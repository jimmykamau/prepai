<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (16.2.6) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# PrepAI

One-page MVP that takes a job title and returns three role-specific interview questions via an LLM. Hosted on Vercel.

See `PROJECT_CONTEXT.md` for the product brief, the Stitch design source, and the decisions captured during scoping.

## Commands

| Task | Command |
|-|-|
| Dev server (Turbopack) | `npm run dev` |
| Production build | `npm run build` |
| Production start | `npm run start` |
| Lint | `npm run lint` |
| Generate route types only | `npx next typegen` |

No test runner is configured yet.

CI runs `npm run lint` then `npm run build` on every push and on PRs to `main` (see `.github/workflows/ci.yml`). Node 24, npm caching.

## Architecture

Single Next.js 16 App Router page that orchestrates a small client state machine and one server route.

```
app/
├── layout.tsx              fonts (Geist display + Inter body), html shell
├── page.tsx                "use client" — landing form ↔ results view in one component
├── globals.css             Tailwind v4 + @theme tokens (Cognitive Professional)
└── api/questions/route.ts  POST: validate body → verify Turnstile → call OpenRouter

lib/
├── schema.ts               zod schemas: JobTitleInput + QuestionsSchema (3 items, enum category)
├── ai.ts                   provider dispatch (openrouter|google) + generateObject() call
└── turnstile.ts            siteverify wrapper; no-op when TURNSTILE_SECRET_KEY unset
```

Key flow: the client POSTs `{jobTitle, turnstileToken?}` to `/api/questions`. The route validates with `JobTitleInput`, calls `verifyTurnstile` (which short-circuits to OK when no secret is configured — that's how local dev stays frictionless), then `generateInterviewQuestions` which reads `AI_PROVIDER` to pick OpenRouter or Google, then runs AI SDK's `generateObject` with `QuestionsSchema` so the response is always exactly three `{question, category, rationale}` items or the route returns 502.

The page only renders the `<Turnstile>` widget when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set in the build env — there is no separate "captcha off" code path; absence of the public key is the off switch on the client, absence of the secret is the off switch on the server.

## Env vars

See `.env.example`. Three groups:
- `AI_PROVIDER` (optional, defaults to `openrouter`). Selects which block below is required.
- OpenRouter (`OPENROUTER_API_KEY` required, `OPENROUTER_MODEL` optional → `anthropic/claude-sonnet-4.5`).
- Google AI Studio (`GOOGLE_GENERATIVE_AI_API_KEY` required, `GOOGLE_MODEL` optional → `gemini-2.5-flash`).
- Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`, both optional; either is a no-op without the other in its layer).

For Vercel: `vercel env add OPENROUTER_API_KEY production`, etc. The Vercel CLI is not installed by default in this repo — `npm i -g vercel` to unlock.

## Design system

Tokens come from the Stitch "Cognitive Professional" design system (project `5645027595053377922`). The mapping lives in `app/globals.css` under `@theme inline`:

| Token | CSS var | Tailwind utility |
|-|-|-|
| Surface (slate-50) | `--surface` | `bg-surface` |
| Card (white) | `--card` | `bg-card` |
| Primary text (deep slate) | `--primary` | `text-primary` |
| Secondary text | `--muted` | `text-muted` |
| Accent (indigo) | `--accent` | `bg-accent` / `text-accent` |
| Success (emerald) | `--success` | `text-success` |
| Outline (slate-200) | `--outline` | `border-outline` |

The `.ai-card` utility (in `globals.css`) is the standard container. Add `data-ai="true"` to apply the indigo→emerald gradient hairline border called out in the design system as the "AI Feedback Block" treatment.

Headings use `font-display` (Geist); body text inherits Inter from `<body>`. Both are wired via `next/font/google` in `app/layout.tsx`.

## Conventions

- Schema-validated structured output via `generateObject`. Do not parse free-form text from the LLM — extend `QuestionsSchema` in `lib/schema.ts` instead.
- Server-only secrets (`OPENROUTER_API_KEY`, `TURNSTILE_SECRET_KEY`) must never be referenced from `app/page.tsx` or other client components. Anything client-readable must be prefixed `NEXT_PUBLIC_`.
- The API route is pinned `runtime = "nodejs"` and `dynamic = "force-dynamic"` because every call is unique per job title.
- Tailwind v4 — no `tailwind.config.ts`. Add new design tokens by extending `@theme inline { ... }` in `app/globals.css`.
