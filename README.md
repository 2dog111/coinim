# coin.im

An English crypto trade-planning assistant: shared trade brief, deterministic decimal spot/cash scenarios, a hypothetical linear USD call at expiry, and a real server-side streaming language-model adapter. No database, account, wallet connection, execution or conversation persistence.

## Local setup

Requires Node.js 22.23 or later and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev -- --port 3216
```

Open http://127.0.0.1:3216. Remove `PUBLIC_ORIGIN` from `.env.local` for local development. The calculator works with empty provider variables. AI chat returns a typed `NOT_CONFIGURED` state until `LLM_API_KEY`, `LLM_MODEL`, and `LLM_BASE_URL` are set.

The provider must support the OpenAI-compatible chat-completions SSE wire format. `LLM_BASE_URL` ends before `/chat/completions`. `LLM_AUTH_MODE=google-key` sends `x-goog-api-key`; otherwise bearer authorization is used. `LLM_REASONING_EFFORT` is optional and must be supported by the selected model. Production uses a probe-verified Vertex endpoint and `google/gemini-3.5-flash`; secrets stay in `/etc/coin-im-planner/planner.env` and are never bundled or committed. `PUBLIC_ORIGIN=https://coin.im` and `TRUST_PROXY=1` apply only behind the supplied Nginx configuration, which overwrites client IP headers.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start -- --port 3216
```

`tests/browser.mjs` uses the owner's isolated Playwright runtime and checks desktop and narrow Chromium layouts. Adapt its runtime and executable paths on another machine. `QA_URL` selects a different deployment. Screenshots and synthetic provider responses are ignored under `qa-artifacts/`.

## Structure

- `app/page.tsx`, `app/globals.css`: two-section homepage, form, comparisons, accessible native modal chat and safe Markdown.
- `lib/trade.ts`: schemas, one versioned brief, Decimal calculations, calendar deadlines, conservative explicit-input extraction and conflict checks.
- `lib/server.ts`: bounded request/history parsing, origin checks, rate/concurrency limits, timeout/cancellation and streaming provider adapter.
- `app/api/{analyze,chat,status}`: server endpoints. Status exposes availability booleans only.
- `tests/trade.test.ts`: financial, state, provenance and server boundary checks.
- `docs/PRODUCT_SPEC.md`: owner's specification.
- `scripts/deploy/`: systemd/Nginx configuration and the legacy retirement archive procedure.

## Calculation scope and limits

Percentage-based spot scenarios include entry and exit fees inside the committed amount. The smaller position commits the lesser of capital and the stated loss budget. Unknown tolerance stays unknown; zero tolerance gives zero market exposure. Cash has zero market PnL without assumed interest. Platform, custody, currency and tax risks are outside the calculation.

The worked call is hypothetical, linear, USD-denominated and valid only at expiry. Changing the example asset removes its imaginary quote. No live market adapter is connected. Executable options need verified contract terms, multiplier, settlement currency, fees and quotes. Event contracts need matching settlement rules and execution prices; touch and close conditions are not interchangeable. Staged entry needs a price path or explicit fills.

Chat can update explicitly stated budget, loss, target, recognized ticker and calendar-month horizon through conservative parsing. Ambiguous changes require clarification or editing the form. It cannot write verified quotes or engine results. Narrative model output remains interpretation; numerical comparisons are rendered separately from the engine. The in-memory rate limiter is designed for one Node process; multiple replicas require a shared limiter. No raw conversations or financial notes are logged by the app.

## Deployment

See `DEPLOY.md` and `PROGRESS.md` for the verified release and checks. The existing Git history is retained as the parent of the rebuild. No old product is served by the new application; old endpoints return 404. Existing legacy records and keys are preserved separately from retired code.

Protocol references: [Next.js self-hosted application setup](https://nextjs.org/docs/app/getting-started/installation), [Google Chat Completions compatibility](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library).
