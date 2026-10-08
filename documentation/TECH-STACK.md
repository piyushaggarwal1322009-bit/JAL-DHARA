# Tech stack and dependency decisions

[README](../README.md) · [Architecture](03-SYSTEM-ARCHITECTURE.md) · [Backend](BACKEND.md) · [Deployment](11-DEPLOYMENT.md)

## Single-app stack

| Layer | Choice | Why / boundary |
| --- | --- | --- |
| Application | Next.js App Router | One codebase for site pages and Node API routes. |
| Language | TypeScript, strict mode | One shared domain contract from fixture to UI and pure engines. |
| UI | React state/useReducer, Tailwind CSS | Compact workspace without a global-state package. |
| Components/icons | Selective shadcn/ui and Lucide React | Accessible controls and consistent small icons; avoid a large component framework. |
| Network canvas | `@xyflow/react` | Selectable directed tank/channel graph; domain state stays outside canvas internals. |
| Motion | Framer Motion, optional | Restrained state transitions; honor reduced motion. |
| Validation | Zod | Parse fixture, form snapshots, API input, and provider output at boundaries. |
| Engine | Pure TypeScript functions called by Node API routes | Deterministic water balance and exhaustive ≤8-repair subset search. |
| Map | Leaflet + React Leaflet + OpenStreetMap | User-entered, source-attributed field records; JSON/CSV import/export and local browser storage. |
| Data | Typed illustrative simulation fixture and user-entered map records | No tank-level real dataset, database, or live feed is configured. |
| Optional AI | Groq API via `groq-sdk` | One structured text-to-form proposal, server-side only; manual fallback is mandatory. |
| Tests | Vitest | Golden arithmetic, invariants, optimizer ranking, and validation. |
| Hosting | Vercel **or** Render | Deploy the same Next.js application; only one host is needed for the demo. |

No Python service, Express server, authentication provider, queue, vector database, or AI orchestration framework is part of the MVP. Next.js provides simulation, optimizer, and optional Groq routes. Map records remain local; shared storage and accounts are future work.

## Package boundary

Planned runtime dependencies: `next`, `react`, `react-dom`, `@xyflow/react`, `zod`, `lucide-react`, `groq-sdk` **only if diagnosis is implemented**, plus Tailwind and the minimum shadcn/ui peer packages required by selected controls. Add `framer-motion` only if meaningful transitions survive the five-hour cut. Development dependencies: `typescript`, React/Node type packages, `vitest`, Tailwind/PostCSS tooling, and a DOM test library only if UI automation is written. Install with the package manager, commit its lockfile, and avoid mixing npm/yarn/pnpm lockfiles. Do not pin speculative versions in documentation; choose mutually compatible maintained releases during implementation and record exact resolved versions in the lockfile.

## Environment and runtime

`GROQ_API_KEY` is an optional server secret. `GROQ_MODEL` defaults to `openai/gpt-oss-20b`, subject to provider availability and the free-plan limits documented by [Groq](https://console.groq.com/docs/rate-limits). Never prefix the key with `NEXT_PUBLIC_`. The app must build and run without either variable. Use a supported Node.js LTS for both hosts; declare a compatible `engines.node` range in `package.json`. Do not configure Next.js `output: 'export'` if `/api/diagnose` is included. [Deployment](11-DEPLOYMENT.md) has exact Vercel and Render paths.

## Version and change discipline

At implementation time, verify current Next.js/React compatibility, the `@xyflow/react` API, Groq structured-output model support, and host Node support against official documentation. Run `npm ci`, `npm run test`, and `npm run build` with the committed lockfile before deploy. A changed provider model must pass the API validation tests; a changed simulation dependency must pass the golden numerical tests. No runtime dependency may perform engineering calculations in place of the documented engine.
