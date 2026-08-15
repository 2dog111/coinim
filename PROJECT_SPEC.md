# coin.im Project Specification

## Purpose

`coin.im` is a static B2B direct-mail landing site.

The offer: research the right companies and decision-makers, write direct-response letters, create physical grabbers, produce the mail pieces, and manage tracked delivery.

The page should feel like a serious editorial landing page, not a generic AI/SaaS template.

## Local Files

- `index.html`: English landing page and canonical homepage.
- `ru.html`: Russian version, served at `/ru`. Do not expose it from the English homepage unless explicitly requested.
- `es.html`: Spanish version, served at `/es`. Do not expose it from the English homepage unless explicitly requested.
- `styles.css`: shared visual system for English and Russian pages.
- `ms.css`: Market Scan longread visual system, served by `ms.html`.
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
- The landing should feel solid, premium, direct-response, editorial, and physical-mail focused.
- The first viewport must clearly show `coin.im`, contact options, and the physical-letter idea.
- Keep WhatsApp and Telegram contact buttons visually recognizable:
  - WhatsApp: green brand cue.
  - Telegram: blue brand cue.
  - Contact number: `+66 63 393 3143`.
  - Telegram handle: `@am7am`.
- Use real existing mail/grabber images where possible.
- Do not add new large images unless optimized under 700 KB.

## SEO And AI-Agent Structure

Current canonical structure:

- English canonical: `https://coin.im/`
- Russian canonical: `https://coin.im/ru`
- Spanish canonical: `https://coin.im/es`
- English `hreflang`: `en`
- Russian `hreflang`: `ru`
- Spanish `hreflang`: `es`
- Default `hreflang`: `x-default`
- Open Graph and Twitter images are local assets.
- JSON-LD uses `Organization`, `Service`, and `WebPage` on English.
- JSON-LD uses `Organization` and `WebPage` on Russian.
- `robots.txt` allows crawling and includes:
  - `Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference`
  - `Sitemap: https://coin.im/sitemap.xml`

Do not add fake FAQ/schema blocks unless matching visible page content exists.

## Accessibility And Responsive Requirements

Before deployment after visual/layout changes, check:

- `375`
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

Use a clean temporary static directory for deployment. Include only the files needed for the site:

- `index.html`
- `ru.html`
- `es.html`
- `ai.html`
- `s.html`
- `ms.html`
- `ms/index.html`
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
- `https://coin.im/styles.css?v=<current-version>`
- `https://coin.im/ms.css?v=<current-ms-version>`
- production HTML references the current CSS version
- production text did not drift from local text when the task was visual-only

Then update `VERSIONS.md`.

VPS origin deployment:

- Host: `iva` / `193.181.215.57`
- Web root: `/var/www/coin.im/current`
- Releases: `/var/www/coin.im/releases/<timestamp>`
- Nginx config: `/etc/nginx/conf.d/coin.im.conf`
- Use the same clean temporary static directory contents listed above.
- Keep `/`, `/ru`, `/es`, and `/ms` working through Nginx `try_files`.
- After rsync, verify direct origin HTTP before changing DNS.
- DNS already points to the VPS through Cloudflare DNS-only records. TLS is issued on the VPS through certbot.

## Current Operational Boundaries

- `/open` is a manual Business File intake, not an automatic Market Scan product.
- Uploaded files and metadata are encrypted with AES-256-GCM by the intake API and stored outside the static web root.
- The current intake has no account system, result page, result token, SMTP delivery, automated OpenAI/Anthropic processing, worker queue, dashboard, or countdown.
- Do not claim those capabilities as live until their server-side implementation and production configuration have been verified.
- API credentials, encryption keys, SMTP credentials, and other secrets belong on the VPS only and must never be committed.

## Current Contacts

- Email: `mail@coin.im`
- WhatsApp: `+66 63 393 3143`
- WhatsApp link: `https://wa.me/66633933143`
- Telegram: `@am7am`
- Telegram link: `https://t.me/am7am`

## Working Rule For Future Edits

First inspect current files. Preserve unrelated changes. Keep changes minimal and production-ready. If the user says text must not change, compare visible text before and after. Keep `ms.html` and `ms/index.html`, `handling.html` and `handling/index.html`, and `open.html` and `open/index.html` byte-identical.
