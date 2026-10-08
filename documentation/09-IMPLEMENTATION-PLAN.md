# 09 — Five-hour implementation plan

[Requirements](02-PRODUCT-REQUIREMENTS.md) · [Architecture](03-SYSTEM-ARCHITECTURE.md) · [Tests](10-TESTING-AND-VALIDATION.md)

## Build sequence

This schedule assumes one developer with AI-assisted coding, a fresh Next.js template, an already prepared fixture, and no prolonged deployment outage. Times include integration; the optional AI feature is deliberately last. File paths are ownership boundaries so parallel contributors can work on typed contracts without editing the same module. All work remains in one application; “parallel” here means separable implementation tasks, **not** runtime agents.

| Time | Priority | Owner files / task | Deliverable and checkpoint |
| --- | --- | --- | --- |
| 0:00–0:30 | Must | `package.json`, `src/app/*`, `src/lib/model.ts`, `validation.ts`, `fixture.ts` | App boots, fixture passes Zod/cross-reference/DAG checks; simple `/` displays fixture names. |
| 0:30–1:30 | Must | `src/lib/simulation.ts`, `simulation.test.ts` | Pure engine and exact intact/blocked conservation tests pass **before** UI or AI work. |
| 1:30–2:05 | Must | `src/lib/optimization.ts`, `optimization.test.ts` | Exhaustive subset search, budget/tie/no-candidate tests pass; input frozen in tests. |
| 2:05–3:20 | Must | `src/components/workspace/*`, `network/*`, `results/*` | Network selection, edit/run/optimize/apply/reset flow; visible stale-state and computed comparison. |
| 3:20–3:45 | Must | `src/app/parampara/page.tsx`, `about/page.tsx`, report component | Context/limits, JSON or print export, source links. |
| 3:45–4:25 | Must | UI polish, responsive/accessibility checks, `npm run test`, `npm run build` | Desktop/mobile usable; no core numerical regression. |
| 4:25–5:00 | Must first; optional if time | Deploy to selected host (Vercel or Render) and smoke; then `src/app/api/diagnose/route.ts` and confirmation UI only if core done | Public demo with manual workflow; optional Groq extraction if key/quota/time permit. |

## Integration rules

Freeze the interfaces in [data models](05-DATA-MODELS.md) at 0:30. Engine contributors can work independently of React components; UI can render fixture and mock typed results until engine checkpoint, but must remove mocks before deployment. The optimizer imports the finished engine; it does not duplicate equations. AI route only produces proposals. Integrate at 1:30 (engine fixture output), 2:05 (optimizer contract), 3:20 (full workflow), and 4:25 (test/build/demo rehearsal). One person owns edits to shared `model.ts` after 0:30 to avoid contract drift.

## Cut order and definition of done

If late, omit AI first, then animation, then printable styling (keep JSON export), then policy comparison visualization (keep the policy switch and numerical table). Preserve simulation, broken-link comparison, repair budget search, disclaimer, and report. A deployed demo that reliably performs the primary flow is more valuable than unfinished extras. Never cut validation, balance checks, or source/assumption labels. Completion means all **M** requirements in [requirements](02-PRODUCT-REQUIREMENTS.md) pass, build succeeds, and the selected host's smoke checks work without Groq. Record any skipped O feature honestly in README at implementation time.
