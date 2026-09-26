# Investor Match MVP (`/investors/`)

Status on 2026-09-17 (second pass): local implementation, not deployed. 100 published profiles researched from the investors' own websites; see "Current data" below for the honest counts and "Readiness" for what still blocks a launch.

## What it is

A static catalog of early-stage investors (angels, small and specialist funds, entrepreneur-investors, accelerators) with explainable matching on four criteria: sector, funding stage, investment geography and published check size. A visitor builds a shortlist of up to 20 profiles and sends it to coin.im through the existing inquiry form. Everything after that is manual work by coin.im.

The page answers one question: who has a published reason to read this pitch. It does not predict interest, score risk appetite or estimate wealth.

## Files

| Path | Role |
|---|---|
| `data/investors/profiles/*.json` | One editorial profile per file. Source of truth. Public repository: only `published` or `hidden` records belong here. |
| `data/investors/page.template.html` | Static page template (header, copy, form, footer). Placeholders `{{...}}` are filled by the build. |
| `data/investors/private/` | Ignored by Git: `queue/` drafts, `imports/` original files with rights notes, `suppression.json`, `disputed.md`. Never reaches the page. |
| `data/investors/import-template.csv`, `import-mapping.example.json` | Import template and column mapping example. |
| `scripts/build-investors.cjs` | Validates data, renders `investors/index.html` and the byte-identical mirror `investors.html`. `--check` validates without writing. |
| `scripts/lib/investors-data.cjs` | Loader and validator (`validateProfile`, `loadProfiles`, `publicView`). |
| `scripts/import-investors.cjs` | Local CSV/JSON import into drafts with row-numbered errors, dry run and deduplication. |
| `scripts/test-investors.cjs` | Tests: matching rules, data validity, bundle hygiene, mirror freshness, import validation. Part of `npm test`. |
| `assets/investor-match-core.js` | Dictionaries (sectors, stages, regions, countries), matching and the data access layer (`listInvestors`, `getInvestorBySlug`, `getPublishedInvestorCount`). Shared by Node and the browser. |
| `assets/investor-match.js` | Browser behaviour: filters, pagination, shortlist, direct links, research brief, form prefill. |
| `assets/investor-match.css` | Page styles, all scoped to `.im-` classes. |
| `docs/investor-match-mvp.md` | This document. |

Commands:

```sh
node scripts/build-investors.cjs          # rebuild /investors/ after any data change
node scripts/build-investors.cjs --check  # validate only
node scripts/test-investors.cjs           # Investor Match tests (also in npm test)
npm run lint && npm test && npm run build # full project checks
```

The build is also part of `npm run build`. The preview (`scripts/preview.py`) serves `/investors/`.

## How matching works

One pure function, `evaluate(profile, criteria, today)` in `assets/investor-match-core.js`, serves the catalog rows, the opened profile, the shortlist review and the research brief. Each criterion the visitor fills in yields one fact `{ state, reasonCode, text, sourceIds, stale? }`:

- `match`: the published value confirms the criterion (`stage-listed`, `sector-listed`, `sector-agnostic`, `geography-listed`, `check-within`).
- `mismatch`: a published value contradicts it (`stage-outside`, `sector-outside-exhaustive`, `geography-outside-exhaustive`, `check-outside-hard`).
- `unknown`: nothing published, or the value cannot be compared (`*-not-published`, `sector-not-listed`, `geography-not-listed`, `check-other-currency`, `check-outside-typical`, `country-unmapped`).

Empty criteria are ignored; with no criteria at all the page is in Browse mode (no verdict, name order). Verdict = worst state: any `mismatch` gives "Outside your selected criteria", any `unknown` gives "Needs more research", all `match` gives "Matches your selected criteria". Criteria combine with AND; the sector select is single-choice (OR inside a group is not needed by the interface).

Rules that matter:

