# G30 audit

## Change status

All seven supplied text replacements were found exactly once and completed. Markup, classes, element order and CSS were not changed.

## Required grep output

```text
$ grep -c 'the object' index.html
7
$ grep -c 'Companies, people, routes' index.html
0
$ grep -c 'which people, which address' index.html
0
$ grep -c 'Who is worth writing to at all' index.html
0
$ grep -c 'Companies and routes' index.html
0
$ grep -c 'the thing inside it' index.html
2
$ grep -c 'confirmed against two sources' index.html
1
$ grep -c 'delivery evidence for every record' index.html
2
```

The requested zero count for lowercase `the object` cannot result from the panel replacement alone. Seven unrelated lowercase uses remain in the body copy and were not changed. `delivery evidence for every record` appears once in the new panel note and once in the existing workflow copy.

## Panel validation

- All four notes are declarative and use no question marks.
- Stage names: one line at 1024, 1280 and 1440.
- Stage notes: one line at 1024; one or two lines at 1280 and 1440.
- The second-stage note never reaches three lines.
- Page `h1` count: 1.
- `scrollWidth === innerWidth`: passed locally at 375, 768, 1024, 1280 and 1440.
- Console warnings and errors: 0.
- Lighthouse: Performance 94, Accessibility 96, Best Practices 100, SEO 100.

At 1024 x 768 the existing responsive breakpoint stacks the panel below the hero copy. The panel begins at 817 px and the hero section ends at 1365 px, so the first-screen height requirement does not pass. The panel itself is 478 px high and all notes fit on one line. No CSS change was made because G30 explicitly forbids style changes.

Screenshots are in `qa-screens/g30/`: `panel-1024.png`, `panel-1280.png`, `panel-1440.png` and `first-screen-375.png`.

## Deployment

- VPS release: `/var/www/coin.im/releases/20260815T110931Z`.
- Clean static release: 81 files.
- Local, snapshot and remote hashes match for `index.html`, `ms.html` and `ms/index.html`.
- All required HTTPS routes returned 200.
- Production overflow checks passed at 375, 430, 1024 and 1920 with one `h1` and no console warnings or errors.
- Nginx is active, `nginx -t` passed, and the certificate for `coin.im` and `www.coin.im` is valid through 2026-11-13.
- No DNS or mail configuration was changed.
