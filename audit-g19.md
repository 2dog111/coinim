# G19 report

## Replacements

All supplied `БЫЛО` strings were found in the expected count: singleton blocks once, image-alt metadata twice, four `home-label` elements four times. No source string was missing or ambiguous.

Completed:

- Removed the hero kicker, record label, four home labels and the bridge label.
- Retyped `Four stages` and `Object one of twelve` and changed their label typography with the four stage labels.
- Applied every supplied dash, `not X. Y`, repetition, adverb, arrow and hero-opening replacement literally.
- Removed record numbering, `Read on` and the duplicate record equation.
- Preserved the stage and workflow numbering and the `#object-one` anchor.
- Added the only new copy from the prompt: `Which leaves the only question that matters. Who is worth a letter at all.`
- No `aria-labelledby` reference was broken; the missing-target list is empty.

## Twelve object pairs

### Key

БЫЛО: `For access, a closed opportunity, real estate, negotiations, entry to the right person, a private offer, or a limited circle of participants.`

СТАЛО: `For access, a closed opportunity, real estate, or negotiations.`

### Coin

БЫЛО: `For letters about money, profit, savings, cost of error, investments, surveys, invitations, and the first conversation.`

СТАЛО: `For letters about money, profit, savings, and cost of error.`

### Shredded banknotes

БЫЛО / СТАЛО: `For a budget spent in the wrong direction: expensive leads, an advertising line nobody can defend, a channel that stopped working two quarters ago.`

Already three listed applications; unchanged.

### Blister card

БЫЛО: `For letters that begin with a specific pain: expensive leads, an empty sales pipeline, debt, overload, delay, advertising that burns budget, production errors, or lost enquiries.`

СТАЛО: `For letters that begin with a specific pain: expensive leads, an empty sales pipeline, debt, or overload.`

### Broken part

БЫЛО: `For letters about repair, replacement, insurance, quality, production, safety, errors, and the cost of stoppage.`

СТАЛО: `For letters about repair, replacement, insurance, and quality.`

### Photograph

БЫЛО: `For proof: a property, warehouse, production line, product, empty shelf, document, person, or real condition.`

СТАЛО: `For proof: a property, warehouse, production line, or product.`

### Soil or sand

БЫЛО: `For land, beach, resort, construction, plot, warehouse, industrial zone, infrastructure, and any projects where the main thing is place.`

СТАЛО: `For land, beach, resort, and construction.`

### Material sample

БЫЛО: `For manufacturing, construction, finishing, packaging, furniture, equipment, locations, routes, and logistics.`

СТАЛО: `For manufacturing, construction, finishing, and packaging.`

### Map fragment

БЫЛО: `A map fragment works when the main thing is place, movement, route, delivery radius, footfall, proximity to an object, or point of entry.`

СТАЛО: `A map fragment works when the main thing is place, movement, route, or delivery radius.`

### Reply card

БЫЛО: `For letters where an answer is needed: qualification, survey, signal of interest, application, consent to a conversation, or a reason for a second touch.`

СТАЛО: `For letters where an answer is needed: qualification, survey, signal of interest, or application.`

### Seed packet

БЫЛО / СТАЛО: `For a long sales cycle, and for any offer where an honest answer is measured in months rather than weeks.`

Already two applications; unchanged.

### Small hourglass

БЫЛО / СТАЛО: `For a deadline that exists whether or not anybody replies: a quarter closing, a budget cycle, a rule taking effect, an offer with a date on it.`

Already four applications; unchanged.

## Command output

```text
grep -c '—' index.html
0

grep -niE 'instantly|immediately|simply|truly|thoughtfully|essentially|absolutely|incredibly' index.html
[no output]

grep -c 'hero__kicker|home-label|record__label|record__index|hero__read-on|proof-equation' index.html
0

grep -c '→' index.html
0
```

`text-transform: uppercase` remains only in pre-existing `assets/base.css` rules at lines 172, 230, 491, 628, 707, 735, 770, 802, 975, 1031, 1282 and 1585. None is one of the removed homepage labels; they were listed and left unchanged.

`accent-deep` output:

```text
assets/home.css:11   custom-property definition
assets/home.css:153  text-decoration colour, not glyph colour
assets/home.css:233  button border, not text
assets/home.css:240  text-decoration colour, not glyph colour
```

No `accent-deep` occurrence is used as text glyph colour. `assets/base.css` has no occurrence.

## Browser and Lighthouse

At 375, 768, 1024, 1440 and 1920:

- `document.documentElement.scrollWidth === innerWidth`: true.
- `document.querySelectorAll('h1').length === 1`: true.
- Console errors or warnings: none.
- `#object-one`: present.
- `≠`: one occurrence.
- Record bridge copy: present.

Screenshots for `hero`, `record`, `bridge` and `object-key` at every width are in `qa-screens/g19/`.

Lighthouse:

```text
Performance: 88
Accessibility: 96
Best Practices: 100
SEO: 100
```

Accessibility is 96 because the exact required `.plate__label { color: var(--ink-soft) }` fails contrast on the dark plate. It was not changed outside G19.

## Deployment

VPS release: `/var/www/coin.im/releases/20260815T101422Z`.
