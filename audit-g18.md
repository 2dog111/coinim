# G18 report

## A. Button diagnosis

The geometry-changing rules found before the edit were:

```text
190 .btn transition: transform 90ms ease-out
216 .btn:active transform: translateY(1px)
232 .btn--stamp:hover transform: rotate(-0.5deg)
237 .btn--stamp:active transform: rotate(-0.5deg) translateY(1px)
472 .hero .btn transition: color 180ms ease, transform 90ms ease-out
509 .hero .btn:active, .minibar .btn:active transform: translateY(1px)
```

The hover rotation and active translation changed the button rectangle. The transform transitions animated those geometry changes. The fill pseudo-element had no `pointer-events: none`, and hover fill was not restricted to a fine pointer.

Current button rule index:

```text
60:button:focus-visible,
176:.btn {
195:.btn--secondary {
199:.hero-link.btn {
205:.btn::before {
217:.btn > span {
222:.btn * {
227:  .btn:hover::before {
231:  .btn:hover {
236:.btn:active {
240:.btn:focus-visible {
245:.btn--stamp {
375:.minibar__contacts > a:not(.btn) {
382:.minibar__contacts > a:not(.btn):hover,
383:.minibar__contacts > a:not(.btn):focus-visible {
463:.hero .btn,
464:.minibar .btn {
484:.hero .btn::before,
485:.minibar .btn::before {
498:  .hero .btn:hover::before,
499:  .minibar .btn:hover::before {
503:  .hero .btn:hover,
504:  .minibar .btn:hover {
509:.hero .btn:focus-visible,
510:.minibar .btn:focus-visible,
517:.hero .btn--primary,
518:.minibar .btn--primary {
524:.hero .btn--secondary {
734:  .hero .btn {
742:  .minibar__contacts > a:not(.btn) {
749:  .hero .btn,
750:  .hero .btn::before,
751:  .minibar .btn,
752:  .minibar .btn::before {
1324:.business-file-intake .btn {
1702:  .btn,
1703:  .btn::before,
```

Focused validation:

```text
button_hover_geometry_violations=0
button_transition_violations=0
unwrapped_buttons=0
hover geometry stable=true
cursor=pointer
child cursor=pointer
touch fill before scroll=matrix(0, 0, 0, 1, 0, 0)
touch fill after scroll=matrix(0, 0, 0, 1, 0, 0)
reduced-motion transition=0s
reduced-motion fill transition=0s
reduced-motion geometry stable=true
```

The 3.4-second edge-hover recording is `qa-screens/g18/button-hover.webm`.

## B. The record

The block is one 62ch column. The heading is `1,000,000<sup>+</sup>`, the former duplicate heading is absent, the two proofs and three production errors are separate list items, and all copy after the impact sentence remains present.

Browser output:

```text
width  overflow  number colour       body position  number fits  left edges match
375    true      rgb(22, 19, 15)     static         true         true
768    true      rgb(22, 19, 15)     static         true         true
1024   true      rgb(22, 19, 15)     static         true         true
1440   true      rgb(22, 19, 15)     static         true         true
1920   true      rgb(22, 19, 15)     static         true         true
```

At 375px the number uses the allowed fallback minimum of `2.375rem` and fits its body. Number contrast against the computed block background is `17.32:1`. The browser console is empty.

Screenshots:

```text
qa-screens/g18/record-375.jpg
qa-screens/g18/record-768.jpg
qa-screens/g18/record-1024.jpg
qa-screens/g18/record-1440.jpg
qa-screens/g18/record-1920.jpg
```

## CSS and copy output

```text
record_two_column_rules=0
sticky_rules=0
Not a million impressions=1
It does not prove your campaign will work=1
Over a million letters, posted=0
record number h2=1
home copy matches
```

`accent-deep` usage:

```text
11   custom property definition
166  hero secondary-link underline colour
246  stamp-button border colour
253  prose-link underline colour
424  hero kicker square background
883  record label square background
```

It is not used as text colour in `The record`. The two project text-related uses are underline decoration, not glyph colour; they were listed and left unchanged.

Server output for release `/var/www/coin.im/releases/20260815T095910Z`:

```text
grep ':hover' | grep 'transform|padding|border-width|font-weight': no output
grep 'sticky': no output
Not a million impressions=1
It does not prove your campaign will work=1
Over a million letters, posted=0
nginx active
nginx configuration test successful
```

## Status

- Buttons do not change geometry on hover or active; the cursor remains stable.
- Touch hover fill does not stick after tap and scroll.
- Reduced motion is immediate and keeps stable geometry.
- The record is one column with one left edge and no sticky element.
- The number is dark and framed by the two ledger rules with its caption.
- The three production errors are visible as a separate list.
- The impact sentence is separate and larger than the remaining copy.
- Performance: 95.
- Accessibility: 100.
- Best Practices: 100.
- SEO: 100.
