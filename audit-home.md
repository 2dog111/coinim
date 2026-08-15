# Home G1 Audit

## 1. Tokens

| Selector | Property | Current value | Replacement |
| --- | --- | --- | --- |
| `:root` in old `styles.css` | `--page`, `--page-warm`, `--surface` | `#f7f8f5`, `#fffef9`, `#ffffff` | `--paper`, `--paper-raised`, `--paper-deep` from `assets/base.css` |
| `:root` in old `styles.css` | `--ink`, `--hero-ink`, `--headline`, `--headline-soft`, `--muted` | separate homepage ink set | `--ink`, `--ink-soft`, `--ink-muted`, `--ink-inverse` from `assets/base.css` |
| `:root` in old `styles.css` | `--highlight`, `--gold`, `--deep-gold` | old yellow set | `--accent`, `--accent-deep`, `--accent-ink` in `assets/home.css` |
| `:root` in old `styles.css` | `--coral`, `--teal` | extra homepage accent colours | removed from active homepage styling; contact icon cues moved to `--whatsapp` and `--telegram` |
| `.hero-kicker` | `font-size` | `clamp(2.75rem, 5.25vw, 5.65rem)` | `clamp(2.75rem, 7vw, 5.5rem)` |
| `.message-lead`, `.message-flow`, `.message-proof`, `.message-offer` | `font-size` | multiple custom display sizes | replaced by `/ms` H1, H2 and body scale |
| `.hero`, `.content-section`, `.deep-research`, `.client-path-section`, `.closing-section` | `padding` | independent homepage spacing literals | replaced with `/ms` rhythm based on `clamp(...vh...)` and `--measure` |
| `.hero-kicker`, `.contact-card`, `.deep-research`, `.example-image`, `.primary-cta` | `border-radius` and `box-shadow` | card shadows and rounded surfaces | shadows removed; radius reduced or removed; borders use `--rule` |
| `index.html` | `theme-color` | `#f8de6a` | `#f4efe5` |
| `assets/home.css` | all hex colours | root declarations only | verified with `rg -n "#[0-9a-fA-F]{3,8}" assets/home.css` |

## 2. Components

| Home class | `/ms` analogue | Verdict |
| --- | --- | --- |
| `.hero` / `.hero-copy` / `.hero-kicker` | `.ms-hero-v2`, `.ms-hero-inner` | renamed and rebuilt as `.home-hero` using the same scale |
| `.message-board` | none needed | removed |
| `.market-scan-cta` | `.bridge` | removed in G1; `.bridge` reserved for later prompt |
| `.deep-research.market-scan` | `/ms` explanatory longread blocks | removed from homepage |
| `.stage-index` | none | kept as the only new G1 component |
| `.rest-band` | `.rest-band` | reused from `assets/base.css`; one instance on homepage |
| `.equation` | `.equation` | reused from `assets/base.css` with a narrow homepage override |
| `.text-block`, `.example-image` | independent homepage object section | left as homepage content, restyled with shared tokens |
| `.client-path-grid`, `.client-path-item` | no direct `/ms` equivalent | left as homepage workflow section, restyled with shared tokens |
| `.contact-card` | no direct `/ms` equivalent | left for preserved closing contact section |

## 3. Typography

