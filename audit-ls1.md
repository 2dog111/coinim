# coin.im LS1 letter specimen audit

Date: 2026-08-15

## Delivered

- Added one approved `.specimen--letter` for the key.
- Kept DOM order: object, sheet, caption.
- Removed the other nine baked-text letter images from active catalogue markup; their existing object descriptions remain.
- Added local `assets/fonts/caveat-latin-400-normal.woff2` and its SIL OFL licence.
- Cropped `assets/grabber-key-object.webp` from the source at `320 x 560`, offset `260 x 105`. The active crop contains the key and paper only, with no baked text.
- Deployed Worker version `6757a8dc-7ed8-43ee-bb74-04b5f7210637`.

## Responsive checks

| Viewport | Scroll width | Overflow | Component screenshot |
| --- | ---: | --- | --- |
| 375 | 375 | none | `qa-screens/ls1/specimen-component-375.png` |
| 768 | 768 | none | `qa-screens/ls1/specimen-component-768.png` |
| 1024 | 1024 | none | `qa-screens/ls1/specimen-component-1024.png` |
| 1440 | 1440 | none | `qa-screens/ls1/specimen-component-1440.png` |
| 1920 | 1920 | none | `qa-screens/ls1/specimen-component-1920.png` |

At 375 the object, sheet and caption are stacked in DOM order. At 768 and above the object and sheet share a row in `5fr 7fr` columns and the caption spans both.

## Text, font and accessibility

- `.specimen__hand`: `Mr Adeyemi —`, 12 characters, one instance.
- Computed hand size is exactly `1.2x` the body size at all five widths.
- Hand and body contrast on `--paper-raised`: `17.316:1` each.
- Body copy is Georgia; the active hand stack is `Caveat, Georgia, serif`.
- The full 489-character sheet selection succeeded; `window.find("roughly four seconds")` returned `true`.
- Selection screenshot: `qa-screens/ls1/text-selection-768.png`.
- With the WOFF2 request blocked, `document.fonts.check("20px Caveat")` returned `false` and the 375 screenshot remained readable in Georgia: `qa-screens/ls1/fallback-georgia-375.png`.
- Reduced-motion emulation matched and returned zero document animations; every specimen node computed `animation-name: none`, `animation-duration: 0s`, and `transition-duration: 0s`.
- The only active specimen image has alt text `A cut key blank taped to the head of a letter.`

## Network and performance

- A clean local navigation made five requests, all to `http://127.0.0.1:4180`: HTML, base CSS, home CSS, the local WOFF2 and the cropped WebP. Evidence: `qa-screens/ls1/network-request-log.png` and `qa-screens/ls1/playwright-evidence.json`.
- No external font, library or CDN URL exists in `assets/home.css`.
- The public Cloudflare response receives an account-level analytics beacon from `static.cloudflareinsights.com`. It is injected at the edge and is absent from local HTML/CSS; the strict public third-party-origin count is therefore one until Browser Insights is disabled in Cloudflare.
- Lighthouse: Performance 99, Accessibility 100, SEO 100, LCP 1.8 s, CLS 0.
- Lighthouse screenshot: `qa-screens/ls1/lighthouse-scores.png`; complete reports: `qa-screens/ls1/lighthouse.report.html` and `.json`.

## Production verification

- `https://coin.im/`, `/ru`, `/es`, `/ms` and the Worker URL returned HTTP 200.
- The public homepage references `assets/home.css?v=20260815-ls1-letter-2`.
- The public WOFF2 is `48,836` bytes and the cropped WebP is `19,612` bytes.
- Public `<main>` text matches local `<main>` text after HTML whitespace normalisation.
- Public HTML contains one `.specimen__hand`, the approved letter copy and the new crop; it contains no active `grabber-key-letter.webp` reference.

