# Home copy audit

Scope: `index.html` only. This audit records observations; it does not authorize copy edits outside the six approved G6 replacements.

## Repeated phrases of four or more words

Method: exact normalized text-node sequences. Nested shorter sequences are grouped under the longest repeated phrase rather than listed again.

| Phrase | Where | Classification |
| --- | --- | --- |
| `the ask is small enough to answer` | Stage three, lines 212 and 222 | Conscious echo: the process sentence is repeated in its ordered checklist. |
| `the list, the letter and the object` | How we work, line 605; FAQ duration, line 628 | Conscious echo: approval and timing need the same three deliverables. |
| `the letter and the object` | Stage navigation, line 121; How we work, line 605; FAQ duration, line 628 | Navigation/approval terminology, not a content duplicate. |
| `a reason to answer you` | Stage one, lines 155 and 165 | Conscious echo: the scanned-market definition restates the selection test. |
| `a campaign that fails` | FAQ no replies, line 640 twice | Deliberate rhetorical repetition within one answer. |
| `an enclosure that rattles` | The record, line 136; Stage four, line 236 | Conscious echo: the claim of production experience is supported later by the operational example. |
| `in a sorting machine` | The record, line 136; Stage four, line 236 | Conscious echo paired with the preceding item. |
| `deciding who is worth` | Stage-one heading, line 152; FAQ duration, line 628 | Intentional hand-off from the stage to the practical timing answer. |
| `have been posted to` | Stage three, line 211; FAQ letter-writing, line 632 | Similar wording, but the first tests specificity and the second tests exclusivity. |
| `the main thing is place` | Sand/soil and map-fragment object descriptions | Conscious object-catalogue echo. |
| `still attached to the` | Stage four, line 275; How we work, line 610 | Conscious echo: process summary repeats record traceability. |
| `we print, pack and` | Stage four, line 237; How we work, line 610 | Conscious echo: stage detail and workflow summary. |
| `the reason it was` | Stage one, line 156; Stage four, line 275 | Incidental shared wording around an explicitly recorded reason. |
| `come back with a` | FAQ countries, line 644; workflow copy | Incidental grammatical overlap with different subjects. |
| `without opening it, and` | Stages two and three | Incidental physical-mail wording; meanings differ. |

## Repeated syntactic figures

| Figure | Occurrences | Assessment |
| --- | --- | --- |
| `X is not Y` or `X is not for Y` contrast | Lines 137, 156, 183, 184, 213, 288, 488, 584 | Repeated deliberately to set scope and reject weak substitutes. It is a house style, not a newly introduced duplication. |
| `rather than` contrast | Lines 171, 184, 248, 658 | Repeated contrast between a weaker and a stronger operational choice. No edit under G6. |
| Short negative sequence (`Not X. Not Y.`) | Lines 135, 211, 340-341 | Three uses of staccato negation. The strongest repetition is in Stage three and the photo description; both remain because they serve different arguments. |
| `We do not ...` boundary statement | Lines 212, 272, 610, 640 | Four explicit limits or refusals. This is consistent with the page's candid tone. |

## Word counts by section

Visible English text-node words; headings and interactive labels are included. A flag marks a section more than twice either immediate neighbour.

| Section | Words | Flag |
| --- | ---: | --- |
| Hero | 119 | - |
| The record | 153 | - |
| Stage one | 257 | - |
| Stage two | 289 | - |
| Stage three | 282 | - |
| Stage four | 315 | - |
| Rest band 1 | 16 | - |
| The objects | 907 | More than 2x both neighbouring rest bands; expected catalogue depth. |
| Rest band 2 | 14 | - |
| How we work together | 153 | More than 2x Rest band 2; expected process section. |
| The obvious questions | 420 | More than 2x How we work together; expected FAQ density. |
| Start here | 59 | - |

## Tone review

| Place | Observation | Decision |
| --- | --- | --- |
| The record, lines 135-137 | Production proof is immediately bounded by what it cannot prove. | Keep: this prevents a volume claim from becoming a result claim. |
| Stage one bridge, lines 170-171 | The Market Scan link restates the research mechanics that the destination page expands. | Keep: it is navigation context, not a second explanation. |
| Stage four, lines 248-275 | Delivery states are followed by the distinction between delivery evidence and attention. | Keep: the limitation is material, not already implied by a signature. |
| How we work, lines 600-610 | The workflow compresses earlier stages into approvals and dispatch. | Keep: this is the operational summary a buyer needs before the FAQ. |
| FAQ no replies, line 640 | The answer repeats the page's evidence-and-learning proposition. | Keep: it directly answers the risk question and now avoids the removed phrase. |

No sentence was identified as removable solely because the preceding paragraph already made the same point.

## G6 mechanical overlap checks

### Home market-selection mechanics retained

| `index.html` line | Retained sentence or unit |
| ---: | --- |
| 154 | Bought-list failure and industry-code filtering. |
| 155 | Market hypotheses are chosen before a list exists. |
| 156 | Hypotheses survive or are dropped with recorded reasons. |
| 161 | Bought-list comparison by industry code and headcount. |
| 165 | Scanned-market qualification by a reason to answer. |
| 171 | Market reading, hypothesis naming, pruning standard and measurement. |
| 600 | Brief-stage explanation of markets worth writing to and markets skipped. |

These are retained because G6 is a copy audit, not a scope reduction of the home-page explanation.

### Market Scan statements that retell home-page delivery or object work

| `ms.html` lines | Retold subject | Decision |
| --- | --- | --- |
| 884-919 | Named-person route verification, delivery risk and postage cost. | Keep; this is evidence for the Market Scan workflow. |
| 925-933 | Letter timing and the object being chosen by the argument. | Keep; this is the Market Scan's downstream rationale. |
| 964-972 | Object constraints and a link to the home-page object catalogue. | Keep; the explicit link avoids recreating the catalogue. |
| 1001-1008 | Delivery events connected back to market hypotheses. | Keep; this explains the joined-up record. |
| 1044-1049 | Physical-route and campaign-record outputs. | Keep; these are deliverables, not duplicate catalogue copy. |
| 1196-1201 | Route FAQ and the optional letters/objects/production/delivery work. | Keep; this answers Market Scan-specific questions. |

No `/ms` copy changed in G6.

## Copy freeze and acceptance checks

- `copy/home.en.md` is generated from ordered `main` text nodes of `index.html` and is the English home-page freeze.
- `node scripts/check-copy.js` compares normalized text nodes and exits non-zero on the first mismatch. It passes for `home`.
- `copy/ms.en.md` is intentionally a separate Market Scan work item. `node scripts/check-copy.js ms --write` exits with that explicit scope message rather than generating an incomplete freeze.
- The six approved WAS phrases were each present exactly once before replacement; only those six text fragments were changed.
- `find-and-replace` occurs once (line 211), `we would rather` occurs once (line 589), and `part of it that answered` occurs once (line 275).
- The required search for `before anything is printed|before production|until you have seen` returns three lines: 199, 595 and 632. Line 632 is the mandatory retained FAQ lead-in from the approved G6 replacement, so a two-line result would require a prohibited seventh edit.
