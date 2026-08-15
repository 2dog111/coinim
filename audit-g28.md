# G28 audit

## Change status

| Change | Search result | Status |
|---|---:|---|
| Stage 3 opening | 1 | completed |
| Before a word is read opening | 1 | completed |
| Stage 1 self-promotional phrase | 1 | completed |
| Stage 1 evidence paragraph insertion point | 1 | completed |

## Required grep output

```text
$ grep -c 'Something solid in the envelope changes the pile' index.html
1
$ grep -c 'An envelope is judged in about two seconds. In the hand' index.html
1
$ grep -c 'understand least and pay for most' index.html
0
$ grep -c 'six hundred and eighty businesses' index.html
1
```

## Structure

- The new evidence paragraph is directly after the paragraph ending `Losing one on paper is cheaper than losing it in the post.` and before `<div class="contrast-pair">`.
- The text after `never.` in the `Before a word is read` opening paragraph is unchanged.
- The page contains one `h1`.
- No CSS was changed.

The supplied Stage 3 replacement is not only a sentence split. Compared with the original it introduces `changes` and `lands`, removes or restructures other words, and therefore does not preserve every original word. The supplied `СТАЛО` text was nevertheless applied exactly.

## Browser QA

- `scrollWidth === innerWidth`: passed at 375 and 1440.
- Console warnings and errors: 0.
- Lighthouse: Performance 94, Accessibility 96, Best Practices 100, SEO 100.
- Screenshots: `qa-screens/g28/stage-1-375.png`, `stage-3-375.png`, `before-reading-375.png` and matching 1440 files.

## Deployment

Deployed with G30 in VPS release `/var/www/coin.im/releases/20260815T110931Z`. No DNS or mail changes were made.
