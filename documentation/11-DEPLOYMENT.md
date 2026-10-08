# 11 — Deployment on Vercel or Render

[Architecture](03-SYSTEM-ARCHITECTURE.md) · [Backend](BACKEND.md) · [AI integration](08-AI-INTEGRATION.md) · [Smoke tests](10-TESTING-AND-VALIDATION.md)

## Status and prerequisites

The repository contains a Next.js application with the workspace, field map, and API routes. It can be deployed as a Node application on either Vercel or Render.

Use one supported Node.js version consistently in local development, Vercel, and Render; the project declares `engines.node`. Scripts: `dev`, `build`, `start`, `test`, and `typecheck`. Local commands: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run dev`. API routes use the **Node runtime**; do not set `output: 'export'` because a static export cannot host `/api/diagnose`, `/api/simulate`, or `/api/optimize`.

The core app requires **no environment variable**. Optional diagnosis uses `GROQ_API_KEY` and `GROQ_MODEL` (default `openai/gpt-oss-20b`). Put local values in `.env.local`, which must be gitignored. Never use a `NEXT_PUBLIC_` prefix for the key. Map field records are saved in each browser and do not sync to the host. Verify current model availability, strict JSON-schema support, and free-plan quota from [Groq's documentation](https://console.groq.com/docs/models) and [rate limits](https://console.groq.com/docs/rate-limits); quota and pricing may change.

## Vercel path

1. Push the implemented repository to a Git host and import it into Vercel with the detected **Next.js** framework preset. Keep the project root at the repository root. Vercel documents [Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs).
2. Use the committed npm lockfile; the expected build is `npm run build`. Add `GROQ_API_KEY` and optional `GROQ_MODEL` to the project's **server** environment only if diagnosis is included. Redeploy when changing server environment values; see [Vercel environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables).
3. Check `/`, `/parampara`, `/about`, and (if enabled) `POST /api/diagnose`. Run the full [smoke test](10-TESTING-AND-VALIDATION.md). The manual flow must work with the key absent.

## Render path

1. Push the same implemented repository and create a **Node Web Service**, not a Static Site, because the Next.js route performs server-side work. Render's [Next.js guide](https://render.com/docs/deploy-nextjs-app) distinguishes these modes.
2. Set root directory to repository root, build command `npm ci && npm run build`, start command `npm run start -- -p $PORT`, and a supported Node version. The start command is for Render's Linux shell; `$PORT` is its injected listening port. Select the free plan only after checking its current limitations.
3. Add `GROQ_API_KEY` and optional `GROQ_MODEL` under the service's Environment settings if diagnosis is included; [Render documents environment variables](https://render.com/docs/configure-environment-variables). Deploy, then run the same smoke test.

Optional `render.yaml` blueprint once code exists:

```yaml
services:
  - type: web
    name: jalsaarthi-x
    runtime: node
    plan: free
    buildCommand: npm ci && npm run build
    startCommand: npm run start -- -p $PORT
    envVars:
      - key: GROQ_MODEL
        value: openai/gpt-oss-20b
      # Add GROQ_API_KEY as a secret in the Render dashboard.
```

Do not commit a key or a fabricated deployment URL. The blueprint is a template, not a deployed service. Render [free web services](https://render.com/docs/free) currently spin down after inactivity and can have a slow first request; rehearse the judge demo before presenting. This is a hosting characteristic, not a simulation error.

## Troubleshooting and security

If build fails, resolve TypeScript/server-client import mistakes, Next.js version/Node mismatch, and Zod schema drift. If the canvas is blank, check React Flow container height and client component boundary. If conservation fails, inspect rounding, channel loss, and external-spill accounting; do not suppress the invariant. If `/api/diagnose` fails, confirm the key exists on the **same chosen host**, the model supports strict schema output, and provider quota is available; use manual controls meanwhile. Avoid logging narratives, bound body and output sizes, and keep secret access in `src/app/api/diagnose/route.ts` only. JSON/print export is generated locally and remains an illustrative report, not engineering approval.
