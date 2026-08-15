# Homepage G10 Interaction and Limits Audit

## Button Physics

- The two page buttons use `.btn`; the hero CTA also uses `.btn--stamp`.
- Marker fill measured from left to right: `scaleX(0)` at 0 ms, `scaleX(0.861859)` at 90 ms, and `scaleX(1)` after 220 ms. The transition duration is 180 ms.
- The stamp rotation measured `-0.500000219deg` on hover and keyboard focus.
- Active state measured `translateY(0.999962px)` with `rgba(0, 0, 0, 0.14) 0 1px 2px inset`.
- Text-link underline thickness measured 1 px at rest and 2 px on hover.
- Keyboard traversal reached both buttons. Each measured a solid 2 px `rgb(22, 19, 15)` focus outline.
- With `prefers-reduced-motion: reduce`, button and marker transitions measured 0 s, document animations measured 0, and the stamp transform was `none`.

Screenshots:

- `qa-screens/g10/button-fill-0ms.png`
- `qa-screens/g10/button-fill-90ms.png`
- `qa-screens/g10/button-fill-220ms.png`
- `qa-screens/g10/button-active.png`
- `qa-screens/g10/button-focus-visible.png`
- `qa-screens/g10/button-focus-contact.png`
- `qa-screens/g10/button-reduced-motion.png`

## Contrast and Effects

| Pair | Contrast |
| --- | ---: |
| `--ink` on `--accent` | 13.797:1 |
| Limits heading and terms on section background | 16.157:1 |
| Limits copy and definitions on section background | 9.310:1 |

CSS search found no `gradient`, `blur`, `backdrop-filter`, or `glow`. The only `box-shadow` is the required inset shadow in `.btn:active`.

## Limits Section

- The exact supplied copy is present immediately after the unchanged sentence `It is done when delivery is recorded.`
- The heading is an `h3`; the page still contains one `h1`.
- The section reuses `.status-list` and adds no icon, status badge, or `.rest-band`.
- The page still contains exactly three `.rest-band` elements.
- `node scripts/check-copy.js`: passed.

## Responsive Checks

| Viewport | `scrollWidth` | `innerWidth` | Overflow |
| ---: | ---: | ---: | --- |
| 375 | 375 | 375 | none |
| 768 | 768 | 768 | none |
| 1024 | 1024 | 1024 | none |
| 1440 | 1440 | 1440 | none |
| 1920 | 1920 | 1920 | none |

Section screenshots are in `qa-screens/g10/limits-375.png`, `limits-768.png`, `limits-1024.png`, `limits-1440.png`, and `limits-1920.png`.

## Lighthouse

- Performance: 99
- Accessibility: 100
- SEO: 100

Reports and score screenshot are in `qa-screens/g10/lighthouse.report.html`, `lighthouse.report.json`, and `lighthouse-scores.png`. Raw interaction measurements are in `qa-screens/g10/interaction-evidence.json`.
