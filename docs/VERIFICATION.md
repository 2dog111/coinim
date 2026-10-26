# Verification — 2026-10-26

## Automated

21 unit and API boundary tests pass. TypeScript, ESLint and production build pass. Linux production compilation uses Node 22.23.2; local checks use Node 26.5.1. Financial arithmetic uses Decimal, with zero and nonzero fee cases, unknown/zero loss budgets, full-size conflicts, call expiry payoffs, quote invalidation and persistent calendar deadlines.

The server rejects unknown quote/calculation fields, cross-origin requests and invalid payloads. Tests verify typed missing-credential errors, deterministic recalculation, clarification before provider requests, risk preservation and rejection of negated or third-party risk instructions. Markdown renders without HTML, active links or remote images. No secrets appear in the staged application files; this pattern check is not a full historical Git audit.

## Browser

Isolated Chromium 151.0.7922.34 at 1440×900 and 390×844 checked the actual page, form controls, empty/free-text submissions, example loading, imaginary quote invalidation, keyboard textarea behavior, modal focus/Escape, copying, reset/keep, conflict clarification, cancellation/retry and horizontal overflow. Screenshots were visually reviewed. Both local and public interaction suites passed with no unexpected console errors. Provider-error and configuration states were intercepted only in the designated failure-path tests.

Real provider calls were separately tested: direct Vertex probe, local API stream, local browser analysis plus a target-change follow-up, and public HTTPS API analysis. Public stream returned HTTP 200, 2,212 answer characters, a completion event and no error. Follow-up kept the loss budget at $1,000 while changing the target scenario to 20%.

Narrow Chromium is responsive emulation. Real iPhone, iOS Simulator, Mobile Safari and cross-engine testing were not performed. No current prices or executable quotes are connected. Options are hypothetical expiry calculations only. No trade was executed and no wallet was connected.

The final public follow-up returned HTTP 200, 1,805 answer characters and a completion event. Mentioning a friend’s $50,000 tolerance did not alter the user’s $1,000 loss budget or the resolved deadline. The public browser suite was repeated on the final release and passed.

## Retirement evidence

R2 contains one retirement set with two encrypted parts. Both were downloaded and compared byte-for-byte; hashes are in `DEPLOY.md`. The production database passed SQLite integrity and foreign-key checks. Legacy code and stale runtime/service files were removed after the new public site passed checks. Legacy working records and key files remain intact outside the new release. Git history is preserved.

Local evidence is intentionally ignored in `qa-artifacts/`: browser report, desktop/narrow page and panel screenshots, and synthetic real-provider transcripts.
