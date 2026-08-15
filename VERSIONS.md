# coin.im Versions

This is the local place to check the current site version before edits or deployment.

## Current Version

- Local site version: `2026-08-15-072601Z-vps-audit-anchors`
- Home base CSS cache key in HTML: `assets/base.css?v=20260815-g5`
- Home CSS cache key in HTML: `assets/home.css?v=20260815-proof-readable`
- Market Scan base CSS cache key in HTML: `assets/base.css?v=20260815-g5`
- Market Scan CSS cache key in HTML: `assets/ms.css?v=20260815-g5`
- Main production URL: `https://coin.im/`
- Russian page URL: `https://coin.im/ru`
- Spanish page URL: `https://coin.im/es`
- Market Scan page URL: `https://coin.im/ms`
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
- Active release: `/var/www/coin.im/releases/20260815T072601Z`
- Current symlink: `/var/www/coin.im/current`
- Nginx config: `/etc/nginx/conf.d/coin.im.conf`
- Certbot issued a Let's Encrypt certificate for `coin.im` and `www.coin.im`; it expires on `2026-11-13` and is configured for automatic renewal.
- Clean release deployed with `62` files.
- Public HTTPS checks passed for `https://coin.im/`, `/ru`, `/es`, `/ms`, `/assets/base.css`, `/assets/home.css`, `/styles.css`, `/robots.txt`, `/sitemap.xml`, and `https://www.coin.im/`.

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
