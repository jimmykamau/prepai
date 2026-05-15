# PrepAI

Type a job title, get three thoughtful interview questions a real hiring manager would ask.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · AI SDK v6 (OpenRouter or Google AI Studio) · Cloudflare Turnstile (optional) · Vercel.

## Local dev

```bash
cp .env.example .env.local
# fill in OPENROUTER_API_KEY (default) or set AI_PROVIDER=google + GOOGLE_GENERATIVE_AI_API_KEY
npm install
npm run dev
```

Open http://localhost:3000 and submit "Customer Success Manager".

## Configuration

| Variable | Required | Default | Purpose |
|-|-|-|-|
| `AI_PROVIDER` | no | `openrouter` | `openrouter` or `google` |
| `OPENROUTER_API_KEY` | when provider=openrouter | — | https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | no | `anthropic/claude-sonnet-4.5` | Any OpenRouter model slug |
| `GOOGLE_GENERATIVE_AI_API_KEY` | when provider=google | — | https://aistudio.google.com/apikey |
| `GOOGLE_MODEL` | no | `gemini-2.5-flash` | Any Gemini model id (`gemini-2.5-pro`, etc.) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | no | — | When set, renders the Turnstile widget |
| `TURNSTILE_SECRET_KEY` | no | — | When set, verifies the token server-side |

To smoke-test the Turnstile path locally, use Cloudflare's always-passing test keys: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`, `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`.

## Deploy

```bash
npm i -g vercel
vercel link
vercel env add OPENROUTER_API_KEY production
vercel --prod
```

> **Abuse warning.** The MVP has no built-in rate limiting. If you deploy
> publicly without Cloudflare Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` +
> `TURNSTILE_SECRET_KEY`), anyone who finds the URL can drive arbitrary
> spend against your configured LLM provider key by hitting `/api/questions`
> repeatedly. Always enable Turnstile in production, or front the deployment
> with an external WAF / per-IP limiter.

See `AGENTS.md` for architecture and `PROJECT_CONTEXT.md` for product context and design-system source.
