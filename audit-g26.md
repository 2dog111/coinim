# G26 audit

## Change

- Applied the supplied replacements and removals to `ms.html`.
- Removed the `limits` entry from the dynamic table of contents together with the deleted section, preventing a dangling `#limits` link.
- Kept `ms.html` and `ms/index.html` byte-identical for the public `/ms` route.
- Removed uppercase transformation and wide letter spacing from `.ms-act-label` while preserving the kicker treatment.

## Required counts

```text
em dash                                             0
Five things this does not do                        0
Who should not buy this                             0
It does not prove                                   0
There is no demonstration dashboard                 0
still no dashboard                                  0
wrong instrument for the job                        0
id="limits"                                         0
ms-act-label                                       15
The measurement covers writer and research work only  1
Six things people ask                               1
```

## Structure and browser QA

- JSON-LD parses as valid JSON.
- Visible FAQ questions: 6; JSON-LD FAQ questions: 6.
- Missing internal anchor targets: 0.
- Missing `aria-labelledby` targets: 0.
- `document.querySelectorAll('h1').length`: 1.
- `scrollWidth === innerWidth`: passed at 375, 768, 1024, 1440 and 1920.
- Console warnings and errors: 0.
- Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- Screenshots at 375 and 1440 are in `qa-screens/g26/` for `measured`, `measured-to-faq`, `faq`, `status` and `final`.

## Deployment

- VPS release: `/var/www/coin.im/releases/20260815T105520Z`.
- Local, clean snapshot and remote SHA-256 hashes match for `index.html`, `ms.html` and `ms/index.html`.
- All required HTTPS routes returned 200; Nginx is active and `nginx -t` passed.
- Certificate for `coin.im` and `www.coin.im` is valid through 2026-11-13.
- No DNS or mail configuration was changed.

## Unrelated existing check

`node scripts/check-copy.js` still reports the earlier G24 wording difference between `That number proves two things and nothing else.` and the current `That number proves two things.` G25 and G26 do not touch that text.
