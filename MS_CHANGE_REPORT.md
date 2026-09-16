# Market Scan campaign integration

Local version: `20260914-ms-campaign-v3`. Implements brief №3 on the existing
local №1 and №2 checkpoint. Production deployment completed with the owner’s explicit authorization.
Static and intake release: `20260914T065214Z-campaign-v3`. See VERSIONS.md for full verification.

## Delivered changes

- `ms.html`, `ms/index.html`: the requested seven argument headings, research
  sequence, labeled onboarding exercise, observed/inferred/unknown dossier,
  exclusion guide, research-to-letter transition, Anton's note, four FAQs,
  final shared Pilot/Scale cards and one shared inquiry form. New public copy
  follows the supplied American English, with commas replacing long dashes
  under the project punctuation rule. Shared existing plan labels are retained.
- All six original chronological sections are inside a closed native disclosure
  below the form. The complete original article is byte-identical, including
  dates, attribution and source markers. No original article links or payment
  actions existed in this local source. No historical purchase actions were added.
  The provided archive notice separates earlier email experiments and claims
  from the current campaign. Original source: `reference/ms-before-prompt3.html`.
- `assets/ms-campaign.js`: reveals containing disclosures for initial hashes,
  hash changes and repeat clicks. All six existing section links remain usable.
- `assets/ms-campaign.css`: composes existing paper/ink tokens, fonts, controls
  and spacing. Uses readable HTML research records beside explanations. The
  existing 185,308-byte illustration is clearly labeled; no new images or fonts.
- `scripts/build-homepage.cjs`: the homepage remains the canonical markup for
  shared pricing, inquiry fields and success text, header, footer and contacts.
  Build renders these components into /ms and updates its route mirror. Both
  pages, MS hero and MS metadata use `assets/campaign-pricing.js`. No independent
  pricing calculation, validation, backend or form implementation was added.
- `assets/campaign-tools.js`: the common CTA selection code runs without a
  calculator on /ms. Existing first-party events use fixed `/ms` context there,
  without website, contact, audience or financial values.
- `assets/contact-ui.js`, `server/coin_open/leads.py`: pass and allowlist `/ms`
  as an inquiry source. Existing encrypted storage, website normalization,
  server validation, origin check, rate limit and retry deduplication remain.
- `index.html`: only the requested link caption changed in visible copy, to
  “See how Market Scan works”. Shared JS cache keys changed to `20260914-p3`.
  All three protected sections match their before hashes after accounting for
  that one explicitly requested link caption. Letter sections match exactly.
- `server/tests_open/test_leads.py`: covers encrypted source persistence,
  duplicate reception and rejection of arbitrary/PII-bearing source values.
- `scripts/qa-ms-campaign.cjs`: local browser coverage for both pages and archive,
  pricing/CTA integration, form failures and same-record timeout retry.
- `scripts/preview.py`: an optional `COIN_PREVIEW_PORT` allows isolated local
  servers without interrupting another session's preview.
- `package.json`: lint also checks the new script and shared build script.

## Validation

- npm lint, typecheck, test and build pass. 38 market tests, 10 intake tests and
  the existing exact-decimal calculator assertions pass. Build database and all
  inquiry records are temporary local data. No test leads reached production.
- Isolated Chromium and WebKit: / and /ms at 360, 390, 768 and 1440 px. The
  requested 390x844 and 1440x900 sizes are included. Prices, unit prices, selection
  and preservation, one form, images, local anchors and no horizontal overflow
  pass. The named global `desktop-browser-qa` runner was not installed/found;
  equivalent checks ran with the available bundled headless browsers. Native
  Safari was not separately tested.
- Keyboard form navigation, native archive disclosure and every historical
  section hash pass. /ms and /ms/ serve matching bytes locally.
- Local reception verifies normalized website, source `/ms`, campaign interest
  and server-confirmed success. HTTP 200 without `received: true` stays an error.
  A real 25-second timeout after server receipt retains fields and request ID;
  retry returns the same server reference, with no second inquiry record.
- The homepage's existing evidence/calculator/form browser regression suite is
  also run against separate temporary local storage. Reusing the first test
  store initially triggered the existing rate limiter (429), correctly; tests
  were rerun with a fresh store without changing anti-spam limits.
- Analytics network interception verifies fixed `/ms` context and allowlisted
  event names, with no form data or external transmission.
- Screenshot review caught an inherited homepage definition-list layout rule;
  it is overridden only on /ms. Final dossier layouts were rechecked in both
  engines at all four widths, with desktop row alignment verified.
- Original article and protected homepage checks: `reference/ms3-preservation.json`
  and `reference/ms3-protected-before.json`. Required route mirrors, copy lock,
  build idempotence and Git whitespace checks pass.
- Local screenshots and results: `qa-screens/ms-campaign-v3/` and
  `qa-screens/ms3-home-regression/`. Generated evidence is not part of deployment.

## Dependencies and deployment

All local №1/№2 dependencies are integrated and deployed with №3. Active static
and intake directories use `20260914T065214Z-campaign-v3`. Exactly 9 static and 2
intake files were overlaid on clones of the actual active VPS releases. Old
releases, an encrypted intake-data backup and a market database backup are retained.
No production keys, uploaded data, dependencies, payment logic or Nginx/DNS/mail
configuration were replaced.

The initial SSH blocker was resolved through the owner's Webdock session and an
explicitly authorized public key assignment to `admin`. Private key material is
stored only in the Mac's ~/.ssh directory; use the saved `coinim-vps` SSH alias.

Staged browser and intake tests passed. All 25 public HTTPS checks returned 200;
all 9 published static files match bundle hashes. Public Chromium and WebKit
checks at 390x844 and 1440x900 passed /, /ms and /message. Three message-wall slots
and market state are unchanged. Market environment/reconciliation/smoke checks
pass; Nginx and all four services are healthy. Valid TLS and unchanged handling
referrer policy verified. Public form failure requests were intercepted locally;
no synthetic leads or payments reached production. Generated evidence is under
`qa-screens/ms3-deploy/`.

## Evidence and operational limits

The illustrative exercise and review guide are questions, not client evidence.
No results, conversion improvement, prospect counts, delivery quantities achieved,
verified research accuracy, launch timing or dashboard readiness are claimed.
Historical assertions are retained as the author's development history, with
an explicit historical-context notice. They were not independently validated.
Previously unresolved paid-unit, unusual grabber, waiting/revisit, tax/payment
and timing questions from CHANGE_REPORT.md remain unresolved.

The existing design direction and the Clay/Attio entries in the owner's
[reference catalog](https://lll.bz/forai) informed the sequence and adjacent work
artifacts. No additional design reference or copied brand assets were introduced.
