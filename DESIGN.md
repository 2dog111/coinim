# coin.im Market Scan Reference Design

## Status

- Status: `publicly verified`, bilingual editorial dossier v2.
- Canonical source screen: Russian Market Scan at `/msru`.
- English Market Scan at `/ms` is the complete English language port of the same editorial system and current Russian source text.
- Active public production release: `/var/www/coin.im/releases/20260828T060451Z`.
- A future Spanish Market Scan page does not exist yet.

## Design Idea

The page is a proofed print dossier, not a SaaS product screen. It should feel like an expensive editorial edition built from paper, ink, registration marks, proof lines, and physical-mail geometry. The design supports the first-person argument without adding or rewriting copy.

## Audience And Primary Action

- Audience: an owner or operator deciding whether to buy another contact list or build a market map first.
- Primary action: transfer source materials through `/open` for a manual Market Scan intake.
- Secondary action: contact the owner in Telegram.

## Visual System

- Warm paper `#f4efe6`, ink `#1e1b16`, wax terracotta `#b4552d`, muted proof rules, and a subtle SVG paper grain.
- Source Serif 4 carries the editorial voice. Technical proof, table labels, and compact interface text use the existing monospaced stack.
- Typography stays light. Hierarchy comes from scale, measure, spacing, contrast, chapter counters, drop caps, and proof marks.
- The image-free hero uses a faint constructed envelope outline instead of a photograph. The benchmark and final action are the only dark editorial events.
- No badges, pills, feature-card grids, decorative taxonomies, heavy weights, glossy SaaS effects, stock imagery, or arrow ornaments.

## Canonical Layout

- On desktop in both languages, the hero and all five story parts share one stable twelve-column editorial axis: the main heading stays on the left and its explanation stays on the right. Headings never alternate sides between sections.
- Story headings remain within their own section while the right reading column advances. Below 1180 px, the same material becomes one continuous column.
- Both headers use the existing envelope mark, the `coin.im` wordmark, and the `Market Scan` descriptor. They hide while the reader scrolls down, return on upward movement, carry the reading progress line, and report the current chapter plus estimated minutes remaining.
- A five-link chapter strip follows the hero. It stays below the header, becomes the top navigation when the header hides, scrolls horizontally on narrow screens, and shares scroll-spy state with the delayed desktop rail.
- At 1240 px and above, a fixed contents rail appears only after the story begins and marks the current part.
- Below 1240 px, neither language has an early floating contents control; the chapter strip remains the navigation surface.
- The five story parts use one continuous paper tone, chapter counters, thin proof rules, a reading measure of about 41 rem, and one consistent left-heading/right-prose composition.
- The benchmark is a dark full-width evidence panel with monospaced data and animated comparison bars. On narrow screens it scrolls horizontally inside its own panel without widening the document.
- The qualification passage is followed by a dark anti-filter note, a quiet action, a four-item result inventory, and a single-column FAQ. The final CTA remains the only loud action and uses the dark sealed-envelope composition with `/open` and Telegram.
- Neither hero has an intake button, story link, photograph, part marker, or resume prompt. A compact passport states the physical-mail channel, the product-first method, and the documented proof before the chapter strip starts the story.
- Five collapsible proof notes pull only documented numbers and statements from adjacent paragraphs. They are open on desktop and closed on mobile. One exact sentence about paid industry vocabulary is duplicated as a full editorial quote.
- On wide screens the contents rail stays hidden during the first two minutes and through part one. It appears from part two onward, remains fixed, and uses outcome-led section labels large enough to scan without covering the reading measure.

## Content And Product Invariants

- The Russian author text remains the source of truth. The English author text follows it in the same order and carries the same facts, including digit-form currency values.
- Each page has one H1, five story H2 headings, 25 story H3 headings, three interface H3 headings, 150 paragraphs, and five story sections.
- Each language has four placements linking to `/open`: the existing middle and final actions plus two quiet conversion links.
- `/open` is a manual Business File intake. The page must not imply an account, automated scan, result dashboard, or guaranteed outcome.
- Existing reading-resume behavior and analytics remain active. The new reveals, reading estimate, scroll spy, proof-note state, and fixed-duration anchor scroll are progressive enhancement and never hide content when JavaScript or motion is unavailable.

## Accessibility And Performance

- Compact interface text remains legible and the story body stays at 18 px or above on narrow screens.
- Links and controls have visible keyboard focus. The skip link remains first in the document.
- Reduced-motion and print modes remove nonessential navigation, reveal, anchor-scroll, and FAQ-icon motion.
- The layout must not overflow horizontally at 375, 430, 768, 1024, 1440, or 1920 px.
- The static Russian and English Open Graph images are 1200 by 630 pixels and remain below the project limit of 700 KB each.

## Language Ports

Russian `/msru` remains the source reference. English `/ms` shares the same editorial structure, CSS, JavaScript, interaction model, and proof hierarchy, with language-specific text, metadata, geometry, route hashes, and Open Graph image. A future Spanish port still requires a separate command, translation, metadata review, and browser-validation pass.

## Homepage And Direct Mail Route

- Status: `publicly verified` in `/var/www/coin.im/releases/20260828T090224Z`.
- `/mail` carries the complete former English homepage without visible body-copy changes. Its canonical, Open Graph URL, hreflang, and WebPage plus Service identifiers point to `/mail`.
- `/` is THE COIN-OPERATED PUBLIC MESSENGER: one public wire of reviewed messages whose senders can put coin behind placement and time.
- The homepage is a text-first public telegraph. Warm paper, black ink, pale yellow message-only entries, neutral linked entries, thin rules, light Source Serif 4, and monospaced metadata carry the visual system. It uses no crypto imagery, gradients, glass, stock images, badges, social metrics, or card-grid treatment.
- The hero stays compact enough for the first message to begin in the initial mobile viewport. The feed is one reading column; message-only entries are larger and more spacious than linked entries.
- Seed messages carry no fake authors, dates, amounts, transactions, or verified states. A verified payment marker can render only when the data contains verified status, amount, currency, transaction hash, and transaction URL.
- The placement form is a native dialog with a 500-character field, optional HTTP or HTTPS link, reply contact, character count, and live publication preview. It opens a prefilled email to `mail@coin.im`; there is no checkout or success claim.
- The root keeps the existing favicon, font, focus treatment, and analytics, and adds no dependency or page imagery.
