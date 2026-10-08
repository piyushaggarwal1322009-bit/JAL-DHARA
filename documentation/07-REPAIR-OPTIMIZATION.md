# 07 — Repair optimization

[Simulation](06-SIMULATION-ENGINE.md) · [Models](05-DATA-MODELS.md) · [Tests](10-TESTING-AND-VALIDATION.md)

## Decision and objective

Given a **validated current scenario** and maximum integer `budgetINR`, choose a subset of eligible repairs that minimizes total unmet demand across all villages for the same rainfall, starting storage, demand, and policy. Because demand is fixed, this is equivalent to maximizing total delivered water. Do **not** use AI-generated scores. The empty subset is always feasible and its simulation is the baseline. Repair costs are illustrative; there is no estimate of benefit per real rupee.

Eligibility: a repair record points to an existing channel that is currently `blocked` or `degraded`; its restored capacity/efficiency pass validation. A functional channel is ineligible even if it has a repair record. No dependencies or mutually exclusive actions are supported in MVP; adding them requires explicit schema and feasibility checks later. Total cost is sum of selected costs and must be `≤ budgetINR`. Zero-cost actions are allowed. If no eligible repair exists, return empty selection and a plain explanation.

## Deterministic ranking

Evaluate every feasible subset and rank lexicographically by: **(1)** lowest `recommended.unmetDemandL`, **(2)** lowest total cost, **(3)** fewest actions, **(4)** ascending joined repair-ID list. This avoids paying for an action with no additional simulated benefit. In particular, if all subsets leave unmet demand unchanged, the empty subset wins. Report improvement as `baseline.deliveredL` versus `recommended.deliveredL`, with per-village changes. “Affected community” means unmet demand changed by a positive amount between compared runs, not simply that a node is downstream.

## Pure algorithm

```text
optimize(input, budgetINR):
  validate input and budget; eligible = damaged channels' repairs sorted by id
  require eligible.length <= 8
  baseline = simulate(input)
  best = { ids: [], cost: 0, result: baseline }
  evaluated = 1                         // empty subset
  for each non-empty bitmask from 1 to 2^eligible.length - 1:
    actions = repairs selected by mask
    cost = sum(actions.costINR)
    if cost > budgetINR: continue
    candidateInput = copy of input with selected channels replaced by
      { condition: 'functional', capacityL: restoredCapacityL,
        efficiency: restoredEfficiency }
    candidateResult = simulate(candidateInput)
    evaluated++
    if rank(candidateResult, cost, actions.ids) better than best: best = candidate
  return { selectedRepairIds: best.ids, totalCostINR: best.cost,
           baseline, recommended: best.result, evaluatedSubsetCount: evaluated,
           explanation: format from computed deltas and tie-break reason }
```

Copy channel records and arrays; freeze fixtures in tests to catch mutation. Each subset starts from the original validated scenario, never the previous subset. `2^n` evaluations include baseline (at most 256 for 8 repairs). Runtime is `O(2^n × (V+E+D))` plus subset construction, acceptable for the bounded demo; if the client becomes noticeably busy, show progress or run in a Web Worker later, rather than claiming a fixed latency. Reject >8 eligible actions with a clear validation error.

## Example and acceptance

After the user blocks `b-c` in the illustrative fixture, only `repair-b-c` is eligible. Its cost is ₹12,000. At budget ₹11,999, result is empty, cost ₹0, delivered 500 L, unmet 1,000 L. At ₹12,000, result selects `repair-b-c`, cost ₹12,000, delivered 1,500 L, unmet 0. The optimizer must **not** silently change rainfall or policy. At budget ₹20,000 the same one repair wins, because no other action is eligible. If `a-b` and `b-c` are both blocked in a test variant, evaluate empty, each single, and pair independently; this catches complementarity and invalid greedy assumptions. Tie and no-benefit tests are specified in [testing](10-TESTING-AND-VALIDATION.md).

## Output explanation

Example: “Repair B→C for ₹12,000. Under the current illustrative event, delivered water rises from 500 L to 1,500 L and unmet demand falls from 1,000 L to 0 L; Villages C and D receive 500 L each.” Generate this from two `SimulationResult`s. Do not say the repair will produce real-world savings. The UI applies recommendations only after user action and reruns the engine to create a comparison snapshot.
