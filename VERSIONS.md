# coin.im Versions

This is the local place to check the current site version before edits or deployment.

## Current Version

- Local site version: `2026-08-15-110931Z-vps-g30`
- Home base CSS cache key in HTML: `assets/base.css?v=20260815-g24`
- Home CSS cache key in HTML: `assets/home.css?v=20260815-g24`
- Business File home CSS cache key in HTML: `assets/home.css?v=20260815-g18`
- Business File CSS cache key in HTML: `assets/open.css?v=20260815-g8m-2`
- Business File JS cache key in HTML: `assets/open.js?v=20260815-g8m`
- Market Scan base CSS cache key in HTML: `assets/base.css?v=20260815-g26`
- Market Scan CSS cache key in HTML: `assets/ms.css?v=20260815-g26`
- Main production URL: `https://coin.im/`
- Russian page URL: `https://coin.im/ru`
- Spanish page URL: `https://coin.im/es`
- Market Scan page URL: `https://coin.im/ms`
- File handling page URL: `https://coin.im/handling`
- Business File intake URL: `https://coin.im/open`
- AI/notes page: `https://coin.im/ai.html`, intentionally `noindex, nofollow`
- Short/notes page: `https://coin.im/s.html`, intentionally `noindex, nofollow`

## Local Rollback Snapshot

- Snapshot label: `2026-08-15-130041-bkk-vps-current-rollback`
- Snapshot time: `2026-08-15 13:00:41 BKK`
- Purpose: local clean static rollback point for the current VPS production site.
- Local snapshot directory: `local-releases/20260815T130041BKK-vps-current-clean-static/`
- Local archive: `local-releases/20260815T130041BKK-vps-current-clean-static/site.tar.gz`
- Archive SHA-256: `b4eb773a18e5b1d0a00c6fbac6c060b377ac9e423a39bd7e687eb0b70675299b`
- File count in clean static snapshot: `56`
- Included files follow the VPS production list in `DEPLOY.md`: HTML pages, `llms.txt`, CSS files, `robots.txt`, `sitemap.xml`, `ms/index.html`, and `assets/`.
- To roll back later, deploy this archive through the VPS release flow in `DEPLOY.md`; do not use Wrangler or the old Cloudflare Worker path.

## Git Checkpoint

- Annotated tag: `checkpoint-20260815-g30`
- Branch at creation: `main`
- Scope: the complete source state through G30, including the current static site, Market Scan route mirror, `/handling`, the manual encrypted `/open` intake and API source, deployment documentation, and audit reports.
- Generated `qa-screens/` files are intentionally excluded; they are local evidence, not required to build or restore the site.
- Inspect the checkpoint with `git show checkpoint-20260815-g30`.
- Start a safe rollback branch with `git switch -c restore/checkpoint-20260815-g30 checkpoint-20260815-g30`. Do not reset a dirty working tree.

## Last Known Cloudflare Worker Deployment

Historical only. Current production is the VPS origin described below and in `DEPLOY.md`; do not use this Worker path unless explicitly asked to restore it.

- Deployment date: `2026-08-15`
- Cloudflare Worker name: `aged-star-171b`
- Worker URL: `https://aged-star-171b.uuudotbz.workers.dev`
- Production version ID: `6757a8dc-7ed8-43ee-bb74-04b5f7210637`
- Last deployed files included: `index.html`, `ru.html`, `es.html`, `ai.html`, `s.html`, `ms.html`, `ms/index.html`, `styles.css`, `ms.css`, `robots.txt`, `sitemap.xml`, `llms.txt`, `assets/`
- Current generated header mark: `assets/coin-im-mark-20260813.webp`

## Current Production Deployment

