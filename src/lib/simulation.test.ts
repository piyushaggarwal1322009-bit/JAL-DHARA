import { describe, expect, it } from "vitest";
import { freshDemoInput } from "./fixture";
import { optimize } from "./optimization";
import { simulate } from "./simulation";

describe("illustrative tank cascade", () => {
  it("conserves the intact event and delivers to all three villages", () => {
    const result = simulate(freshDemoInput());
    expect([result.rainfallRunoffL, result.initialStorageL, result.deliveredL,
      result.unmetDemandL, result.finalStorageL, result.externalSpillL, result.balanceResidualL])
      .toEqual([4000, 1000, 1500, 0, 3500, 0, 0]);
    expect(result.tankBalances.map((item) => item.finalStorageL)).toEqual([1000, 1000, 1000, 500]);
  });

  it("exposes the downstream shortage after B→C is blocked", () => {
    const input = freshDemoInput();
    input.channels[1].condition = "blocked";
    const result = simulate(input);
    expect([result.deliveredL, result.unmetDemandL, result.finalStorageL,
      result.externalSpillL, result.balanceResidualL]).toEqual([500, 1000, 2000, 2500, 0]);
    expect(result.villageDeliveries.map((item) => item.householdUnmetL + item.irrigationUnmetL))
      .toEqual([0, 500, 500]);
  });

  it("changes scarce-water allocation without changing total delivery", () => {
    const input = freshDemoInput();
    input.rainfall.rainfallMm = 2;
    const first = simulate(input);
    input.policy.mode = "proportional";
    const proportional = simulate(input);
    expect(first.villageDeliveries[0].householdDeliveredL).toBe(200);
    expect(first.villageDeliveries[0].irrigationDeliveredL).toBe(0);
    expect(proportional.villageDeliveries[0].householdDeliveredL).toBe(80);
    expect(proportional.villageDeliveries[0].irrigationDeliveredL).toBe(120);
    expect([first.deliveredL, proportional.deliveredL]).toEqual([200, 200]);
  });

  it("supports irrigation priority and an equal starting share", () => {
    const input = freshDemoInput();
    input.rainfall.rainfallMm = 2;
    input.policy.mode = "irrigationFirst";
    const irrigationFirst = simulate(input);
    expect(irrigationFirst.villageDeliveries[0].householdDeliveredL).toBe(0);
    expect(irrigationFirst.villageDeliveries[0].irrigationDeliveredL).toBe(200);
    input.policy.mode = "equalShare";
    const equalShare = simulate(input);
    expect(equalShare.villageDeliveries[0].householdDeliveredL).toBe(100);
    expect(equalShare.villageDeliveries[0].irrigationDeliveredL).toBe(100);
    expect(equalShare.balanceResidualL).toBe(0);
  });

  it("rejects a cyclic network", () => {
    const input = freshDemoInput();
    input.channels.push({ id: "d-a", sourceTankId: "d", targetTankId: "a", priority: 1, condition: "functional", capacityL: 100, efficiency: 1 });
    expect(() => simulate(input)).toThrow(/cycle/i);
  });
});

describe("budget search", () => {
  it("selects B→C only when the budget reaches ₹12,000", () => {
    const input = freshDemoInput();
    input.channels[1].condition = "blocked";
    const snapshot = JSON.stringify(input);
    expect(optimize(input, 11999).selectedRepairIds).toEqual([]);
    const best = optimize(input, 12000);
    expect(best.selectedRepairIds).toEqual(["repair-b-c"]);
    expect(best.totalCostINR).toBe(12000);
    expect([best.baseline.deliveredL, best.recommended.deliveredL]).toEqual([500, 1500]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("returns the empty set when no repair is needed", () => {
    const best = optimize(freshDemoInput(), 20000);
    expect(best.selectedRepairIds).toEqual([]);
    expect(best.evaluatedSubsetCount).toBe(1);
  });
});