- **Absence is never a refusal.** A profile's `sectors` and `investmentGeographies` are treated as named examples unless `sectorScope` / `geographyScope` is `"exhaustive"` (the source says "only", "exclusively", "we do not invest outside"). Examples plus a different sector or country give `unknown`. `agnostic` and `global` match anything.
- **Historical deals are not the mandate.** `investmentEvidence` and portfolio names are never read by `evaluate`; they are shown separately as "Investment evidence (historical)". A past biotech deal does not make a biotech mandate.
- **Office country is not investment geography.** The company country is mapped through `COUNTRIES` to regions and compared with `investmentGeographies` only. The office country is a separate catalog filter.
- **Check size: same currency only (USD with USD), no FX.** `publishedCheckRange` carries `min`, `max` (either may be null: "from", "up to"), `currency`, `constraint` (`typical` default, or `hard` when the source states a firm limit), `checkType` (`initial`, `follow-on`, `unknown`) and `sourceId`. Inside the range: match. Outside a `hard` range: mismatch. Outside a `typical` guide: unknown with the explanation "not a stated refusal". A single published amount (Everywhere Ventures $250k, Hustle Fund $150k) is stored as min = max but stays `typical`, so a different target is unknown, never a mismatch. Input is parsed by `parseTargetCheck`: blank means no criterion; `0`, negatives, decimals, separators, exponents and amounts above $100,000,000 produce a field error and no criterion, never a zero check.
- **Staleness.** The bundle carries `criteriaCheckedAt` per field (latest source check). `REVIEW_INTERVALS` = 180 days for mandate and check, 90 for role and address. A match older than the interval keeps its state but gets `stale: true` and "review recommended" in the text and verdict.
- **Empty results.** `suggestRelaxations(filters)` recounts real results with one criterion removed and returns at most two suggestions that actually add results. They are applied only on click, shown as "Filter removed: X" with a Restore button. Hidden profiles, suppression and paper-pitch refusals are not filters and are never relaxed.

## Shortlist grouping and delivery status

- Up to 20 profile ids. Selection survives filter changes, pagination and profile expansion; only the fit status is recomputed. Removal is explicit with an Undo for the last removal in the session.
- Entries are grouped into one potential approach only through a confirmed `organisationId` (person profile linked to an organisation profile). Name or domain similarity never groups. A person listed with an organisation name but without `organisationId` is flagged "link not established". The bar shows "N selected, M potential approaches to confirm": M is a count to verify, not a promise of letters.
- On restore, ids that are no longer published are dropped and a neutral notice states how many were removed, without reasons. If `localStorage` throws, the shortlist lives in memory for the page view.
- Investor fit, address type, paper-pitch policy, recipient routing and coin.im delivery availability are separate statuses in the review, the brief and the profile. The page says "Delivery availability is checked separately for each business address" and never claims worldwide delivery. A `not-accepted` paper policy is shown as excluded from any paper plan.

## Research brief and hand-off to the inquiry

- "Copy research brief" uses the Clipboard API and reports a real success with the character count; on failure it shows the text in a read-only textarea for manual selection and never says "copied".
- "Print research brief" renders the same model into `#brief-print` and calls the browser's own print; print CSS hides everything else. No PDF library, no new route, no automatic printing.
- The brief contains: criteria, creation date and data version (`generatedAt` = latest editorial update), profiles grouped by potential approach, up to two reasons and the unknowns per profile, contact limits, direct source URLs with check dates, and the next step. It never contains visitor data, private notes, rights notes or refusal records.
- "Request an investor outreach plan" (shortlist) and "Request a tailored investor search" (works with an empty shortlist, passes criteria only) fill two fields of the existing form on the page: a read-only `investor_brief` textarea (up to 8,000 characters, shortened with a note if longer) and a hidden `investor_slugs` list. The visitor's own free text goes into the existing `audience` field. Nothing is sent until the visitor submits.
- Backend contract (`server/coin_open/leads.py`): `investor_brief` (string, max 8,000) and `investor_slugs` (list of at most 20 slugs matching `[a-z0-9-]`, max 80 chars each) are optional, accepted only with `source: "/investors"`, ignored for the homepage and `/ms`, stored encrypted with the enquiry and shown in the existing admin panel. Required fields, rate limit and idempotency (`request_id`) are unchanged. Client fit statuses inside the brief are text for the owner, not trusted data.
- Form states come from the shared `contact-ui.js`: busy state and disabled button, 25-second timeout, network error, "could not confirm" message that keeps every entry, and on `/investors/` only, the server's 422 validation message is shown verbatim. A timeout is reported as unconfirmed, not as "not received".

