# G14R audit

## Result

- Production release: `/var/www/coin.im/releases/20260815T093817Z`
- Home CSS key: `assets/home.css?v=20260815-g14r`
- Lighthouse: Performance 95, Accessibility 100, Best Practices 100, SEO 100
- Public `/open`: HTTP 200
- Nginx and `coin-im-open`: active

## Structure and copy

- One `h1`: `Notifications disappear. A letter stays.`
- Primary action: `/open`
- Secondary action: `/ms`
- Exactly one stage link, Stage 01 to `/ms`
- Minibar uses `IntersectionObserver`; no scroll listener
- No `linear-gradient` or `backdrop-filter`
- No horizontal overflow at 375, 768, 1024, 1440, or 1920 px
- Browser console was empty at all tested widths

## Responsive measurements

| Width | Tile | Brand | Primary | Hero grid |
| ---: | ---: | ---: | ---: | --- |
| 375 | 68 px | 40 px | 51 px | one column |
| 768 | 88 px | 40 px | 49 px | one column |
| 1024 | 104 px | 53.248 px | 49 px | one column |
| 1440 | 120 px | 74.88 px | 49 px | two columns |
| 1920 | 120 px | 80 px | 49 px | two columns |

The visible minibar tile is 36 px and its reeding is hidden.

## Evidence

- Hero screenshots: `qa-screens/g14r/hero-375.png`, `hero-768.png`, `hero-1024.png`, `hero-1440.png`, `hero-1920.png`
- Tile crops: `qa-screens/g14r/tile-375.png`, `tile-1920.png`
- Visible minibar: `qa-screens/g14r/minibar-visible.png`
- Lighthouse reports: `qa-screens/g14r/lighthouse.report.html`, `lighthouse.report.json`
- Local and active VPS SHA-256 match for `index.html` and `assets/home.css`

## Public verification

HTTP 200 was returned by `/`, `/ru`, `/es`, `/ms`, `/handling`, `/open`, `/api/open/health`, the required CSS assets, `robots.txt`, `sitemap.xml`, and `https://www.coin.im/`. Nginx configuration passed validation and the certificate for `coin.im` and `www.coin.im` is valid through 2026-11-13.
