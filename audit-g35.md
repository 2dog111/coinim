# G35 Audit

## Changes

- Moved `#object-one` after the four-stage rest band and directly before `#objects`.
- Removed the full explanatory proof block beneath `1,000,000+`.
- Applied all 35 supplied replacements in `index.html`.
- Updated `copy/home.en.md` and changed `scripts/check-copy.js` to extract sections in the new DOM order.
- Did not change public CSS, image markup, route mirrors, `/handling`, or `/open`.
- Existing parallel Market Scan changes were preserved without modification.

## Required Counts

All 21 forbidden fragments return `0`, including `pile`, `window`, the removed record classes, old key/photo/map copy, old FAQ copy, and the old list/manifest field labels.

```text
A precision engineering firm in Sheffield  1
Four hundred brass keys                    1
1,000,000                                  1
object-one-label                           2
A Market Scan is $2,400                    1
between 3 and 9 per cent                   1
Twelve thousand rows                       1
About forty countries                      1
$                                           5
```

Section order:

```text
id="what-we-do"
id="stage-1"
id="object-one"
id="objects"
```

The `One row of the list` block contains no `<span>` tags after replacement. Long dash, en dash, and arrow counts are all `0`.

The supplied negation regex returns five matches rather than three because `(Not|No|...)` has no trailing word boundary and therefore matches the `No` at the start of both `Notifications disappear` meta-alt values. The three body-copy matches are the updated `Nobody mistakes it for a gift...`, the preserved `Not now, try in [month].`, and the preserved `Nobody consciously notices the difference.` No extra body-copy negation fragment was introduced.

## Structure And Responsive QA

- `h1` count: `1`.
- `h2` count: `12`, unchanged from HEAD.
- `#object-one` parent: `MAIN`.
- `#object-one[aria-labelledby]` resolves to `object-one-label`.
- Plate picture markup, `srcset`, alt text, dimensions, decoding, fetch priority, and `loading="lazy"` match HEAD.
- JSON-LD parses successfully.
- No horizontal overflow at 375, 768, 1024, 1440, or 1920.
- `#object-one` is below the first fold at all five widths.
- Browser console warnings and errors: `0`.

Object top positions were 10,186 px at 375; 7,505 px at 768; 7,614 px at 1024; 8,021 px at 1440; and 8,469 px at 1920.

## Lighthouse

- Performance: `95`
- Accessibility: `96`
- Best Practices: `100`
- SEO: `100`
- LCP: `2.9 s`; the moved lazy key image is not the LCP element.

Forty screenshots are stored in `qa-screens/g35/`: hero, million block, stage-to-key junction, Key, Photograph, Map fragment, Production and delivery, and FAQ at each required width.

## Deployment

- Combined G33/G35 VPS release: `/var/www/coin.im/releases/20260815T131609Z`.
- Clean static release file count: `81`.
- Local and active `index.html` SHA-256: `8b6a1793766c39674288b6223a5554a9036b1251a84e1151ef0f633c8b4816af`.
- Local and active `ms.html` plus `ms/index.html` SHA-256: `9fca0673547267ac55c94e31eaf682a10b12dc10c692d2314c373a42cf09bf9f`.
- `nginx -t` passed and Nginx is active.
- Required public routes returned HTTP 200.
- Production responsive checks passed at 375, 430, 768, 1024, 1440, and 1920 with no console warnings or errors.
- The `coin.im` certificate remains valid through 2026-11-13.
- No backend, DNS, mail, or TLS configuration was changed.
