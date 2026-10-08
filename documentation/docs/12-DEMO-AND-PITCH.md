# 12 — Demo and pitch

[Overview](01-PROJECT-OVERVIEW.md) · [Fixture](05-DATA-MODELS.md) · [Simulation](06-SIMULATION-ENGINE.md)

## Thirty-second pitch

“Tamil Nadu's traditional Eri tanks show how connected storage and channels can help share water across a landscape. When a channel is blocked, a local repair decision can affect villages farther downstream. JalSaarthi X turns that idea into a small executable model: break a link, calculate the water balance, test affordable repairs, and see the result for each community. The numbers are reproducible outputs from an illustrative scenario, not AI guesses or field measurements.”

## Sixty-second interactive demo

1. Open `/` with the illustrative four-tank network visible. Say that all volumes/costs are demo assumptions.
2. Click **Run baseline**: show computed 1,500 L delivered, 0 L unmet, and 3,500 L final storage.
3. Select B→C, set **Blocked**, and run: show 500 L delivered, 1,000 L unmet at Villages C and D, and 2,500 L external spill at B.
4. Enter ₹12,000 and click **Find repairs**: one eligible repair, `repair-b-c`, meets budget and removes all unmet demand in this case.
5. Click **Apply**, then show the paired comparison and balance residual 0. Point to `/parampara`: cascade inspiration, clear model assumptions, and sources.

Do not quote a metric before the working app displays it. If implemented values differ, investigate the engine/test mismatch and use the actual verified results.

## Three-minute detailed sequence

0:00–0:35 frame the maintenance question and Eri connection. 0:35–1:15 inspect Tank A, its rainfall/runoff formula, and directed links. 1:15–1:55 break B→C and explain why B's surplus is externally spilled while C/D demand goes unmet. 1:55–2:25 enter budget, explain exhaustive feasible subset search and deterministic tie breaks. 2:25–2:45 apply repair and show per-village before/after plus exact conservation. 2:45–3:00 show household-first toggle, optional diagnosis proposal/manual fallback, and limits. Export the JSON or print view if time allows.

## Why this is different

The knowledge-system contribution is a directed storage-and-overflow abstraction inspired by traditional tank cascades, paired with an explicit local-allocation rule. The engineering contribution is a testable counterfactual water balance and budget search. Architecture is one browser-run pure TypeScript engine and optimizer inside Next.js, plus an optional server proxy for text extraction. AI never fabricates hydrology. Sustainability relevance is better discussion of repair priorities; real impact requires measurement and local governance, which the MVP does not claim.

## Likely difficult questions

| Question | Credible answer |
| --- | --- |
| “Is this based on a real village?” | No. The topology, volumes, demands, and costs are explicitly illustrative. The Eri and maintenance context is sourced; field use requires surveyed inputs and validation. |
| “Does the model conserve water?” | Yes within its simplified boundary: initial storage plus runoff equals delivered plus final storage plus channel loss plus external spill. Golden tests expect residual 0. It does not model evaporation, infiltration, or delayed flows. |
| “Why use AI at all?” | Only to turn a short defect note into an editable proposal. The deterministic engine produces every numerical outcome; the manual path works without AI. |
| “How do you know the chosen repair is best?” | For ≤8 eligible actions, all feasible subsets are simulated with the same input, ranked by unmet demand, cost, action count, and ID. This is optimal only for the stated one-step model and objective. |
| “Will it improve real water availability or fairness?” | We make no such claim. The model can reveal trade-offs in an example. Site measurements, hydraulic analysis, operating rules, community agreement, and expert review are needed before decisions. |

## Fallback and future scale

If Groq fails, use manual controls. If the selected host is unavailable, run the local build and show preverified test output, while clearly distinguishing it from a deployed demo. After the MVP, use measured topology, rainfall series, calibrated losses, multi-period storage, and locally chosen rules. Distinct traditional systems such as johads, khadins, tankas, and baolis would need separate domain models; they are not drop-in substitutes for this cascade.
