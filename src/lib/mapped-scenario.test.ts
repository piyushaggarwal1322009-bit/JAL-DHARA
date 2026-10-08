import { describe, expect, it } from "vitest";
import { simulate } from "./simulation";
import { createMappedScenario } from "./mapped-scenario";
import type { SiteFeature } from "./site-data";

const tank = (id: string, name: string, longitude: number): SiteFeature => ({ id, kind: "tank", name, latitude: 28, longitude, source: "Survey", observedOn: "", notes: "", measurements: {} });

describe("mapped network simulation", () => {
  it("uses exactly the mapped tanks and connects them by nearest links", () => {
    const input = createMappedScenario([tank("map-1", "North Tank", 77), tank("map-2", "East Tank", 77.01), tank("map-3", "South Tank", 77.02)]);
    expect(input.tanks.map((item) => item.name)).toEqual(["North Tank", "East Tank", "South Tank"]);
    expect(input.tanks).toHaveLength(3);
    expect(input.channels).toHaveLength(2);
    expect(input.tanks.some((item) => item.name === "Tank D")).toBe(false);
    expect(simulate(input).balanceResidualL).toBe(0);
  });
});
