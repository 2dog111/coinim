# G24 audit

## Replacement status

- Parts A-C: all supplied target text and removals were already present; every `БЫЛО` source was absent because the earlier pass had applied it. No duplicate target was found.
- Part D: both remaining record sources were found once and replaced.
- Part E: the shortened hero anaphora, twelve object openings and adverb removal were already present.
- Part F: arrows, decorative record numbering, read-on control and homepage equations were already absent.
- Part G: the short opening sentence was already present. The G19 bridge copy was removed and `home-rest` restored to the required empty, aria-hidden element.
- Part H: all three sections were already absent after G23.
- Part I: the listed dead homepage selectors were already absent. The conflicting `.plate .plate__label` override was removed and both homepage CSS query keys were raised to `20260815-g24`.

The generic `.equation` rules in `assets/base.css` were retained because `ms.html` and `ms/index.html` use them for the visible Search paths equation. Removing them would alter `/ms`, contrary to G24's page scope. The FAQ phrase `delivery scan and nothing else` remains because G24 supplies no replacement for it and explicitly forbids invented copy.

## Twelve object pairs

1. Key
   - БЫЛО: `For access, a closed opportunity, real estate, negotiations, entry to the right person, a private offer, or a limited circle of participants.`
   - СТАЛО: `For access, a closed opportunity, real estate, or negotiations.`
2. Coin
   - БЫЛО: `For letters about money, profit, savings, cost of error, investments, surveys, invitations, and the first conversation.`
   - СТАЛО: `For letters about money, profit, savings, and cost of error.`
3. Shredded banknotes
   - БЫЛО / СТАЛО: `For a budget spent in the wrong direction: expensive leads, an advertising line nobody can defend, a channel that stopped working two quarters ago.`
4. Blister card
   - БЫЛО: `For letters that begin with a specific pain: expensive leads, an empty sales pipeline, debt, overload, delay, advertising that burns budget, production errors, or lost enquiries.`
   - СТАЛО: `For letters that begin with a specific pain: expensive leads, an empty sales pipeline, debt, or overload.`
5. Broken part
   - БЫЛО: `For letters about repair, replacement, insurance, quality, production, safety, errors, and the cost of stoppage.`
   - СТАЛО: `For letters about repair, replacement, insurance, and quality.`
6. Photograph
   - БЫЛО: `For proof: a property, warehouse, production line, product, empty shelf, document, person, or real condition.`
   - СТАЛО: `For proof: a property, warehouse, production line, or product.`
7. Soil or sand
   - БЫЛО: `For land, beach, resort, construction, plot, warehouse, industrial zone, infrastructure, and any projects where the main thing is place.`
   - СТАЛО: `For land, beach, resort, and construction.`
8. Material sample
   - БЫЛО: `For manufacturing, construction, finishing, packaging, furniture, equipment, locations, routes, and logistics.`
   - СТАЛО: `For manufacturing, construction, finishing, and packaging.`
9. Map fragment
   - БЫЛО: `A map fragment works when the main thing is place, movement, route, delivery radius, footfall, proximity to an object, or point of entry.`
   - СТАЛО: `A map fragment works when the main thing is place, movement, route, or delivery radius.`
10. Reply card
   - БЫЛО: `For letters where an answer is needed: qualification, survey, signal of interest, application, consent to a conversation, or a reason for a second touch.`
   - СТАЛО: `For letters where an answer is needed: qualification, survey, signal of interest, or application.`
11. Seed packet
   - БЫЛО / СТАЛО: `For a long sales cycle, and for any offer where an honest answer is measured in months rather than weeks.`
12. Small hourglass
   - БЫЛО / СТАЛО: `For a deadline that exists whether or not anybody replies: a quarter closing, a budget cycle, a rule taking effect, an offer with a date on it.`

## Command output

```text
—: 0
→: 0
≠: 0
What we cannot do yet: 0
What we will not do: 0
Who should not hire you: 0
No perfume: 0
and nothing else: 1
Volume is not a result: 0
hero__kicker|home-label|record__label|record__index|hero__read-on: 0
intensifier grep: no output
```

`text-transform: uppercase` remains only in pre-existing `assets/base.css` rules at lines 172, 230, 491, 628, 707, 735, 770, 802, 975, 1031, 1282 and 1585. `letter-spacing: 0.1...` remains in pre-existing `assets/base.css` rules at lines 171, 250, 490, 627, 706, 801, 973, 1030, 1281 and 1583, plus the removed-bridge selector in `assets/home.css` at line 1053. These were reported without modification as required.

`accent-deep` occurrences:

- `assets/home.css:11`: custom-property definition, neither text nor fill.
- `assets/home.css:153`: text-decoration colour, not glyph text or fill.
- `assets/home.css:233`: button border colour, not text or fill.
- `assets/home.css:240`: text-decoration colour, not glyph text or fill.

## Browser and deployment

At 375, 768, 1024, 1440 and 1920: one `h1`, no horizontal overflow, no missing aria target, no uppercase homepage label, empty `home-rest`, and no console warning or error.

- Performance: 94
- Accessibility: 96
- Best Practices: 100
- SEO: 100

Accessibility is 96 because the required `var(--ink-soft)` label colour has insufficient contrast on the dark plate.

VPS release: `/var/www/coin.im/releases/20260815T103707Z`. Nginx validation and all required public HTTPS checks passed. DNS, backend and mail records were untouched.