## How to add a profile

1. Research the investor on its own website: mandate page, FAQ, portfolio, team, imprint or contact page. Write down each URL and the date you checked it.
2. Copy an existing profile such as `data/investors/profiles/nap.json` and fill every field. Required: `id`, `slug` (file name must be `<slug>.json`), `displayName`, `entityType`, `investorType`, `officialWebsite`, `summary` (40 to 80 words, written by you, not copied), `sectors`, `stages`, `investmentGeographies` (empty list when not published), `publishedCheckRange` or `null`, `fieldEvidence`, `investmentEvidence` (at least one entry for a published profile), `preferredPitchChannel` or `null`, `businessAddress` or `null`, `recipientRoutingStatus`, `paperPitchPolicy`, `editorialUpdatedAt`, `publicationStatus`, `sources`.
3. Every published criterion must point at a source id in `fieldEvidence` (`sectors`, `stages`, `investmentGeographies`); the check range carries its own `sourceId`. The build refuses a profile whose criteria have no source.
4. Values must come from the dictionaries in `assets/investor-match-core.js`. To add a sector or region, extend the dictionary; the validator and the page options follow automatically.
5. Set `publicationStatus` to `draft` while researching (keep drafts in `data/investors/private/queue/`, not in `profiles/`), `published` when the checklist below passes, `hidden` to take a profile offline without deleting it.
6. Run `node scripts/build-investors.cjs` and `node scripts/test-investors.cjs`.

Publication checklist: identified entity; official website; confirmed investment activity or a current public mandate with a dated source; a self-written summary; sources for every criterion; permission to publish (public first-party information used as facts, no copied biographies, photos or logos).

To hide a profile: set `publicationStatus` to `hidden`, rebuild; the bundle, counter and page drop it, and visitors who had it shortlisted see a neutral "no longer published" notice on their next visit. To remove it after a removal request: delete the file, add the organisation or person to `data/investors/private/suppression.json` with the date and reason, rebuild.

## How to verify or update a fact

