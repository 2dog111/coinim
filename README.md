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

`tests/browser.mjs` uses the owner's isolated Playwright runtime and checks Chromium at 360, 390, 430, 768 and 1440px. `QA_WIDTHS` can narrow a diagnostic run. Adapt its runtime and executable paths on another machine. `QA_URL` selects a different deployment. Screenshots and synthetic provider responses are ignored under `qa-artifacts/`.

## Structure

- `app/page.tsx`, `app/home.tsx`, `app/trade-artifacts.tsx`, `app/globals.css`: three-section conversation-first homepage, compact constraint editors, central workspace, comparisons and safe Markdown.
- `lib/trade.ts`: schemas, one versioned brief, Decimal calculations, calendar deadlines, conservative explicit-input extraction and conflict checks.
- `lib/plan.ts`: full-precision hypothetical call thresholds, independent example calendar, route-fit assessment, conditional exit plan and readable plan snapshot.
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


## Conditional plans (Prompt 2)

The homepage example has independent state and four selectable price scenarios. Its initial scenario is +20%; this does not change the example's +50% thesis or the visitor's target. Sections two and three share one example with a date-only UTC start and a six-calendar-month deadline. Loading it into a nonempty workspace requires confirmation.

Available capital and the user's explicitly intended spot commitment are separate inputs. A stated purchase amount does not silently become available capital. The user may adopt a reason to reconsider in Assumptions or explicitly state it in chat. The model cannot adopt its own proposal. All market evidence remains unverified.

Call break-even and the valid upside crossover use Decimal arithmetic at 60 significant digits. Crossover equality can be evaluated as an exact numerator/denominator ratio; only display values are rounded. The helper is restricted to the hypothetical linear USD, zero-fee example. No valid upside crossover, invalid inputs and nonzero fees are handled explicitly. Real instruments still require verified contract terms and a premium.

Copy plan produces a timestamped plain-text snapshot of current assumptions, deterministic scenarios, data provenance and exit conditions. It excludes chat transcripts. Edits cancel pending analysis, mark previous narrative as stale, and recalculate the persistent artifacts locally. Transport failures preserve server-validated brief updates. Financial figures and dates appear only in deterministic artifacts. The real model provides prose; the stream buffers each line and rejects detected numeric claims before publishing that line. A rejected explanation leaves the calculated plan available. This is a presentation boundary, not a semantic truth verifier. Gemini uses low reasoning effort and temperature 0.2; a real smoke test is required after changing its instructions.

## Conversation-first interface (Prompt 3)

The first screen asks for one thought and exposes budget, deadline and loss limit as three compact editors. Budget and risk begin unknown; the six-month deadline is marked as a default. Formatted currency input is parsed without converting a cleared field to zero. Loss has both a native range input and exact dollar entry; lowering the budget does not silently change accepted risk.

The homepage scenario uses an independent −50% to +100% explorer with exact entry and presets. It reuses the Decimal-backed spot/call engine and does not modify the user's brief or call the model. The central workspace replaces the former side dialog: returning to the homepage preserves the draft, local edits immediately update calculations, and one explicit update action refreshes model prose.

The supplied standalone design package informed layout and interaction only. Its disconnected assistant was not copied. The application retains the real server-side provider, validation, source states, stale-response protection, bounded history, safe Markdown and readable plan export.

The question box is the dominant first-screen object. Budget and maximum loss have visible sliders and exact entries; the loss slider works before a budget is entered. Exit choices and the date field are visible alongside them. Additional fields remain visible below the primary action. On the result screen, history scrolls independently above a persistent composer, with deterministic calculations and editable assumptions retained.

The input-first mechanism follows [Perplexity's LLL.bz reference](https://lll.bz/ii/s/perplexity.md). Visitors can type immediately or pick a concrete starter question. The conversation begins with the visitor's question, followed by deterministic numbers and streamed model explanation. The reference's branding, copy and assets are not used.