- Deployment date: `2026-08-15`
- Host: `iva` / `193.181.215.57`
- Active release: `/var/www/coin.im/releases/20260815T110931Z`
- Active intake API release: `/opt/coin-im-open/releases/20260815T092516Z`
- Current symlink: `/var/www/coin.im/current`
- Nginx config: `/etc/nginx/conf.d/coin.im.conf`
- Certbot issued a Let's Encrypt certificate for `coin.im` and `www.coin.im`; it expires on `2026-11-13` and is configured for automatic renewal.
- Clean release deployed with `81` files.
- Public HTTPS checks passed for `https://coin.im/`, `/ru`, `/es`, `/ms`, `/handling`, `/open`, `/api/open/health`, `/assets/base.css`, `/assets/home.css`, `/styles.css`, `/robots.txt`, `/sitemap.xml`, and `https://www.coin.im/`.

## Versioning Rule

When `styles.css` changes, bump the CSS query string in both:

- `index.html`
- `ru.html`

Use date-based keys, for example:

```text
styles.css?v=YYYYMMDD-N
```

Update this file after any completed deploy or major local visual iteration.

## Last Verified Local QA

The 2026-08-15 G30 pass replaced all seven supplied homepage stage-panel strings without changing markup or CSS and deployed the accumulated G27-G30 text changes. Stage names remain on one line at 1024, 1280 and 1440; notes stay within two lines; and local overflow checks passed at 375, 768, 1024, 1280 and 1440. The existing 1024 breakpoint stacks the panel below the hero, so the hero ends below the 768 px viewport; this unresolved style constraint and the two inconsistent grep expectations are documented in `audit-g30.md`. Lighthouse returned Performance 94, Accessibility 96, Best Practices 100 and SEO 100. The clean 81-file release is `/var/www/coin.im/releases/20260815T110931Z`; all required HTTPS routes returned 200, production overflow checks passed at 375, 430, 1024 and 1920, remote hashes match and no Cloudflare Worker, DNS or mail settings were changed.

The 2026-08-15 G29 pass aligned Market Scan with the homepage by stating that the first chronicle returns within 72 hours in Current status, the visible timing FAQ answer and its JSON-LD counterpart. The visible and structured answers match exactly, JSON-LD is valid, and `ms.html` equals `ms/index.html`. Browser checks at 375 and 1440 found no horizontal overflow or console warnings; Lighthouse returned Performance 99, Accessibility 100, Best Practices 100 and SEO 100. The requested grep expectation says two `72 hours` matches in `ms.html`, but the three required placements necessarily produce three; this is documented in `audit-g29.md`. It was deployed with G30 in `/var/www/coin.im/releases/20260815T110931Z`.

The 2026-08-15 G28 pass applied the four supplied homepage changes: shortened the Stage 3 and `Before a word is read` openings, removed `and pay for most` from Stage 1, and added the supplied six-hundred-and-eighty-business evidence paragraph before `contrast-pair`. The new paragraph is in the required position, the page has one `h1`, and browser checks at 375 and 1440 found no horizontal overflow or console warnings. Lighthouse remained at the current homepage baseline of Performance 94, Accessibility 96, Best Practices 100 and SEO 100. The supplied Stage 3 replacement is not literally a word-preserving sentence split; that discrepancy is recorded in `audit-g28.md`. It was deployed with G30 in `/var/www/coin.im/releases/20260815T110931Z`.

The 2026-08-15 G27 pass removed the eleven specified uses of `quietly` and `genuinely` from Market Scan while preserving the two meaningful `quietly` uses, the one meaningful `genuinely` use and all 19 occurrences of `actually`. A5 was updated in both the visible FAQ and JSON-LD; B5 and B6 occurred only in visible prose. `ms.html` and `ms/index.html` are byte-identical, JSON-LD is valid, and browser checks at 375 and 1440 found no horizontal overflow or console warnings. Lighthouse returned Performance 99, Accessibility 100, Best Practices 100 and SEO 100. Its timing discrepancy was resolved by G29. It was deployed with G30 in `/var/www/coin.im/releases/20260815T110931Z`.

