import type { OptimizationResult, RepairAction, SimulationInput, SimulationResult } from "./model";
import { simulate } from "./simulation";
import { validateInput } from "./validation";

function repairedInput(input: SimulationInput, selected: RepairAction[]): SimulationInput {
  const actions = new Map(selected.map((item) => [item.channelId, item]));
  return {
    ...input,
    channels: input.channels.map((channel) => {
      const action = actions.get(channel.id);
      return action ? { ...channel, condition: "functional" as const,
        capacityL: action.restoredCapacityL, efficiency: action.restoredEfficiency } : { ...channel };
    }),
  };
}

export function applyRepairs(input: SimulationInput, selectedRepairIds: string[]): SimulationInput {
  const selected = input.repairs.filter((item) => selectedRepairIds.includes(item.id));
  if (selected.length !== selectedRepairIds.length) throw new Error("Unknown repair ID.");
  return repairedInput(input, selected);
}

interface Ranked { ids: string[]; cost: number; result: SimulationResult }
function better(candidate: Ranked, current: Ranked): boolean {
  if (candidate.result.unmetDemandL !== current.result.unmetDemandL) return candidate.result.unmetDemandL < current.result.unmetDemandL;
  if (candidate.cost !== current.cost) return candidate.cost < current.cost;
  if (candidate.ids.length !== current.ids.length) return candidate.ids.length < current.ids.length;
  return candidate.ids.join(",").localeCompare(current.ids.join(",")) < 0;
}

export function optimize(rawInput: SimulationInput, budgetINR: number): OptimizationResult {
  if (!Number.isInteger(budgetINR) || budgetINR < 0 || budgetINR > 1_000_000_000) throw new Error("Enter a valid repair budget.");
  const { input } = validateInput(rawInput);
  const baseline = simulate(input);
  const channelById = new Map(input.channels.map((item) => [item.id, item]));
  const eligible = input.repairs.filter((item) => channelById.get(item.channelId)?.condition !== "functional")
    .sort((a, b) => a.id.localeCompare(b.id));
  if (eligible.length > 8) throw new Error("At most eight repair candidates are supported.");
  let best: Ranked = { ids: [], cost: 0, result: baseline };
  let evaluatedSubsetCount = 1;
  for (let mask = 1; mask < 2 ** eligible.length; mask++) {
    const selected = eligible.filter((_, index) => Boolean(mask & (1 << index)));
    const cost = selected.reduce((total, item) => total + item.costINR, 0);
    if (cost > budgetINR) continue;
    const ids = selected.map((item) => item.id);
    const result = simulate(repairedInput(input, selected));
    evaluatedSubsetCount++;
    const candidate = { ids, cost, result };
    if (better(candidate, best)) best = candidate;
  }
  const improvement = best.result.deliveredL - baseline.deliveredL;
  const explanation = best.ids.length === 0
    ? eligible.length === 0 ? "No damaged channels have a repair action." : "No affordable repair improves delivered water under these assumptions."
    : `Restoring ${best.ids.length} connection${best.ids.length === 1 ? "" : "s"} adds ${improvement.toLocaleString("en-IN")} L of delivered water in this illustrative event.`;
  return { selectedRepairIds: best.ids, totalCostINR: best.cost, baseline,
    recommended: best.result, evaluatedSubsetCount, explanation };
}
