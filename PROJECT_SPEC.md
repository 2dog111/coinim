# coin.im Project Specification

## Market Scan campaign page contract, 2026-09-14

The owner's third brief builds on the first two locally. /ms explains audience
research for the same physical Pilot/Scale campaigns. Shared homepage markup is
rendered into /ms by scripts/build-homepage.cjs, using the existing pricing
configuration and inquiry handler. /ms contains exactly one inquiry form;
its allowlisted source is `/ms`. Historical notes remain intact below the form
inside a closed disclosure with deep-link support. See MS_CHANGE_REPORT.md and
reference/release-ms-campaign-v3.json. Integrated briefs №1–№3 are deployed in VPS release `20260914T065214Z-campaign-v3`.
See VERSIONS.md for active paths, backups and verified public state.

## Campaign evidence and inquiry contract, 2026-09-14

The owner's explicit first and second briefs supersede earlier homepage pricing,
protected-example replacement exceptions and form-field requirements below. The
current source has Pilot (1,000 letters/$3,800) and Scale (10,000/$30,000), a labeled
field guide, local exact-decimal cost calculator and an inquiry requiring only
website, name and work email. Phone is conditional on the selected reply channel.
The five letters now use the exact first brief; the second brief preserves them.
Research details and the historical library remain available in disclosures.
See CHANGE_REPORT.md and reference/brief2.txt for the exact current scope.
Production deployment completed as part of release `20260914T065214Z-campaign-v3`.

## Homepage editorial contract, 2026-09-07

The owner-supplied editorial brief was applied with explicit exceptions: the Market Scan section and all five own/five historical examples remain byte-identical to the pre-edit version. They are protected by AGENTS.md and recorded hashes in docs/private/home-protected-sections-20260906.json. They are not to be shortened, hidden or polished with writing skills by a general editing instruction.

The supplied brief explicitly restores the Send your website CTA to /open on the hero and final section. The hero retains How it works to #business-file. This supersedes the earlier no-early-intake instruction for these two links. The existing enquiry form and its handler remain unchanged. Business introduction and report introduction use the supplied English text; a distinct approval/production section sits between objects and delivery. Standalone employee comparison removed, while the same argument inside a protected sample remains untouched. Homepage navigation excludes Message wall and old mail links. Market Scan link remains in its protected section and footer. No Telegram contact was restored.

/open gets only the supplied replacement opening explanation. Its form, file limits, notices, handlers and existing 72-hour text remain unchanged. The repository does not establish fulfilment of that timetable. Exact enclosure inclusion, video coverage and commercial terms for waiting/revisits also remain unspecified; no new promises were introduced.

## Campaign enquiry and contacts, 2026-09-06

The homepage now has a real short enquiry form at its end. Required: name, company, phone, work email and one reply channel (WhatsApp, SMS, Phone or Email). Office address is optional. There is no upload requirement. Corporate email is suggested by placeholder, without rejecting personal domains. POST `/api/open/leads` validates and stores encrypted metadata in the existing intake jobs directory, shares the owner notification/admin workflow and deduplicates retries by request identifier. Successful UI requires `received: true` from the server. Failed submissions retain fields.

The stable admin entrance is `/api/open/admin`, using the existing server admin key. Successful login sets an eight-hour HttpOnly Secure SameSite=Strict signed cookie. Existing secret panel links continue to work. Admin now includes company, office address and form source; existing jobs/files remain readable. Key contents are never published. Private data is outside static/backend releases.

Shared non-sticky header on homepage, English and Russian Market Scan: existing coin logo, 96px desktop wordmark, WhatsApp and SMS with generated glass icons. On narrow screens wordmark is 72px. Owner Telegram contact links removed across other public static pages; historical article mentions of Telegram remain source content. Phone/email are available as form reply preferences. New asset master and prompt notes are local in design/masters and docs/private/contact-ui-assets-20260906.md; only four optimized WebP icons deploy.

