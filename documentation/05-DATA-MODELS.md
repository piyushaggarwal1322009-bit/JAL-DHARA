# 05 — Data models and illustrative fixture

[Architecture](03-SYSTEM-ARCHITECTURE.md) · [Simulation](06-SIMULATION-ENGINE.md) · [Optimization](07-REPAIR-OPTIMIZATION.md)

## Units and conventions

All engine volumes, storage, capacity, transfer and demand are **integer litres per one event step**. Rainfall is non-negative millimetres; catchment is square metres; dimensionless coefficients/efficiencies lie in `[0,1]`; cost/budget are non-negative integer INR. `1 mm × 1 m² = 1 L`. IDs are stable ASCII strings and unique within their own collection. IDs and source/target references are case-sensitive. No real coordinates, rainfall observations, field costs, or measured efficiencies are included.

## Canonical TypeScript contracts

```ts
type Id = string;
type ChannelCondition = 'functional' | 'degraded' | 'blocked';
type DemandKind = 'household' | 'irrigation';

interface Village { id: Id; name: string; tankId: Id }
interface Tank {
  id: Id; name: string; catchmentAreaM2: number; runoffCoefficient: number;
  capacityL: number; initialStorageL: number;
}
interface WaterChannel {
  id: Id; sourceTankId: Id; targetTankId: Id; priority: number;
  condition: ChannelCondition; capacityL: number; efficiency: number;
}
interface WaterDemand { id: Id; villageId: Id; kind: DemandKind; amountL: number }
interface RainfallScenario { id: Id; label: string; rainfallMm: number }
interface RepairAction {
  id: Id; channelId: Id; costINR: number; restoredCapacityL: number;
  restoredEfficiency: number; feasibilityNote?: string;
}
interface CommunityPolicy { mode: 'householdFirst' | 'proportional' }
interface SimulationInput {
  schemaVersion: 1; villages: Village[]; tanks: Tank[];
  channels: WaterChannel[]; demands: WaterDemand[];
  repairs: RepairAction[]; rainfall: RainfallScenario;
  policy: CommunityPolicy;
}
interface VillageDelivery {
  villageId: Id; householdDeliveredL: number; irrigationDeliveredL: number;
  householdUnmetL: number; irrigationUnmetL: number;
}
interface ChannelFlow { channelId: Id; sentL: number; receivedL: number; lossL: number }
interface TankBalance {
  tankId: Id; runoffL: number; incomingL: number; deliveredL: number;
  finalStorageL: number; externalSpillL: number;
}
interface SimulationResult {
  villageDeliveries: VillageDelivery[]; channelFlows: ChannelFlow[];
  tankBalances: TankBalance[]; rainfallRunoffL: number;
  initialStorageL: number; deliveredL: number; unmetDemandL: number;
  finalStorageL: number; channelLossL: number; externalSpillL: number;
  balanceResidualL: number; affectedVillageIds?: Id[];
}
interface OptimizationResult {
  selectedRepairIds: Id[]; totalCostINR: number;
  baseline: SimulationResult; recommended: SimulationResult;
  evaluatedSubsetCount: number; explanation: string;
}
interface AIExtractedReport {
  channelId: Id | null; defect: 'blocked' | 'degraded' | 'unknown';
  villageIds: Id[]; budgetINR: number | null;
  unknownFields: string[]; evidence: string;
}
```

`affectedVillageIds` is computed by comparison helper, not by a standalone simulation. Prefer a separate `compareResults(before,after)` return type in implementation; if kept in `SimulationResult`, leave absent for a single run. `ChannelFlow.sentL` is water removed from source, `receivedL` reaches target, and `lossL = sentL - receivedL`. `externalSpillL` is surplus that finds no usable outgoing channel capacity; it is not claimed to be safe discharge.

## Boundary validation

