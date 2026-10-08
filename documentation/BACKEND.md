# Backend boundary and API contract

[Architecture](03-SYSTEM-ARCHITECTURE.md) · [AI integration](08-AI-INTEGRATION.md) · [Data models](05-DATA-MODELS.md) · [Deployment](11-DEPLOYMENT.md)

## Why there is no separate backend service

The MVP does **not** need a standalone backend repository or server. The browser runs the deterministic simulation, optimizer, and report generation from validated local data. The only server-side concern is keeping an optional Groq API key private while extracting a proposed defect report. A Next.js App Router route handler supplies that thin backend within the same application. Vercel runs it as a function; Render runs the same app as a Node web service. No database or persistent user session is required.

## Route inventory

| Route | Runtime | Responsibility |
| --- | --- | --- |
| `GET /` | Browser-facing Next.js page | Workspace and local pure computations. |
| `GET /parampara` | Next.js page | Eri explanation, sources, assumptions. |
| `GET /about` | Next.js page | Methodology and limits. |
| `POST /api/diagnose` | Next.js Node route, optional | Groq text extraction into an unconfirmed, validated proposal. |

There is no `/api/simulate` or `/api/optimize`: both are pure local functions. Do not make a public endpoint that returns fabricated results or accepts arbitrary provider-produced volumes.

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

## Security, observability, and portability

Keep `GROQ_API_KEY` in the server environment on the chosen host and `.env.local` only for local development. Never use `NEXT_PUBLIC_`, expose secrets in errors, or log raw user text. Bound payload and output, set timeout, use a best-effort per-instance throttle, and design for provider 429/5xx failures. Without shared storage, a throttle cannot enforce a global distributed limit; do not claim that it can. Log only status, duration, and a generated request ID if useful. The primary demo must remain available while the route is disabled. [Deployment](11-DEPLOYMENT.md) explains how the same route runs on Vercel and Render.