## Current route contract. 2026-09-06

The direct-mail service is now the English homepage at `/`. The paid three-slot wall is at `/message` and `/message/`, with all current placement data, checkout, receipts, archive, stats, rules and API routes preserved. `/message/<slug>` continues to serve individual message pages. The homepage is a static editorial landing; Nginx serves its `index.html`. The market service serves the wall at `/message` and `/message/`, retaining an internal `/` compatibility alias so old Nginx workers remain functional during a graceful reload. Public `/` is served statically by Nginx.

Homepage sources: `index.html`, `assets/direct-mail.css`, `assets/direct-mail.js`, and the optimized `assets/coin-letter-20260906.webp`. Source image master lives in `design/masters/`, outside the deploy allowlist. `message.html` and `message/index.html` are byte-identical local wall fallbacks and match the local backend `home.html`; root `index.html` no longer matches that template. The active production wall preserves its existing English content; the local fallback retains the pre-existing Russian work. Do not deploy unrelated local backend changes to reconcile that distinction.

Owner-set commercial offer: 10,000 letters for $30,000, or $3 per letter. Includes business research, Market Scan, recipient selection, copy, physical grabbers, printing, packaging, delivery and reporting. This price is supplied by the owner, not an independently validated cost estimate. The owner explicitly rejected the prior 500-letter model, calculator and quantity qualifications. They are removed from the landing and metadata. No legal disclaimers are to be added. Historical economics notes remain private and superseded. Reporting is handled with the team; no customer portal was implemented.

Homepage layout: no contents sidebar or contents disclosure. A single centred text column up to 75ch, with 22px desktop body text and at least 18px visible text throughout. Copy refined with the explicitly requested Anton skill. Market Scan and all ten original/historical examples remain. Homepage intake links belong only in the final start section and footer. The hero and header lead to the service explanation. Avoid repeating inventories, research subsections and full-story invitations; the single Market Scan continuation sits after its explanation.

`/mail` and `/mail/` retain the previous complete service page unchanged as the original longread. `/ms`, `/ms/`, `/msru`, `/msru/`, `/open` and `/handling` remain intact. The older route and product descriptions below document the previous state and are superseded by this contract where they disagree.

## Previous specification

`coin.im` is a one-page wall with exactly three occupied paid-message slots. The owner-published Russian wall has the linked Coin.im platform description in slot one at `14 USDT`, the linked Instagram profile `@adrieves19` in slot two at `12 USDT`, and the linkless `Просто сообщение` text in slot three at `10 USDT`. These placements were published by direct owner instruction without an on-chain receipt; that instruction does not imply or fabricate a payment. The prior seed placements remain in `/archive`. No fourth or unoccupied placement exists. Each current placement remains until a confirmed USDT payment outbids that slot by exactly `1 USDT`.

The ASGI service renders all three slots from the persistent market database. `index.html` and `server/coin_market/home.html` remain byte-identical emergency seed fallbacks. A confirmed outbid replaces only its selected slot, moves the prior placement to `/archive`, and leaves the other two slots unchanged.

The three slot numbers are permanent entity types:

- slot № 1 is a website and requires only a public non-social URL plus a 100 to 888 non-space-character description from the customer. Before a payment intent is created, the backend opens the public URL, extracts the page title and favicon, captures the visible first screen at `1600x1050`, optimizes the favicon and screenshot to WebP, keeps the screenshot under `700 KB`, and stores both images with the private intent. The captured title, favicon, and screenshot are published inside the website card only after payment confirmation. A failed page capture stops checkout and leaves no payment intent; a website without a usable favicon may still publish with its title and screenshot;
- slot № 2 is a social placement and requires a supported network choice, a matching public profile URL, and a 100 to 888 non-space-character pitch;
- slot № 3 is only a 100 to 888 non-space-character message. It has no name, URL, CTA, card-wide link, or share link. The server clears message-slot signature, location, and CTA metadata even if a client submits them directly.

