# 03 — System architecture

[Requirements](02-PRODUCT-REQUIREMENTS.md) · [Models](05-DATA-MODELS.md) · [AI boundary](08-AI-INTEGRATION.md)

## One application, explicit boundaries

```mermaid
flowchart TB
  subgraph Browser
    Page[App Router / client workspace] --> Editor[Scenario editor + React state]
    Editor --> Validate[Zod validation]
    Validate --> Sim[simulate(input): SimulationResult]
    Validate --> Opt[optimize(input, budget): OptimizationResult]
    Opt --> Sim
    Sim --> View[React Flow + result panels + export]
  end
  Page -. optional report text .-> Route[POST /api/diagnose]
  Route --> ServerCheck[Size/rate checks + Zod]
  ServerCheck -. key stays server .-> Provider[Groq API]
  Provider --> ServerCheck
  ServerCheck -. proposal only .-> Page
```

`src/lib/simulation.ts` and `optimization.ts` have no React, network, clock, random, or mutable global state. `simulate(input)` receives a validated immutable snapshot and returns a new result. `optimize(input,budgetINR)` clones candidate scenario states, calls `simulate`, and returns ranked IDs and result. `src/lib/validation.ts` owns schemas and graph checks. UI components receive typed values and callbacks. The selected React Flow element is a UI selection, not domain state.

## Client state and invocation

Use `useReducer` in the workspace (Zustand adds little for one screen). State: editable scenario, selected element ID, input errors, last committed run `{input,result}`, optional comparison snapshot, recommendation, and diagnosis draft. On **Run**, validate a deep plain-data snapshot and call `simulate` synchronously; display only its result. Any edit marks results “Inputs changed—run again” and invalidates the recommendation. On **Optimize**, validate current snapshot/budget and call `optimize`; show recommendation without applying it. On **Apply**, create a new scenario with chosen states, then run and store a paired before/after comparison using the same rainfall, starting storage, demand, and policy. **Reset** restores the fixture. JSON report serialization uses the last paired snapshots, never recomputes during rendering.

## Server boundary

Only `/api/diagnose` needs server execution, and only if optional AI is implemented. It accepts a length-limited narrative and known channel/village IDs, calls Groq using a server-only `GROQ_API_KEY`, validates structured output, and returns an **unconfirmed proposal**. The browser shows proposed fields for user confirmation before any edit. The server never runs the water engine and never accepts an AI-produced flow, capacity, cost, or efficiency as authoritative. Reject requests over the documented size, return structured errors, and use a modest per-instance throttle if practical; free-tier deployments cannot guarantee a global quota without persistent storage. This Next.js route is the entire MVP backend boundary; see [Backend](BACKEND.md).

## Data flow, errors, security

Fixture JSON → Zod parse + cross-reference/DAG check → edit snapshot → pure run or subset search → React presentation → local export. Validate again at each engine entry even if the form validates. Show actionable errors for invalid graph; never display stale results as current. React escapes input by default; render narratives as text, not HTML. AI route treats prompt text as untrusted, limits size, and keeps key server-side. No login or database is needed because scenarios are ephemeral and the only optional secret remains on the server. A database would add deployment burden without supporting a must-have requirement.

## Planned source boundaries

| Area | Owns | Must not own |
| --- | --- | --- |
| `src/lib/model.ts` + `validation.ts` | Types, Zod, graph checks | UI rendering |
| `src/lib/fixture.ts` | One illustrative scenario | live data |
| `src/lib/simulation.ts` | Deterministic water balance | provider calls, UI state |
| `src/lib/optimization.ts` | Repair subset enumeration and tie breaks | mutation of input |
| `src/components/workspace/*` | Forms, controls, orchestration | alternative calculations |
| `src/components/network/*` | React Flow projection and selection | domain storage state |
| `src/app/api/diagnose/route.ts` | Optional extraction proxy | simulation or writes |

See [the build schedule](09-IMPLEMENTATION-PLAN.md) for integration checkpoints.
