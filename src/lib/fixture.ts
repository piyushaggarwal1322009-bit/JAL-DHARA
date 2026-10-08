import type { SimulationInput } from "./model";

/** All values are invented for a reproducible demonstration, not field measurements. */
export const DEMO_INPUT: SimulationInput = {
  schemaVersion: 1,
  villages: [
    { id: "v-b", name: "Village B", tankId: "b" },
    { id: "v-c", name: "Village C", tankId: "c" },
    { id: "v-d", name: "Village D", tankId: "d" },
  ],
  tanks: [
    { id: "a", name: "Tank A", catchmentAreaM2: 200, runoffCoefficient: 0.5, capacityL: 1000, initialStorageL: 1000 },
    { id: "b", name: "Tank B", catchmentAreaM2: 0, runoffCoefficient: 0, capacityL: 1000, initialStorageL: 0 },
    { id: "c", name: "Tank C", catchmentAreaM2: 0, runoffCoefficient: 0, capacityL: 1000, initialStorageL: 0 },
    { id: "d", name: "Tank D", catchmentAreaM2: 0, runoffCoefficient: 0, capacityL: 1000, initialStorageL: 0 },
  ],
  channels: [
    { id: "a-b", sourceTankId: "a", targetTankId: "b", priority: 1, condition: "functional", capacityL: 4000, efficiency: 1 },
    { id: "b-c", sourceTankId: "b", targetTankId: "c", priority: 1, condition: "functional", capacityL: 2500, efficiency: 1 },
    { id: "c-d", sourceTankId: "c", targetTankId: "d", priority: 1, condition: "functional", capacityL: 1000, efficiency: 1 },
  ],
  demands: [
    { id: "b-h", villageId: "v-b", kind: "household", amountL: 200 },
    { id: "b-i", villageId: "v-b", kind: "irrigation", amountL: 300 },
    { id: "c-h", villageId: "v-c", kind: "household", amountL: 200 },
    { id: "c-i", villageId: "v-c", kind: "irrigation", amountL: 300 },
    { id: "d-h", villageId: "v-d", kind: "household", amountL: 200 },
    { id: "d-i", villageId: "v-d", kind: "irrigation", amountL: 300 },
  ],
  repairs: [
    { id: "repair-a-b", channelId: "a-b", costINR: 6000, restoredCapacityL: 4000, restoredEfficiency: 1 },
    { id: "repair-b-c", channelId: "b-c", costINR: 12000, restoredCapacityL: 2500, restoredEfficiency: 1 },
    { id: "repair-c-d", channelId: "c-d", costINR: 8000, restoredCapacityL: 1000, restoredEfficiency: 1 },
  ],
  rainfall: { id: "rain-demo", label: "Illustrative event", rainfallMm: 40 },
  policy: { mode: "householdFirst" },
};

export function freshDemoInput(): SimulationInput {
  return structuredClone(DEMO_INPUT);
}
