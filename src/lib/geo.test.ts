import { describe, expect, it } from "vitest";
import { allTankDistances, distanceMeters, minimumConnectionTree } from "./geo";
import type { SiteFeature } from "./site-data";

function tank(id: string, latitude: number, longitude: number): SiteFeature {
  return { id, kind: "tank", name: id.toUpperCase(), latitude, longitude, source: "survey", observedOn: "", notes: "", measurements: {} };
}

describe("mapped location distances", () => {
  it("calculates a geodesic straight-line distance in metres", () => {
    expect(distanceMeters(tank("a", 0, 0), tank("b", 0, 1))).toBeCloseTo(111_195, -1);
  });

  it("lists each pair once in increasing distance order", () => {
    const pairs = allTankDistances([tank("a", 0, 0), tank("b", 0, 0.01), tank("c", 0, 0.03)]);
    expect(pairs).toHaveLength(3);
    expect(pairs.map((pair) => pair.meters)).toEqual([...pairs.map((pair) => pair.meters)].sort((a, b) => a - b));
  });

  it("selects the minimum links needed to connect all tanks", () => {
    const tree = minimumConnectionTree([tank("a", 0, 0), tank("b", 0, 0.01), tank("c", 0, 0.03)]);
    expect(tree).toHaveLength(2);
    expect(tree.reduce((sum, link) => sum + link.meters, 0)).toBeCloseTo(distanceMeters(tank("a", 0, 0), tank("c", 0, 0.03)), 0);
  });
});
