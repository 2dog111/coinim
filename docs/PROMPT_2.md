Continue implementing coin.im in the current repository.

This is Prompt 2: refine the first two homepage sections, add a third section, and strengthen the working product behind them.

Do not restart the project.
Do not replace the existing application with a new template.
Do not deliver only a design proposal.

All website copy, interface text, assistant output, code comments, and implementation documentation must be in English.

Do not conduct competitor or market research.
Do not invent current prices, available contracts, market evidence, or product capabilities.

────────────────────────────────────────
1. THE PRODUCT UPGRADE
────────────────────────────────────────

coin.im turns an existing crypto idea into a conditional trade plan.

The user has usually already picked the coin.

Their real question is:

“Given what I believe, how long I can wait, and what I can afford to lose, which ways of entering fit—and what would have to happen for each to work?”

The product must now make three things unusually clear:

1. Whether the intended exposure fits the user’s constraints.
2. What each route needs to become profitable or outperform an alternative.
3. What the user intends to do after entering.

The differentiator is conditional comparison, not AI-generated conviction.

Do not optimize for the largest bullish-scenario profit.
Do not call one route “best” without stating the assumptions and criteria.
Do not confuse a structure that fits a loss limit with a good investment.

A smaller position, waiting, and insufficient information remain valid outcomes.

Important distinction:

Equal maximum modeled price loss does not imply equal risk, equal probability of loss, or equal likelihood of reaching a target.

Use that distinction consistently.

────────────────────────────────────────
2. INSPECT AND PRESERVE
────────────────────────────────────────

Read the project instructions and inspect the actual implementation before editing.

Check:

- AGENTS.md, CLAUDE.md, README.md, and relevant configuration.
- Git status and unrelated uncommitted changes.
- Existing form, calculator, chat, API, shared state, and tests.
- Whether financial calculations are deterministic.
- Whether chat uses a real server-side model integration.
- Whether hypothetical data is visibly separated from verified data.

Preserve working functionality from Prompt 1.

Fix missing or broken baseline functionality when it affects this task, but do not rewrite unrelated code.

Reuse the existing framework and components.

Do not add authentication, a database, wallets, order execution, payments, subscriptions, or a new market-data integration for this task.

Keep the application compact.

────────────────────────────────────────
3. PAGE STRUCTURE AND VISUAL DIRECTION
────────────────────────────────────────

The homepage now has exactly three primary sections:

1. Describe and check the trade.
2. Compare outcomes and understand the hurdle.
3. Plan the exit.

The analysis/chat panel is part of the application, not a fourth marketing section.

Use a light, restrained, financially credible design.

- One primary reading column.
- Large regular-weight headings.
- Readable body text.
- Compact forms.
- Clear dollar amounts.
- Subtle borders.
- One restrained accent color.
- Minimal decorative elements.

Do not use crypto illustrations, neon styling, fake charts, oversized gradients, testimonials, invented logos, performance claims, or activity notifications.

Do not force sections into fixed 100vh heights.
Do not sacrifice mobile usability to fit everything above the fold.

Primary action across the site:

“Build my trade plan”

Use secondary actions only when they perform a different task.

Header:

Wordmark:
“coin.im”

Navigation:
“Compare outcomes”
“Plan your exit”
“Ask a question”

The first two links scroll to their sections.
“Ask a question” opens the real chat panel.

Browser title:

“coin.im — You picked the coin. Now choose the trade.”

Meta description:

“Test your crypto trade against your budget, loss limit, and deadline. Compare outcomes, understand the trade-offs, and plan your exit.”

────────────────────────────────────────
4. SECTION ONE — EXACT COPY
────────────────────────────────────────

Small label:

“Before you buy”

H1:

“You picked the coin.
Now choose the trade.”

Supporting paragraph:

“Tell us what you want to buy, what you can afford to lose, and when you want out. We help you test the trade—not just justify the purchase.”

Small supporting line:

“A smaller position—or no trade—may be the better fit.”