| Page | Connected families before | Connected families now |
| --- | --- | --- |
| Home | system sans plus repeated Inter/system stacks in `styles.css` | `--font-serif: Georgia, "Times New Roman", serif`; `--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; mono system stack for technical elements |
| `/ms` | `Georgia`, system sans, system mono from `ms.css` | unchanged visually, now supplied by `assets/base.css` |
| External font files | none | one G4 exception: `Patrick Hand` local Latin subset for short handwritten fragments only |
| `font-display` | not applicable because no `@font-face` was used in G1-G3 | G4 handwritten exception uses `font-display: swap` |

## 4. Rubbish

| Item | Found | Closed by |
| --- | --- | --- |
| Gradient buttons | old `.primary-cta`, `.market-scan-cta`, old contact treatments | removed from active homepage CSS |
| Glassmorphism / blur | old contact cards | removed from active homepage CSS |
| Floating cards with shadows | old hero cards, research cards, image cards | removed from active homepage CSS |
| Glows | old contact/image treatments | removed from active homepage CSS |
| Icon emoji | none on edited homepage | no action |
| Animated counters | none | no action |
| Trust badges | none | no action |
| Cookie banner | none | no action |
| Unconfirmed `88 ways` line | English, Russian, Spanish marketing hero copy | removed |

## QA

| Check | Result |
| --- | --- |
| `/ms` screenshots before/after | `qa-screens/ms-before-375.png`, `qa-screens/ms-after-375.png`, `qa-screens/ms-before-1440.png`, `qa-screens/ms-after-1440.png` |
| `/ms` pixel comparison | 375: no diff; 1440: no diff |
| Home screenshots | `qa-screens/home-g1-375.png`, `qa-screens/home-g1-768.png`, `qa-screens/home-g1-1024.png`, `qa-screens/home-g1-1440.png`, `qa-screens/home-g1-1920.png` |
| `scrollWidth === innerWidth` | 375=375, 768=768, 1024=1024, 1440=1440, 1920=1920 |
| H1 count | 1 |
| Stage placeholders | `#stage-1` ... `#stage-4` exist, empty, height 0 |
| `.rest-band` on homepage | 1 |
| Hero/proof copy | exact match to COPY |
| `--accent` and `--accent-deep` as text colour | none in `assets/home.css` |
| Contrast | `--accent-ink` on `--paper`: 8.19:1; `--ink` on `--accent`: 13.80:1; `--ink-soft` on `--paper`: 9.31:1; `--ink-muted` on `--paper`: 5.62:1 |
| Keyboard focus | visible on both hero links; screenshot `qa-screens/home-g1-focus.png` |
| Reduced motion | `assets/home.css` disables transitions and animation under `prefers-reduced-motion: reduce` |
| Lighthouse | Performance 100, Accessibility 100, SEO 100; `qa-screens/lighthouse-home-g1.json`, `qa-screens/lighthouse-home-g1.html`, `qa-screens/lighthouse-home-g1.png` |

## Decisions

| Decision | Reason |
| --- | --- |
| `assets/base.css` was copied from current `ms.css` instead of extracting a smaller subset first | This preserves `/ms` pixel-for-pixel for G1; a later cleanup can reduce the base once both pages are stable |
| Existing object and workflow sections stayed in place | G1 explicitly says not to rewrite those sections yet |
| The first `.rest-band` is empty | No COPY text was supplied for it, and adding text would violate the prompt |
| Contact cards remain only in the preserved closing section | The hero COPY requires two links only |
| Literal `88` remains in unrelated `s.html`, `ai.html`, old inactive `styles.css`, and old inactive `ms.css` | The marketing “88 ways” claim was removed; unrelated source names, prices, CSS sizes, and inactive legacy files were not rewritten |

## Not Done

| Item | Status |
| --- | --- |
| Public deployment | not requested |
| Reducing `assets/base.css` to only common rules | deferred to avoid changing `/ms` pixels during G1 |

# Home G2 Report

## Structure

| Check | Result |
| --- | --- |
| `.stage` | declared once as the shared stage component; filled stages use generic descendant rules, empty stages use `.stage:empty` |
| `#stage-1` | filled with Stage one COPY, `.contrast-pair`, and the only `.bridge` |
| `#stage-2` | filled with Stage two COPY and `.spec-card` |
| `#stage-3`, `#stage-4` | empty, height 0 |
| `.rest-band` on homepage | 1 |
| `.bridge` on homepage | 1 |
| Bridge links | `/ms`, `/ms#limits` |
| `/ms#limits` | exists; local browser resolved it as `/ms/#limits`, target title: `Five things this does not do.` |
| H1 count | 1 |
| Heading order | no skipped heading levels in the edited stages |

## Content

