# G16 audit

## Source

- Path: `assets/img1-letter-01-key.webp`
- Format: WebP
- Dimensions: 1600 x 2000 px
- Size: 232600 bytes
- The source was not modified.

## Derivatives

| File | Dimensions | Format | Bytes |
| --- | ---: | --- | ---: |
| `img1-letter-01-key-640.avif` | 640 x 800 | AVIF | 18487 |
| `img1-letter-01-key-640.webp` | 640 x 800 | WebP | 49600 |
| `img1-letter-01-key-640.jpg` | 640 x 800 | JPEG | 94785 |
| `img1-letter-01-key-960.avif` | 960 x 1200 | AVIF | 38259 |
| `img1-letter-01-key-960.webp` | 960 x 1200 | WebP | 94276 |
| `img1-letter-01-key-960.jpg` | 960 x 1200 | JPEG | 192874 |
| `img1-letter-01-key-1280.avif` | 1280 x 1600 | AVIF | 117912 |
| `img1-letter-01-key-1280.webp` | 1280 x 1600 | WebP | 134320 |
| `img1-letter-01-key-1280.jpg` | 1280 x 1600 | JPEG | 251733 |
| `img1-letter-01-key-1920.avif` | 1920 x 2400 | AVIF | 219826 |
| `img1-letter-01-key-1920.webp` | 1920 x 2400 | WebP | 226012 |
| `img1-letter-01-key-1920.jpg` | 1920 x 2400 | JPEG | 511133 |

All derivatives preserve the 4:5 source ratio without cropping. The 1280 variants meet their weight budgets. The handwritten lines remain readable in the AVIF evidence crop.

## Browser checks

At 375, 768, 1024, 1440 and 1920 px:

- `document.documentElement.scrollWidth === innerWidth`: true
- image `naturalWidth`: non-zero
- plate background: `rgb(22, 19, 15)`
- `a[href="#object-one"]`: present
- image and caption left edges: equal
- rendered ratio: 0.8
- border: none; radius: 0; shadow: none
- transition duration: 0s; animation: none
- console errors and warnings: 0

## Evidence

- Section screenshots: `qa-screens/g16/section-375.png`, `section-768.png`, `section-1024.png`, `section-1440.png`, `section-1920.png`
- AVIF text crop: `qa-screens/g16/avif-1280-text-crop.png`
- Lighthouse screenshot: `qa-screens/g16/lighthouse-final.png`
- Lighthouse report: `qa-screens/g16/lighthouse.report.html` and `.json`
- Lighthouse: Performance 95, Accessibility 100, Best Practices 100, SEO 100

## Production

- Release: `/var/www/coin.im/releases/20260815T095133Z`
- Home CSS key: `assets/home.css?v=20260815-g16`
- Required site routes, API health, CSS files, and the 1280 AVIF returned HTTP 200.
- Nginx and `coin-im-open` are active; Nginx configuration passed validation.
- Local and active VPS SHA-256 hashes match for `index.html` and `assets/home.css`.
