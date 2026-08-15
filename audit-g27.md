# G27 audit

## Replacement status

| Change | Status | Matches replaced |
|---|---|---:|
| A1 | completed | 1 |
| A2 | completed | 1 |
| A3 | completed | 1 |
| A4 | completed | 1 |
| A5 | completed | 2 |
| B1 | completed | 1 |
| B2 | completed | 1 |
| B3 | completed | 1 |
| B4 | completed | 1 |
| B5 | completed | 1 |
| B6 | completed | 1 |

A5 occurred in both the visible FAQ and FAQPage JSON-LD and was replaced in both. B5 and B6 occurred only in visible prose, not in JSON-LD.

## Required grep output

```text
$ grep -c 'quietly' ms.html
2
$ grep -c 'genuinely' ms.html
1
$ grep -c 'quietly leave a dead direction' ms.html
0
$ grep -c 'actually' ms.html
19
```

The `actually` count was 19 before the edit and remains 19.

## Validation

- FAQPage JSON-LD: valid JSON.
- `ms.html` and `ms/index.html`: byte-identical.
- `scrollWidth === innerWidth`: passed at 375 and 1440.
- Console warnings and errors: 0.
- Lighthouse: Performance 99, Accessibility 100, Best Practices 100, SEO 100.
- Lighthouse report: `qa-screens/g27/lighthouse.json`.

## Part C: unresolved timing discrepancy

No copy was changed for this discrepancy.

```text
$ grep -n '72 hours' index.html
241:            <p class="business-file-note">Nothing here is automated. You send the material, a person reads it, and the first chronicle comes back within 72 hours. <a href="/handling">What we do with your file</a></p>

$ grep -n 'comes back with a date on it' ms.html
1117:            <p>What does exist is an intake. You send the material, a person reads it, and the first chronicle comes back with a date on it.</p>

$ grep -n 'As long as that market takes to read' ms.html
86:                  "text": "As long as that market takes to read, which is an unsatisfying answer and also the true one. A narrow offer in one country is quick. A product with six plausible buyer contexts across five geographies is not, and promising otherwise would only move the disappointment further down the calendar."
1088:              <p>As long as that market takes to read, which is an unsatisfying answer and also the true one. A narrow offer in one country is quick. A product with six plausible buyer contexts across five geographies is not, and promising otherwise would only move the disappointment further down the calendar.</p>
```

## Deployment

Deployed with G30 in VPS release `/var/www/coin.im/releases/20260815T110931Z`. No DNS or mail changes were made.