The root hero exposes a direct `Publish here` action. `/takeover` is one publisher screen, not a chooser followed by a second form screen. It defaults to Message and keeps Website, Social, and Message as three large icon tabs with live prices above the active single-column form. Every type displays the exact next price, calculated as that slot's current confirmed price plus `1 USDT`. The form creates a private seven-minute payment receipt but does not charge or publish anything. The receipt provides the exact amount, the owner-approved USDT TRC-20 address, QR code, TronLink action, automatic chain monitoring, and manual transaction-ID fallback. A final matching transfer replaces the selected slot atomically. The previous placement moves to `/archive`; the other two placements and prices do not change.

Automatic amount-only discovery is limited to a live seven-minute receipt. Two live receipts may not reserve the same exact USDT amount at once. After a receipt expires, an already-sent transfer can be recovered only with its exact TRON transaction ID; a new payment must start from the current slot price. This prevents an unrelated or later transfer with the same amount from being attached to the wrong placement.

The complete English B2B direct-mail service remains at `/mail`; Market Scan remains at `/ms`; encrypted Business File intake remains at `/open`. Those routes and the existing intake API are separate from the takeover market.

## Local Files

- `index.html`: canonical static source and emergency fallback for the initial three-slot wall.
- `server/coin_market/home.html`: byte-identical root template whose three marked slot blocks are replaced from SQLite at request time.
- `assets/wall.css` and `assets/wall.js`: root wall layout, typography, dynamic total, and per-slot outbid links.
- `assets/coin-im-wall-screenshot.webp`: optimized local Chromium screenshot used by the owner-published Coin.im website placement.
- `assets/pen-screenshot.png`: retained optimized Chromium screenshot for the archived `pen.dev` seed placement.
- `assets/takeover.css` and `assets/takeover.js`: slot-aware checkout, receipt verification, live updates, sharing, and first-party metrics.
- `assets/social-glass-atlas.webp`: optimized GPT Image atlas for the 15 supported social-network choices and published social cards.
- `assets/logo.png`, `assets/logo-512.png`, `assets/logo-192.png`, `assets/apple-touch-icon.png`, and the favicon PNGs: the three-slot coin.im app icon and its production sizes.
- `assets/mock-site.html` and `assets/sreda-screenshot.png`: retained legacy mock assets; the fixed root does not load them.
- `server/coin_market/`: SQLite-backed takeover market, payment verification, isolated automatic website capture, atomic reign switching, receipts, archive, stats, badges, posters, admin, and operational CLI.
- `server/deploy/coin-im-screenshot.service`: local-only Chromium capture worker. It runs as `coinscreenshot` without market secrets or database access.
- `server/coin_market/migrations/`: append-safe market schema migrations.
- `server/tests_market/`: business-logic, integration, and browser-journey tests.
- `mail.html` and `mail/index.html`: full English direct-mail landing, served at `/mail` and `/mail/`.
- `ru.html`: Russian version, served at `/ru`. Do not expose it from the English homepage unless explicitly requested.
- `es.html`: Spanish version, served at `/es`. Do not expose it from the English homepage unless explicitly requested.
- `styles.css`: shared visual system for English and Russian pages.
- `ms.css`: Market Scan longread visual system, served by `ms.html`.
- `msru.html` and `msru/index.html`: Russian Market Scan story page, served at `/msru`.
- `assets/msru.css` and `assets/msru.js`: shared Market Scan reference UI and section navigation for the Russian source page and its English translation.
- `handling.html` and `handling/index.html`: factual file-handling page, served at `/handling`.
- `open.html` and `open/index.html`: manual Business File intake, served at `/open`.
- `server/coin_open/`: encrypted manual intake API deployed separately from the static web root.
- `robots.txt`: crawler and AI-agent access policy.
- `llms.txt`: concise language-aware reference for AI agents.
- `sitemap.xml`: public sitemap.
- `ai.html`: AI/notes page, currently `noindex, nofollow`.
- `s.html`: short/notes page, currently `noindex, nofollow`.
- `assets/`: logo, social images, letter photos, grabber examples, favicon files.
- `AGENTS.md`: project rules for future Codex work.
- `VERSIONS.md`: local version/deployment reference.

