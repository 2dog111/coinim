# Homepage G7 Rhythm Audit

## Stage Labels

- Hero index: four links, no numbers.
- Stage labels: `The market`, `Companies and routes`, `The letter`, `Production and delivery`.
- Anchors retained: `#stage-1`, `#stage-2`, `#stage-3`, `#stage-4`.
- Each hero link reached its matching hash and placed the section at 96 px from the viewport top.
- No `Stage one`, `Stage two`, `Stage three`, or `Stage four` string remains in `index.html`.
- No number-specific stage rule or accent colour remains in the stage CSS.

## Spacing

| Viewport | Section space | Component top | Component bottom | Two-sided component space | Label to heading | Heading to first copy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 375 | 44 px | 20 px | 20 px | 40 px | 8.8 px | 20 px |
| 1440 | 68 px | 28 px | 28 px | 56 px | 8.8 px | 28 px |

Ratio check:

- 375: 44 px section space is less than twice the 40 px two-sided component space.
- 1440: 68 px section space is less than twice the 56 px two-sided component space.

## Document Height

| Viewport | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| 375 | 24,272 px | 21,847 px | 2,425 px / 10.0% |
| 1440 | 20,731 px | 17,391 px | 3,340 px / 16.1% |

## Screenshots

| Viewport | Before | After |
| --- | --- | --- |
| 375 | `qa-screens/home-g7-before-375.png` | `qa-screens/home-g7-after-375.png` |
| 768 | `qa-screens/home-g7-before-768.png` | `qa-screens/home-g7-after-768.png` |
| 1440 | `qa-screens/home-g7-before-1440.png` | `qa-screens/home-g7-after-1440.png` |

## Validation

- Visible-text comparison passed after mapping only the four approved label replacements and removing the stage-index numbers.
- Responsive checks passed at 375, 430, 768, 1024, 1440, and 1920.
- Horizontal overflow: 0 px at every checked width.
- `node scripts/check-copy.js`: passed.
