import type { SiteFeature } from "./site-data";

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a: Pick<SiteFeature, "latitude" | "longitude">, b: Pick<SiteFeature, "latitude" | "longitude">) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export interface DistancePair { from: SiteFeature; to: SiteFeature; meters: number }

export function allTankDistances(tanks: SiteFeature[]): DistancePair[] {
  const pairs: DistancePair[] = [];
  for (let i = 0; i < tanks.length; i += 1) {
    for (let j = i + 1; j < tanks.length; j += 1) {
      pairs.push({ from: tanks[i], to: tanks[j], meters: distanceMeters(tanks[i], tanks[j]) });
    }
  }
  return pairs.sort((a, b) => a.meters - b.meters);
}

/** Shortest straight-line set of links connecting all mapped tank locations (Prim's algorithm). */
export function minimumConnectionTree(tanks: SiteFeature[]): DistancePair[] {
  if (tanks.length < 2) return [];
  const connected = new Set([0]);
  const tree: DistancePair[] = [];
  while (connected.size < tanks.length) {
    let best: DistancePair | undefined;
    let bestIndex = -1;
    for (const fromIndex of connected) {
      for (let toIndex = 0; toIndex < tanks.length; toIndex += 1) {
        if (connected.has(toIndex)) continue;
        const candidate = { from: tanks[fromIndex], to: tanks[toIndex], meters: distanceMeters(tanks[fromIndex], tanks[toIndex]) };
        if (!best || candidate.meters < best.meters) { best = candidate; bestIndex = toIndex; }
      }
    }
    if (!best || bestIndex < 0) break;
    tree.push(best); connected.add(bestIndex);
  }
  return tree;
}