The 2026-08-15 G25 and G26 pass replaced the opening evidence in the homepage `Why paper, when email is free` section and removed the requested qualification cascade, limits section, duplicate FAQ item, status repetition, decorative labels and long dashes from Market Scan. `ms.html` and `ms/index.html` are byte-identical; JSON-LD is valid; visible and structured FAQs contain six questions; and no internal link or `aria-labelledby` target is missing. Browser checks at 375, 768, 1024, 1440 and 1920 found no horizontal overflow and no console warnings or errors. Market Scan Lighthouse returned 100 in all four categories. Homepage Lighthouse remained at the G24 baseline of Performance 94, Accessibility 96, Best Practices 100 and SEO 100. The combined static release is `/var/www/coin.im/releases/20260815T105520Z`; all required public HTTPS checks passed and evidence is in `audit-g25.md`, `audit-g26.md`, `qa-screens/g25/` and `qa-screens/g26/`.

The 2026-08-15 G24 pass consolidated the prior homepage cleanup, shortened the two remaining record statements, restored the empty `home-rest` band, applied the requested label colour and raised both homepage CSS keys to `g24`. The shared `.equation` rule in `base.css` was retained because `/ms` still uses it; the FAQ phrase `delivery scan and nothing else` was retained because G24 supplies no replacement and forbids invented copy. Checks at 375, 768, 1024, 1440 and 1920 found one `h1`, no missing `aria-labelledby` targets, no uppercase homepage labels and no horizontal overflow. Lighthouse returned Performance 94, Accessibility 96, Best Practices 100 and SEO 100; the accessibility finding is the requested low-contrast `var(--ink-soft)` label on the dark plate. It was deployed to VPS release `/var/www/coin.im/releases/20260815T103707Z`; all required public HTTPS checks passed and evidence is in `audit-g24.md` and `qa-screens/g24/`.

The 2026-08-15 G23 pass removed `What we cannot do yet`, `What we will not do`, and `Who should not hire you?` without moving or rewriting surrounding copy. Stage four now moves directly from the delivery-evidence paragraph to `How a record ends`; `Before a word is read` ends with `What is still on the desk on Thursday`; and the FAQ contains six questions, ending with `Which countries can you post to?`. Checks at 375, 768, 1024, 1440 and 1920 found one `h1`, no missing `aria-labelledby` targets and no horizontal overflow. Lighthouse returned Performance 94, Accessibility 100, Best Practices 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T103058Z`; all required public HTTPS checks passed and evidence is in `qa-screens/g23/`.

The 2026-08-15 G21 pass applied all thirteen supplied homepage cuts, removed the remaining equation and its CSS, and preserved `What we cannot do yet`, its three items, `What we will not do`, and `Who should not hire you?`. Checks at 375, 768, 1024, 1440 and 1920 found no horizontal overflow and no equation elements. Lighthouse returned Performance 94, Accessibility 100, Best Practices 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T102258Z`; all required public HTTPS checks passed and evidence is in `qa-screens/g21/`.

The 2026-08-15 brand1 pass replaced the generated SVG coin mark with a targeted physical-direct-mail emblem combining an envelope, key, wax seal and coin rim. The `coin.im` wordmark is approximately 20% larger, and the email, WhatsApp and Telegram links use restrained button treatments with recognizable brand-colour rules. The generated WebP is 128 x 128 px and 4402 bytes. Checks at 375, 430, 768, 1024, 1440 and 1920 found no horizontal overflow, loaded imagery, usable contact targets and an empty console. Lighthouse returned Performance 95, Accessibility 100, Best Practices 100 and SEO 100. It was deployed with the current G19 cleanup to VPS release `/var/www/coin.im/releases/20260815T101647Z`; all required routes and the new logo returned HTTP 200, and local/active HTML, CSS and logo hashes match. Production evidence is in `qa-screens/brand1/production-1440.png`.

The 2026-08-15 G19 pass applied the supplied homepage cleanup literally: removed non-informational labels, long dashes, link arrows, decorative record numbering, the read-on control and the duplicate equation; shortened the 12 object-use openings mechanically; and added the approved record-to-market bridge. Checks at 375, 768, 1024, 1440 and 1920 found one `h1`, one remaining `≠`, the preserved `#object-one` anchor, no horizontal overflow and empty consoles. Lighthouse returned Performance 88, Accessibility 96, Best Practices 100 and SEO 100. Accessibility is 96 because the required `.plate__label { color: var(--ink-soft) }` has insufficient contrast on the dark plate; it was reported rather than changed outside the prompt. The static site was deployed to `/var/www/coin.im/releases/20260815T101422Z`; evidence is in `audit-g19.md` and `qa-screens/g19/`.