| Check | Result |
| --- | --- |
| Stage one COPY | exact text inserted |
| Stage two COPY | exact text inserted |
| Extra transition text | none added |
| Northline Industrial | not present on homepage |
| `/ms` terminology beyond COPY | no `Market Arm`, `Chronicle`, `Judge`, `vertical`, `.merge-diagram`, or `.distance-set` on homepage |
| British spelling | `labelled` preserved |

## Visual And Technical QA

| Check | Result |
| --- | --- |
| Home screenshots | `qa-screens/home-g2-375.png`, `qa-screens/home-g2-768.png`, `qa-screens/home-g2-1024.png`, `qa-screens/home-g2-1440.png`, `qa-screens/home-g2-1920.png` |
| `scrollWidth === innerWidth` | 375=375, 768=768, 1024=1024, 1440=1440, 1920=1920 |
| 375 `.contrast-pair` | width 343, no horizontal scroll |
| 375 `.spec-card` | width 343, no horizontal scroll |
| Accent in stages | only `01` and `02` use `--accent-ink` |
| `--accent` as text | none |
| `--accent-deep` as text | none |
| Contrast | `--ink-muted` on `--paper`: 5.62:1; `--ink` on `--paper`: 16.16:1; `--ink-soft` on `--paper`: 9.31:1; `--accent-ink` on `--paper`: 8.19:1 |
| Reduced motion | `assets/home.css` disables transitions and animation under `prefers-reduced-motion: reduce` |
| Bridge keyboard focus | visible on both bridge links; screenshot `qa-screens/home-g2-focus.png` |
| Lighthouse | Performance 100, Accessibility 100, SEO 100; `qa-screens/lighthouse-home-g2.json`, `qa-screens/lighthouse-home-g2.html`, `qa-screens/lighthouse-home-g2.png` |

## Decisions

| Decision | Reason |
| --- | --- |
| Stage internals use semantic elements with `.stage` descendant selectors rather than new named components | G2 forbids new components beyond `.stage` |
| `.bridge` links are normal ink on the homepage | G2 limits stage accent usage to `01` and `02` |
| Automatic `.bridge` arrow is suppressed inside stages | No microcopy or extra visual cue was supplied in COPY |
| `.spec-card` title is an `h3`, not `h4` | Keeps heading hierarchy from skipping levels |
| `.contrast-pair` uses a neutral rule instead of the base red left border | Avoids visual “bad-good” colour coding |

## Not Done

| Item | Status |
| --- | --- |
| Nothing | all requested local G2 checks completed |

# Home G3 Report

## Structure

| Check | Result |
| --- | --- |
| `#stage-3` | filled with Stage three COPY, vertical `.chain`, `.equation`, and `#objects` link |
| `#stage-4` | filled with Stage four COPY, `.manifest`, `.status-list`, limits paragraph, and closing paragraph |
| `.stage` shell | unchanged from G2; only existing base components were styled inside stages |
| `.rest-band` on homepage | 2 |
| `.bridge` on homepage | 1 |
| Object catalogue | unchanged except `id="objects"` added to the existing object section |
| `The ten objects we post` | links to `#objects`; local click set hash to `#objects` and scrolled the target to top |
| H1 count | 1 |
| Heading order | no skipped heading levels in the edited stages |

## Content

| Check | Result |
| --- | --- |
| Stage three COPY | exact text inserted, including `≠` |
| Stage four COPY | exact text inserted, including visible em dashes in `.status-list` |
| Rest band COPY | exact text inserted |
| Extra bridge to `/ms` | none |
| Extra numbers in stages 3 and 4 | none beyond COPY and stage numbers `03`, `04` |
| New images in stages 3 and 4 | none |

## Visual And Technical QA

