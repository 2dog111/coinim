# coin.im redesign prompt — Superdesign reference

Redesign the existing coin.im product around the interaction and spatial system visible in the LLL.bz Superdesign reference. Borrow the mechanism and measured relationships, not Superdesign’s identity, copy, illustrations, icons, brand marks, or generated-design gallery.

## Product truth to preserve

coin.im is an English trade-planning tool, not an exchange and not a generic AI landing page. A visitor describes a crypto trade, sets available budget, maximum acceptable modeled loss, and exit timing, then receives a deterministic comparison and an exit plan that can be questioned in chat. No wallet or account is required and nothing is traded. The public site also contains a sourced Binance incident report. The domain is visibly for sale for $70,000 through `mailto:8@111.bz`.

Keep every existing form field, handler, calculator, validation/recovery state, conversation state, blog route, source link, GA measurement ID, GA exclusion for `/insights/`, first-party insights, email address, and API contract. Do not invent quotes, prices, testimonials, users, live market data, forecasts, returns, scarcity, security claims, or customer logos.

## Reference geometry at 1440×900

Use the Superdesign first screen as the primary spatial reference:

- Near-white canvas, approximately `#fbfbfa`; black primary text; neutral gray secondary text; no colored marketing wash.
- Header height about 64px with 24–32px outer padding. Wordmark is left-aligned. A compact rounded navigation capsule sits visually in the center. Utility actions are right-aligned; the strongest utility is a black rounded button.
- Hero is centered, with substantial empty space rather than a split-screen poster. Start the headline near 130px from the top of the viewport. Keep it to one short line on desktop, about 44–52px, semibold sans, tight line height.
- Put a one-line muted explanation roughly 20px below the headline.
- Put a compact segmented information pill roughly 44–52px below the subtitle. For coin.im it must communicate the three required inputs — Budget, Max loss, Exit — without pretending to be an interactive control.
- Main planner panel begins about 40px below the pill. Desktop width 720–760px. White background, 1px neutral border, 20–24px radius, restrained shadow, generous 22–26px inner padding.
- The question textarea is the dominant empty area at the top of the panel. The required financial settings remain visible below it, aligned as three equal columns. Keep labels small and quiet, inputs 44–48px tall, and ranges/presets compact.
- The submit action is black and unambiguous. Preserve the text “Get the plan”; do not reduce it to an unexplained icon.
- Put real example-question chips immediately below the panel as the reference puts quick actions below its prompt box.
- The first screen must remain the tool itself. Do not add a decorative hero image, fake dashboard, cryptocurrency art, gradients, glass, or fabricated proof.
- Begin the next major section after a clear band of whitespace. Use a left-aligned section title and a right-aligned row of quiet category labels, echoing the reference’s “Discover design prompts” library header.

## coin.im adaptation below the fold

Translate the reference’s generated-output gallery into a gallery of real coin.im outputs:

1. The deterministic three-route comparison is the strongest proof and gets the largest card.
2. The exit-plan example is the second product proof.
3. The research report is a smaller editorial card with a direct route to the Binance incident article.

Use a 12-column desktop grid with 16–24px gaps and white cards on the near-white canvas. Cards use 18–24px radii, a thin neutral border and almost no shadow. The comparison can span the full grid; the exit plan and research can form an asymmetric 8/4 row. On mobile, stack them in task order: comparison, exit plan, research.

Each card must contain real existing content and interactions. Avoid repeating headings, card grids inside card grids, decorative badges, or generic feature copy. Keep section backgrounds continuous; hierarchy comes from spacing, borders and card mass.

## Header and sale action

Replace the separate colored sale strip with a Superdesign-like header composition. Keep coin.im at left, a rounded navigation capsule in the center, and right-side utilities: the visible email plus a high-contrast black `$70,000` sale button. The sale button must still say that the domain is for sale through accessible text and open the pre-addressed email inquiry. On mobile, keep the wordmark and `$70,000` action visible; collapse nonessential navigation without hiding the way back from the conversation.

## Typography and visual system

- Use the existing Hanken Grotesk as the primary and body face; the reference is sans-led. Keep IBM Plex Mono only for financial figures when it improves scanning. Do not use the current serif body treatment.
- Desktop body 16–18px, labels 13–14px, main headline 44–52px, library headings 26–32px. Mobile headline 40–48px with no clipped lines.
- Default radius family: controls 10–12px, pills 999px, product cards 20–24px.
- Default colors: canvas near-white, surfaces white, ink near-black, muted gray, border `#e7e7e4`, focus visible in dark blue or black. Remove the magenta accent.
- Motion is limited to 120–220ms hover/focus/press feedback and respects reduced motion.

## Blog, article and workspace

Carry the same header, typography, white surfaces, rounded containers and neutral palette into `/blog`, the Binance incident article and the conversation workspace. The article remains a reading surface, not a card wall. Preserve the numbered report structure, 38-source register and all source distinctions. The workspace remains task-first, with the current brief visible and recovery actions close to errors.

## Responsive and accessibility requirements

- At 390px there is no horizontal overflow. Controls remain at least 44px high.
- Required inputs remain visible; optional comparison fields stay in the native disclosure.
- Focus rings, labels, error announcements, disabled states, reduced motion and keyboard submission remain intact.
- Mobile task order is headline → explanation → required inputs → Get the plan → examples → proof gallery.

## Completion proof

Run TypeScript, ESLint, all 40 tests, `git diff --check`, and the production build. In isolated Chromium 151 at 390×844 and 1440×900, verify the homepage validation and recovery path, example dialog, advanced disclosure, conversation return path, blog navigation, article sources, console, page errors, failed requests, HTTP errors and horizontal overflow. Visually inspect final screenshots against the reference geometry. Only after those checks, deploy the verified commit, confirm public routes/API/GA privacy, refresh the one-generation encrypted R2 snapshot, remove the superseded server release, and push the release record to GitHub.