Place the working intake form directly below.

Do not add a decorative hero image.

FORM COPY

Form heading:

“Start with your idea”

Textarea label:

“What are you thinking?”

Placeholder:

“I want to buy $5,000 of SOL and sell within six months. I think it could rise 50%, but I’m only comfortable losing $1,000. I’d sell early at my target. Compare the ways to enter—and tell me what I’m missing.”

Helper:

“Include anything that could change the answer.”

Keep the textarea visible, multiline, and initially empty.

Preserve the 4,000-character limit.

Do not turn the placeholder into submitted data.

Below the textarea, show a compact field group.

Labels:

“Coin”
“Capital available, USD”
“Out by”
“Target upside, %”
“Loss I can accept, USD”

Coin placeholder:

“BTC, ETH, SOL, or a token address”

Capital helper:

“Available to commit. Not a requirement to spend it all.”

Deadline options:

“Within 1 month”
“Within 3 months”
“Within 6 months”
“Choose a date”

Preserve six months as the visible default selection.

Use calendar-month arithmetic and resolve the selection to a real date on submission.

Target helper:

“Your scenario, not our forecast.”

Target and loss budget must each support:

“Not sure yet”

Do not invent either value when it is unknown.

Loss-budget helper:

“A constraint to test—not a guaranteed stop-loss.”

Keep fees and exit preference in an expandable area:

“Assumptions”

Preserve the existing fee calculations and validation.

Show the active fee assumption clearly, including whether it is illustrative or verified.

Example:

“Fees: 0.10% per side · Assumed”

Do not silently change the fee assumption to improve displayed returns.

Primary button:

“Build my trade plan”

Secondary text action:

“Load the worked example”

Below the actions:

“No wallet connection. No trade execution. Your decision.”

SMALL LIVE CHECK

Keep the live spot calculator, but make its output easier to understand.

Heading:

“Check the downside”

Before enough inputs exist:

“Add a budget and a loss limit to check the size of the position.”

When the capital budget is larger than the loss limit, explain the full-budget spot scenario without accusing the user of intending to spend everything.

Use this pattern:

“Putting the full {capitalBudget} into spot could lose more than your {lossBudget} limit.”

Then display:

“Smaller position, same idea”

Show:

- Capital committed.
- Capital left uncommitted.
- Profit/loss at the target or an explicitly illustrative scenario.
- Maximum modeled price loss.

Do not label the smaller position a personalized recommendation.

Use:

“This position fits the stated price-loss limit in the model.”

Include:

“Price-movement scenarios only. Platform, custody, currency, tax, and other risks are not included.”

Never imply that a stop order guarantees the loss limit.

Do not create a network request on every keystroke.

Free-text-only submission must still work.

If a required assumption is missing, open the chat with the available context and ask one useful question.

────────────────────────────────────────
5. SECTION TWO — INTERACTIVE PROOF
────────────────────────────────────────

Replace a passive comparison table with an interactive worked example.

Heading:

“Right about the coin.
Wrong about the trade.”

Supporting paragraph:

“A price rise can still produce a loss. Compare the outcomes before you choose the instrument.”

Visible label:

“Hypothetical example — not live prices”

Example summary:

“$5,000 available · $1,000 loss limit · +50% thesis · 6-month deadline”

This is a separate illustrative example, not the visitor’s actual trade.

Do not overwrite the visitor’s inputs when they interact with it.

SCENARIO SELECTOR

Label:

“What happens to the coin’s price?”

Options:

“+50%”
“+20%”
“No change”
“−30%”

Default selected scenario:

“+20%”

Selection changes the displayed calculations instantly.

Make the selector keyboard-accessible.

OUTCOME COMPARISON

Show three readable rows, or stacked cards on mobile:

1. “Buy $1,000 of the coin”
   Secondary:
   “$4,000 stays uncommitted”

2. “Spend $1,000 on an illustrative call”
   Secondary:
   “$4,000 stays uncommitted”

