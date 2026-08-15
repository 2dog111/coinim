# G23 audit

## Removed sections

1. `What we cannot do yet`: removed with its wrapper, introductory copy, three-item definition list and closing paragraph.
2. `What we will not do`: removed with the remaining paragraph below it. The scale paragraph had already been removed by G21.
3. `Who should not hire you?`: removed with its complete FAQ article.

No internal link or script referenced `stage-4-limits-title` before removal.

## Required command output

```text
grep -c 'What we cannot do yet' index.html: 0
grep -c 'What we will not do' index.html: 0
grep -c 'Who should not hire you' index.html: 0
grep -c 'No perfume' index.html: 0
grep -c 'do not survive scale' index.html: 0
grep -c 'stage-4-limits-title' index.html: 0
grep -c 'laminated' index.html: 0
FAQ <article> count: 6
```

Stage four contains no empty container between the delivery-evidence paragraph and `How a record ends`. `Before a word is read` ends with `What is still on the desk on Thursday`. The FAQ ends with `Which countries can you post to?`. No `aria-labelledby` attribute points to a missing identifier.

## Browser and Lighthouse

One `h1` remains. `document.documentElement.scrollWidth === innerWidth` passed at 375, 768, 1024, 1440 and 1920. No browser warnings or errors were recorded.

- Performance: 94
- Accessibility: 100
- Best Practices: 100
- SEO: 100

Screenshots, browser results and `lighthouse.json` are in `qa-screens/g23/`.

## Deployment

- VPS release: `/var/www/coin.im/releases/20260815T103058Z`
- Static files: 81
- Nginx configuration test: passed
- Nginx: active and reloaded
- Required public routes: HTTP 200
- Cloudflare Worker, DNS and mail records: untouched