The 2026-08-15 G18 pass removed hover and active geometry changes from homepage buttons, confined the yellow fill to fine-pointer hover, preserved a single inherited pointer cursor and prevented touch hover from sticking. It rebuilt `The record` as one left-aligned 62ch column with the dark `1,000,000+` heading, ledger rules, numbered proof points, separate production-error list and preserved remainder copy. Browser checks at 375, 768, 1024, 1440 and 1920 found `scrollWidth === innerWidth`, matching left edges, `position: static`, a fitting number and no console errors. Hover, touch and reduced-motion checks passed; the 3.4-second recording and screenshots are in `qa-screens/g18/`. Lighthouse returned Performance 95, Accessibility 100, Best Practices 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T095910Z`.

The 2026-08-15 G16 pass added the full-width dark `#object-one` plate immediately after the G14R hero, with the first key letter in AVIF, WebP and JPEG at four responsive widths and the supplied caption copy. The source remains unchanged; the 1280 variants meet their weight budgets and the AVIF text crop is readable. Checks at 375, 768, 1024, 1440 and 1920 found no horizontal overflow, preserved 4:5 geometry, aligned image and caption edges, no image effects or motion, and an empty console. Lighthouse returned Performance 95, Accessibility 100, Best Practices 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T095133Z`; all required routes and the 1280 AVIF returned HTTP 200, and local/active HTML and CSS hashes match. Evidence is in `audit-g16.md` and `qa-screens/g16/`.

The 2026-08-15 G14R pass replaced the previous hero with the supplied coin-tile lock-up, responsive two-column hero, four-stage index, two actions and an `IntersectionObserver` minibar. Checks at 375, 768, 1024, 1440 and 1920 found no horizontal overflow, one `h1`, one stage link and an empty console. Lighthouse returned Performance 95, Accessibility 100, Best Practices 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T093817Z`; all required public routes returned HTTP 200, Nginx and `coin-im-open` remained active, and local/active HTML and CSS hashes match. Evidence is in `audit-g14r.md` and `qa-screens/g14r/`.

The 2026-08-15 wax-dedup pass removed the duplicate wax-seal paragraph from Stage four while preserving the fuller paragraph in the envelope section. The adjacent delivery paragraphs remain direct siblings with no empty container or hanging heading, and `grep -c "closes with wax" index.html` returns `1`. The change is present in the active VPS release `/var/www/coin.im/releases/20260815T093817Z`; Nginx validation passed, the public routes returned HTTP 200, and before/after evidence is in `qa-screens/wax-dedup/`.

The 2026-08-15 G8M pass added the manual `/open` Business File intake and its encrypted API without accounts, status pages, result tokens, SMTP, workers, automatic scans, dashboards or countdowns. Files are streamed into AES-256-GCM ciphertext under `/var/lib/coin-im-open/jobs/<job_id>/files`; metadata is encrypted beside them; the key is `/etc/coin-im-open/encryption.key`; and SSH MOTD plus `sudo coin-open notifications` is the owner notification channel. Production tests returned `422` for missing required data and every private URL range, `415` for a forbidden extension, `413` above 200 MB and `429` on the sixth submission in one hour. A real test file was stored as 60 bytes of ciphertext with no plaintext match, the notification appeared, and `coin-open delete` returned the original filename before removing the whole job. `/handling` stayed byte-identical at SHA-256 `5a6c0cf942f2650deadef4d28cfe8e1525e3394cb4b15ce1cb602493e13664e9`. Production checks at 375, 430, 768, 1024, 1440 and 1920 found `scrollWidth === innerWidth`, one `h1`, no `www` links, no third-party resource hosts and an empty console. Lighthouse returned Performance 99, Accessibility 100 and SEO 100. Static and API releases are both `20260815T092516Z`; evidence is in `qa-screens/g8m/`.

The 2026-08-15 G14 pass replaced the hero mail action with one `Open a business file` stamp button to `/open`, added the supplied non-link response note, demoted the Market Scan action to a prose link, and rebuilt the four stage links with supplied subtitles and down arrows. Keyboard focus is visible, marker fill reaches both lines, reduced motion removes the transition, accent contrast is 13.80:1 for ink and 4.80:1 for muted text, and all four anchors land below the fixed header. Checks at 375, 768, 1024, 1440 and 1920 found `scrollWidth === innerWidth`; the actions stack only at the mobile breakpoint. Lighthouse returned Performance 95, Accessibility 100 and SEO 100. It is present in the combined active VPS release `/var/www/coin.im/releases/20260815T092516Z`; all required public routes returned HTTP 200 and local/active HTML and CSS hashes match. Evidence is in `qa-screens/g14/`.

The 2026-08-15 G15 pass rebuilt the English object catalogue as 12 ordered sections with one matching IMG-1/IMG-2 letter image after each text block. The supplied heading, introduction, new copy, closing paragraph and all 12 alt strings match; the first image is eager and the remaining 11 are lazy; the old key specimen, duplicated letter text, obsolete caption and removed object sections are absent. Browser checks at 375, 768, 1024, 1440 and 1920 found `scrollWidth === innerWidth`, preserved 4:5 image proportions, a `--measure-wide` maximum, and an empty console. Lighthouse returned Performance 96, Accessibility 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T091850Z`; production browser checks at 375 and 1440 found 12 sections, 12 image elements, no failed loads, no overflow and an empty console. All 12 production image URLs and the required site, handling, open and API health routes returned HTTP 200. Evidence is in `audit-g15.md` and `qa-screens/g15/`.