3. “Wait”
   Secondary:
   “No market exposure in this model”

For each route, show:

- “Profit / loss”
- “Maximum modeled price loss”

Clearly distinguish profit/loss from final capital.

Do not use percentage returns with an ambiguous denominator.

All values must come from the calculation engine.

Use the established example:

Reference asset price: $100
Spot allocation: $1,000
Call strike: $120
Premium per underlying unit: $10
Underlying units covered: 100
Total premium: $1,000
Expiry: the six-month example deadline
Fees: zero
Slippage: zero
Returns on uncommitted capital: zero

Expected results:

At +50%:
Spot: +$500
Call: +$2,000
Wait: $0

At +20%:
Spot: +$200
Call: −$1,000
Wait: $0

At no change:
Spot: $0
Call: −$1,000
Wait: $0

At −30%:
Spot: −$300
Call: −$1,000
Wait: $0

Maximum modeled price loss:
Spot: $1,000
Call: $1,000
Wait: $0

These are acceptance fixtures, not separately hardcoded display values.

SCENARIO EXPLANATION

Use short templates populated by calculated values.

At +20%:

“The coin rose 20%. Spot made $200. The call lost its entire $1,000 premium.”

At +50%:

“The call earns more here. It needed the larger move to happen by expiry.”

At no change:

“Spot is unchanged before costs. The call expires worthless.”

At −30%:

“Both routes lose. The call loses its full premium; spot retains $700.”

Keep values synchronized with the engine.

Below the comparison:

“Waiting avoids this price exposure, but it also misses a rally.”

────────────────────────────────────────
6. THE NEW DIFFERENTIATOR: WHAT THE TRADE NEEDS
────────────────────────────────────────

Below the example comparison, add a compact threshold explanation.

Heading:

“What this call needs”

Display two calculated thresholds:

“Break-even at expiry”
“+30%”

“Overtakes the spot example”
“Above approximately +33.3% at expiry”

Supporting text:

“Becoming profitable and becoming the better-paying route are two different thresholds.”

Small qualification:

“Calculated from this example’s assumptions. Not a forecast.”

Also show:

“Equal loss limits do not mean equal risk.”

CALCULATION REQUIREMENTS

Use deterministic functions.

For this zero-fee example:

S0 = 100
K = 120
p = 10
A_spot = 1000
C_call = 1000

Spot units:

q = A_spot / S0

Call underlying units:

u = C_call / p

Spot expiry PnL:

q × ST − A_spot

Call expiry PnL:

u × max(ST − K, 0) − C_call

Call break-even price:

K + C_call / u

For a valid crossover above the strike, solve:

(u − q) × ST = u × K + C_call − A_spot

For the example:

Call break-even price = 130
Call/spot upside crossover price = 133.333333...

Convert prices to returns relative to S0.

Do not hardcode the thresholds.

Handle invalid inputs, zero denominators, and cases without a valid upside crossover.

Do not imply that every pair of routes has one simple crossover.

Use full-precision values for calculations and rounded values for display.

At the exact crossover, the routes have equal modeled PnL.
“Above approximately +33.3%” must not be treated as an exact execution threshold.

Do not apply this helper to real options with different settlement mechanics.

Do not silently apply the zero-fee example’s thresholds to a user’s nonzero-fee scenario.

If a real option is not verified and priced, its threshold remains unknown.

Use:

“Cannot calculate this threshold without verified contract terms and a premium.”

Do not add an options optimizer or a complex charting package.

ASSUMPTIONS DISCLOSURE

Expandable label:

“Show the assumptions”

Include the full example inputs and:

“The option results apply at expiry only. They are not estimates of what the option could be sold for earlier.

This example uses an imaginary coin and a linear USD option payoff.

No executable quote is provided.

Fees, slippage, taxes, and returns on uncommitted capital are set to zero.”

Section action:

“Build my trade plan”

This scrolls to and focuses the existing form.
It must not overwrite user input.

