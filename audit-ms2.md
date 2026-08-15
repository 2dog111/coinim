# Market Scan MS-2 text audit

Scope: local `ms.html` and its identical route copy `ms/index.html`. No CSS, component, or section-order changes.

## Prerequisite

MS-1 is present. The old early `Here is what the system actually does` block is absent, the substantive acts occur once, and the early premise leads into the acts rather than duplicating them.

## Exact replacement preflight

Each `WAS` string was checked before editing. Only one of 26 matched literally.

| # | `WAS` key | Result |
| ---: | --- | --- |
| 1 | `Give Market Scan a business... may be named.` | Not found. The current hero already says `proves why`, `those decision-makers are actually named`, and continues through letters, delivery and one record. No replacement. |
| 2 | `Then we keep the whole path in one CRM.` | Not found. Current text says `Then we keep the entire path in one record.` No replacement. |
| 3 | `A client gives us information about the business.` | Not found. Current intake copy is already one paragraph beginning `Everything begins with what the client can tell us.` No replacement. |
| 4 | `Then the system does eight things.` | Not found after MS-1. No replacement. |
| 5 | `Not to collect links.` | Found once and replaced exactly with `Not to collect links. Anyone can collect links.` |
| 6 | `But it is not allowed to call every imaginative idea a market.` | Not found. No replacement. |
| 7 | `A warehouse operator... all three may care about conveyor failures.` | Not found. Current sentence says `all three can be made to care`. No replacement. |
| 8 | `After an hour, the whiteboard will look excellent.` | Not found. Current copy has no comma and continues `Everybody leaves satisfied.` No replacement. |
| 9 | `25 × 12 × 8 × 3 = 7,200 possible search paths.` | Not present as a contiguous text node; the equation is component markup. No replacement. |
| 10 | `The problem may be a stoppage...` | Not found. The food-manufacturing example is now a structured card. No replacement. |
| 11 | `The problem may be throughput...` | Not found. The parcel-hub example is now a structured card. No replacement. |
| 12 | `The problem may extend beyond downtime.` | Not found. The 3PL example is now a structured card. No replacement. |
| 13 | `A failure may threaten a client service-level agreement...` | Not found. The current wording is inside the 3PL card. No replacement. |
| 14 | `The integrator may not suffer...` | Not found. The integrator example is now a structured card. No replacement. |
| 15 | `This is a more experimental market...` | Not found. The private-equity example is now a structured card. No replacement. |
| 16 | `A normal lead list may put all five into "industrial companies."` | Not found. Current text says `puts all five into industrial companies, sorted by headcount.` No replacement. |
| 17 | `It may be a spreadsheet.` | Not found. Current text says `It is a spreadsheet.` No replacement. |
| 18 | `Or the decision to tolerate the problem for another year.` | Not found. Current sentence is longer and says `one more year`. No replacement. |
| 19 | `It is the working record from which the rest of the scan is built.` | Not found. The Chronicle opening has already been rewritten. No replacement. |
| 20 | `The vocabulary changes by geography...` | Not found. Current text says `The vocabulary shifts with geography...`. No replacement. |
| 21 | `The small one may be the better market.` | Not found. Current scale copy is longer and uses a fifty-person example. No replacement. |
| 22 | `A system that only generates things...` | Not found. The current pull quote is a shorter variant. No replacement. |
| 23 | `A LinkedIn profile may be stale.` | Not found. Current text said `A profile may be two years stale.` The cross-page `may` rule was applied to the current paragraph instead. |
| 24 | `A shared reception may accept the package...` | Not found. Current text used `a package` and `no reason on earth`. The cross-page `may` rule was applied without importing the unmatched replacement. |
| 25 | `A weak route stays out of production...` | Not found. Current copy contains only the second idea in a different sentence. No replacement. |
| 26 | `The machine accelerates.` | Not found. `The reasoning stays parked.` was also already absent. No replacement or deletion. |

## Cross-page rules

### `may`

- Before: 27 visible-text occurrences.
- After: 0.
- Reduction: 100%, exceeding the required fourfold reduction.
- The supplied hedge paragraph is the first paragraph of `#hypotheses`.
- Real uncertainty in people and route verification is now expressed through stale/conflicting signals, unresolved status, and current-source checks.

### Rhythm

The only run of three ordinary one-sentence paragraphs in the Writer act was merged. Remaining runs longer than two are explicit lists: Chronicle fields, rejected letter constructions, Judge rejection criteria, and benchmark limitations.

### Speaker

- Before: `we` 24; `the system` 4; ratio 6.0:1.
- After: `we` 32; `the system` 4; ratio 8.0:1.
- Human decisions now say `we place`, `we test`, `we buy`, `we check`, and `we verify`.
- The four retained `the system` references describe actual machine behaviour rather than human judgement.

## Required blocks

- Added the exact hypotheses hedge.
- Added the exact gambling transition.
- Removed the five object-section subheadings and their descriptions; replaced them with the supplied paragraph and `The objects we post` link to `https://coin.im/#objects`.
- The six intake fragments were already combined into one paragraph by the current source, so there were no six child paragraphs to remove.
- `The reasoning stays parked.` was already absent.

## FAQ and final CTA

- The four supplied buyer questions are first and in the required order.
- Three named legacy questions were present and retained: Apollo/Clay, thousands of Market Arms, and headquarters.
- The requested legacy question about replacing an experienced salesperson did not exist in the current FAQ, and no answer text was supplied, so it was not invented.
- The visible FAQ and `FAQPage` JSON-LD contain the same seven questions and answers.
- The final CTA uses the supplied body, then email, Telegram and WhatsApp.
- `Return to coin.im` was removed from the CTA. The current page has no footer copy of that link, so the resulting page count is zero rather than one.
- The document title is `Do not buy the list yet — Market Scan | coin.im`, 47 characters. The local browser reports it in full.

## Regression

- `ms.html` and `ms/index.html` are byte-identical.
- Screenshots: `qa-screens/ms-ms2-before-375.png`, `qa-screens/ms-ms2-after-375.png`, `qa-screens/ms-ms2-before-1440.png`, `qa-screens/ms-ms2-after-1440.png`.
- No horizontal overflow at 375 or 1440.
- One `h1`; 87 headings; no hierarchy skips.
- JSON-LD parses successfully and matches the visible FAQ.
- British forms retained, including `fulfilment`, `organisation`, `labelled`, `programme`, `summarise`, and `despatch`.
- Lighthouse baseline: Performance 99, Accessibility 100, SEO 100, LCP 1.8 s, CLS 0, TBT 0 ms.
- Lighthouse after MS-2: Performance 99, Accessibility 100, SEO 100, LCP 1.7 s, CLS 0, TBT 0 ms.
- The `https://coin.im/#objects` target returned HTTP 200.

## Copy that still asks for work outside the allowed list

- The hero still uses machine-documentation voice (`It reads...`) because the supplied hero `WAS` string did not match the current source.
- The five Northline buyer cards still use the prior concise card copy because every supplied prose `WAS` string missed the structured-card version.
- The Judge pull quote still uses the prior generic system wording because its supplied `WAS` string did not match.
- `The explanation is live. The system is still being finished.` remains in Current status; it describes product state rather than a human decision.

## Not completed

- A fourth retained legacy FAQ item could not be kept because the experienced-salesperson question was absent from the current FAQ and no replacement answer was supplied.
- `Return to coin.im` could not remain once in the footer because the current page has no footer containing it; adding a new footer would violate the no-structure-change rule.
