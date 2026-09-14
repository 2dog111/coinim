# Campaign evidence, economics and inquiry

Version: `20260914-campaign-evidence-v2`. Implements the owner's second brief
incrementally on the first iteration. The source checkpoint includes both iterations.

## Changes

- `index.html`, `assets/pilot-scale.css`: replaced the contrast section with a labeled
  field guide using the existing concept letter image. Added exclusion reasoning,
  the approval sequence, separate handoff/read/reply wording, Repeat/Revise/Stop,
  four FAQs and a single disclosure around the preserved historical library.
  The five own letters and the existing research/operational copy are preserved
  apart from the owner's explicit replacements.
- `assets/campaign-pricing.js`, `scripts/build-homepage.cjs`: one pricing source
  renders both pricing blocks and both campaign selectors. Prices stay $3,800 and
  $30,000. The calculator reads the same source at runtime.
- `assets/campaign-tools.js`: a local cost-coverage calculator uses exact decimal
  BigInt arithmetic and rounds customer counts upward. Inputs start empty/zero as
  requested. No financial inputs are transmitted. Pricing CTAs choose the visible
  form interest; generic CTAs preserve it. Allowlisted event names use the existing
  first-party beacon without contact, website, free-text or financial values.
- `assets/contact-ui.js`: website/name/email are sufficient; domains normalize to
  HTTPS. Phone is required only for a selected phone channel. Confirmed server
  reception controls success. Error/timeout preserves fields and retry ID.
- `server/coin_open/leads.py`, `server/coin_open/admin.py`: normalized HTTP/HTTPS
  website, optional audience and campaign interest persist in the existing encrypted
  job and appear in the existing owner admin. No automatic website fetch added.
  Notification records continue referencing the encrypted job. Honeypot, origin
  gate, rate limit and duplicate protection remain.
- `server/tests_open/test_leads.py`, `scripts/test-calculator.cjs`,
  `scripts/qa-evidence.cjs`, `package.json`: regression checks and pricing build.
  `COIN_PYTHON` can select Python 3.11+ without replacing the imported Python 3.9 venv.

## Passed checks

- npm lint, typecheck, tests and build. Build migration ran only against temporary
  local storage. 38 existing market tests, 9 intake tests and calculator assertions pass.
- Exact test examples: $1,000 contribution and $0 other costs give 4/30 customers;
  $1,000 other costs give 5/31. Decimal boundaries, zero, negative, empty,
  non-numeric and non-finite strings are covered.
- Isolated Chromium and WebKit at 360, 390, 768 and 1440 px: layout, calculator,
  campaign selection/preservation, keyboard navigation, domain normalization,
  conditional phone, server failure and real local server-confirmed reception pass.
- A 25-second timeout after a local server receipt was retried with the same request
  ID, returning the existing record. No fictional lead reached production.
- Existing letter texts, historical attribution/links, research paragraphs outside
  the replaced hook, cities and unchanged operational sections match the prior iteration.
- Legacy mail copy lock, route mirrors and Git whitespace checks pass.
- The five analytics events were verified with all network traffic intercepted
  locally; only event name, event type and the fixed page path were transmitted.
  WebKit select controls retain at least 44px height after the final CSS adjustment.

## Not verified / deployment blocker

VPS deployment is authorized by the owner but not performed. `aiagentiva` is not
configured on this Mac. Direct `ops@193.181.215.57` reaches SSH but rejects available
authentication (`Permission denied`). The SSH agent has no identities. The local
release manifest is `reference/release-evidence-v2.json`. Production files, backend
compatibility, staged release and post-deploy behavior must be verified once an
authorized SSH login/key is available. Native Safari was not separately tested;
the available WebKit browser was tested. No production lead was submitted.

## Commercial questions for the owner

- What exactly is the paid unit: a prepared letter, a delivery attempt, or a completed handoff?
- Which nonstandard grabbers, courier waiting and repeat attempts are included or separately charged?
- What are the confirmed production/launch timelines, taxes and payment terms?
- Which actual delivery/handoff materials have permission for public use?

No answers to these questions, performance results or conversion improvements have
been invented or published. The new field guide is a schema, not customer proof.
