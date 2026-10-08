# 06 — Deterministic simulation engine

[Models and fixture](05-DATA-MODELS.md) · [Optimizer](07-REPAIR-OPTIMIZATION.md) · [Validation](10-TESTING-AND-VALIDATION.md)

## Scope and units

Model **one rainfall event and one instantaneous routing step**, not a daily/seasonal hydrologic forecast. All water is integer litres. It models direct runoff, tank storage, local household/irrigation delivery, surplus transfers, channel loss, and external spill. It omits infiltration, evaporation, groundwater, travel time, gates, hydraulic head, sediment, and real spillway safety. Treat zero local catchment in the fixture as a deliberate demo assumption.

For tank `i`, raw runoff `Rᵢ = rainfallMm × catchmentAreaM2 × runoffCoefficient` litres. Convert to integer using `Math.round` once per tank for non-negative values. Reject values above safe integer limits. At processing time, `available = initialStorage + roundedRunoff + upstreamReceived`. Allocate local demand first, then retain `min(capacity, available − delivered)`; the remainder is **surplus**. Route surplus through outgoing channels sorted by `(priority, id)`. For each channel, `sent = min(remainingSurplus, channel.capacityL)` if not blocked, otherwise 0. `received = floor(sent × efficiency)` and `loss = sent − received`. Subtract `sent` from source surplus and add `received` to target pending inflow. Unsent remainder becomes external spill. A degraded channel uses its current capacity/efficiency; a repair replaces both from its `RepairAction`.

This ordering is a policy choice: local demand precedes storage and onward surplus. Water may briefly exceed tank capacity *during the event calculation* but final stored water cannot; the surplus is routed/spilled in the same step. A target never sends water backwards. Outgoing transfer is limited by source surplus and channel capacity, **not** target capacity; the target resolves its own demand/storage/overflow when its topological turn arrives. Each litre is consumed, stored, lost in channel, or externally spilled exactly once.

## Demand allocation

At each tank, collect demands of villages attached to it. `householdFirst`: allocate available volume to household demands in ascending demand ID, then irrigation demands in ascending ID; each receives `min(remaining, amountL)`. This is a simplified configurable rule, not a claim about every historical community. `proportional`: allocate up to `min(available,totalDemand)` across **all** demands in proportion to `amountL`; compute integer floor shares, then distribute leftover litres by descending fractional remainder and ascending demand ID. Zero-demand items get zero. Both modes conserve integer litres and respect requested amounts. Total delivery may match while household/irrigation outcomes differ. Show both per-village values, not only the total.

## Graph processing and invariant

Validate a DAG and compute deterministic Kahn topological order, choosing the lowest tank ID whenever several are ready. Pending incoming starts at zero. A disconnected tank still processes its own rainfall/storage/demand. A cycle is rejected rather than iterated. The global balance is:

`initialStorageL + rainfallRunoffL = deliveredL + finalStorageL + channelLossL + externalSpillL`.

`balanceResidualL` is left minus right and **must equal 0**. Also assert `0 ≤ finalStorageᵢ ≤ capacityᵢ`, `0 ≤ deliveredDemand ≤ requestedDemand`, `received ≤ sent`, and no negative balances. Use safe-integer checks for sums/products. Unmet demand is sum of `requested − delivered` and is not part of the water balance.

## Implementable pseudocode

```text
simulate(input):
  scenario = validateInputAndDAG(input)
  order = deterministicTopologicalOrder(scenario)
  pendingIncoming[tankId] = 0 for every tank
  initialise result rows with zero values
  for tankId in order:
    runoff = round(rainfallMm * catchmentAreaM2 * coefficient)
    available = initialStorage + runoff + pendingIncoming[tankId]
    deliveries = allocateDemands(available, localDemands, policy)
    remaining = available - sum(deliveries)
    finalStorage = min(capacityL, remaining)
    surplus = remaining - finalStorage
    for edge in outgoing sorted by (priority, id):
      sent = edge.blocked ? 0 : min(surplus, edge.capacityL)
      received = floor(sent * edge.efficiency)
      surplus -= sent
      pendingIncoming[edge.targetTankId] += received
      record sent, received, sent-received
    externalSpill[tankId] = surplus
    record runoff, incoming, delivered, finalStorage
  aggregate totals and assert invariants
  return a newly allocated SimulationResult
```

## Worked demo calculation

The [fixture](05-DATA-MODELS.md) has 40 mm rain, 200 m² catchment, coefficient 0.5 **only at A**: `40×200×0.5 = 4,000 L`. A starts at 1,000 L, retains 1,000 L, and sends 4,000 L to B. B delivers 500 L, stores 1,000 L, sends 2,500 L to C. C delivers 500 L, stores 1,000 L, sends 1,000 L to D. D delivers 500 L and stores 500 L. All efficiencies are 1. Totals: **5,000 L input = 1,500 L delivered + 3,500 L stored**; no loss or external spill; unmet 0.

If `b-c` is blocked, B still delivers 500 L and stores 1,000 L, but its 2,500 L surplus becomes external spill. C and D receive none and each has 500 L unmet demand. Totals: **5,000 = 500 delivered + 2,000 stored + 2,500 external spill**; unmet 1,000 L. Repairing `b-c` returns to the intact result under identical inputs. These are arithmetic expectations for an invented dataset, not verified field outcomes.

For a low-water policy example, set rainfall to 2 mm: A runoff 200 L and passes it to B. B has 500 L total demand. Household-first delivers 200 L household, 0 irrigation; proportional delivers 80 L household and 120 L irrigation. The latter uses proportional shares of 200/500 and 300/500. This illustrates a policy difference without changing total water delivered.

## Edge cases

Zero rain still permits initial storage to flow only if surplus after local demand/storage exists. An empty tank with no input serves zero. A full tank routes or spills excess. Blocked channels have zero sent/received/loss. A disconnected branch can serve only local water. Loss lowers downstream delivery but appears explicitly in the balance. Channel capacity zero is valid but does not transfer. Multiple outgoing edges follow stable priority, so earlier edges receive surplus first; this is **not** optimized routing. All-zero demand leaves water stored or spilled. Any invalid physical value or cycle fails before partial results are shown.

This is a transparent accounting demonstration. Site-scale engineering needs measured catchments, operating rules, rainfall series, hydraulics, and expert review.
