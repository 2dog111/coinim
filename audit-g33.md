# G33 Audit

## Changes

- Restored `Notifications disappear. A letter stays.` as the homepage `h1`.
- Restored the pre-G31 three-paragraph hero lead.
- Restored the empty `rest-band home-rest` with `aria-hidden="true"`.
- Preserved the G31 key-letter caption exactly.
- Did not change CSS, stage-panel copy, buttons, social image alt text, animation, images, `/ms`, `/handling`, or `/open`.

G35 ran immediately after G33 and intentionally replaced the first paragraph of the restored lead. The G33 prerequisite for G35 passed: `Post arrives in two piles` returned `0`.

## Browser Checks

- One `h1` and three `.hero__lead p` elements.
- `home-hero[aria-labelledby]` resolves to `hero-title`.
- `#object-one[aria-labelledby]` resolves to `object-one-label`.
- The empty `home-rest` retains `aria-hidden="true"`.
- Heading line count is `3` at 375, 768, 1024, 1440, and 1920.
- No horizontal overflow at any required width.

Ten screenshots are stored in `qa-screens/g33/`: hero and empty band at each required width.

## Deployment

- Combined G33/G35 VPS release: `/var/www/coin.im/releases/20260815T131609Z`.
- Clean static release file count: `81`.
- Required public routes returned HTTP 200.
- Production responsive checks passed at 375, 430, 768, 1024, 1440, and 1920.