────────────────────────────────────────
7. SECTION THREE — THE EXIT PLAN
────────────────────────────────────────

Add a third section that demonstrates the deliverable.

Do not make this a generic benefits grid.

Heading:

“Decide how you’ll get out.
Before you get in.”

Supporting paragraph:

“A price target is not a plan. Set your deadline, your exit conditions, and the evidence that would change your mind.”

Show one compact, concrete example plan.

Visible label:

“Illustrative plan · spot route”

Card title:

“The six-month plan”

Use the same example state as section two.

Do not create a second, inconsistent set of assumptions.

PLAN ROWS

Row label:

“Entry assumption”

Value template:

“$1,000 at $100 per unit. $4,000 remains uncommitted.”

Row label:

“Target condition”

Value:

“Review an exit if the coin reaches $150 before the deadline.”

Supporting text:

“A target is a condition to act on, not a guaranteed fill.”

Row label:

“Time limit”

Value template:

“Plan to exit no later than {resolvedExampleDate}, whether or not the target has been reached.”

Resolve the example date from six calendar months after the current example start date.

Do not hardcode a date or use 180 days as a substitute.

Avoid timezone-related off-by-one errors.

Row label:

“Reason to reconsider”

Value:

“Not defined yet.”

Supporting text:

“What evidence would make you stop believing this trade is worth taking?”

Do not invent a token-specific invalidation rule.

Row label:

“Downside”

Value template:

“Up to $1,000 of modeled price loss.”

Supporting text:

“An earlier exit may reduce the loss. A stop order does not guarantee a cap.”

Row label:

“Still unverified”

Value:

“The investment thesis, current market prices, and executable liquidity.”

Below the card:

“This is the format. Your plan is built from your own inputs.”

Primary action:

“Build my trade plan”

Secondary action:

“Ask a question”

The first action focuses the intake form without changing it.
The second opens the user’s existing conversation, not an invented example conversation.

Do not imply that coin.im monitors prices, sends alerts, or executes these exits.

Footer:

“coin.im helps you compare assumptions and trade structures. It does not hold funds or place orders. No return is guaranteed.”

────────────────────────────────────────
8. MAKE THE WORKSPACE MATCH THE PROMISE
────────────────────────────────────────

The real analysis panel must contain the same useful artifacts demonstrated on the homepage.

Preserve a single typed trade brief shared by the form, calculator, and conversation.

The panel should contain:

A. “Your trade brief”
Compact and editable.

B. “The key issue”
The most consequential finding or missing assumption.

C. “Scenario comparison”
Rendered from deterministic calculations.

D. “What this route needs”
Only when the required inputs exist.

E. “Your exit plan”
A practical summary of the user’s stated preferences.

F. The ongoing conversation.

Do not render a giant fixed six-section report after every message.
Keep the plan persistent and make subsequent answers focus on what changed.

Separate two independent statuses:

“Scenario fit”
“Market evidence”

Possible scenario-fit descriptions:

“Fits the stated price-loss limit”
“Exceeds the stated price-loss limit”
“Needs more information”

Possible market-evidence descriptions:

“Not verified”
“Partially verified”
“Verified inputs available”

Use evidence-related states only when actual source records support them.

“Verified inputs available” does not mean the investment thesis is proven or the trade is safe.

A scenario can fit the modeled loss limit while having no verified investment case.

Make that visible.

Do not add a numerical confidence score, recommendation score, or traffic-light “Buy” badge.

────────────────────────────────────────
9. CHAT REFINEMENT
────────────────────────────────────────

Keep the real server-side model integration from Prompt 1.

Do not replace it with scripted responses.

Panel title:

“Your trade, stress-tested”

Subtitle:

“Your assumptions. Clear trade-offs. An exit plan.”

Initial message:

“Which coin are you considering, and what do you want the trade to achieve? Describe the idea or use the calculator.”

Composer placeholder:

“Ask a question or change an assumption…”

Retain working send, cancel, retry, copy, reset, and close controls.

