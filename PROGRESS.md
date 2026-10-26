# coin.im rebuild

## Objective
Replace the old coin.im product with the English trade-planning assistant specified in the owner's attachment. Publish to the existing domain and GitHub. Keep a verified legacy website backup in Cloudflare R2 before retiring old code. Preserve working data and Git history.

## Confirmed
- New workspace was empty, without commits or remote.
- Legacy repository: 2dog111/coinim, default branch main, public.
- Production host per deployment docs: aiagentiva, 193.181.215.57.
- No Sites hosting, DNS or mail changes are needed.

## In progress
Inspect live deployment and backup targets; implement typed calculator, shared brief, server AI adapter and accessible two-section UI.

## Next
Unit/API/interaction checks, production build, real provider smoke, verified R2 archive, deployment, public checks, old-code cleanup, GitHub push.

## Verification before cutover
- 20 unit/API tests pass; typecheck and lint pass.
- Production builds succeeded locally and on Linux / Node 22.23.2.
- Isolated Chromium desktop 1440x900 and narrow 390x844: form, example loading/invalidation, conflicts, free-text submission, modal focus/Escape, copy, reset, stop/retry and overflow passed with no unexpected console errors.
- Actual Gemini requests succeeded directly, through the local API stream, and in the browser including a follow-up that retained the loss budget.
- Local-source retirement archive verified by R2 download and byte comparison. SHA-256: `6f0e48a2a498009f7db63300522bebdac6ead991b1970145c4a31e0a0e498ead`.
- New server service is running on loopback; status reports calculator/chat available and market data unavailable.

## Next
Complete consistent production retirement archive, switch Nginx, verify public browser/API/chat, clean old code, push replacement to the existing GitHub main branch without rewriting history.

## Public release, 2026-10-26
- Published at https://coin.im/ on aiagentiva, release `20261026-trade-planner-v1`.
- HTTPS homepage and `/api/status` return 200; calculator/chat true, marketData false. Nginx config passed validation. The first immediate post-reload probe reached an old worker and returned 404; subsequent direct-host and public probes returned 200.
- Public Chromium 1440x900 and 390x844 interaction suite passed with no unexpected console errors or horizontal page overflow.
- Production provider smoke: HTTP 200, complete streamed Gemini answer (2,212 characters), no error event.
- Production retirement archive round-trip SHA-256: `6efdc73fb5d3174a39f72273d1968fa45e05b66ac547715f7f01e88f954a59ce`.
- R2 retirement set: `aiagentiva/coin-im-retired/legacy-local-source.tar.gz.enc` and `legacy-production.tar.gz.enc`. Local-source archive 112,724,256 bytes; production archive 14,693,184 bytes. The production SQLite integrity and foreign-key checks passed.
- Old local checkout removed only after clean Git-state, matching history and archive-hash checks. Its Git history is preserved in this repository and the encrypted archive.
- Old server code, runtime environments, background services, previous database backup generations and temporary staging files retired after public verification. Working legacy database, enquiry files and keys remain intact.
- No live quotes, exchange execution, wallet integration, email or Telegram messages were added or sent.
- Narrow Chromium checks are responsive emulation, not an iPhone/Mobile Safari test.

## Completed
- Final source: 21 unit/API tests, TypeScript, ESLint and production build passed.
- Final public Chromium desktop/narrow suite passed. The final real Gemini follow-up returned HTTP 200 and 1,805 answer characters, preserved the $1,000 user loss budget despite a third-party $50,000 reference, and retained the resolved 2027-04-26 deadline.
- The final release is `20261026-trade-planner-v1`; the preceding new-build release and temporary build directory were removed after verification.
- Source is published to the existing GitHub `2dog111/coinim` main branch with `9c84d75` retained in its ancestry. No force push or history rewrite.
- No required provider environment variables are missing on production. Verified external market quotes remain intentionally unconfigured.

