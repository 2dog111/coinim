# G25 audit

## Change

- Replaced the first two paragraphs in `#why-paper` with the three supplied paragraphs.
- Preserved the following three paragraphs byte-for-byte and in their original order.
- The section contains exactly six direct `p` children.

## Text checks

```text
Writing a cold email used to cost somebody an hour.  0
Getting into the inbox did not become easier at the same time.  0
117 emails and 153 Teams messages  1
213 billion pieces in 2006  1
price of entry rather than an advantage  1
Nobody receives two hundred envelopes in a day  1
We collect email addresses in the course of the work  1
em dash  0
```

## Browser QA

- `scrollWidth === innerWidth`: passed at 375, 768, 1024, 1440 and 1920.
- Console warnings and errors: 0.
- Screenshots: `qa-screens/g25/why-paper-375.png`, `qa-screens/g25/why-paper-1440.png`.
- Lighthouse: Performance 94, Accessibility 96, Best Practices 100, SEO 100.
- The Lighthouse result matches the G24 baseline exactly; G25 did not regress it.

## Deployment

- VPS release: `/var/www/coin.im/releases/20260815T105520Z`.
- Public text checks passed at `https://coin.im/`.
- Required HTTPS routes returned 200.
- No Cloudflare Worker, DNS or mail configuration was changed.
