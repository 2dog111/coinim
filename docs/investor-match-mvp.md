# Investor Match MVP

Deployed 2026-09-22 at `https://coin.im/investors/`.
Active static release: `/var/www/coin.im/releases/20260922T153944Z-investor-match`.
Previous release `20260914T065214Z-campaign-v3` is retained for rollback. Initial
SSH timeouts cleared on retry; no access settings or credentials were changed.

## Current research state

- 40 independently written, sourced organisation profiles are marked `published`
  in the source data and rendered in the live release.
- 6 have a business address published by the organisation.
- 0 have a confirmed paper-pitch route. All paper policies are unknown; no
  acceptance or personal delivery is inferred from a street address.
- The goal of 100 profiles is not complete. Another 60 records are needed.
  Nineteen named candidates are in the private research queue: seventeen could
  not be sufficiently retrieved/verified in this session, and two need a fuller
  mandate review. The other 41 have not been researched. They are not represented
  by fake or empty public profiles.
- This release contains firms, not independently verified personal angels or
  family offices. The schema supports those entities after evidence review.
- The reviewed sources include an original Pocket financing announcement naming
  MGV, investor-published mandates and portfolios. No OpenVC, NFX, commercial
  database export, copied biography, logo or photo was used.

The source pages were reviewed on 2026-09-22. This is an editorial review date,
not a claim that a transaction happened on that date or that capital is available.
Some primary sites returned fetch failures or empty content. The private queue
records those limits without asserting that a firm stopped investing.

## Files and build

`content/investors/profiles.json` is the editable catalogue. Each field uses
source ids and the four criteria use `fieldEvidence`. The renderer validates
published records, requires a private publication review, allowlists both top-level
and nested public fields, and writes `investors/index.html`. It embeds only
published profiles. Drafts, source imports, rights documents and contact
suppression records must remain under the ignored
`docs/private/investor-match/` directory, outside every deployment manifest.

Run `npm run build:investors` after an editorial change. `npm run build` includes
that command and the existing homepage/Market Scan build. When running the full
build, point `COIN_MARKET_DATA_ROOT` and `DATABASE_URL` to temporary local storage
and set `SITE_URL` to a local URL. Never run a local build against production data.
The existing Python backend requires Python 3.11 or newer; this task used an
isolated Python 3.12 environment without changing product dependencies.

The build reuses the homepage header and footer. The homepage gets one compact
promotion, one footer link and an isolated handoff script. The existing Market
Scan shared-footer generator excludes that homepage-only promotion, preserving
both Market Scan route mirrors. There was no `/millionaires/` implementation,
so no redundant legacy page or redirect was created.

## Add, verify or hide a profile

1. Identify the investment entity, not just an employee with the same domain.
   For an independent angel, verify the official professional page and direct
   investing activity. Never infer personal wealth or investor eligibility.
2. Write 40 to 80 original words. Review a primary mandate or specific investment
   announcement. Provide 1 to 3 investment facts. A portfolio example establishes
   past activity; it does not prove a current geographic or sector mandate.
3. Record source title, publisher, URL, publication date if established, review
   date and the precise `supportsFields`. Bind populated criteria to those source
   ids. Do not invent event dates; the model accepts year, month or day precision.
4. Use the explicit dictionaries in `assets/investor-core.js`. Empty arrays and
   a null check mean unknown. Use `*` only for an expressly broad mandate.
   Mark `fieldEvidence[field].exhaustive` true only when the source establishes
   an exclusion outside the listed values. A short list of interests is usually
   not exhaustive. Regions normalized into only some countries remain partial.
5. Record source-use review privately in
   `docs/private/investor-match/publication-review.json`, keyed by profile id.
   `publicPublication: approved` must have an actual basis. Independent reporting
   of limited professional facts does not grant a licence to copy the source.
   Imported commercial data needs separately established rights for internal
   use, serving clients and public publication. Unknown rights prohibit that use.
6. Set `publicationStatus` to `published` only after editorial review. Set it to
   `hidden` to remove it and rebuild. Stored shortlists automatically discard
   removed ids on the next visit. Record the reason for removal privately.

`organisationId` groups members of a firm in the shortlist. Matching names alone
do not merge entities. Shared firm domains trigger manual review for organisations;
different people at one domain are not automatically duplicates.

## Addresses and contact preferences

Use only a business/correspondence address published for professional contact by
the organisation. No private home addresses, private phone numbers, hidden emails,
family data, movements or personal financial estimates. A residential-looking
registered address must not be promoted as a personal contact location.

Recheck the source and update `businessAddress.checkedAt` only after that check.
Preserve address type: operating office, headquarters, registered office,
correspondence, or type not established. Do not repurpose addresses reserved for
legal notices or privacy requests as pitch channels. A PO box is not an operating
office. When in doubt, keep the address null.

Recipient routing and paper acceptance are separate, dated, sourced states.
`paperPitchPolicy.status: not-accepted` excludes the entity from the paper plan,
even when all investment criteria match. The shortlist may retain the profile for
research, with that exclusion stated in the UI and inquiry. Follow private contact
objections through a separate, private suppression record and hide the public
profile if required; never publish the suppression record or try to bypass a
refusal, secretary or preferred online pitch form.

## Matching and handoff

`createStore` in `assets/investor-core.js` provides `listInvestors`,
`getInvestorBySlug` and `getPublishedInvestorCount`. Matching is deterministic,
with no LLM or probability score. Each selected criterion is match, mismatch or
unknown. Only published closed USD ranges are compared to USD requests. Open
ranges, median bands and other currencies stay unknown for amount matching.
Office country is a distinct filter; portfolio geography never fills a mandate.

