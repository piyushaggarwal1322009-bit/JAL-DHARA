# Backend boundary and API contract

[Architecture](03-SYSTEM-ARCHITECTURE.md) · [AI integration](08-AI-INTEGRATION.md) · [Data models](05-DATA-MODELS.md) · [Deployment](11-DEPLOYMENT.md)

## Backend boundary

The backend is part of the Next.js application; it does not need a separate service. Simulation and optimization run through server routes using the same validated deterministic library as the browser. Groq remains an optional server-side report extraction feature. Map field records are saved in browser storage and exported as JSON/CSV. This release has no database, sign-in, or cross-device sync; add authenticated database persistence before offering shared workspaces or storing user data centrally.

## Route inventory

| Route | Runtime | Responsibility |
| --- | --- | --- |
| `GET /` | Browser-facing Next.js page | Scenario editor and results display. |
| `GET /parampara` | Next.js page | Eri explanation, sources, assumptions. |
| `GET /about` | Next.js page | Methodology and limits. |
| `POST /api/diagnose` | Next.js Node route, optional | Groq text extraction into an unconfirmed, validated proposal. |
| `GET /map` | Next.js page | Map-based, source-attributed field data entry. |
| `POST /api/simulate` | Next.js Node route | Validate a scenario and compute its result on the server; request capped at 64 KB. |
| `POST /api/optimize` | Next.js Node route | Validate a scenario and INR budget and compute repair options; request capped at 64 KB. |

Browser and server use the same deterministic simulation/optimization library. The APIs do not use Groq to produce numeric results. Do not make a public endpoint that returns fabricated results or accepts arbitrary provider-produced volumes.

## `POST /api/diagnose` contract

Request JSON: `{ "text": "The B to C channel is blocked; budget ₹12,000." }`. Accept UTF-8 JSON only, body ≤4 KB, trimmed text length 1–1000 characters. Load allowed tank, channel, and village labels from the canonical fixture on the server. Do not accept client-provided allowlists. Return `200` with `{ "proposal": AIExtractedReport, "requiresConfirmation": true }`; the exact `AIExtractedReport` type is in [data models](05-DATA-MODELS.md). Use error JSON `{ "code": string, "message": string }` with `400 INVALID_REQUEST`, `502 INVALID_PROVIDER_OUTPUT`, or `503 AI_UNAVAILABLE`; map provider timeout/quota to `503` without exposing raw response. An HTTP 429 from Groq is an upstream quota event; the UI displays manual fallback.

## Handler sequence

```text
1. Reject unsupported method/content type or oversized body.
2. Parse and Zod-validate { text }.
3. If GROQ_API_KEY is absent, return 503 AI_UNAVAILABLE.
4. Load canonical IDs/names from fixture and construct one constrained extraction prompt.
5. Call Groq chat completions with the configured model, strict JSON schema,
   temperature 0, short timeout, no streaming or tools.
6. Check provider refusal/empty content, parse JSON, then Zod-validate every field.
7. Cross-check IDs and unknown fields against the canonical fixture.
8. Return the proposal; do not mutate any scenario or run engineering logic.
```

The strict JSON schema must require all fields of `AIExtractedReport` and set `additionalProperties: false`; `channelId` and `budgetINR` can be `null`. Zod validation remains mandatory because a well-shaped response can still contain unknown IDs or implausible values. The browser presents an editable confirmation sheet; **only user confirmation** maps the proposal into local form state. The route never stores reports or sends messages elsewhere.

## Scenario and map persistence

Map records currently live in `localStorage` on the user's device. JSON import/export and CSV export provide backup and transfer. This does not provide server backup, access control, collaboration, or cross-device sync. Before adding shared persistence, select a database and authentication provider, enforce per-user row access, and preserve provenance fields. Never put a database service-role key in browser code.

## Security, observability, and portability

Keep `GROQ_API_KEY` in the server environment on the chosen host and `.env.local` only for local development. Never use `NEXT_PUBLIC_`, expose secrets in errors, or log raw user text. Bound payload and output, set timeout, use a best-effort per-instance throttle, and design for provider 429/5xx failures. Without shared storage, a throttle cannot enforce a global distributed limit; do not claim that it can. Log only status, duration, and a generated request ID if useful. The primary demo must remain available while the route is disabled. [Deployment](11-DEPLOYMENT.md) explains how the same route runs on Vercel and Render.