Suggested follow-ups:

“What if it rises only 20%?”
“What if I’m right, but late?”
“What would make me walk away?”

These must send actual messages with the current brief.

ASSISTANT BEHAVIOR UPDATES

The assistant must:

- Distinguish capital available from capital the user explicitly intends to commit.
- Identify a full-budget spot conflict without assuming the user has already chosen to spend everything.
- Explain trade-offs instead of endorsing the largest upside number.
- Distinguish being profitable from outperforming an alternative.
- Explain that same maximum price loss does not imply same risk.
- Keep user price targets separate from forecasts.
- Keep structural analysis separate from fundamental validation.
- Treat the holding period as a deadline, not an instruction to ignore earlier exit opportunities.
- Ask for one missing, consequential input at a time.
- Preserve the loss budget unless the user explicitly changes it.

If asked:

“What if I’m right, but late?”

Explain the consequence of the stated deadline and any expiry.

Do not assume that the user can simply hold past a hard deadline.
Do not claim an expired option benefits from a later rally.
Do not invent an early-exit valuation.

If asked for an invalidation rule without verified asset evidence:

Help the user articulate a proposed condition.
Label it as a proposed condition until the user adopts it.
Do not invent supporting facts.

The assistant may conclude:

“There is not enough information to prefer one route.”

That is a valid answer.

────────────────────────────────────────
10. STATE, EXAMPLES, AND CHANGES
────────────────────────────────────────

Maintain separate state for:

- The user’s real trade brief.
- The homepage’s hypothetical worked example.

They may share calculation functions.
They must not silently share assumptions.

“Load the worked example” is the explicit action that copies example inputs into the user workspace.

If the user already has a draft, request confirmation before replacing it.

Exact confirmation:

“Replace your current inputs with the example?”

Buttons:

“Keep my inputs”
“Load example”

Keep a visible hypothetical badge while example instrument assumptions are active.

Changing the example asset to a real asset invalidates the imaginary option inputs.

Never attach the sample premium to BTC, ETH, SOL, or another real asset.

For user follow-ups:

- Apply validated changes to the existing brief.
- Recalculate dependent results.
- Show a short description of the change.
- Preserve unchanged constraints.
- Do not create a disconnected new analysis.

Example:

“Target updated from +50% to +20%. Your loss limit is unchanged.”

Use brief versions or request identifiers to prevent stale responses from overwriting newer inputs.

If inputs change while an analysis is running, cancel or clearly supersede the old request.

Use:

“Your inputs changed. Update the plan to use the new assumptions.”

Do not silently present old calculations as current.

────────────────────────────────────────
11. COPY PLAN AND SESSION BEHAVIOR
────────────────────────────────────────

Make “Copy plan” genuinely useful.

Copy a readable plain-text snapshot containing:

- Asset.
- User thesis.
- Capital budget.
- Loss budget or its unknown status.
- Target scenario or its unknown status.
- Deadline and exit preference.
- Routes actually calculated.
- Financial assumptions.
- Scenario results.
- Exit conditions.
- Unverified information.
- Whether data was hypothetical or verified.
- Snapshot timestamp.

Do not export a chat transcript as though it were a finalized plan.

Do not call a plan “approved,” “safe,” or “execution-ready.”

Keep conversation state within the existing session behavior.
Do not introduce account creation or persistent storage for this task.

Do not log raw financial notes or send them to analytics.

────────────────────────────────────────
12. DATA HONESTY AND FAILURE STATES
────────────────────────────────────────

Preserve all financial, privacy, and security protections from Prompt 1.

Without verified market data:

- Percentage-based spot calculations still work.
- Hypothetical option examples remain usable and labeled.
- Current-price claims remain unavailable.
- Token-specific news and fundamentals remain unverified.
- Real options cannot be ranked using invented premiums.
- Prediction-market contracts cannot be treated as equivalent without their exact terms.

Do not imply the homepage example is a live opportunity.