The 2026-08-15 G13 pass added the exact approved `Before a word is read` section after the object catalogue and before `Why paper, when email is free`. All 25 supplied COPY blocks match character-for-character; the removable handwritten-address paragraph remains in full; the six `h3` headings retain their specified order; and the section contains no lists, images, icons or new `.rest-band` elements. Local checks at 375, 768, 1024, 1440 and 1920 found `scrollWidth === innerWidth`, one page `h1`, and an empty console; production checks passed at those widths plus 430. Prose width is 667.78 px and minimum measured contrast is 9.31:1. Lighthouse returned Performance 98, Accessibility 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T085115Z`; all required public HTTPS checks passed and local/production hashes match. Screenshots and the Lighthouse report are in `qa-screens/g13/`.

The 2026-08-15 G11 pass added the exact approved `Why paper, when email is free` section between the object catalogue and `How we work together`, omitted the unfilled `0.0%` paragraph entirely, and added the two approved machine-checking paragraphs immediately after the unchanged Market Scan postage sentence. The home page still has three `.rest-band` elements; both pages have one `h1`; `ms.html` and `ms/index.html` are byte-identical; and the supplied COPY blocks match character-for-character. Local and production checks at 375, 768, 1024, 1440 and 1920 found `scrollWidth === innerWidth` with an empty console. Minimum measured contrast is 9.31:1 and maximum text width is 667.78 px. Lighthouse returned Performance 99, Accessibility 100 and SEO 100 for both pages. It was deployed to VPS release `/var/www/coin.im/releases/20260815T083411Z`; all required public HTTPS checks passed. Screenshots and Lighthouse reports are in `qa-screens/g11/`.

The 2026-08-15 infrastructure correction replaced the inaccurate Hetzner/Ashburn storage sentence on `/handling` with the verified Webdock/Copenhagen location while preserving the encryption-at-rest requirement for the planned AES-GCM upload service. Matching `handling.html` and `handling/index.html` files were deployed to VPS release `/var/www/coin.im/releases/20260815T082251Z`; `/handling` returns HTTP 200 with `Referrer-Policy: no-referrer`, the public page contains `Webdock` and no longer contains `Hetzner`, and all required public HTTPS checks passed. G8 was not exposed because OpenAI, Anthropic and SMTP credentials are absent and the current SPF policy authorises only the separate `mail.111.bz` MX.

The 2026-08-15 H1 pass added the factual `/handling` page as matching `handling.html` and `handling/index.html` files. Visible text matches every supplied COPY block after HTML whitespace normalisation, with one `h1`, seven supplied `h2` headings, no unresolved slots, no scripts, no external resources and minimum measured contrast of 9.31:1. Local and production checks at 375, 768, 1024, 1440 and 1920 found `scrollWidth === innerWidth` with an empty console. Production Lighthouse returned Performance 100, Accessibility 100 and SEO 100. Nginx serves `/handling` and `/handling/` with `Referrer-Policy: no-referrer`. It was deployed to VPS release `/var/www/coin.im/releases/20260815T080345Z`. The upload form, status page, cryptographic token generation and token revocation do not exist in this static repository and were not claimed as completed by this pass.

The 2026-08-15 G9 pass added the approved three-line reply-card mechanism and wax-seal explanation in exactly the requested positions without changing CSS, components, images, or the three existing `.rest-band` elements. `node scripts/check-copy.js` passes; `[month]` and `[name]` render literally; measured text contrast is 9.31:1; and local plus production browser checks at 375, 768, 1024, 1440 and 1920 found `scrollWidth === innerWidth` with an empty console. Lighthouse returned Performance 99, Accessibility 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T075410Z`; all required public HTTPS checks passed. Screenshots are in `qa-screens/g9/`.

