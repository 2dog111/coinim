# coin.im Project Specification

## Purpose

`coin.im` is a one-page wall with exactly three occupied paid-message slots. Slot one starts as the linked `pen.dev` website placement at `14 USDT`, slot two starts as the linked `@midnightdrafter` X placement at `12 USDT`, and slot three starts as the `On silence.` message at `10 USDT`. No fourth or unoccupied placement exists. Each placement remains until a confirmed USDT payment outbids that slot by exactly `1 USDT`.

The ASGI service renders all three slots from the persistent market database. `index.html` and `server/coin_market/home.html` remain byte-identical emergency seed fallbacks. A confirmed outbid replaces only its selected slot, moves the prior placement to `/archive`, and leaves the other two slots unchanged.

The three slot numbers are permanent entity types:

- slot № 1 is a website and requires a headline, a 111 to 888 non-space-character description, and a public non-social URL;
- slot № 2 is a social placement and requires a 111 to 888 non-space-character pitch plus a supported public social-profile URL; its optional short note appears after the profile handle;
- slot № 3 is a text-only message with an optional name and must not contain a public URL.

Every card displays the exact next price, calculated as that slot's current confirmed price plus `1 USDT`. The selected form creates a private seven-minute payment receipt but does not charge or publish anything. The receipt provides the exact amount, the owner-approved USDT TRC-20 address, QR code, TronLink action, automatic chain monitoring, and manual transaction-ID fallback. A final matching transfer replaces the selected slot atomically. The previous placement moves to `/archive`; the other two placements and prices do not change.

The complete English B2B direct-mail service remains at `/mail`; Market Scan remains at `/ms`; encrypted Business File intake remains at `/open`. Those routes and the existing intake API are separate from the takeover market.

## Local Files

- `index.html`: canonical static source and emergency fallback for the initial three-slot wall.
- `server/coin_market/home.html`: byte-identical root template whose three marked slot blocks are replaced from SQLite at request time.
- `assets/wall.css` and `assets/wall.js`: root wall layout, typography, dynamic total, and per-slot outbid links.
- `assets/pen-screenshot.png`: optimized real Chromium screenshot used by the `pen.dev` placement.
- `assets/takeover.css` and `assets/takeover.js`: slot-aware checkout, receipt verification, live updates, sharing, and first-party metrics.
- `assets/logo.png`, `assets/logo-512.png`, `assets/logo-192.png`, `assets/apple-touch-icon.png`, and the favicon PNGs: the three-slot coin.im app icon and its production sizes.
- `assets/mock-site.html` and `assets/sreda-screenshot.png`: retained legacy mock assets; the fixed root does not load them.
- `server/coin_market/`: SQLite-backed takeover market, payment verification, atomic reign switching, receipts, archive, stats, badges, posters, admin, and operational CLI.
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

The root, market pages, and `/api/market/` are served by the isolated `coin-im-market` service. Persistent market data is outside the release tree at `/var/lib/coin-im-market/market.sqlite3`. Static routes and the existing `coin-im-open` service keep their separate release and data paths.

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