- Each `sources[]` entry has `publishedAt` (the source's own date if known, day, month or year precision) and `checkedAt` (when you looked). Update `checkedAt` when you re-check, and `editorialUpdatedAt` on the profile. The page shows "Updated" as the latest `editorialUpdatedAt` across published profiles.
- `investmentEvidence[]` entries have `eventDate` plus `datePrecision` (`day`, `month`, `year`, `unknown`). A press reprint of an old deal keeps the original event date; it is not a new investment. "Investment announced" appears on the page only when a date is known.
- Distinguish the mandate from a past deal: `sectors`, `stages`, `investmentGeographies` and `publishedCheckRange` describe what the investor says it does now; `investmentEvidence` describes what it did. A portfolio in a sector does not by itself put the sector into the mandate.
- Employee roles: `publicContactPeople[]` needs a `sourceId` and `reviewedAt`. Name a partner only when the official site currently lists the person and role. Do not attribute a firm's investment to a person without a source.

## How to update an address

- Use only an address the organisation publishes itself (contact page, imprint, legal notice, footer). Store the type: `operating-office`, `headquarters`, `registered-office`, `correspondence`, `type-not-established`. A suite number or "c/o" is not evidence of an operating office; a registered office is not evidence of a partner's presence.
- Set `checkedAt` to the date you saw it. The page prints "Business address checked".
- `recipientRoutingStatus` stays `not-confirmed` until you have dated evidence that a named recipient at that address receives unsolicited business letters; then set `confirmed` and add `recipientRoutingEvidence: { sourceId, checkedAt }`.
- `paperPitchPolicy`: `accepted` or `not-accepted` only with a source (`paperPitchEvidence.sourceId`), otherwise `unknown`. A profile with `not-accepted` is shown, but the page states it is excluded from any paper plan and the shortlist brief flags it. Do not route around a stated refusal or a gatekeeper. Do not send pitches to legal-notice or privacy addresses.
- Never collect home addresses, personal phones, non-published emails, family details, movements or personal wealth.

## How to import a permitted file

Rights first: a CSV export from a third-party service is not permission to publish, to build a derivative directory or to serve clients. OpenVC and NFX terms prohibit republication and competing use (checked 2026-09-17: https://www.openvc.app/legal, https://www.nfx.com/terms); do not import them, even "for later verification". A commercial source needs separate rights for internal use, client work and publication. Unknown rights mean no use.

```sh
node scripts/import-investors.cjs --file data/investors/private/imports/list.csv --mapping data/investors/import-mapping.example.json --dry-run
node scripts/import-investors.cjs --file data/investors/private/imports/list.csv --rights "Owner's own research, granted 2026-09-17"
```

- Columns are mapped explicitly (see the mapping file); `data/investors/import-template.csv` is the template.
- The script checks types, URLs, required fields, dictionary values and check ranges, and reports every problem with its row number. `--dry-run` writes nothing.
- Valid rows become drafts in `data/investors/private/queue/` with `importSource` (file, row, rights note). Nothing is published automatically: a draft still needs research, a summary, evidence and a status change before it is moved to `profiles/`.
- Deduplication: organisations are compared by website domain and name, people by name plus organisation. Exact matches are skipped; partial matches are listed under `review` for manual checking. Several people on one domain are not duplicates of each other.
- Re-running the same file is idempotent: an existing draft from the same file is merged, filling only empty fields; editorial edits are kept, a differing imported value is recorded under `internalReview.conflicts` for the editor, the draft's `publicationStatus` is never changed (a hidden draft stays hidden), and the report lists `diff`, `updated` and `unchanged`. A slug that already exists as an editorial profile is refused and listed for review.

## Quality check and re-check queue

`npm run quality-check` (also `node scripts/quality-check-investors.cjs --json` or `--today YYYY-MM-DD`) reports errors and warnings separately and exits non-zero on errors:

- errors: schema violations, duplicate id or slug, broken `organisationId`, future `checkedAt`, event date after publication or check date, routing or paper policy without evidence, published profile without investment evidence, published count differing between data, rendered rows, bundle and page counter, private fields or draft/hidden statuses in the public artifact, queued drafts leaking into the page;
- warnings: unknown check, no address, address type not established, mailbox-like line typed as operating office, non-USD check, missing scopes, profile with no matching criteria at all, shared domains;
- review recommended: fields whose latest check is older than the editorial policy (180 days for mandate and check, 90 for roles and addresses). This is a re-check queue, not a statement that the fact is wrong; old investments never expire. A successful HTTP response is not a check: `checkedAt` changes only when a person reads the source. Blocked or timed-out sources are not refutations. When primary sources conflict, keep the conflict in `internalReview` and set the disputed current criterion to unknown (empty list or null).

`scripts/test-investors.cjs` runs the quality check on the real data and fails on any error.

## How the shortlist reaches coin.im

- The browser stores only `{ "version": 1, "ids": [...] }` in `localStorage` under `coinim.investorShortlist`. Ids of profiles that are no longer published are dropped on load. If storage is blocked, the shortlist lives in memory for the page view and the review panel says so.
- "Request an outreach plan" writes a plain-text research brief (names, slugs, verdict, missing checks, the visitor's criteria) into the optional "Shortlisted investors and criteria" field of the existing inquiry form on the same page. The field maps to the backend's existing `audience` text field (2,000 characters). Longer briefs are truncated with a note; "Copy research brief" gives the full text.
- The form posts to the existing `/api/open/leads` endpoint with `source: "/investors"` (the backend allowlist now accepts this value alongside `homepage` and `/ms`; `campaign_interest` is fixed to `help`, so no letter prices appear on the investor page). Enquiries are encrypted and visible in the existing admin panel. Nothing is sent to any investor.
- The homepage form and its behaviour are unchanged; `assets/contact-ui.js` only learned the extra source value.

## Legal notes for the owner

- A paper letter and personalisation do not exempt anyone from rules on soliciting investment. Do not determine accredited or professional investor status from wealth, firm name or any score. The legal structure of a specific round and of the outreach must be reviewed by a qualified specialist; the page disclaimer does not replace that review.
- US context only, not a universal guide: https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/general-solicitation
- The MVP does not run deals, take money, promise compliance or charge a success fee on capital raised. Do not add these.
- Do not present a listed firm as a coin.im partner. Do not reuse ordinary campaign prices or volumes for the investor service; the page says "An inquiry, not an order".

## Current data (2026-09-17)

- 100 published profiles, all researched on the investors' own websites on 2026-09-17: 92 funds, 4 accelerators, 2 angels, 2 entrepreneur-investors (3 person entities, one linked to an organisation profile).
- 52 have a published check range (35 USD, 10 EUR, 5 GBP, 2 AUD); 77 a published stage; 62 published sectors; 60 a published investment geography; 69 a published pitch channel.
- 26 have a published business address (DE 6, GB 5, US 5, AT 2, AU 2, FI, SG, IN, SE, NG, LT one each). Most are imprints, footers or contact pages; the type is recorded per address.
- 0 have confirmed recipient routing; 0 have a published paper-pitch policy (all `unknown`). No profile is ready for paper delivery without a manual check.
- Research queue: none carried over. Sites that could not be read without JavaScript and were not published: Precursor Ventures, Chapter One, Freestyle, Essence VC, Bling Capital. Not investing or unreachable: VITALIZE (funds fully deployed), Wonder Ventures, Chaos Ventures, Cocoon Capital, Powerhouse, Restive, Fin Capital, Java Capital, Jenson, Signals, Wingman, Todd and Rahul.
- The page weighs about 600 KB of HTML because all 100 profiles are rendered statically; keep this in mind before adding many more, or split evidence into a lazily loaded file later.

## How to continue past 100

Method: find original pre-seed and seed announcements in several sectors and regions, list every named investor including small co-investors, verify each on its own site, separate first checks from follow-ons, record the business address only when the organisation publishes it, write the summary yourself, attach sources per field. Prefer small and specialist teams and publicly active angels over famous names. Keep drafts in `private/queue/` until the checklist passes. Report real counts, not a target.

## Readiness (2026-09-17)

- Interface: working locally at 390, 768 and 1440 px, with and without JavaScript, direct links and refresh. Ready for a review by the owner.
- Content: 100 published profiles; 52 with a published check; 26 with a business address; 0 with confirmed recipient routing; paper-pitch policy unknown for all 100. Usable for research and shortlists, not for any delivery promise.
- Inquiry intake: works against the existing encrypted `/api/open/leads` with the optional brief fields; confirmed only by the backend's `received: true`. The backend change is local and must be deployed together with the page.
- Delivery service: not implemented. Every letter route needs manual research; coin.im delivery is limited to the areas stated on the homepage.

## Not implemented (by design)

- Paid data APIs, scraping, unofficial scraper APIs, bypassing logins or paywalls.
- Automated research or crawling of the visitor's website (no SSRF surface).
- Any probability of investment, risk-appetite or wealth score.
- Sending letters or emails, buying data, ordering delivery.
- AI letter or pitch generation, PDF editing, QR landing pages.
- CRM, accounts, payments, agent workflows, vector or graph databases.
- SEO pages per profile or per filter combination (one canonical page, direct links via `/investors/#slug`).