The 2026-08-15 letter-gallery fix connected all 12 generated IMG-1 and IMG-2 WebP files to the visible `The objects` section on the English homepage. Public browser verification at `https://coin.im/#objects` found 12 DOM images, all 12 loaded, no failed requests, two mobile columns at 375 px, and no horizontal overflow. Local checks at 375, 430, 768, 1024, 1440 and 1920 also found no overflow. It was deployed to VPS release `/var/www/coin.im/releases/20260815T074758Z`; the home CSS cache key is `assets/home.css?v=20260815-letter-gallery`.

The 2026-08-15 audit-anchor pass restored the exact Market Scan anchor sentence `The interface will appear when it has real work to show.` while preserving the caveat as `Not before.`, and restored the second G9 home anchor `Then we design the envelope, mailer, protection, label, and postage around the finished piece—not the other way around. It should arrive clean, secure, and ready to open.` `ms.html` and `ms/index.html` are byte-identical, `node scripts/check-copy.js` passes, the home audit markers remain in place, and all raster images are below 700 KB. It was deployed to VPS release `/var/www/coin.im/releases/20260815T072601Z`; public HTTPS checks passed for `/`, `/ru`, `/es`, `/ms`, `/assets/base.css`, `/assets/home.css`, `/styles.css`, `/robots.txt`, `/sitemap.xml`, and `https://www.coin.im/`. Browser geometry checks for `/` and `/ms` at 375, 430, 768, 1024, 1440 and 1920 found no horizontal overflow and no console, page, or request errors.

The 2026-08-15 IMG-2 asset deployment generated letters 7-12 as complete ImageGen scenes without programmatic text overlays. Manual transcription matched every COPY block on the first attempt, including all three response-card lines in letter 10. The final WebP files are `1600x2000`, below 700 KB, and documented in `audit-img2.md`. VPS release `/var/www/coin.im/releases/20260815T061753Z` passed public HTTPS checks for `/`, `/ru`, `/es`, `/ms`, CSS assets, `robots.txt`, `sitemap.xml`, `https://www.coin.im/`, and all six new IMG-2 assets. CSS cache keys did not change during the IMG-2 work.

The 2026-08-15 proof-layout fix prevents `1,000,000+` from overflowing its grid track into `Over a million letters, posted.` The number now owns a max-content column, the proof section keeps its full desktop width, and the mobile layout remains stacked. Checks at 375, 430, 768, 821, 1024, 1180, 1440 and 1920 found zero overlap and no horizontal overflow; the approved text is unchanged. It was deployed to VPS release `/var/www/coin.im/releases/20260815T061514Z`; the production Retina check measured a 51.19 px gap with zero overlap. Screenshots are in `qa-screens/proof-readable/`.

