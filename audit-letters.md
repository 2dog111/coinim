# Letter Rendering Audit

## Active Homepage Letter Text

| Location | Asset or markup | Case | Font | Transformations | Decision |
| --- | --- | --- | --- | --- | --- |
| `#objects` / `Coin or bill` | `assets/coin-letter-example-en.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Used as an object photograph only; `alt` is the object name, not the letter text |
| `#objects` / `Photo` | `assets/grabber-photo-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |
| `#objects` / `Sand or soil` | `assets/grabber-soil-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |
| `#objects` / `Stamped reply card or questionnaire` | `assets/grabber-reply-check-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |
| `#objects` / `Aspirin or stress card` | `assets/grabber-stress-card-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |
| `#objects` / `Feather or piece of coal` | `assets/grabber-coal-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |
| `#objects` / `Key` | `assets/grabber-key-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |
| `#objects` / `Material sample or map fragment` | `assets/grabber-material-sample-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |
| `#objects` / `Ticket, plastic card, or blank card` | `assets/grabber-pass-card-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |
| `#objects` / `Broken part` | `assets/grabber-broken-part-letter.webp` | A: text is part of the photograph | unknown, baked into image | none in active CSS | Replaced `with-copy` variant; photograph is not a text carrier |

## Markup And Overlay Check

| Check | Result |
| --- | --- |
| Text laid over a photograph | none on the active homepage |
| Letter body typeset in markup | none on the active homepage |
| `rotate`, `skew`, `matrix`, `perspective` in active letter blocks | none |
| Handwritten fragment on the active homepage | none |
| Confirmed real letter copy | not available; no readable letter copy was invented or added |

## Handwriting Font Candidate Test

| Candidate | 375 result | 1440 result | Verdict |
| --- | --- | --- | --- |
| Caveat | readable, but `i/l` and `n/m` are weaker at small width | readable | not selected |
| Patrick Hand | clearest `a/o`, `r/v`, `i/l`, `n/m`, and digits on 375 | readable | selected |
| Shantell Sans | readable, but wraps more aggressively on 375 | readable | not selected |

Screenshots:

| Candidate | 375 | 1440 |
| --- | --- | --- |
| Caveat | `qa-screens/font-candidates/caveat-375.png` | `qa-screens/font-candidates/caveat-1440.png` |
| Patrick Hand | `qa-screens/font-candidates/patrick-hand-375.png` | `qa-screens/font-candidates/patrick-hand-1440.png` |
| Shantell Sans | `qa-screens/font-candidates/shantell-sans-375.png` | `qa-screens/font-candidates/shantell-sans-1440.png` |

Selected font: Patrick Hand. Reason: on 375 it separates the required pairs most clearly without the large wrapping cost of Shantell Sans.

## Handwriting Rule Measurements

| Item | Result |
| --- | --- |
| Connected handwritten family | `Patrick Hand`, local subset file `assets/fonts/patrick-hand-latin-subset.ttf` |
| `font-display` | `swap` |
| Fallback stack | `"Patrick Hand", Georgia, "Times New Roman", serif, cursive` |
| Active handwritten letter lines | 0 |
| Active handwritten fragment colour | no active fragment; rule uses `--ink` when applied |
| Active handwritten fragment width | no active fragment; rule is capped at `48ch` when applied |
| Candidate test font size on 375 | `1.35rem`, above `1.25rem` |
| Candidate test line-height | `1.6`, above `1.55` |
| Candidate test contrast | `--ink` on `--paper-raised`: 16.16:1 |
| Read-aloud test | Patrick Hand candidate fragment read on the first attempt at 375 |

## Notes

The visible text inside object photographs appears to be sample letter text baked into the image. It is not confirmed campaign copy. The G4 implementation treats those images as object photographs, not as readable letter examples, and does not add replacement letter text.