The catalogue shows 25 results per page. The four primary criteria apply with
the matching button; search and secondary filters update immediately. Filtering
resets pagination. Full matches precede incomplete records; contradicted records
are hidden unless requested. Names sort consistently within each group. A hash
link reveals its profile even if it sits outside the current filter/page, with
an explicit notice. Without JavaScript all profiles, sources and contact links
remain readable; inactive controls stay hidden.

Only `{version: 1, ids: [...]}` is stored in localStorage, capped at 20 profiles.
Denied storage falls back to memory with an explanation. Form values, email and
confidential pitches are never stored there. No background lead request occurs
on selection.

On the explicit request action, a public-text brief is carried in the URL fragment
to the existing homepage form. Fragments are not sent in HTTP requests. The
isolated homepage script fills the existing `audience` field if empty, preserves
an existing inquiry otherwise, and removes the fragment after processing. This
is not submission. The existing handler still sends only after the visitor reviews
and submits the form. It requires `received: true`, preserves input on errors and
uses the existing request-id retry contract. The existing `help` campaign option
is used; investor scope/pricing are expressly separate. No API change was needed.
Briefs longer than the existing 2,000-character limit are not silently truncated;
the visitor is offered the copy path instead.

## Local CSV / JSON import

The template `content/investors/import-template.csv` contains headers only,
without fabricated sample investors. `import-mapping.json` explicitly maps columns
to fields. Nested CSV cells must contain JSON (with normal CSV quote escaping).
For a full-shape example, inspect any researched record in `profiles.json`.

Create a private rights record before importing, with `internalUse: approved`,
`basis`, `reviewedAt`, and separate client-service/public-publication decisions.
An approval of internal use is not approval of either external use.

```sh
node scripts/import-investors.cjs /private/path/investors.csv \
  --mapping content/investors/import-mapping.json \
  --rights /private/path/rights.json --dry-run
node scripts/import-investors.cjs /private/path/investors.json \
  --rights /private/path/rights.json --dry-run
```

Remove `--dry-run` after reviewing the report to write private drafts. JSON imports
accept an array of full records. CSV reports physical row numbers, including
multiline quoted cells; JSON reports 1-based record numbers. Errors, unsafe URLs,
bad ranges or ambiguous identities prevent writing a batch. Every accepted record
is forced to `draft`, regardless of the incoming publication flag. Import never
changes the catalogue, uploads a file or publishes anything.

## Continue towards 100

Start with original company financing announcements across several sectors.
Research directly named smaller co-investors at their own sites. Establish
identity, mandate/activity, source-use basis and a meaningful independent summary
before publication. Keep inaccessible, unverified and ambiguous candidates in the
private queue. Revisit the 19 known pending candidates and research another 41;
replace unsuitable candidates instead of counting them as completed profiles.
Null addresses and checks are valid. A larger count is not a delivery claim.

## US outreach context

The owner specified the United States. Postal format and personalization do not
exempt investment solicitations from securities rules. Do not determine accredited
or professional-investor status from wealth, a firm name or a score. A qualified
specialist must review the specific round and communication structure; the public
disclaimer does not replace that review.

Primary reference: [SEC general solicitation](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/general-solicitation).
USPS provides [residential direct-mail delivery](https://www.usps.com/business/every-door-direct-mail.htm),
which does not itself resolve securities, data-use or recipient-preference rules.

## Verification and scope

Local lint, typecheck, 38 existing market tests, 10 existing intake tests,
calculator tests, full production build with isolated storage and Investor Match
tests passed. Isolated headless Chromium at 390x844, 768x900 and 1440x900 verified
layout, criteria, empty results, reset, pagination, deep links, shortlist
persistence/limits, denied storage, no-JS reading, and mocked form failures and
success. The named global `desktop-browser-qa` runner was not found; equivalent
isolated Playwright Chromium checks are in `scripts/qa-investors.cjs`.

Screenshots under `qa-screens/investors/` were reviewed and remain local.
The three protected homepage section hashes and all required route mirrors match.
No external investor form, real production lead or payment was submitted.

Not implemented: paid APIs, automatic research/scraping, investment-probability
prediction, sending letters, pitch generation, registration, a full CRM, investment
transactions or payment collection. The business process after an inquiry is manual.

## Verified release

`reference/release-investor-match.json` is the exact static overlay manifest.
Clone the actual active VPS static release and overlay only its listed files;
do not replace the whole site with this working tree. Read the active Nginx
configuration and verify that `/investors/` resolves to the static directory
before switching. If it does not, add only the appropriate static route after
backing up the config. Preserve all API, message, handling and mail routes.

Do not deploy backend files, local rights records, research queues, data-source
files, tests, raw imports, source maps or screenshots. After access is restored,
compare the active homepage and sitemap to the recorded baseline, resolve any
new changes, validate Nginx, switch atomically, verify the published hashes and
all routes listed in DEPLOY.md, then update VERSIONS.md with the actual release.
This task switched only the static release. No Git push, backend deployment,
DNS or mail change occurred. Nginx configuration is byte-identical to its backup.
All 7 published file hashes match; 32 HTTPS checks, the `/investors` redirect,
handling privacy headers and the three unchanged message-wall slots passed.
Private source, rights, research queue and importer paths return 404.
Public Chromium smoke at 390x844 and 1440x900 passed for search, profile opening,
shortlist handoff, homepage form and message-wall layout, with no JavaScript
errors or actual submissions. The full public browser matrix encountered an
intermittent navigation timeout; the complete local and staged-artifact matrices
passed. These are distinct verification scopes.