The 2026-08-15 IMG-1 asset deployment regenerated six direct-mail letter images as whole generator outputs without programmatic text overlays, kept all final webp files at `1600x2000` and under 700 KB, and documented manual transcription/comparison in `audit-img1.md`. It was deployed to VPS release `/var/www/coin.im/releases/20260815T060106Z`; public HTTPS checks passed for `/`, `/ru`, `/es`, `/ms`, CSS assets, `robots.txt`, `sitemap.xml`, and `https://www.coin.im/`. CSS cache keys did not change.

The 2026-08-15 G10 pass added marker-fill and stamp interaction physics to both home-page buttons, strengthened prose-link underlines on hover, and added the exact `What we cannot do yet` copy after the unchanged delivery sentence. Both buttons passed keyboard focus checks, reduced motion disables transitions and rotation, five requested widths have no horizontal overflow, and measured button contrast is 13.797:1. Lighthouse returned Performance 99, Accessibility 100 and SEO 100. It was deployed to VPS release `/var/www/coin.im/releases/20260815T055944Z`; full evidence is in `audit-g10.md` and `qa-screens/g10/`.

The 2026-08-15 LS1 pass replaced the baked-text object catalogue images with one approved, selectable key-letter specimen; the other nine unapproved letter images were removed from active markup. Caveat is self-hosted as WOFF2 with Georgia fallback, the object crop contains no baked text, all five requested widths have no horizontal overflow, and the measured text contrast is 17.316:1. Lighthouse returned Performance 99, Accessibility 100 and SEO 100. It was deployed to `aged-star-171b` as version `6757a8dc-7ed8-43ee-bb74-04b5f7210637`; full evidence is in `audit-ls1.md` and `qa-screens/ls1/`.

The 2026-08-15 G7 rhythm pass removed stage numbers from the hero index and all four stage sections, replaced the four stage labels, and consolidated vertical rhythm around `--space-section`, `--space-block`, and `--space-tight`. The visible copy comparison changed only the approved labels and removed numbers. Checks at 375, 430, 768, 1024, 1440 and 1920 found no horizontal overflow; all four stage links reached their original anchors. Full measurements and before/after screenshots are in `audit-home-g7.md`.

The 2026-08-15 live-home review pass restored the three stronger legacy lines, converted the object catalogue from a two-column grid into ten alternating editorial spreads, completed the visible British-spelling pass, and replaced currency/medicine wording with non-regulated physical analogues. Responsive geometry passed at 375, 430, 768, 1024, 1440 and 1920 with no horizontal overflow; all ten catalogue images loaded. The remaining raster-letter reissue is documented in `audit-live-home.md` because no approved set of ten real first paragraphs exists in the repository.

The 2026-08-15 MS-2 local text pass removed all visible `may` occurrences from Market Scan, added the hypotheses hedge, reduced the object section to its main-page link, rebuilt the buyer-first FAQ and final CTA, and updated the document title. `ms.html` and `ms/index.html` are byte-identical. Checks at `375` and `1440` found no horizontal overflow. Lighthouse remained Performance 99, Accessibility 100 and SEO 100, with LCP improving from 1.8 s to 1.7 s. See `audit-ms2.md` for exact-match discrepancies and the two source-state limitations.

The 2026-08-15 G6 copy refresh changed exactly six approved home-page text fragments. `node scripts/check-copy.js` passes, screenshots at `375` and `1440` have no visual regression, and no horizontal overflow was found at either width. Lighthouse returned Performance 100, Accessibility 100 and SEO 100, with LCP 1.5 s. It was deployed to `aged-star-171b` as version `44d856b7-cefd-41f4-b50e-f4232f953e42`; `/`, `/ru`, `/es`, `/ms` and the CSS resources returned HTTP 200.

The 2026-08-13 refresh was checked at:

- `375`
- `430`
- `768`
- `1024`
- `1440`
- `1920`

Key checks passed:

- no horizontal overflow
- readable typography on mobile and desktop
- valid JSON-LD
- no missing image files
- no empty links
- all web images under 700 KB
- no forbidden AI-taxonomy badge phrases
- English and Russian visible text preserved during the last visual-only refresh
