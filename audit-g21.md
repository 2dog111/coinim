# G21 audit

## Thirteen edits

1. Stage one length disclaimer: completed.
2. `/ms#limits` link: completed.
3. Business File reassurance tail: completed.
4. Stage two unreachable-people block and wrapper: completed.
5. Stage three ten-second sentence: left unchanged as required.
6. Remaining equation and equation CSS: completed.
7. Stage four opening sentence: completed.
8. Stage four attention-measurement block and wrapper: completed.
9. Object catalogue closing sentence: completed.
10. Letterpress justification tail: completed.
11. Scale disclaimer below `What we will not do`: completed.
12. Both FAQ tails: completed.
13. Contact refusal sentence: completed.

No source string was missing or duplicated.

## Required command output

```text
grep -c '≠' index.html: 0
grep -c 'honest version rather than the flattering' index.html: 0
grep -c 'what it cannot do' index.html: 0
grep -c 'Some people cannot be reached' index.html: 0
grep -c 'None of this tells you whether anybody read it' index.html: 0
grep -c 'do not survive scale' index.html: 0
grep -c 'wrong instrument for the job' index.html: 0
grep -c 'least interesting stage' index.html: 0
grep -n 'equation' assets/home.css: no output
```

Stage two ends with the `spec-card`, without an empty wrapper. Stage four ends with the record-continuity paragraph, without an empty wrapper. `What we cannot do yet` and all three items remain. `What we will not do` and `Who should not hire you?` remain.

## Browser and Lighthouse

`document.documentElement.scrollWidth === innerWidth` passed at 375, 768, 1024, 1440 and 1920. No browser warnings or errors were recorded.

Lighthouse:

- Performance: 94
- Accessibility: 100
- Best Practices: 100
- SEO: 100

Screenshots and `lighthouse.json` are in `qa-screens/g21/`.

## Deployment

- VPS release: `/var/www/coin.im/releases/20260815T102258Z`
- Static files: 81
- Nginx configuration test: passed
- Nginx: active and reloaded
- Required public routes: HTTP 200
- Public G21 copy and `assets/home.css?v=20260815-g21`: verified
- Cloudflare Worker, DNS and mail records: untouched
