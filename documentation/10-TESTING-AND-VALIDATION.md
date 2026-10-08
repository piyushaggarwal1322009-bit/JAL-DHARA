# 10 — Testing and validation

[Fixture](05-DATA-MODELS.md) · [Simulation](06-SIMULATION-ENGINE.md) · [Optimization](07-REPAIR-OPTIMIZATION.md)

## Test approach

Use Vitest for pure engine/schema tests. Prefer exact integer expectations over snapshots of UI markup. A small UI interaction test may use Testing Library if time permits; otherwise follow the explicit manual checklist. All numeric expectations below refer to the **invented** four-tank fixture, never field observations. Freeze input objects to verify purity. Run `npm run test` and `npm run build` before deployment; repeat only after relevant changes.

## Golden numerical cases

| Case | Expected result |
| --- | --- |
| Intact fixture, 40 mm | Runoff 4,000 L; initial 1,000; delivered 1,500; unmet 0; final storage A/B/C/D = 1,000/1,000/1,000/500; external spill 0; channel loss 0; residual 0. |
| Block `b-c` | Delivered 500 L only at B; unmet C=500, D=500; final storage A/B/C/D = 1,000/1,000/0/0; external spill at B 2,500 L; residual 0. |
| Repair `b-c` | Exactly equals intact result; cost is reported separately as ₹12,000, never subtracted from water. |
| Budget ₹11,999 on blocked case | Empty repair set, cost 0, recommended result equals blocked baseline. |
| Budget ₹12,000 on blocked case | `repair-b-c`, cost 12,000, recommended delivered 1,500 L and unmet 0. |
| Rainfall 2 mm, intact, household-first | A runoff 200; B household delivered 200, irrigation 0; C/D delivered 0; residual 0. |
| Rainfall 2 mm, proportional | B household delivered 80, irrigation 120; total delivered 200; residual 0. |
| Rainfall 0, intact | A remains 1,000 L, no surplus; all three villages unmet 500 L each; residual 0. |

## Unit and property checks

- Validate rainfall dimensions (`mm×m²=L`), rounding once per tank, efficiency `floor(sent×efficiency)`, and channel loss equality.
- Empty tank and no inflow: zero delivery, zero negative values. Full tank plus new runoff: storage stays at capacity; only surplus routes/spills. Zero-capacity channel, blocked channel, and disconnected node have expected zero transfers.
- Insufficient water never over-delivers or creates storage. Demand equals delivered plus unmet for each demand and village. All final storage lies within tank capacity.
- Global water conservation is exact across a table of hand-built graphs and randomized **valid small DAG** fixtures with safe integers. Verify deterministic repeated calls and unchanged frozen input.
- Reject cycles, self-edge, duplicate IDs, missing village/tank/channel references, NaN/Infinity, negative values, initial storage over capacity, efficiency >1, oversized arrays, and >8 repair candidates.
- Two damaged links: test all subsets and a case where a downstream repair alone yields no improvement but the pair does. Confirm optimizer evaluates subsets from the original scenario, not cumulatively.
- Tie test: equal unmet chooses cheaper cost, then fewer actions, then lexicographic IDs. A no-benefit repair loses to empty set. No candidates, unaffordable actions, zero budget, and zero-cost repair are explicit cases.

## UI and API checks

Select tank/channel with pointer and keyboard; toggle condition; Run; change input and verify stale label; Optimize; Apply; Compare; Reset. Confirm affected village labels use computed unmet deltas. Policy toggle changes allocation values in low-rain case. Exported JSON matches current visible results and includes assumptions/limitations. Check labels, focus, screen-reader names, status text, reduced motion, 320/768/1280 px layouts, scroll and React Flow controls.

For optional `/api/diagnose`, test valid extraction, unknown channel, invalid provider JSON, missing API key, timeout/quota, oversized text, forged IDs, and prompt-injection text. All failures leave the scenario untouched and offer the manual form. Do not assert provider wording; mock provider responses at the server boundary.

## Deployment smoke

On the selected host (Vercel or Render), open `/`, `/parampara`, `/about`; load the sample; block `b-c`; observe the 500 L/1,000 L shortage case; optimize at ₹12,000; apply; observe 1,500 L/0 unmet; export; reload without a key and repeat the manual flow. If Groq is enabled, test one confirmed extraction and one missing-key/provider-error fallback. Check browser console and server logs for errors and ensure no secret appears in client bundles or responses. Only report these checks as passed after executing them.
