import { z } from "zod";
import type { SimulationInput } from "./model";

const id = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const volume = z.number().int().min(0).max(1_000_000_000);
const fraction = z.number().finite().min(0).max(1);
const village = z.strictObject({ id, name: z.string().min(1).max(80), tankId: id });
const tank = z.strictObject({
  id, name: z.string().min(1).max(80), catchmentAreaM2: z.number().finite().min(0).max(10_000_000),
  runoffCoefficient: fraction, capacityL: volume, initialStorageL: volume,
});
const channel = z.strictObject({
  id, sourceTankId: id, targetTankId: id, priority: z.number().int().min(0).max(1000),
  condition: z.enum(["functional", "degraded", "blocked", "overflowing"]), capacityL: volume, efficiency: fraction,
});
const demand = z.strictObject({ id, villageId: id, kind: z.enum(["household", "irrigation"]), amountL: volume });
const repair = z.strictObject({
  id, channelId: id, costINR: volume, restoredCapacityL: volume, restoredEfficiency: fraction,
  feasibilityNote: z.string().max(200).optional(),
});

export const simulationInputSchema = z.strictObject({
  schemaVersion: z.literal(1), villages: z.array(village).max(40), tanks: z.array(tank).min(1).max(20),
  channels: z.array(channel).max(40), demands: z.array(demand).max(80), repairs: z.array(repair).max(8),
  rainfall: z.strictObject({ id, label: z.string().min(1).max(80), rainfallMm: z.number().finite().min(0).max(500) }),
  policy: z.strictObject({ mode: z.enum(["householdFirst", "irrigationFirst", "proportional", "equalShare"]) }),
});

function unique(items: { id: string }[], label: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`Duplicate ${label} ID.`);
}

export function validateInput(input: SimulationInput): { input: SimulationInput; order: string[] } {
  const parsed = simulationInputSchema.parse(input) as SimulationInput;
  unique(parsed.villages, "village"); unique(parsed.tanks, "tank"); unique(parsed.channels, "channel");
  unique(parsed.demands, "demand"); unique(parsed.repairs, "repair");
  const tankIds = new Set(parsed.tanks.map((item) => item.id));
  const villageIds = new Set(parsed.villages.map((item) => item.id));
  const channels = new Map(parsed.channels.map((item) => [item.id, item]));
  const pairs = new Set<string>();
  parsed.tanks.forEach((item) => {
    if (item.initialStorageL > item.capacityL) throw new Error(`${item.name} starts above capacity.`);
    const runoff = Math.round(parsed.rainfall.rainfallMm * item.catchmentAreaM2 * item.runoffCoefficient);
    if (!Number.isSafeInteger(runoff)) throw new Error("Runoff exceeds safe integer range.");
  });
  parsed.villages.forEach((item) => { if (!tankIds.has(item.tankId)) throw new Error(`Unknown tank for ${item.name}.`); });
  parsed.demands.forEach((item) => { if (!villageIds.has(item.villageId)) throw new Error(`Unknown village for demand ${item.id}.`); });
  parsed.channels.forEach((item) => {
    if (!tankIds.has(item.sourceTankId) || !tankIds.has(item.targetTankId) || item.sourceTankId === item.targetTankId) throw new Error(`Invalid channel ${item.id}.`);
    const pair = `${item.sourceTankId}:${item.targetTankId}`;
    if (pairs.has(pair)) throw new Error(`Duplicate channel ${pair}.`);
    pairs.add(pair);
  });
  const repairChannels = new Set<string>();
  parsed.repairs.forEach((item) => {
    const current = channels.get(item.channelId);
    if (!current || repairChannels.has(item.channelId)) throw new Error(`Invalid repair ${item.id}.`);
    if (item.restoredCapacityL < current.capacityL || item.restoredEfficiency < current.efficiency) throw new Error(`Repair ${item.id} reduces channel performance.`);
    repairChannels.add(item.channelId);
  });
  const indegree = new Map(parsed.tanks.map((item) => [item.id, 0]));
  parsed.channels.forEach((item) => indegree.set(item.targetTankId, (indegree.get(item.targetTankId) ?? 0) + 1));
  const order: string[] = [];
  while (order.length < parsed.tanks.length) {
    const next = [...indegree.entries()].filter(([, count]) => count === 0).map(([key]) => key).sort()[0];
    if (!next) throw new Error("The tank network contains a cycle.");
    order.push(next); indegree.delete(next);
    parsed.channels.filter((item) => item.sourceTankId === next).forEach((item) => indegree.set(item.targetTankId, (indegree.get(item.targetTankId) ?? 0) - 1));
  }
  return { input: parsed, order };
}