When AI credentials are absent:

“The scenario calculator is ready. AI chat is not configured on this deployment yet.”

Do not simulate a working assistant.

When market data is absent:

“Scenario analysis is available. Current prices, market evidence, and executable quotes are not verified.”

Keep failures local.

A failed AI request must not erase the brief or disable deterministic calculations.

Do not expose provider errors, credentials, or internal prompts.

Preserve server-side validation, bounded input sizes, sanitized Markdown, cancellation, timeouts, and rate limiting.

────────────────────────────────────────
13. RESPONSIVE AND ACCESSIBLE POLISH
────────────────────────────────────────

Inspect and refine the actual rendered interface.

Desktop:

- Main content approximately 1040px maximum width.
- Narrower reading widths for prose.
- No excessive vertical gaps.
- Numerical comparisons easy to scan.
- Chat panel wide enough for useful output.

Mobile:

- Readable at 360px.
- No horizontal page overflow.
- No wide desktop table squeezed into tiny text.
- Inputs at least 16px text size.
- Comfortable touch targets.
- Safe-area-aware chat composer.
- No floating button covering the primary action.
- No content hidden behind the software keyboard.

Accessibility:

- Visible focus states.
- Proper labels and error associations.
- Keyboard-operable scenario controls.
- Correct focus handling for the chat panel.
- Escape closes the panel.
- Reduced-motion support.
- Signed amounts and text labels, not color alone.
- Restrained live-region announcements.
- Adequate contrast.

Use animation only to clarify a changed state.
Do not add decorative motion.

All visible buttons and links must perform their stated actions.

────────────────────────────────────────
14. TESTS AND ACCEPTANCE
────────────────────────────────────────

Preserve existing tests and add coverage for the new behavior.

MATHEMATICS

- Worked-example PnL matches all four scenarios.
- Call break-even is $130, or +30%.
- The upside call/spot crossover is $133.333333..., or +33.333333...%.
- At the exact crossover, modeled PnL is equal.
- Immediately above it, the call has higher modeled expiry PnL.
- Immediately below it, spot has higher modeled expiry PnL.
- Threshold calculations handle invalid or nonexistent crossovers.
- Zero-fee example assumptions do not leak into nonzero-fee user calculations.
- Rounding does not change internal comparisons.
- Unknown loss budgets remain unknown.
- A zero loss budget is not presented as compatible with a guaranteed zero-loss crypto position.

STATE

- Scenario controls do not overwrite the user’s brief.
- Loading the example requires confirmation when a draft exists.
- Replacing the example asset invalidates hypothetical option data.
- User follow-ups update the same brief.
- Loss limits remain unchanged unless explicitly edited.
- Stale model responses cannot overwrite newer assumptions.

PRODUCT

- All three homepage sections exist and use the specified copy.
- The downside preview remains functional without AI.
- Chat makes real provider requests when configured.
- Missing credentials produce an honest configuration state.
- “Copy plan” contains assumptions and data provenance.
- Exit conditions are not presented as executed orders or active monitoring.
- No invented market facts appear in deterministic fallbacks.
- There are no dead controls or empty promised features.

RESPONSIVE

Inspect at approximately:

360px
390px
430px
768px
1440px

Use the available browser tooling.
Fix observed layout and interaction problems.

Run available type checks, linting, tests, and the production build.

A mocked provider test does not prove that live AI chat works.

If credentials are available, make one non-sensitive real-provider smoke test.
If not, explicitly report that limitation.

────────────────────────────────────────
15. FINAL DELIVERY
────────────────────────────────────────

Implement the changes.

Then provide:

- A concise summary of what changed.
- Files changed.
- Test and build results.
- Whether real AI chat was successfully exercised.
- Any remaining configuration requirements.
- Which calculations are available now.
- Which comparisons still require verified external data.

Do not claim integrations are complete when they are not.

The finished product should make the visitor think:

“I understand what this trade needs to work, what could make it disappoint, and what I intend to do next.”