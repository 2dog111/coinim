# G15 Acceptance Report

## Structure

The catalogue contains 12 `h3` sections in this order:

1. Key
2. Coin
3. Shredded banknotes
4. Blister card
5. Broken part
6. Photograph
7. Soil or sand
8. Material sample
9. Map fragment
10. Reply card
11. Seed packet
12. Small hourglass

## Image Mapping

| Section | File | Loading |
|---|---|---|
| Key | `/assets/img1-letter-01-key.webp` | eager |
| Coin | `/assets/img1-letter-02-coin.webp` | lazy |
| Shredded banknotes | `/assets/img1-letter-03-shredded-money.webp` | lazy |
| Blister card | `/assets/img1-letter-04-blister.webp` | lazy |
| Broken part | `/assets/img1-letter-05-broken-bracket.webp` | lazy |
| Photograph | `/assets/img1-letter-06-photo.webp` | lazy |
| Soil or sand | `/assets/img2-letter-07-soil-sachet.webp` | lazy |
| Material sample | `/assets/img2-letter-08-fabric.webp` | lazy |
| Map fragment | `/assets/img2-letter-09-map.webp` | lazy |
| Reply card | `/assets/img2-letter-10-response-card.webp` | lazy |
| Seed packet | `/assets/img2-letter-11-seeds.webp` | lazy |
| Small hourglass | `/assets/img2-letter-12-hourglass.webp` | lazy |

Every section contains exactly one image. All 12 local asset URLs returned HTTP 200. All supplied `alt` strings match G15.

## Content Checks

- Heading and introduction match the supplied COPY.
- The catalogue section contains no standalone word `ten`.
- The related navigation link now says `The twelve objects we post`.
- `Material sample or map fragment` was split without losing or duplicating its five existing paragraphs: the first three remain under `Material sample`; the final two moved unchanged to `Map fragment`.
- `Feather or piece of coal` and `Ticket, plastic card, or blank card` are no longer sections. Their objects appear in the supplied closing paragraph.
- `Set here, not photographed` and the duplicated `Mr Adeyemi` letter text are absent.
- The first image is eager; the remaining 11 are lazy.
- The page still contains three `.rest-band` elements.

## Responsive QA

Browser checks at 375, 768, 1024, 1440 and 1920 px returned `scrollWidth === innerWidth`. The catalogue contained 12 sections and 12 images at every width, with no failed image requests or console warnings/errors. Images retain a 4:5 ratio, use `height: auto`, and do not exceed `--measure-wide`.

Screenshots:

- `qa-screens/g15/catalogue-375.png`
- `qa-screens/g15/catalogue-1440.png`

## Lighthouse

- Performance: 96
- Accessibility: 100
- SEO: 100
- LCP: 2.7 s
- CLS: 0

Reports:

- `qa-screens/g15/lighthouse.report.html`
- `qa-screens/g15/lighthouse.report.json`

## Deployment

Not deployed. G15 did not include an explicit publication instruction.