## Non-Negotiable Content Rules

- Do not split the approved long English text into unrelated blocks.
- Do not rewrite approved text unless the user explicitly asks for copy changes.
- Keep the complete approved English service copy on `/mail`; the move from the former homepage must not shorten or rewrite its visible body.
- Do not remove profanity from supplied English source text unless the user explicitly asks.
- Do not add visible Russian-version links to the main English page unless the user explicitly asks.
- Do not add badges, eyebrow labels, small section labels, standalone number chips, decorative pills, or AI-taxonomy lists.
- Never add terms like `Entity discovery`, `Entity resolution`, `Company matching`, `Deduplication`, `Role mapping`, `Seniority filtering`, `Decision-maker identification`, or `Buying-committee mapping` as decorative labels.
- Keep essential meaning in body copy, not in generic feature badges.

## Visual Direction

- High readability comes first.
- Use dark text on light backgrounds.
- Avoid white body text.
- Avoid bold and heavy font weights. Typography should be thin, readable, and well-spaced; hierarchy should come from size, rhythm, and layout rather than weight.
- Avoid heavy blur, low-contrast type, and decorative backgrounds that make reading harder.
- The root should feel expensive, calm, public, human, and slightly dangerous without crypto imagery or generic SaaS treatment.
- The root uses warm white `#faf9f6`, Inter for the interface, Newsreader 400 for long messages, and no uppercase interface copy except `USDT` and `UTC`.
- The `/mail` landing remains solid, premium, direct-response, editorial, and physical-mail focused.
- The Russian `/msru` page is the canonical Market Scan source for both copy and UI. The English `/ms` page is its complete translated port with the same information architecture and behavior.
- Future Spanish work requires a separate instruction and a complete language-specific translation and validation pass.
- The first `/mail` viewport must clearly show `coin.im`, contact options, and the physical-letter idea.
- On mobile, the root hero must remain short enough for the first paid slot to begin inside the initial viewport.
- Keep WhatsApp and Telegram contact buttons visually recognizable:
  - WhatsApp: green brand cue.
  - Telegram: blue brand cue.
  - Contact number: `+66 63 393 3143`.
  - Telegram handle: `@am7am`.
- Use real existing mail/grabber images where possible.
- Do not add new large images unless optimized under 700 KB.

## SEO And AI-Agent Structure

Current canonical structure:

- Homepage canonical: `https://coin.im/`
- Archive canonical: `https://coin.im/archive`
- Stats canonical: `https://coin.im/stats`
- Rules canonical: `https://coin.im/rules`
- English service canonical: `https://coin.im/mail`
- Russian canonical: `https://coin.im/ru`
- Spanish canonical: `https://coin.im/es`
- English `hreflang`: `en`
- Russian `hreflang`: `ru`
- Spanish `hreflang`: `es`
- Default `hreflang`: `x-default`
- Open Graph and Twitter images are local assets.
- JSON-LD uses `Organization`, `Service`, and `WebPage` on `/mail`; the paid wall homepage relies on its canonical and Open Graph metadata.
- JSON-LD uses `Organization` and `WebPage` on Russian.
- `robots.txt` allows crawling and includes:
  - `Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference`
  - `Sitemap: https://coin.im/sitemap.xml`

Do not add fake FAQ/schema blocks unless matching visible page content exists.

## Accessibility And Responsive Requirements

Before deployment after visual/layout changes, check:

- `375`
- `390`
- `393`
- `430`
- `768`
- `1024`
- `1440`
- `1920`

Required outcome:

- no horizontal overflow
- contact cards remain tappable
- body text stays readable
- hero text does not overlap
- images load and do not crush text
- no empty links
- meaningful alt text for real images
- valid JSON-LD

