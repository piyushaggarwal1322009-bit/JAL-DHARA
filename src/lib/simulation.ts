import type { SimulationInput, SimulationResult, WaterDemand } from "./model";
import { validateInput } from "./validation";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);

function allocate(availableL: number, demands: WaterDemand[], mode: SimulationInput["policy"]["mode"]): Map<string, number> {
  const delivered = new Map(demands.map((item) => [item.id, 0]));
  if (mode === "householdFirst" || mode === "irrigationFirst") {
    let remaining = availableL;
    const preferredKind = mode === "householdFirst" ? "household" : "irrigation";
    const ordered = [...demands].sort((a, b) => (a.kind === b.kind ? byId(a, b) : a.kind === preferredKind ? -1 : 1));
    ordered.forEach((item) => {
      const amount = Math.min(remaining, item.amountL);
      delivered.set(item.id, amount); remaining -= amount;
    });
    return delivered;
  }
  const totalDemand = sum(demands.map((item) => item.amountL));
  const allocatable = Math.min(availableL, totalDemand);
  if (totalDemand === 0) return delivered;
  if (mode === "equalShare") {
    let low = 0;
    let high = Math.max(...demands.map((item) => item.amountL));
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (sum(demands.map((item) => Math.min(item.amountL, mid))) <= allocatable) low = mid;
      else high = mid - 1;
    }
    demands.forEach((item) => delivered.set(item.id, Math.min(item.amountL, low)));
    let leftover = allocatable - sum([...delivered.values()]);
    for (const item of [...demands].sort(byId)) {
      if (!leftover) break;
      const current = delivered.get(item.id) ?? 0;
      if (current < item.amountL) { delivered.set(item.id, current + 1); leftover--; }
    }
    return delivered;
  }
  const shares = demands.map((item) => {
    const exact = allocatable * item.amountL / totalDemand;
    const floor = Math.floor(exact);
    delivered.set(item.id, floor);
    return { id: item.id, remainder: exact - floor };
  });
  let leftover = allocatable - sum([...delivered.values()]);
  shares.sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id));
  for (const share of shares) {
    if (leftover === 0) break;
    delivered.set(share.id, (delivered.get(share.id) ?? 0) + 1);
    leftover--;
  }
  return delivered;
}

export function simulate(rawInput: SimulationInput): SimulationResult {
  const { input, order } = validateInput(rawInput);
  const tanks = new Map(input.tanks.map((item) => [item.id, item]));
  const villages = new Map(input.villages.map((item) => [item.id, item]));
  const incoming = new Map(input.tanks.map((item) => [item.id, 0]));
  const channelFlows = input.channels.map((item) => ({ channelId: item.id, sentL: 0, receivedL: 0, lossL: 0 }));
  const flowById = new Map(channelFlows.map((item) => [item.channelId, item]));
  const villageDeliveries = input.villages.map((item) => ({
    villageId: item.id, householdDeliveredL: 0, irrigationDeliveredL: 0,
    householdUnmetL: 0, irrigationUnmetL: 0,
  }));
  const villageResult = new Map(villageDeliveries.map((item) => [item.villageId, item]));
  const tankBalances: SimulationResult["tankBalances"] = [];

  for (const tankId of order) {
    const tank = tanks.get(tankId)!;
    const runoffL = Math.round(input.rainfall.rainfallMm * tank.catchmentAreaM2 * tank.runoffCoefficient);
    const incomingL = incoming.get(tankId) ?? 0;
    const availableL = tank.initialStorageL + runoffL + incomingL;
    if (!Number.isSafeInteger(availableL)) throw new Error("Water total exceeds safe integer range.");
    const localDemands = input.demands.filter((item) => villages.get(item.villageId)?.tankId === tankId);
    const allocations = allocate(availableL, localDemands, input.policy.mode);
    const deliveredL = sum([...allocations.values()]);
    localDemands.forEach((item) => {
      const row = villageResult.get(item.villageId)!;
      const amount = allocations.get(item.id) ?? 0;
      if (item.kind === "household") {
        row.householdDeliveredL += amount;
        row.householdUnmetL += item.amountL - amount;
      } else {
        row.irrigationDeliveredL += amount;
        row.irrigationUnmetL += item.amountL - amount;
      }
    });
    const remainingL = availableL - deliveredL;
    const finalStorageL = Math.min(tank.capacityL, remainingL);
    let surplusL = remainingL - finalStorageL;
    const outgoing = input.channels.filter((item) => item.sourceTankId === tankId)
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    outgoing.forEach((edge) => {
      const sentL = edge.condition === "blocked" ? 0 : Math.min(surplusL, edge.capacityL);
      const receivedL = Math.floor(sentL * edge.efficiency);
      surplusL -= sentL;
      incoming.set(edge.targetTankId, (incoming.get(edge.targetTankId) ?? 0) + receivedL);
      const flow = flowById.get(edge.id)!;
      flow.sentL = sentL; flow.receivedL = receivedL; flow.lossL = sentL - receivedL;
    });
    tankBalances.push({ tankId, runoffL, incomingL, deliveredL, finalStorageL, externalSpillL: surplusL });
  }

  const rainfallRunoffL = sum(tankBalances.map((item) => item.runoffL));
  const initialStorageL = sum(input.tanks.map((item) => item.initialStorageL));
  const deliveredL = sum(tankBalances.map((item) => item.deliveredL));
  const unmetDemandL = sum(villageDeliveries.map((item) => item.householdUnmetL + item.irrigationUnmetL));
  const finalStorageL = sum(tankBalances.map((item) => item.finalStorageL));
  const channelLossL = sum(channelFlows.map((item) => item.lossL));
  const externalSpillL = sum(tankBalances.map((item) => item.externalSpillL));
  const balanceResidualL = initialStorageL + rainfallRunoffL - deliveredL - finalStorageL - channelLossL - externalSpillL;
  if (balanceResidualL !== 0) throw new Error("Water balance failed.");
  return { villageDeliveries, channelFlows, tankBalances, rainfallRunoffL, initialStorageL,
    deliveredL, unmetDemandL, finalStorageL, channelLossL, externalSpillL, balanceResidualL };
}