| Check | Result |
| --- | --- |
| Home screenshots | `qa-screens/home-g3-375.png`, `qa-screens/home-g3-768.png`, `qa-screens/home-g3-1024.png`, `qa-screens/home-g3-1440.png`, `qa-screens/home-g3-1920.png` |
| `scrollWidth === innerWidth` | 375=375, 768=768, 1024=1024, 1440=1440, 1920=1920 |
| 375 `.manifest` | width 343, no horizontal scroll |
| 375 `.status-list` | width 343, no horizontal scroll |
| `.chain` | vertical on all five widths; no arrows, icons, or numbers |
| `.status-list` colours | all states use the same ink colour, no green/red marking |
| Closing paragraph | ordinary text block, no frame or accent background |
| Accent in stages 3 and 4 | only `03` and `04` use `--accent-ink` |
| `--accent` as text | none |
| `--accent-deep` as text | none |
| Contrast | `--ink-inverse` on `--ink-surface`: 16.16:1; `--ink-muted` on `--paper`: 5.62:1; `--ink-soft` on `--paper`: 9.31:1; `--ink` on `--paper`: 16.16:1; `--accent-ink` on `--paper`: 8.19:1 |
| Reduced motion | `assets/home.css` disables transitions and animation under `prefers-reduced-motion: reduce` |
| Catalogue link focus | visible; screenshot `qa-screens/home-g3-focus.png` |
| Lighthouse | Performance 100, Accessibility 100, SEO 100; `qa-screens/lighthouse-home-g3.json`, `qa-screens/lighthouse-home-g3.html`, `qa-screens/lighthouse-home-g3.png` |

## Decisions

| Decision | Reason |
| --- | --- |
| The `.chain` title is a direct `h3` before the ordered list | The COPY includes a title, while keeping `.chain` itself as the existing list component |
| The `.chain` connector is a plain left rule | G3 forbids arrows, icons, and numbers |
| `.status-list` descriptions include the visible leading em dash | Preserves the supplied status-list text while keeping state and explanation in separate columns |
| The catalogue id was added to `.text-section` | That section contains the ten object entries; no object catalogue content was otherwise changed |
| The second `.rest-band` is placed before the object catalogue heading | G3 requires it after `#stage-4` and before the catalogue |

## Not Done

| Item | Status |
| --- | --- |
| Nothing | all requested local G3 checks completed |

# Home G4 Report

## Letter Rendering

| Check | Result |
| --- | --- |
| Letter audit | `audit-letters.md` created |
| Active letter text locations | text is baked into object photographs only; no overlay and no DOM letter body |
| `rotate`, `skew`, `matrix` in `assets/*.css` | none |
| Handwritten candidate screenshots | `qa-screens/font-candidates/caveat-375.png`, `qa-screens/font-candidates/caveat-1440.png`, `qa-screens/font-candidates/patrick-hand-375.png`, `qa-screens/font-candidates/patrick-hand-1440.png`, `qa-screens/font-candidates/shantell-sans-375.png`, `qa-screens/font-candidates/shantell-sans-1440.png` |
| Selected handwritten font | Patrick Hand |
| Selection reason | On 375 it separates `a/o`, `r/v`, `i/l`, `n/m`, and digits most clearly without Shantell Sans' wrapping cost |
| Connected handwritten file | `assets/fonts/patrick-hand-latin-subset.ttf`, local subset |
| `font-display` | `swap` |
| Handwritten fragment size rule | `clamp(1.35rem, 2.2vw, 1.7rem)`, above 1.25rem on 375 |
| Handwritten line-height rule | 1.6, above 1.55 |
| Handwritten colour rule | `--ink`, no opacity and no `mix-blend-mode` |
| Handwritten width rule | max 48ch |
| Active handwritten fragments | none |
| Read-aloud test | Patrick Hand candidate fragment read on first attempt at 375 |
| Handwritten contrast | `--ink` on `--paper-raised`: 17.32:1 |

## Object Catalogue