For small text-only edits, follow `AGENTS.md`: do not run full browser checks unless explicitly requested.

## Deployment

Do not deploy unless the current user message explicitly says to deploy.

Current production deployment is the VPS flow in `DEPLOY.md`.

The root, market pages, and `/api/market/` are served by the isolated `coin-im-market` service. The local-only `coin-im-screenshot` service captures public website titles, favicons, and first screens on `127.0.0.1:8783` in an isolated Chromium process before checkout. Its browser files live at `/var/lib/coin-im-screenshot/browsers`; it has no market environment file or database access. Persistent market data, including optimized website screenshots and favicons stored as SQLite blobs, is outside the release tree at `/var/lib/coin-im-market/market.sqlite3`. Static routes and the existing `coin-im-open` service keep their separate release and data paths.

Use a clean temporary static directory for deployment. Include only the files needed for the site:

- `index.html`
- `mail.html`
- `mail/index.html`
- `ru.html`
- `es.html`
- `ai.html`
- `s.html`
- `ms.html`
- `ms/index.html`
- `msru.html`
- `msru/index.html`
- `handling.html`
- `handling/index.html`
- `open.html`
- `open/index.html`
- `llms.txt`
- `styles.css`
- `ms.css`
- `robots.txt`
- `sitemap.xml`
- `assets/`

After deployment, verify:

- `https://coin.im/`
- `https://coin.im/ru`
- `https://coin.im/es`
- `https://coin.im/mail`
- `https://coin.im/styles.css?v=<current-version>`
- `https://coin.im/ms.css?v=<current-ms-version>`
- `https://coin.im/msru`
- production HTML references the current CSS version
- production text did not drift from local text when the task was visual-only

Then update `VERSIONS.md`.

VPS origin deployment:

- Host: `iva` / `193.181.215.57`
- Web root: `/var/www/coin.im/current`
- Releases: `/var/www/coin.im/releases/<timestamp>`
- Nginx config: `/etc/nginx/conf.d/coin.im.conf`
- Use the same clean temporary static directory contents listed above.
- Keep `/`, `/mail`, `/mail/`, `/ru`, `/es`, `/ms`, and `/msru` working through Nginx `try_files`.
- After rsync, verify direct origin HTTP before changing DNS.
- DNS already points to the VPS through Cloudflare DNS-only records. TLS is issued on the VPS through certbot.

## Current Operational Boundaries

- `/open` is a manual Business File intake, not an automatic Market Scan product.
- Uploaded files and metadata are encrypted with AES-256-GCM by the intake API and stored outside the static web root.
- The current intake has no account system, result page, result token, SMTP delivery, automated OpenAI/Anthropic processing, worker queue, dashboard, or countdown.
- The takeover backend, schema, UI, archive, receipts, moderation controls, and TronGrid adapter exist independently of the legacy intake service.
- Production payment creation stays disabled until a real owner-approved USDT TRC20 receiving address and TronGrid API key are configured. A disabled market must not expose actionable payment controls or create intents.
- The mock payment provider works only on localhost and must never be enabled in production.
- No real USDT is sent during QA. Finality and idempotency are tested locally; live mainnet payment verification requires a separately approved low-value production transaction.
- API credentials, encryption keys, SMTP credentials, and other secrets belong on the VPS only and must never be committed.

## Current Contacts

- Email: `mail@coin.im`
- WhatsApp: `+66 63 393 3143`
- WhatsApp link: `https://wa.me/66633933143`
- Telegram: `@am7am`
- Telegram link: `https://t.me/am7am`

## Working Rule For Future Edits

First inspect current files. Preserve unrelated changes. Keep changes minimal and production-ready. If the user says text must not change, compare visible text before and after. Keep `mail.html` and `mail/index.html`, `ms.html` and `ms/index.html`, `handling.html` and `handling/index.html`, and `open.html` and `open/index.html` byte-identical.
