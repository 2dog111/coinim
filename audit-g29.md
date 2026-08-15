# G29 audit

## Change status

- Current status visible paragraph: completed, one match.
- Visible `How long does it take?` answer: completed, one match.
- FAQPage JSON-LD answer: completed, one match.
- Homepage wording was not changed.

## Required grep output

```text
$ grep -c 'comes back with a date on it' ms.html
0
$ grep -c 'an unsatisfying answer and also the true one' ms.html
0
$ grep -c 'further down the calendar' ms.html
0
$ grep -c '72 hours' ms.html
3
$ grep -c '72 hours' index.html
1
```

The stated expectation of two matches in `ms.html` conflicts with the three required edits. The phrase occurs once in Current status, once in the visible FAQ answer and once in the matching JSON-LD answer. Removing one occurrence would violate G29 or make visible and structured FAQ content diverge.

## Validation

- FAQPage JSON-LD parses as valid JSON.
- Visible `How long does it take?` answer and JSON-LD answer match exactly.
- `ms.html` and `ms/index.html` are byte-identical.
- `scrollWidth === innerWidth`: passed at 375 and 1440.
- Page `h1` count: 1.
- Console warnings and errors: 0.
- Lighthouse: Performance 99, Accessibility 100, Best Practices 100, SEO 100.
- Screenshots: `qa-screens/g29/faq-375.png`, `status-375.png` and matching 1440 files.

## Deployment

Deployed with G30 in VPS release `/var/www/coin.im/releases/20260815T110931Z`. No Cloudflare Worker, DNS or mail changes were made.
