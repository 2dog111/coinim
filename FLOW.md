# coin.im Market Scan Reference Flow

## Entry

Readers enter `/msru` or `/ms` directly, or follow the matching language route from the site. The header identifies coin.im and Market Scan, hides on downward reading, returns on upward movement, and reports chapter progress plus estimated reading time. In both languages the first viewport states that a list ends where the buyer's vocabulary ends, explains the filter blind spot, and names the route from product to physical address. A compact passport confirms that the channel is physical mail, the method starts with the product, and the evidence comes from the documented history and model benchmark.

## Main Reading Path

1. On `/msru` and `/ms` the reader moves from the image-free hero into a five-link chapter strip and then directly into the first-person story. Neither hero interrupts the opening with an early CTA.
2. The chapter strip is sticky and horizontally scrollable on mobile. On wide screens the larger rail appears only after two minutes of reading and after the reader reaches part two.
3. The reader moves through the argument, system mechanics, build history, dark benchmark evidence panel, qualification note, result inventory, FAQ, and economic conclusion on one stable editorial axis.
4. Proof notes expose exact numbers without interrupting the protected paragraphs. They default closed on mobile and open on desktop.
5. Quiet intermediate actions and the final loud action all return to the same manual `/open` intake. Telegram remains the secondary route in the sealed closing block.

## State And Navigation

- `assets/msru.js` synchronizes both contents controls with the current section, calculates reading time at 200 words per minute, updates chapter and remaining minutes, hides and restores the sticky header, sets the mobile proof-note state, and reveals editorial anchors through `IntersectionObserver`. Hash navigation uses a fixed 720 ms eased scroll and falls back to immediate movement under reduced motion. The rail still stores the reading start in session storage and reveals itself only after the delayed threshold and part-two boundary.
- `assets/ms-reading.js` preserves the existing local reading-resume state by pathname. It clears the state near completion.
- Russian human-readable hash links are the source of truth for `/msru`, with old `#chast-1` through `#chast-5` aliases retained. English `/ms` retains its established `#premise`, `#judge`, `#sourcing`, `#record`, and `#faq` hashes as its compatibility contract.
- `assets/ms-track.js` keeps the existing page and CTA beacon behavior. Four `/open` links in each language keep distinct CTA labels for analytics. The final Telegram link remains separate.

## Success Criteria

- The proposition, filter problem, Market Scan mechanism, and first-person proof are understandable without scrolling in both languages; the story follows in the same voice without a photograph or intermediate CTA screen.
- Every contents link reaches the matching section and exposes the active state.
- The primary action reaches `/open`; this page itself does not submit files or create a scan.
- The closing block provides both `/open` and Telegram without implying an automated success state.
- The four FAQ answers repeat only facts already present in the protected story and are mirrored in valid FAQPage JSON-LD.
- Keyboard navigation exposes the skip link and reaches all controls.
- The page remains readable and free of horizontal overflow across the project viewport matrix.

## Failure And Boundary States

- If JavaScript is unavailable, all story content, hash links, and actions remain visible and work as normal HTML. The delayed rail, progress, header auto-hide, and reveal motion simply do not run.
- If local storage is unavailable, reading-resume behavior fails silently and the page remains usable.
- Intake errors and upload validation belong to `/open`, not to `/msru` or `/ms`.
- A successful visit to `/open` is navigation to the manual intake, not proof that materials were accepted or a Market Scan was produced.

## Future Language Pages

The Russian and English journeys now share the same editorial system. A future Spanish page requires a separate translation or adaptation, language-specific geometry and metadata, and its own validation pass.

## Homepage Route Flow

1. A reader entering `/` sees exactly three occupied placements with separate current prices: website in slot № 1, social profile in slot № 2, and text-only message in slot № 3. There is no unclaimed homepage state.
2. The Russian hero has the direct `Website · Social · Message` publication action from the owner prompt. A plain `/takeover` URL opens the Message form immediately. Website, Social, and Message remain visible as three icon tabs with live prices on the same one-column publisher screen. Each placement also keeps its own action. The server and client both calculate the exact next amount as the selected slot's current confirmed price plus `1 USDT`.
3. The active form enforces the entity boundary. Website has exactly two visible fields: a non-social public URL and the text. The customer does not upload a screenshot or write a separate headline. Social requires one of 15 supported network choices, a matching public profile URL, and a pitch; pasting a supported URL selects its network automatically. Message accepts only the text. It has no name, URL, CTA, card-wide link, or share link. All three require 100 to 888 non-space characters.
4. Website submission first asks the isolated capture service to open the public URL, extract its page title and favicon, and photograph the visible `1600x1050` first screen. Private, local and non-HTTP targets are blocked. A page-capture failure returns the customer to the URL field and creates no payment intent. A successful screenshot and any usable favicon are normalized to WebP, the screenshot stays under `700 KB`, and both remain in the private draft until confirmation.
5. Form submission then creates one quote-locked payment intent and a private capability receipt. It does not charge a wallet and does not publish the draft. The selected slot and exact price are reserved for seven minutes. Two live receipts cannot reserve the same exact USDT amount at once.
6. The receipt identifies the selected slot and entity, shows the exact USDT amount, owner-approved TRON (TRC-20) address, QR code, TronLink action, automatic confirmation state and transaction-ID recovery field. The capability token stays out of canonical metadata and public logs.
7. A final matching blockchain transfer is applied once. Inside one SQLite transaction, the new placement, its optimized screenshot and favicon when it is a website, and the payment are recorded, the selected prior reign is closed, the new reign is activated, the old placement is added to Archive, and the quote lock is removed.
8. Only the selected slot changes. The other two placements and their prices remain untouched. The new slot price equals the confirmed amount, so its next outbid is again exactly `1 USDT` higher.
9. Automatic amount-only discovery stops when the seven-minute receipt expires. A customer who already sent payment can recover it with the exact TRON transaction ID. A late or conflicting confirmed payment never silently replaces the wrong placement; the private receipt exposes the resulting review or credit state.
10. `/archive`, `/stats`, `/rules`, public reign pages, verified ledgers and result images use server records only. They do not invent reach, payment or publication success.
11. When production payment configuration is incomplete, intent creation is refused. The mock provider is localhost-only. `/mail`, `/ms`, `/msru`, `/handling`, `/open`, `/ru`, `/es`, and the encrypted intake API keep their separate behavior.
