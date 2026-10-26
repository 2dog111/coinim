"use client";
import Markdown from "react-markdown";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  emptyInputs,
  makeBrief,
  validateInputs,
  money,
  exitLabels,
  noMarket,
  type TradeInputs,
  type TradeBrief,
} from "@/lib/trade";

import { createExample, hasDraft, planSnapshot } from "@/lib/plan";
import {
  InteractiveExample,
  ExampleExit,
  WorkspaceArtifacts,
} from "./trade-artifacts";

type Message = { role: "user" | "assistant"; content: string };
const greeting =
  "Which coin are you considering, and what do you want the trade to achieve? Describe the idea or use the calculator.";
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
        <h3>Check the downside</h3>
        <span>Profit / loss in USD</span>
      </div>
      {!c ? (
        <p className="muted">
          Add a budget and a loss limit to check the size of the position.
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
              <dt>Maximum modeled price loss</dt>
              <dd>{money(-c.full.target.maxLoss, true)}</dd>
            </div>
          </dl>
          <p className="small muted">
            Full-budget comparison, including entry fees; not an assumed
            commitment. At the target scenario, final total capital is{" "}
            {money(c.full.target.final)}.
          </p>
          {c.exceedsLoss && (
            <p className="constraint">
              Putting the full {money(brief.inputs.budget!)} into spot could
              lose more than your {money(brief.inputs.loss!)} limit.
            </p>
          )}
          {c.smaller && c.exceedsLoss && (
            <div className="smaller">
              <h4>Smaller position, same idea</h4>
              <dl className="small-numbers">
                <div>
                  <dt>Capital committed</dt>
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
                  <dt>Maximum modeled price loss</dt>
                  <dd>{money(-c.smaller.target.maxLoss, true)}</dd>
                </div>
              </dl>
              <p className="small">
                This position fits the stated price-loss limit in the model.
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

export default function Home({
  exampleStartDate,
}: {
  exampleStartDate: string;
}) {
  const [example] = useState(() => createExample(exampleStartDate));
  const [changed, setChanged] = useState("");
  const [dirty, setDirty] = useState(false);
  const exampleDialog = useRef<HTMLDialogElement>(null);
  const exampleTrigger = useRef<HTMLElement | null>(null);
  const [brief, setBrief] = useState(() =>
    makeBrief(emptyInputs, 1, new Date(exampleStartDate + "T12:00:00")),
  );
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
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      dialog.current?.style.setProperty(
        "--chat-height",
        `${viewport.height}px`,
      );
      dialog.current?.style.setProperty(
        "--chat-top",
        `${viewport.offsetTop}px`,
      );
    };
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
    };
  }, []);
  function update(p: Partial<TradeInputs>) {
    if (messages.length || busy) setDirty(true);
    setChanged("");
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
    idea.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
    idea.current?.focus({ preventScroll: true });
  }
  function loadExample() {
    if (hasDraft(i)) {
      exampleTrigger.current = document.activeElement as HTMLElement;
      exampleDialog.current?.showModal();
      return;
    }
    confirmExample();
  }
  function keepInputs() {
    exampleDialog.current?.close();
    exampleTrigger.current?.focus();
  }
  function confirmExample() {
    requestId.current++;
    abort.current?.abort();
    setBusy(false);
    setBrief(makeBrief({ ...example.inputs }, brief.version + 1));
    setDirty(messages.length > 0);
    setChanged(
      "Hypothetical example loaded. Your previous conversation is preserved.",
    );
    setFormError("");
    setClarify("");
    setError("");
    setCopied("");
    exampleDialog.current?.close();
    focusForm();
  }
  async function run(text: string, analysis = false, retry = false) {
    if (busy) return;
    const validation = validateInputs(i);
    if (
      validation.length &&
      !(!i.asset && !i.thesis && text.trim() && !analysis)
    ) {
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
    setChanged("");
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
        change?: string;
      }) => {
        if (id !== requestId.current) return;
        if (event.brief) {
          setBrief(event.brief);
          setDirty(false);
        }
        if (event.change) setChanged(event.change);
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
    const text =
      planSnapshot(brief) +
      (dirty
        ? "\nYour inputs changed. Update the plan to use the new assumptions. Conversation analysis may refer to earlier inputs."
        : "");
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Plan copied.");
    } catch {
      setCopied("Could not copy. Select and copy the plan manually.");
    }
  }
  function number(
    key: "budget" | "loss" | "target" | "fee" | "committed",
    value: string,
  ) {
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
          <a href="#example">Compare outcomes</a>
          <a href="#exit-plan">Plan your exit</a>
          <button className="text-button" onClick={open}>
            Ask a question <span aria-hidden="true">↗</span>
          </button>
        </nav>
      </header>
      <main id="top">
        <section className="intro" aria-labelledby="headline">
          <p className="eyebrow">Before you buy</p>
          <h1 id="headline">
            You picked the coin.
            <br />
            <span>Now choose the trade.</span>
          </h1>
          <p className="lead">
            Tell us what you want to buy, what you can afford to lose, and when
            you want out. We help you test the trade—not just justify the
            purchase.
          </p>
          <p className="support">
            A smaller position—or no trade—may be the better fit.
          </p>
          <form
            id="trade-form"
            noValidate
            onSubmit={submit}
            aria-describedby={formError ? "form-error" : undefined}
          >
            <div className="form-title">
              <h2>Start with your idea</h2>
              {i.hypothetical && (
                <span className="badge">Hypothetical example</span>
              )}
            </div>
            <label htmlFor="idea">What are you thinking?</label>
            <textarea
              id="idea"
              ref={idea}
              maxLength={4000}
              value={i.thesis}
              onChange={(e) => update({ thesis: e.target.value })}
              placeholder="I want to buy $5,000 of SOL and sell within six months. I think it could rise 50%, but I’m only comfortable losing $1,000. I’d sell early at my target. Compare the ways to enter—and tell me what I’m missing."
              aria-describedby={
                formError ? "idea-help form-error" : "idea-help"
              }
            />
            <p id="idea-help" className="helper">
              Include anything that could change the answer.
            </p>
            <div className="fields">
              <div className="field">
                <label htmlFor="asset">Coin</label>
                <input
                  id="asset"
                  aria-describedby={formError ? "form-error" : undefined}
                  maxLength={180}
                  value={i.asset}
                  placeholder="BTC, ETH, SOL, or a token address"
                  onChange={(e) => update({ asset: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="budget">Capital available, USD</label>
                <input
                  id="budget"
                  type="number"
                  step="any"
                  min="0.01"
                  max="1000000000000"
                  value={i.budget ?? ""}
                  placeholder="5,000"
                  onChange={(e) => number("budget", e.target.value)}
                  aria-describedby={
                    formError ? "budget-help form-error" : "budget-help"
                  }
                />
                <p className="helper" id="budget-help">
                  Available to commit. Not a requirement to spend it all.
                </p>
              </div>
              <div className="field">
                <label htmlFor="horizon">Out by</label>
                <select
                  id="horizon"
                  aria-describedby={formError ? "form-error" : undefined}
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
                  aria-describedby={formError ? "form-error" : undefined}
                  type="number"
                  step="any"
                  min="0.01"
                  max="100000"
                  value={i.target ?? ""}
                  placeholder="50"
                  onChange={(e) => number("target", e.target.value)}
                />
                <p className="helper">Your scenario, not our forecast.</p>
              </div>
              <div className="field loss-field">
                <div className="label-row">
                  <label htmlFor="loss">Loss I can accept, USD</label>
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
                  aria-describedby={formError ? "form-error" : undefined}
                  type="number"
                  step="any"
                  min="0"
                  max={i.budget ?? 1e12}
                  value={i.loss ?? ""}
                  placeholder="1,000"
                  onChange={(e) => number("loss", e.target.value)}
                />
                <p className="helper">
                  A constraint to test—not a guaranteed stop-loss.
                </p>
              </div>
            </div>
            <details className="assumptions">
              <summary>Assumptions</summary>
              <p className="small muted">
                Fees: {i.fee.toFixed(2)}% per side · Assumed
              </p>
              <div className="fields">
                <div className="field">
                  <label htmlFor="fee">Fee assumption, per side</label>
                  <div className="suffix">
                    <input
                      id="fee"
                      aria-describedby={formError ? "form-error" : undefined}
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
                  <label htmlFor="committed">
                    Intended spot commitment, USD
                  </label>
                  <input
                    id="committed"
                    aria-describedby={formError ? "form-error" : undefined}
                    type="number"
                    min="0"
                    max={i.budget ?? 1e12}
                    step="any"
                    value={i.committed ?? ""}
                    placeholder="Not decided"
                    onChange={(e) => number("committed", e.target.value)}
                  />
                  <p className="helper">
                    Optional. The amount you explicitly intend to commit,
                    including entry fees.
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="reconsider">Reason to reconsider</label>
                  <input
                    id="reconsider"
                    maxLength={2000}
                    value={i.reconsider}
                    placeholder="Not defined yet"
                    onChange={(e) => update({ reconsider: e.target.value })}
                  />
                  <p className="helper">
                    Your chosen condition, not verified evidence.
                  </p>
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
            <p className="active-fees">
              Fees: {i.fee.toFixed(2)}% per side · Assumed
            </p>
            <Baseline brief={brief} />
            {formError && (
              <p id="form-error" className="error" role="alert">
                {formError}
              </p>
            )}
            <div className="actions">
              <button className="primary" disabled={busy}>
                Build my trade plan <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={loadExample}
              >
                Load the worked example
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
            Right about the coin.
            <br />
            Wrong about the trade.
          </h2>
          <p className="lead smaller-lead">
            A price rise can still produce a loss. Compare the outcomes before
            you choose the instrument.
          </p>
          <p className="example-summary">
            $5,000 available · $1,000 loss limit · +50% thesis · 6-month
            deadline
          </p>
          <InteractiveExample example={example} />
          <div className="actions">
            <button className="primary" onClick={focusForm}>
              Build my trade plan <span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
        <section
          id="exit-plan"
          className="exit-section"
          aria-labelledby="exit-title"
        >
          <h2 id="exit-title">
            Decide how you’ll get out.
            <br />
            Before you get in.
          </h2>
          <p className="lead smaller-lead">
            A price target is not a plan. Set your deadline, your exit
            conditions, and the evidence that would change your mind.
          </p>
          <ExampleExit example={example} />
          <p className="small muted">
            This is the format. Your plan is built from your own inputs.
          </p>
          <div className="actions">
            <button className="primary" onClick={focusForm}>
              Build my trade plan <span aria-hidden="true">↗</span>
            </button>
            <button className="text-button" onClick={open}>
              Ask a question
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
        ref={exampleDialog}
        className="confirm-example"
        aria-labelledby="example-confirm-title"
        onCancel={(e) => {
          e.preventDefault();
          keepInputs();
        }}
      >
        <h2 id="example-confirm-title">
          Replace your current inputs with the example?
        </h2>
        <div className="actions">
          <button className="secondary" autoFocus onClick={keepInputs}>
            Keep my inputs
          </button>
          <button className="primary" onClick={confirmExample}>
            Load example
          </button>
        </div>
      </dialog>
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
            <p>Your assumptions. Clear trade-offs. An exit plan.</p>
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
                <dt>Capital available</dt>
                <dd>{i.budget === null ? "Unknown" : money(i.budget)}</dd>
              </div>
              <div>
                <dt>Loss limit</dt>
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
                <dd>{i.fee.toFixed(2)}% · Assumed</dd>
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
          {dirty && (
            <p className="notice" role="status">
              Your inputs changed. Update the plan to use the new assumptions.
            </p>
          )}
          {changed && (
            <p className="change-note" role="status">
              {changed}
            </p>
          )}
          <WorkspaceArtifacts brief={brief} />
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
            {dirty && messages.length > 0 && (
              <p className="small muted">
                Earlier messages may refer to previous assumptions. The
                calculations above reflect your current inputs.
              </p>
            )}
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
                  "What if I’m right, but late?",
                  "What would make me walk away?",
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
                    setDirty(false);
                    setChanged("");
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
              <button className="primary" disabled={!composer.trim() || busy}>
                Send
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
