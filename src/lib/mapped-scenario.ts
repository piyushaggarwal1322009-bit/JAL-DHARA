import { DEMO_INPUT } from "./fixture";
import { distanceMeters, minimumConnectionTree } from "./geo";
import type { SimulationInput } from "./model";
import type { SiteFeature } from "./site-data";

function measurement(feature: SiteFeature | undefined, key: string, fallback: number) {
  const raw = feature?.measurements[key];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function createMappedScenario(features: SiteFeature[]): SimulationInput {
  const mappedTanks = features.filter((feature) => feature.kind === "tank");
  if (mappedTanks.length === 0) return structuredClone(DEMO_INPUT);
  const ids = mappedTanks.map((_, index) => `tank-${index + 1}`);
  const tanks: SimulationInput["tanks"] = mappedTanks.map((feature, index) => {
    const defaults = DEMO_INPUT.tanks[index % DEMO_INPUT.tanks.length];
    const capacityL = Math.round(measurement(feature, "capacityL", defaults.capacityL));
    return {
      id: ids[index], name: feature.name,
      catchmentAreaM2: measurement(feature, "catchmentAreaM2", defaults.catchmentAreaM2),
      runoffCoefficient: Math.min(1, measurement(feature, "runoffCoefficient", defaults.runoffCoefficient)),
      capacityL, initialStorageL: Math.min(capacityL, Math.round(measurement(feature, "initialStorageL", defaults.initialStorageL))),
    };
  });

  const tree = minimumConnectionTree(mappedTanks);
  const channels: SimulationInput["channels"] = tree.map((link, index) => {
    let from = mappedTanks.findIndex((tank) => tank.id === link.from.id);
    let to = mappedTanks.findIndex((tank) => tank.id === link.to.id);
    if (from > to) [from, to] = [to, from];
    return { id: `map-link-${index + 1}`, sourceTankId: ids[from], targetTankId: ids[to], priority: index + 1,
      condition: "functional", capacityL: Math.min(tanks[from].capacityL, tanks[to].capacityL), efficiency: 1 };
  });
  const mappedVillages = features.filter((feature) => feature.kind === "village");
  const villages: SimulationInput["villages"] = mappedVillages.length ? mappedVillages.map((feature, index) => {
    const nearest = mappedTanks.reduce((best, tank, tankIndex) => distanceMeters(feature, tank) < distanceMeters(feature, mappedTanks[best]) ? tankIndex : best, 0);
    return { id: `village-${index + 1}`, name: feature.name, tankId: ids[nearest] };
  }) : mappedTanks.map((feature, index) => ({ id: `village-${index + 1}`, name: feature.name, tankId: ids[index] }));
  const demands: SimulationInput["demands"] = villages.flatMap((village, index) => {
    const feature = mappedVillages[index];
    const defaults = DEMO_INPUT.demands;
    const householdDefault = defaults.find((item) => item.kind === "household")?.amountL ?? 200;
    const irrigationDefault = defaults.find((item) => item.kind === "irrigation")?.amountL ?? 300;
    const household = Math.round(measurement(feature, "householdDemandL", householdDefault));
    const irrigation = Math.round(measurement(feature, "irrigationDemandL", irrigationDefault));
    return [
      { id: `demand-household-${index + 1}`, villageId: village.id, kind: "household" as const, amountL: household },
      { id: `demand-irrigation-${index + 1}`, villageId: village.id, kind: "irrigation" as const, amountL: irrigation },
    ];
  });
  const repairs: SimulationInput["repairs"] = channels.map((channel, index) => {
    const defaults = DEMO_INPUT.repairs[index % DEMO_INPUT.repairs.length];
    return { id: `repair-${channel.id}`, channelId: channel.id, costINR: defaults.costINR,
      restoredCapacityL: channel.capacityL, restoredEfficiency: channel.efficiency };
  });
  return { schemaVersion: 1, tanks, villages, channels, demands, repairs,
    rainfall: structuredClone(DEMO_INPUT.rainfall), policy: structuredClone(DEMO_INPUT.policy) };
}