| Check | Result |
| --- | --- |
| Object count | 10 |
| Object order | preserved from the existing page |
| Names and descriptions | existing names and descriptions preserved; wrapper COPY replaced per G4 |
| Images | existing `/assets/` files only; no generated or stock images |
| `with-copy` variants | replaced with no-`with-copy` variants where an existing pair was available |
| Aspect ratio | all catalogue images render at 4:3 with `object-fit: cover` |
| `alt` | equals object title exactly for all 10 images |
| `width` and `height` | present for all 10 images |
| Loading | first two have no `loading="lazy"` and use `fetchpriority="low"`; remaining eight use `loading="lazy"` |
| Grid | 375: 1 column; 768: 2 columns; 1024+: 2 columns |
| Card styling | rule-separated, no shadows, no rounded corners, no hover lift, no lightbox |
| Wrapper COPY | exact G4 COPY inserted |

## Page QA

| Check | Result |
| --- | --- |
| `.rest-band` on homepage | 3 |
| Third `.rest-band` | after catalogue, text: `We would rather post four hundred letters that land than four thousand that arrive.` |
| `.bridge` on homepage | 1 |
| Stages 1-4 | stage geometry unchanged from G3 at 375 and 1440; before screenshots `home-g3-375.png`, `home-g3-1440.png`; after screenshots `home-g4-375.png`, `home-g4-1440.png` |
| Home screenshots | `qa-screens/home-g4-375.png`, `qa-screens/home-g4-768.png`, `qa-screens/home-g4-1024.png`, `qa-screens/home-g4-1440.png`, `qa-screens/home-g4-1920.png` |
| `scrollWidth === innerWidth` | 375=375, 768=768, 1024=1024, 1440=1440, 1920=1920 |
| Reduced motion | `assets/home.css` disables transitions and animation under `prefers-reduced-motion: reduce` |
| Catalogue link focus | still visible on `The ten objects we post`; screenshot `qa-screens/home-g4-focus.png` |
| Catalogue image bytes before | 2,066,636 bytes |
| Catalogue image bytes after | 1,921,502 bytes |
| LCP before G4 | 1.4s from `qa-screens/lighthouse-home-g3.json` |
| LCP after G4 | 1.5s from `qa-screens/lighthouse-home-g4.json` |
| Lighthouse | Performance 100, Accessibility 100, SEO 100; `qa-screens/lighthouse-home-g4.json`, `qa-screens/lighthouse-home-g4.html`, `qa-screens/lighthouse-home-g4.png` |

## Decisions

| Decision | Reason |
| --- | --- |
| No separate letter text was added | The current visible letter text is baked into photos and no confirmed real fragment was supplied |
| Object photos remain photographs even where faint text is visible | They are treated as object images, not as readable letter text |
| First two catalogue images use `fetchpriority="low"` instead of `loading="eager"` | They satisfy the “not lazy” rule without competing with above-the-fold LCP |
| The old `.ms-stamp` rotation was removed from `assets/base.css` | Keeps the G4 global transform grep clean across `assets/*.css` |
| `Patrick Hand` was selected over default Caveat | Better small-width distinction in the required letter pairs |

## Not Done

| Item | Status |
| --- | --- |
| Replacement readable letter sample | not added because no confirmed copy was supplied |

# Home G5 Report

## Delivered

| Area | Result |
| --- | --- |
| `#how` | Three `.spec-card.spec-card--plain` steps with exact G5 copy; one column at 375 and three equal-height columns from 1024 |
| `#faq` | Seven static, fully visible answers inside `.faq`; no `details`, `summary`, accordion, form, or fields |
| `#contact` | Exact CTA copy and the three required links; email first, horizontal on desktop, vertical on 375 |
| Header and navigation | Identical markup, links, sticky behaviour, focus treatment, and progress line on `/` and `/ms` |
| Skip links | Present on both pages and focus visibly before all other links |
| Anchors | Homepage stages, objects, how, FAQ, contact, and every Market Scan TOC target resolve; `#measured` lands at 96px below the top against a 92px header on 375 |
| Metadata | `lang=en`, page-specific title and description, canonical, existing local OG image, `theme-color=#f4efe5`, and one shared favicon set on both pages |
| Crawl files | `sitemap.xml` includes `/` and `/ms` with `2026-08-15`; `robots.txt` references both canonical pages |
| Market Scan | Benchmark says August 2026, client inputs are anonymous, and `.rest-band` count remains 4 |
| CSS cleanup | Removed CSS for the replaced operations/client-path/closing tail; all CSS colour literals are inside `:root` token scopes |
| Fonts | Three active runtime families: Georgia, ui-monospace, and Patrick Hand; the handwritten font remains limited to `[data-handwritten]` and no fragment is active on the homepage |

