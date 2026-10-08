# 02 — Product requirements

[Overview](01-PROJECT-OVERVIEW.md) · [UI specification](04-FRONTEND-UI-UX.md) · [Tests](10-TESTING-AND-VALIDATION.md)

## Actors and scope

One unauthenticated visitor works with one local, illustrative scenario. The browser holds edits until reset/reload. A report download is local. The optional diagnosis endpoint extracts proposed form values but cannot change the scenario. All requirements marked **M** are required for MVP; **O** can be cut.

| ID | Priority | Requirement and testable acceptance |
| --- | --- | --- |
| M1 | Must | `/` opens with the four-tank fixture, labelled “Illustrative assumptions”; keyboard and pointer users can inspect each tank/channel. |
| M2 | Must | Rainfall and budget inputs reject negative/non-finite values; the UI displays units and validation messages. |
| M3 | Must | Channel control switches functional/blocked; Run uses the current form snapshot and shows the run's input summary. |
| M4 | Must | Pure simulation returns per-village delivered/unmet L, final storage L, transfer/loss/spill L, and a zero balance residual for valid inputs. |
| M5 | Must | Intact vs blocked B→C fixture yields the numerical outputs in [tests](10-TESTING-AND-VALIDATION.md); affected villages are identified from positive increase in unmet demand, not graph reachability alone. |
| M6 | Must | Optimizer considers only eligible damaged channels, never exceeds budget, includes the empty subset, reruns simulation for each subset, and uses documented tie breaks. |
| M7 | Must | Applying a recommendation changes only selected repair states; “Compare” reruns matching input conditions and shows before/after values from engine results. |
| M8 | Must | Toggle household-first vs proportional allocation; both preserve water and never deliver more than demand. |
| M9 | Must | `/parampara` explains Eri cascade and clearly separates sourced statements from model assumptions; `/about` states methodology and limits. |
| M10 | Must | Print/JSON report includes scenario, repair costs, computed before/after metrics, constraints, limits, and source URLs; output matches the visible run. |
| M11 | Must | Desktop/mobile layouts, visible focus, labels, non-color statuses, keyboard controls, and reduced-motion behavior pass the checks in [UI spec](04-FRONTEND-UI-UX.md). |
| M12 | Must | `npm run test` and `npm run build` pass; deployed `/`, `/parampara`, `/about` load without any AI key. |
| O1 | Optional | Groq diagnosis from free text returns a validated proposal and requires confirmation; missing key and errors expose the manual form. |
| O2 | Optional | Restrained transition animation for rerun/repair state changes. |

## User stories

- As a judge, I can break a channel and see exactly which village demands go unmet, so the demonstration is understandable without setup.
- As a planner exploring the example, I can set a repair budget and see why an affordable set wins under the stated objective.
- As a community participant, I can compare household-first and proportional allocation and inspect trade-offs per village.
- As a visitor without Groq access, I can complete the same core flow manually.

## Non-functional rules

Simulation and optimization must be deterministic, side-effect free, and run locally for at most 8 candidates (`≤256` subsets). Invalid input fails clearly; no silent clamping except explicitly defined rounding. No external call is needed for primary flow. Use TypeScript strict mode, Zod boundary validation, semantic controls, and a bounded client workload. The target is a responsive interactive demo on common laptops and phones, not a promised latency benchmark. Store no user reports server-side. Do not log a Groq key or raw private narrative.

## Failure states

Invalid graph/cycle/duplicate ID/capacity/efficiency: prevent run and display validation issue. Empty or disconnected branch: compute zero delivery and explicit unmet demand. No repair candidates or unaffordable actions: recommend empty set and explain. Provider timeout/missing key/malformed response: preserve scenario and use manual form. Out-of-range rainfall/budget: inline error, no stale “new” result. Export before run: disable with explanation.

## Success and definition of done

Product success in the hackathon means a judge can complete the break→simulate→budget→repair→compare flow within 60 seconds, follow the water balance, and see no fabricated field claim. Definition of done is every M row implemented and verified with its cited tests, a deployed smoke pass on the selected host (Vercel or Render), and a report whose numbers match the UI. O rows do not block the MVP. The five-hour cut order is in [the plan](09-IMPLEMENTATION-PLAN.md).