Use Zod `z.object(...).strict()` for external/fixture inputs and `z.number().finite()` plus `.int().nonnegative()` for integer fields. Restrict rainfall to `[0,500]` mm, area `[0,10_000_000]` m², any volume to `[0,1_000_000_000]` L, budget/cost to `[0,1_000_000_000]` INR, and coefficient/efficiency to `[0,1]`; these are **software bounds**, not physical standards. Names ≤80 characters, IDs match `/^[a-z][a-z0-9-]{0,39}$/`, arrays ≤20 tanks/40 channels/40 villages/80 demands, candidate repairs ≤8. The MVP fixture has four tanks. Cross-check unique IDs, all foreign keys, no self-edge, unique repair per channel, unique source→target pair, initial storage ≤ capacity, and a DAG using Kahn's algorithm. Reject cycles and invalid references before run. A blocked channel retains its design `capacityL` and efficiency but transfers zero. Only damaged (`blocked`/`degraded`) channels with a repair record are optimizer candidates. `restoredCapacityL` and `restoredEfficiency` must be at least current values and within bounds. Deep-clone snapshots or create new records; never mutate input.

## Illustrative demo fixture

Every name, value, topology, cost, and demand below is **invented for reproducible demonstration**, not a surveyed Indian site. A separate default scenario starts intact; the primary challenge toggles `b-c` to blocked. One rainfall event uses 40 mm only over A's 200 m² catchment at coefficient 0.5, yielding 4,000 L. A starts with 1,000 L; all other tanks start empty.

```json
{
  "schemaVersion": 1,
  "villages": [
    {"id":"v-b","name":"Village B","tankId":"b"},
    {"id":"v-c","name":"Village C","tankId":"c"},
    {"id":"v-d","name":"Village D","tankId":"d"}
  ],
  "tanks": [
    {"id":"a","name":"Tank A","catchmentAreaM2":200,"runoffCoefficient":0.5,"capacityL":1000,"initialStorageL":1000},
    {"id":"b","name":"Tank B","catchmentAreaM2":0,"runoffCoefficient":0,"capacityL":1000,"initialStorageL":0},
    {"id":"c","name":"Tank C","catchmentAreaM2":0,"runoffCoefficient":0,"capacityL":1000,"initialStorageL":0},
    {"id":"d","name":"Tank D","catchmentAreaM2":0,"runoffCoefficient":0,"capacityL":1000,"initialStorageL":0}
  ],
  "channels": [
    {"id":"a-b","sourceTankId":"a","targetTankId":"b","priority":1,"condition":"functional","capacityL":4000,"efficiency":1},
    {"id":"b-c","sourceTankId":"b","targetTankId":"c","priority":1,"condition":"functional","capacityL":2500,"efficiency":1},
    {"id":"c-d","sourceTankId":"c","targetTankId":"d","priority":1,"condition":"functional","capacityL":1000,"efficiency":1}
  ],
  "demands": [
    {"id":"b-h","villageId":"v-b","kind":"household","amountL":200},
    {"id":"b-i","villageId":"v-b","kind":"irrigation","amountL":300},
    {"id":"c-h","villageId":"v-c","kind":"household","amountL":200},
    {"id":"c-i","villageId":"v-c","kind":"irrigation","amountL":300},
    {"id":"d-h","villageId":"v-d","kind":"household","amountL":200},
    {"id":"d-i","villageId":"v-d","kind":"irrigation","amountL":300}
  ],
  "repairs": [
    {"id":"repair-a-b","channelId":"a-b","costINR":6000,"restoredCapacityL":4000,"restoredEfficiency":1},
    {"id":"repair-b-c","channelId":"b-c","costINR":12000,"restoredCapacityL":2500,"restoredEfficiency":1},
    {"id":"repair-c-d","channelId":"c-d","costINR":8000,"restoredCapacityL":1000,"restoredEfficiency":1}
  ],
  "rainfall":{"id":"rain-demo","label":"Illustrative event","rainfallMm":40},
  "policy":{"mode":"householdFirst"}
}
```

Repair cost is a UI/search assumption, **not an engineering estimate**. The zero local catchments are deliberate simplifications to make the demo arithmetic inspectable. Other test fixtures may vary values within the same schema. Historical context and source links are in [the overview](01-PROJECT-OVERVIEW.md).