## Prompt 2 — implementation and release
Continue the existing application with three homepage sections, an independent interactive example, exact call thresholds, a persistent conditional plan and readable plan export. Preserve real Gemini streaming and safety boundaries. Publish to coin.im and existing GitHub main after checks. No new market-data integration or storage.

Implementation: extend shared typed inputs with an explicitly chosen commitment and user-defined reconsideration condition; distinguish these from available capital. Add full-precision zero-fee hypothetical threshold helpers. Preserve the legacy retirement archive unchanged.

### Prompt 2 progress
- Three-section UI and independent interactive example implemented; confirm-before-replace, typed commitment/reconsideration inputs, deterministic workspace artifacts and plain-text copy implemented.
- All five Chromium widths passed the complete interaction suite, including stale-response cancellation and a shortened visual viewport check. This is not real Mobile Safari/keyboard validation.
- Initial real Gemini late-thesis probe incorrectly offered a deadline extension and overgeneralized call losses. Instructions were strengthened, deterministic late-outcome explanations were added, and reasoning effort changed from minimal to low; final real-provider retest pending.
- Mathematical tests include exact crossover equality and neighbors, invalid/no crossover, fee isolation and partial call losses below the thesis target.

### Prompt 2 ready for deployment
35 tests, typecheck and lint pass. Five-width local browser suite passed. Final real late-thesis retest completed successfully and preserved constraints after instruction/reasoning refinement. Building the final Linux release next; then public matrix, provider smoke, superseded-code cleanup and GitHub push.

### Prompt 2 final release
- Deployed `20261026-conditional-plan-v2-final`; systemd active, loopback/public status healthy, Nginx configuration valid.
- Final local/Linux builds, 36 tests, TypeScript and ESLint pass.
- Numeric hallucination in a real probe led to a line-buffered prose boundary: financial figures stay in engine artifacts, rejected explanations retain the calculated plan. The guard is not a semantic truth verifier.
- Final public real-provider analysis and both target/late follow-ups completed with no stream errors and preserved the loss limit/deadline.
- Final public Chromium suite passed at all five widths with no unexpected console errors or horizontal overflow. The focus assertion waits for the actual scheduled focus callback.
- Superseded server releases and the temporary Linux build directory removed after public verification. The final release is the only application code release on the server; legacy working data and R2 retirement archives remain unchanged.
- Delivering the verified source to the existing GitHub main branch without rewriting history.

## Prompt 3 — local implementation

- Replaced the full questionnaire-first layout with one thought, three compact constraint editors and progressive assumptions. Budget and loss start unknown; the calendar horizon records whether it is still the default or a user choice.
- Added exact-entry loss and scenario sliders, formatted currency parsing, preserved zero/unknown distinctions, and kept all financial outputs in the existing deterministic engine.
- Replaced the modal/right-side chat with a central conversation workspace. Drafts survive home/workspace navigation, edits mark prose stale, and only an explicit update sends a new AI request.
- Used the supplied design package as a visual and interaction reference. Its disconnected prototype was not copied over the live provider integration.
- Local verification: 37 unit/API tests, TypeScript, ESLint and production build pass. Isolated Chromium passes at 360, 390, 430, 768 and 1440px with no unexpected console errors or horizontal overflow. A real local Gemini request completed through the API and through the rendered mobile workspace.
- This Prompt 3 implementation has not been deployed or pushed. The active public release and Cloudflare R2 legacy retirement set are unchanged.

## Compact AI-chat refinement — local

- Reworked the first viewport after owner review: one literal product promise, one AI-style composer, three inline controls and one primary action. The next interactive section now begins inside a normal mobile viewport instead of leaving a decorative blank screen.
- Added a native budget slider and fast presets while retaining exact currency entry, the existing loss slider, deadline segments, unknown-value semantics and explicit user provenance.
- Converted the result screen into a bounded AI workspace: independently scrolling history, persistent bottom composer, compact assumptions and calculations, and no footer or result overlap while chatting.
- Tightened the scenario explorer into a two-column desktop workbench and a task-ordered mobile stack; compressed the exit plan and shared visual hierarchy.
- Local checks: 37 tests, TypeScript and ESLint pass. Isolated Chromium passes the complete interaction suite at 360, 390, 430, 768 and 1440px with no unexpected console errors or horizontal overflow. Real rendered Gemini responses completed with the composer remaining visible and usable.
- This refinement remains local and uncommitted; public coin.im and the R2 retirement set were not changed.