## QA

| Check | Result |
| --- | --- |
| Responsive widths | `/` and `/ms` checked at 375, 768, 1024, 1440, and 1920 |
| Horizontal overflow | `scrollWidth === innerWidth` at every width on both pages |
| Homepage counts | 3 rest bands, 1 bridge, 10 objects, 3 work cards, 7 FAQ entries, 3 contact links |
| Homepage grids | Objects: 1 / 2 / 2 / 2 / 2 columns; work cards: 1 / 1 / 3 / 3 / 3 columns |
| Console | 0 errors and 0 warnings on both pages at every checked width |
| External contacts | WhatsApp redirects to a successful 200 response; Telegram returns 200; mail link has the exact required `mailto:` target |
| Contrast | Worst text palette pair: `--stamp` on `--paper-deep`, 5.04:1; all checked text pairs exceed 4.5:1 |
| Motion | Both active page stylesheets disable transition and animation under `prefers-reduced-motion: reduce` |
| Lighthouse `/` | Performance 100, Accessibility 100, SEO 100, LCP 1.5s; `qa-screens/lighthouse-home-g5.json` and `qa-screens/lighthouse-home-g5.png` |
| Lighthouse `/ms` | Performance 99, Accessibility 100, SEO 100, LCP 1.8s; `qa-screens/lighthouse-ms-g5.json` and `qa-screens/lighthouse-ms-g5.png` |
| Screenshots | Before: `qa-screens/home-g5-before-375.png`, `qa-screens/home-g5-before-1440.png`, `qa-screens/ms-g5-before-375.png`, `qa-screens/ms-g5-before-1440.png`; final renders: `qa-screens/home-g5-after-{375,768,1024,1440,1920}.png`, `qa-screens/ms-g5-after-{375,768,1024,1440,1920}.png` |
| Active CSS source weight | 2,759 lines before G5 to 2,754 after G5, a reduction of 5 lines after replacing the obsolete tail with the requested sections |

## Decisions

| Decision | Reason |
| --- | --- |
| FAQ uses static articles rather than open `details` | The brief requires every answer to remain visible and explicitly rejects an accordion |
| Header is shared at the markup level | It is the smallest way to keep links, order, sticky state, progress line, and focus behaviour identical across both pages |
| Accent underlay appears only under `mail@coin.im` below the catalogue | The brief allows one final accent appearance and rejects filled contact buttons |
| Legacy `styles.css` and root `ms.css` received token-only colour normalization | The request applies the no-literal rule to every stylesheet; the values and selectors were preserved |

## Acceptance Notes

| Item | Status |
| --- | --- |
| No published prices | met; the word `price` occurs only inside the supplied FAQ copy explaining why no price is published |
| Literal `from` search | cannot be empty while preserving the approved G1-G4 and G5 copy, which contains ordinary non-price uses of `from` |
| Literal full-repository `grep -rn '88' --include='*.html'` | outside the two-page scope: legacy `ai.html` and `s.html` contain unrelated historical references; `/`, `ms.html`, and `ms/index.html` have no match |

## Outside This Five-Prompt Scope

| Item | Required next step |
| --- | --- |
| Legal/data FAQ | Client legal counsel supplies jurisdiction-specific approved text before it is added as the final FAQ item |
| Published campaign timing or minimum volume | Confirm operational values before publishing them |
| Russian, Spanish, AI, and notes pages | Separate content and visual review; no copy changes were made to them here |
| Production publication | Explicit deployment instruction and a fresh production verification pass |
