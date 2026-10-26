"use client";
import Markdown from "react-markdown";
import { useRef, useState, type FormEvent } from "react";
import {
  emptyInputs,
  exampleInputs,
  makeBrief,
  validateInputs,
  spot,
  callExpiry,
  money,
  exitLabels,
  noMarket,
  type TradeInputs,
  type TradeBrief,
} from "@/lib/trade";

type Message = { role: "user" | "assistant"; content: string };
const greeting =
  "Which coin are you considering, and what would make this a good trade for you? Use the calculator or describe the idea in your own words.";
const labels = [
  "Price +50%",
  "Price +20%",
  "No price change",
  "Price −30%",
  "Maximum price loss",
];
function Comparison() {
  const returns = [0.5, 0.2, 0, -0.3];
  const rows = [
    {
      name: "$1,000 in spot",
      sub: "$4,000 stays uncommitted",
      values: [
        ...returns.map((r) => spot(5000, 1000, r).pnl),
        spot(5000, 1000, -1).pnl,
      ],
    },
    {
      name: "$1,000 in an illustrative call",
      sub: "$4,000 stays uncommitted",
      values: [
        ...returns.map((r) => callExpiry(exampleInputs.hypothetical!, r).pnl),
        -callExpiry(exampleInputs.hypothetical!, 0).maxLoss,
      ],
    },
    { name: "Wait", sub: "No market exposure", values: [0, 0, 0, 0, 0] },
  ];
  return (
    <div className="comparison">
      <table>
        <caption className="sr-only">
          Hypothetical profit and loss in USD, at expiry, before fees
        </caption>
        <thead>
          <tr>
            <th>Route</th>
            {labels.map((l) => (
              <th key={l}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">
                {row.name}
                <small>{row.sub}</small>
              </th>
              {row.values.map((v, j) => (
                <td
                  key={j}
                  data-label={labels[j]}
                  className={v > 0 ? "positive" : ""}
                >
                  {money(v, true)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Baseline({
  brief,
  compact = false,
}: {
  brief: TradeBrief;
  compact?: boolean;
}) {
  const c = brief.calculations;
  return (
    <div className={`baseline ${compact ? "compact" : ""}`}>
      <div className="baseline-head">
        <h3>Spot baseline</h3>
        <span>Profit / loss in USD</span>
      </div>
      {!c ? (
        <p className="muted">
          Add a budget to see a spot scenario. Add a loss limit to check whether
          the position fits it.
        </p>
      ) : (
        <>
          <dl className="numbers">
            <div>
              <dt>
                {c.targetIllustrative
                  ? "At +50% — illustrative"
                  : "At your target"}
              </dt>
              <dd className={c.full.target.pnl > 0 ? "positive" : ""}>
                {money(c.full.target.pnl, true)}
              </dd>
            </div>
            <div>
              <dt>At a 30% price drop</dt>
              <dd>{money(c.full.drop.pnl, true)}</dd>
            </div>
            <div>
              <dt>Worst-case price loss</dt>
              <dd>{money(-c.full.target.maxLoss, true)}</dd>
            </div>
          </dl>
          <p className="small muted">
            Full budget committed, including entry fees. At the target scenario,
            final total capital is {money(c.full.target.final)}.
          </p>
          {c.exceedsLoss && (
            <p className="constraint">
              The full-size spot position can lose more than your stated limit.
            </p>
          )}
          {c.smaller && c.exceedsLoss && (
            <div className="smaller">
              <h4>Smaller position, same idea</h4>
              <dl className="small-numbers">
                <div>
                  <dt>Amount committed</dt>
                  <dd>{money(c.smaller.target.committed)}</dd>
                </div>
                <div>
                  <dt>Capital left uncommitted</dt>
                  <dd>{money(c.smaller.target.cash)}</dd>
                </div>
                <div>
                  <dt>
                    Scenario profit/loss
                    {c.targetIllustrative ? " (+50%, illustrative)" : ""}
                  </dt>
                  <dd>{money(c.smaller.target.pnl, true)}</dd>
                </div>
                <div>
                  <dt>Worst-case price loss</dt>
                  <dd>{money(-c.smaller.target.maxLoss, true)}</dd>
                </div>
              </dl>
              <p className="small">
                Using less capital reduces both downside exposure and
                participation in a rally.
              </p>
              {brief.inputs.loss === 0 && (
                <p className="small">
                  A zero loss budget leaves no room for a risky crypto position.
                  Waiting has zero market PnL in this model; other risks are
                  excluded.
                </p>
              )}
            </div>
          )}
          {brief.inputs.loss === null && (
            <p className="small">
              Loss budget unknown. These scenarios cannot yet be assessed
              against your tolerance.
            </p>
          )}
          <details>
            <summary>Fees, returns and exit assumptions</summary>
            <p className="small">
              Entry and exit fees: {brief.inputs.fee}% per side. Full-size asset
              exposure after entry fees: {money(c.full.target.exposure)}. Return
              at the target scenario:{" "}
              {c.full.target.returnOnCommitted?.toFixed(2)}% on committed
              capital and {c.full.target.returnOnBudget?.toFixed(2)}% on the
              total budget.
            </p>
            {c.smaller && (
              <p className="small">
                Smaller-position return:{" "}
                {c.smaller.target.returnOnCommitted?.toFixed(2) ??
                  "not applicable"}
                % on committed capital;{" "}
                {c.smaller.target.returnOnBudget?.toFixed(2)}% on the total
                budget. Final total capital: {money(c.smaller.target.final)}.
              </p>
            )}
            <p className="small">
              A stop order is an exit instruction, not a guaranteed loss cap.
              Execution prices can differ from the trigger price.
            </p>
          </details>
        </>
      )}
      <p className="scope">
        Price-movement scenarios only. Platform, custody, currency, tax, and
        other risks are not included.
      </p>
    </div>
  );
}

export default function Home() {
  const [brief, setBrief] = useState(() => makeBrief(emptyInputs));
  const i = brief.inputs;
  const [messages, setMessages] = useState<Message[]>([]),
    [composer, setComposer] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [formError, setFormError] = useState(""),
    [copied, setCopied] = useState(""),
    [reset, setReset] = useState(false),
    [clarify, setClarify] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    idea = useRef<HTMLTextAreaElement>(null),
    chatInput = useRef<HTMLTextAreaElement>(null),
    abort = useRef<AbortController | null>(null),
    requestId = useRef(0),
    lastFocus = useRef<HTMLElement | null>(null),
    last = useRef<{
      text: string;
      analysis: boolean;
      history: Message[];
    } | null>(null),
    scroll = useRef<HTMLDivElement>(null);
  function update(p: Partial<TradeInputs>) {
    if ("horizon" in p || "date" in p) p.resolvedDate = null;
    if (busy) {
      requestId.current++;
      abort.current?.abort();
      setBusy(false);
    }
    setBrief((b) => makeBrief({ ...b.inputs, ...p }, b.version + 1));
    setClarify("");
    setFormError("");
  }
  function open() {
    if (dialog.current?.open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    setTimeout(() => chatInput.current?.focus(), 0);
  }
  function close() {
    dialog.current?.close();
    document.body.style.overflow = "";
    lastFocus.current?.focus();
  }
  function focusForm() {
    close();
    idea.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    idea.current?.focus({ preventScroll: true });
  }
  function loadExample() {
    abort.current?.abort();
    setBrief(makeBrief({ ...exampleInputs }, brief.version + 1));
    setFormError("");
    setClarify("");
    focusForm();
  }
  async function run(text: string, analysis = false, retry = false) {
    if (busy) return;
    const validation = validateInputs(i);
    if (validation.length && !(!i.asset && !i.thesis && text.trim())) {
      setFormError(validation[0]);
      if (dialog.current?.open) setError(validation[0]);
      return;
    }
    const actualInputs =
      !i.asset && !i.thesis && text.trim() ? { ...i, thesis: text } : i;
    open();
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    setCopied("");
    setClarify("");
    const controller = new AbortController();
    abort.current = controller;
    const history = retry && last.current ? last.current.history : messages;
    last.current = { text, analysis, history };
    const next: Message[] = [
      ...history,
      { role: "user", content: text || "Build my trade plan" },
      { role: "assistant", content: "" },
    ];
    setMessages(next);
    try {
      const response = await fetch(analysis ? "/api/analyze" : "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          inputs: actualInputs,
          version: brief.version,
          messages: history.slice(-12),
          message: text,
          followup: !analysis,
        }),
      });
      let answer = "";
      const apply = (event: {
        brief?: TradeBrief;
        delta?: string;
        error?: { message: string };
        clarification?: string;
      }) => {
        if (id !== requestId.current) return;
        if (event.brief) setBrief(event.brief);
        if (event.error) setError(event.error.message);
        if (event.clarification) setClarify(event.clarification);
        if (event.delta) {
          answer += event.delta;
          setMessages([
            ...next.slice(0, -1),
            { role: "assistant", content: answer },
          ]);
        }
        requestAnimationFrame(() =>
          scroll.current?.scrollTo({
            top: scroll.current.scrollHeight,
            behavior: "instant",
          }),
        );
      };
      if (
        response.headers.get("content-type")?.includes("application/x-ndjson")
      ) {
        const reader = response.body!.getReader(),
          decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) if (line) apply(JSON.parse(line));
        }
      } else apply(await response.json());
    } catch (e) {
      if (id === requestId.current)
        setError(
          e instanceof DOMException && e.name === "AbortError"
            ? "Generation stopped. Your inputs are still here."
            : "Connection interrupted. Your inputs are still here.",
        );
    } finally {
      if (id === requestId.current) {
        setBusy(false);
        abort.current = null;
      }
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void run(i.thesis || "Build my trade plan from these assumptions.", true);
  }
  async function copy() {
    const text = `Your trade brief\n${JSON.stringify(brief, null, 2)}\n\n${messages
      .filter((m) => m.content)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Plan copied.");
    } catch {
      setCopied("Could not copy. Select and copy the plan manually.");
    }
  }
  function number(key: "budget" | "loss" | "target" | "fee", value: string) {
    const v = value === "" ? null : Number(value);
    update({ [key]: key === "fee" ? (v ?? 0) : v });
  }
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="coin.im home">
          coin.im<span aria-hidden="true">↗</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#example">See an example</a>
          <button className="text-button" onClick={open}>
            Ask a question <span aria-hidden="true">↗</span>
          </button>
        </nav>
      </header>
      <main id="top">
        <section className="intro" aria-labelledby="headline">
          <p className="eyebrow">Crypto trade planning</p>
          <h1 id="headline">
            You picked the coin.
            <br />
            <span>Now choose the trade.</span>
          </h1>
          <p className="lead">
            Tell us your idea, your budget, and when you want out. See how
            different ways to enter change your upside, downside, and exit plan.
          </p>
          <p className="support">
            A spending limit is not a loss limit. We look at both.
          </p>
          <form id="trade-form" noValidate onSubmit={submit}>
            <div className="form-title">
              <h2>What’s the trade?</h2>
              {i.hypothetical && (
                <span className="badge">Hypothetical example</span>
              )}
            </div>
            <label htmlFor="idea">Your idea</label>
            <textarea
              id="idea"
              ref={idea}
              maxLength={4000}
              value={i.thesis}
              onChange={(e) => update({ thesis: e.target.value })}
              placeholder="I want to buy $5,000 of SOL. I think it could rise 50% within six months, but I’m only willing to lose $1,000. I’d sell early if it reaches my target. Should I buy the coin or use options?"
              aria-describedby="idea-help"
            />
            <p id="idea-help" className="helper">
              Tell us what you believe, what you’re unsure about, and anything
              we should take into account.
            </p>
            <div className="fields">
              <div className="field">
                <label htmlFor="asset">Coin</label>
                <input
                  id="asset"
                  maxLength={180}
                  value={i.asset}
                  placeholder="BTC, ETH, SOL, or a token address"
                  onChange={(e) => update({ asset: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="budget">Capital budget, USD</label>
                <input
                  id="budget"
                  type="number"
                  step="any"
                  min="0.01"
                  max="1000000000000"
                  value={i.budget ?? ""}
                  placeholder="5,000"
                  onChange={(e) => number("budget", e.target.value)}
                  aria-describedby="budget-help"
                />
                <p className="helper" id="budget-help">
                  How much you could commit, not how much you must spend.
                </p>
              </div>
              <div className="field">
                <label htmlFor="horizon">Latest exit</label>
                <select
                  id="horizon"
                  value={i.horizon}
                  onChange={(e) =>
                    update({
                      horizon: e.target.value as TradeInputs["horizon"],
                    })
                  }
                >
                  <option value="1">Within 1 month</option>
                  <option value="3">Within 3 months</option>
                  <option value="6">Within 6 months</option>
                  <option value="date">Choose a date</option>
                </select>
                {i.horizon === "date" && (
                  <input
                    aria-label="Exit date"
                    type="date"
                    required
                    value={i.date}
                    onChange={(e) => update({ date: e.target.value })}
                  />
                )}
                <p className="helper">
                  Your deadline, not a requirement to hold until then.
                </p>
              </div>
              <div className="field">
                <div className="label-row">
                  <label htmlFor="target">Target upside, %</label>
                  <button
                    type="button"
                    className="small text-button"
                    onClick={() => update({ target: null })}
                  >
                    Not sure yet
                  </button>
                </div>
                <input
                  id="target"
                  type="number"
                  step="any"
                  min="0.01"
                  max="100000"
                  value={i.target ?? ""}
                  placeholder="50"
                  onChange={(e) => number("target", e.target.value)}
                />
                <p className="helper">
                  Optional. This is your scenario, not our forecast.
                </p>
              </div>
              <div className="field loss-field">
                <div className="label-row">
                  <label htmlFor="loss">Most I’m willing to lose, USD</label>
                  <button
                    type="button"
                    className="small text-button"
                    onClick={() => update({ loss: null })}
                  >
                    Not sure yet
                  </button>
                </div>
                <input
                  id="loss"
                  type="number"
                  step="any"
                  min="0"
                  max={i.budget ?? 1e12}
                  value={i.loss ?? ""}
                  placeholder="1,000"
                  onChange={(e) => number("loss", e.target.value)}
                />
                <p className="helper">
                  Include the possibility that a position loses its entire
                  value.
                </p>
              </div>
            </div>
            <details className="assumptions">
              <summary>More assumptions</summary>
              <div className="fields">
                <div className="field">
                  <label htmlFor="fee">Fee assumption, per side</label>
                  <div className="suffix">
                    <input
                      id="fee"
                      type="number"
                      min="0"
                      max="10"
                      step="any"
                      value={i.fee}
                      onChange={(e) => number("fee", e.target.value)}
                    />
                    <span>%</span>
                  </div>
                  <p className="helper">
                    Illustrative, not a venue quote. Replace it with your actual
                    rate.
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="exit">Exit preference</label>
                  <select
                    id="exit"
                    value={i.exit}
                    onChange={(e) =>
                      update({ exit: e.target.value as TradeInputs["exit"] })
                    }
                  >
                    {Object.entries(exitLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="restrictions">Restrictions</label>
                  <input
                    id="restrictions"
                    value={i.restrictions}
                    maxLength={2000}
                    onChange={(e) => update({ restrictions: e.target.value })}
                    placeholder="Anything this plan must avoid"
                  />
                </div>
                <div className="field">
                  <label htmlFor="context">Additional context</label>
                  <input
                    id="context"
                    value={i.context}
                    maxLength={2000}
                    onChange={(e) => update({ context: e.target.value })}
                    placeholder="Network, experience, or other constraints"
                  />
                </div>
              </div>
            </details>
            <Baseline brief={brief} />
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <div className="actions">
              <button className="primary" disabled={busy}>
                Build my trade plan <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={loadExample}
              >
                Try the worked example
              </button>
            </div>
            <p className="small muted">
              No wallet connection. No trade execution. Your decision.
            </p>
            <p className="small muted">
              Scenario analysis, not a forecast. Prices can move against you.
            </p>
          </form>
        </section>
        <section
          id="example"
          className="example"
          aria-labelledby="example-title"
        >
          <p className="eyebrow">Hypothetical example — not live prices</p>
          <h2 id="example-title">
            Same coin. Same loss budget.
            <br />
            Very different outcomes.
          </h2>
          <p className="lead smaller-lead">
            Being right about the direction is not enough. The structure of the
            trade changes what happens to your money.
          </p>
          <p className="example-summary">
            $5,000 capital budget · $1,000 loss budget · +50% thesis · 6-month
            deadline
          </p>
          <Comparison />
          <div className="callout">
            <h3>The coin can rise. Your trade can still lose.</h3>
            <p>
              In this example, a 20% rise earns $200 on spot — but the call
              loses its full $1,000 premium. At a 50% rise, the call pays more.
              Neither route is better in every outcome.
            </p>
            <p>Waiting avoids market exposure, but it also misses a rally.</p>
          </div>
          <details>
            <summary>Show the assumptions</summary>
            <div className="assumption-copy">
              <p>This is an imaginary coin starting at $100.</p>
              <p>The spot position buys 10 coin units for $1,000.</p>
              <p>
                The illustrative call has a $120 strike and costs $10 per
                underlying coin unit. The position covers 100 coin units, so the
                total premium is $1,000.
              </p>
              <p>
                The call expires at the six-month deadline. Its payoff is
                modeled as a linear USD payoff at expiry.
              </p>
              <p>
                Fees, slippage, taxes, and returns on uncommitted capital are
                set to zero in this example.
              </p>
              <p>
                The option figures apply only at expiry. An earlier exit
                requires a separate valuation.
              </p>
              <p>
                These are teaching assumptions, not executable quotes or a
                recommendation.
              </p>
            </div>
          </details>
          <div className="actions">
            <button className="primary" onClick={focusForm}>
              Analyze my idea <span aria-hidden="true">↗</span>
            </button>
            <button className="secondary" disabled={busy} onClick={loadExample}>
              Load this example
            </button>
          </div>
        </section>
      </main>
      <footer>
        <a className="wordmark" href="#top">
          coin.im
        </a>
        <p>
          coin.im helps you compare assumptions and trade structures. It does
          not hold funds or place orders. No return is guaranteed.
        </p>
      </footer>
      <button className="floating" onClick={open}>
        Ask about this trade <span aria-hidden="true">↗</span>
      </button>
      <dialog
        ref={dialog}
        className="chat"
        aria-labelledby="chat-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="chat-header">
          <div>
            <h2 id="chat-title">Your trade, stress-tested</h2>
            <p>Your assumptions. Clear trade-offs. A plan you can question.</p>
          </div>
          <button aria-label="Close chat" className="close" onClick={close}>
            ×
          </button>
        </div>
        <div className="chat-scroll" ref={scroll}>
          <details className="brief" open>
            <summary>Your trade brief</summary>
            <div className="brief-meta">
              <span>{brief.provenance.inputs}</span>
              <span>Version {brief.version}</span>
            </div>
            {i.hypothetical && <p className="badge">Hypothetical example</p>}
            <dl className="brief-data">
              <div>
                <dt>Coin</dt>
                <dd>{i.asset || "Not specified"}</dd>
              </div>
              <div>
                <dt>Capital budget</dt>
                <dd>{i.budget === null ? "Unknown" : money(i.budget)}</dd>
              </div>
              <div>
                <dt>Loss budget</dt>
                <dd>{i.loss === null ? "Unknown" : money(i.loss)}</dd>
              </div>
              <div>
                <dt>Target scenario</dt>
                <dd>{i.target === null ? "Unknown" : `+${i.target}%`}</dd>
              </div>
              <div>
                <dt>Latest exit</dt>
                <dd>{brief.latestExitDate || "Not specified"}</dd>
              </div>
              <div>
                <dt>Exit preference</dt>
                <dd>{exitLabels[i.exit]}</dd>
              </div>
              <div>
                <dt>Fee per side</dt>
                <dd>{i.fee}% · illustrative</dd>
              </div>
            </dl>
            {i.thesis && (
              <p className="small">Your thesis, unverified: {i.thesis}</p>
            )}
            {i.restrictions && (
              <p className="small">Restrictions: {i.restrictions}</p>
            )}
            {i.context && (
              <p className="small">Additional context: {i.context}</p>
            )}
            <button className="secondary" onClick={focusForm}>
              Edit trade brief
            </button>
          </details>
          <Baseline brief={brief} compact />
          {brief.calculations?.call && (
            <div className="notice">
              <h3>Hypothetical call, at expiry</h3>
              <p>
                Scenario profit/loss:{" "}
                {money(brief.calculations.call.atExpiry.pnl, true)}. Maximum
                price loss:{" "}
                {money(-brief.calculations.call.atExpiry.maxLoss, true)}.
              </p>
              <p>{brief.calculations.call.label}</p>
            </div>
          )}
          <details className="data-status">
            <summary>Data and instrument availability</summary>
            <p>{noMarket}</p>
            <p>
              Options not priced: verified quotes and contract terms are needed.
            </p>
            <p>Event market not compared: no matching, verified contract.</p>
            <p>
              Staged entry needs a price path or explicit fill assumptions.
              Token addresses need a network before identification.
            </p>
          </details>
          <div className="messages">
            <p className="greeting">{greeting}</p>
            {messages
              .filter((m) => m.content)
              .map((m, j) => (
                <div key={j} className={`message ${m.role}`}>
                  <span className="message-author">
                    {m.role === "user" ? "You" : "coin.im"}
                  </span>
                  <div className="prose">
                    <Markdown
                      skipHtml
                      components={{
                        img: () => null,
                        a: ({ children }) => <span>{children}</span>,
                      }}
                    >
                      {m.content}
                    </Markdown>
                  </div>
                </div>
              ))}
          </div>
          {clarify && (
            <div className="notice" role="status">
              <p>{clarify}</p>
              {brief.conflicts.slice(1).map((c) => (
                <p key={c}>{c}</p>
              ))}
              <button className="secondary" onClick={focusForm}>
                Resolve assumptions in the form
              </button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              <p>{error}</p>
              <p className="small">
                Your inputs and calculations are still available.
              </p>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  last.current &&
                  run(last.current.text, last.current.analysis, true)
                }
              >
                Try again
              </button>
            </div>
          )}
          {busy && (
            <p className="generation" role="status">
              Reviewing your trade…
            </p>
          )}
          {messages.some((m) => m.role === "assistant" && m.content) &&
            !busy && (
              <div className="suggestions">
                {[
                  "What if it rises only 20%?",
                  "Would buying less fit better?",
                  "What could make this a bad trade?",
                ].map((s) => (
                  <button key={s} onClick={() => run(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          <div className="chat-tools">
            <button className="text-button" onClick={copy}>
              Copy plan
            </button>
            <button className="text-button" onClick={() => setReset(true)}>
              Reset conversation
            </button>
          </div>
          {copied && (
            <p role="status" className="small">
              {copied}
            </p>
          )}
          {reset && (
            <div className="notice">
              <h3>Clear this conversation?</h3>
              <p>
                This removes the current messages and trade inputs from this
                session.
              </p>
              <div className="actions">
                <button className="secondary" onClick={() => setReset(false)}>
                  Keep it
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    requestId.current++;
                    abort.current?.abort();
                    setBusy(false);
                    setMessages([]);
                    setBrief(makeBrief(emptyInputs));
                    setReset(false);
                    setError("");
                    setClarify("");
                    setComposer("");
                    setCopied("");
                    last.current = null;
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (composer.trim()) {
              void run(composer.trim());
              setComposer("");
            }
          }}
        >
          <label className="sr-only" htmlFor="chat-message">
            Message
          </label>
          <textarea
            id="chat-message"
            ref={chatInput}
            maxLength={4000}
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder="Ask a question or change an assumption…"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (composer.trim() && !busy) {
                  void run(composer.trim());
                  setComposer("");
                }
              }
            }}
          />
          <div className="composer-bottom">
            <p>Do not share seed phrases, private keys, or passwords.</p>
            {busy ? (
              <button
                className="secondary"
                type="button"
                onClick={() => abort.current?.abort()}
              >
                Stop
              </button>
            ) : (
              <button className="primary" disabled={!composer.trim()}>
                Send
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