## Reference-led chat redesign — release in progress

- Owner screenshot showed the older live Prompt 2 first screen; the subsequent local refinements had never been deployed.
- Chose Perplexity from `https://lll.bz/ii/s/perplexity.md` as the interaction reference: the working question input leads, with short example prompts and a visible path to an answer. No reference branding or assets were copied.
- Rebuilt the entry around one question, a real input, three optional budget/loss/deadline controls and concrete starter prompts. The result now starts with the user's message, a deterministic calculation, and the streamed AI response in one conversation.
- Local evidence: 37 unit/API tests, TypeScript, ESLint and production build pass; isolated Chromium passes 360, 390, 430, 768 and 1440px with no unexpected console errors or horizontal overflow. A real local Gemini answer completed with the $5,000 budget and $1,000 loss limit preserved; the composer remained usable.
- Next: build on Linux, check the new release before switch, verify public interaction and provider, remove superseded server code, and push the checked source to the existing GitHub main branch.

### Public release and correction

- The first deployed build exposed a natural-language extraction gap: a question stating "$5,000 available" and "$1,000 price-loss limit" left both settings unknown. Expanded the explicit parser, added a regression test and changed the sample question to a supported phrasing.
- Final source and Linux builds, 38 unit/API tests, TypeScript and ESLint passed. Local and public isolated Chromium interaction suites passed at 360, 390, 430, 768 and 1440px with no unexpected console errors or horizontal overflow.
- The final release is `20261026-chat-first-7818a5e`. Its first systemd start failed because the package lacked the `.next/cache` directory required by `ReadWritePaths`; creating that directory restored service. Public homepage and `/api/status` then returned 200, with calculator/chat available and market data unavailable.
- A real public 390px browser run parsed SOL, $5,000 budget, $1,000 price-loss limit and the six-month exit from a single sentence. The first answer completed at 1,311 characters, and the +20% follow-up at 980 characters. Both retained all three constraints and produced no browser errors.
- The final public first-screen screenshots at 390px and 1440px show the question, input, controls and start prompts. Narrow Chromium is responsive emulation, not Mobile Safari.
- Superseded code releases and temporary build directories are removed only after the final public checks; the R2 legacy retirement set and working data are untouched.

## Always-visible trade form — final release

- Removed click-to-expand budget, loss and deadline panels and the optional-details disclosure. Both sliders, exact amount fields, deadline buttons, date input and additional fields remain visible. The loss slider works before a budget is entered. The first-screen copy now explicitly invites a crypto trade question and follow-ups.
- The primary action ends at about 812–813px in clean 360/390×844 Chromium screenshots. The form has no horizontal overflow. Returning to edit during an in-flight response aborts the request so a late answer cannot overwrite changes.
- 39 unit/API tests, TypeScript, ESLint and local/Linux production builds passed. The complete local and public isolated Chromium suite passed at 360, 390, 430, 768 and 1440px with no unexpected console errors or horizontal overflow. This is responsive Chromium, not a real iPhone or Mobile Safari test.
- During public provider QA, Google Vertex returned `429 RESOURCE_EXHAUSTED`; the UI now shows a clear retry state and retains the brief rather than surfacing a generic transport failure. A later real public request completed with HTTP 200, a 1,398-character response and the SOL, $5,000 budget, $1,000 loss limit and three-month exit intact.
- Active release: `20261026-visible-controls-979f712`. The previous release and temporary Linux build directories were removed after public verification. The Cloudflare R2 legacy retirement set and working data were not changed.
