"use client";

import Markdown from "react-markdown";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  emptyInputs,
  exitLabels,
  makeBrief,
  money,
  noMarket,
  parseFinancialInput,
  validateInputs,
  type TradeBrief,
  type TradeInputs,
} from "@/lib/trade";
import { createExample, hasDraft, planSnapshot } from "@/lib/plan";
import {
  ExampleExit,
  InteractiveExample,
  WorkspaceArtifacts,
} from "./trade-artifacts";

type Message = { role: "user" | "assistant"; content: string };
type Setting = "budget" | "time" | "loss";

const greeting = "What trade would you like to explore?";

const starters = [
  "Should I buy SOL with $5,000?",
  "How much could I lose on BTC?",
  "Help me plan an exit",
];

function amountDraft(value: number | null) {
  return value === null
    ? ""
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function friendlyDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function Consequence({ brief }: { brief: TradeBrief }) {
  const calculations = brief.calculations;
  const inputs = brief.inputs;
  if (!calculations || inputs.loss === null) return null;
  if (inputs.loss === 0)
    return (
      <div className="live-consequence" role="status">
        <strong>A zero-loss requirement does not fit a risky crypto position.</strong>
        <p>
          Waiting has no market price exposure in this model. Other financial
          risks still remain.
        </p>
      </div>
    );
  const smaller = calculations.smaller!;
  return (
    <div className="live-consequence" role="status">
      <strong>
        {calculations.exceedsLoss
          ? `Putting the full ${money(inputs.budget!)} into spot could lose more than your ${money(inputs.loss)} limit.`
          : `A full ${money(inputs.budget!)} spot position can lose its entire value.`}
      </strong>
      <p>
        A {money(smaller.target.committed)} position leaves{" "}
        {money(smaller.target.cash)} uncommitted.
      </p>
      <p>
        At {calculations.targetIllustrative ? "+50% · illustrative" : `+${inputs.target}%`}: {" "}
        {money(smaller.target.pnl, true)} after assumed fees.
      </p>
      <small>
        Price movements only. Platform, custody, currency, and tax risks are not
        included.
      </small>
    </div>
  );
}

export default function Home({
  exampleStartDate,
}: {
  exampleStartDate: string;
}) {
  const [example] = useState(() => createExample(exampleStartDate));
  const [brief, setBrief] = useState(() =>
    makeBrief(emptyInputs, 1, new Date(`${exampleStartDate}T12:00:00`)),
  );
  const inputs = brief.inputs;
  const [view, setView] = useState<"home" | "workspace">("home");
  const [activeSetting, setActiveSetting] = useState<Setting | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState("");
  const [reset, setReset] = useState(false);
  const [clarify, setClarify] = useState("");
  const [changed, setChanged] = useState("");
  const [dirty, setDirty] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [lossDraft, setLossDraft] = useState("");
  const [targetDraft, setTargetDraft] = useState("");
  const [feeDraft, setFeeDraft] = useState("0.1");
  const [committedDraft, setCommittedDraft] = useState("");

  const exampleDialog = useRef<HTMLDialogElement>(null);
  const exampleTrigger = useRef<HTMLElement | null>(null);
  const idea = useRef<HTMLTextAreaElement>(null);
  const chatInput = useRef<HTMLTextAreaElement>(null);
  const abort = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const last = useRef<{
    text: string;
    analysis: boolean;
    history: Message[];
  } | null>(null);

  useEffect(() => {
    if (view === "workspace")
      requestAnimationFrame(() => chatInput.current?.focus({ preventScroll: true }));
  }, [view]);

  function syncDrafts(next: TradeInputs) {
    setBudgetDraft(amountDraft(next.budget));
    setLossDraft(amountDraft(next.loss));
    setTargetDraft(next.target === null ? "" : String(next.target));
    setFeeDraft(String(next.fee));
    setCommittedDraft(amountDraft(next.committed));
  }

  function replaceBrief(next: TradeBrief) {
    setBrief(next);
    syncDrafts(next.inputs);
  }

  function update(patch: Partial<TradeInputs>) {
    if (messages.length || busy) setDirty(true);
    setChanged("");
    if ("horizon" in patch || "date" in patch) patch.resolvedDate = null;
    if (busy) {
      requestId.current++;
      abort.current?.abort();
      setBusy(false);
    }
    setBrief((current) =>
      makeBrief({ ...current.inputs, ...patch }, current.version + 1),
    );
    setClarify("");
    setFormError("");
  }

  function updateAmount(
    key: "budget" | "loss" | "target" | "fee" | "committed",
    value: string,
  ) {
    const setters = {
      budget: setBudgetDraft,
      loss: setLossDraft,
      target: setTargetDraft,
      fee: setFeeDraft,
      committed: setCommittedDraft,
    };
    setters[key](value);
    const parsed = parseFinancialInput(value);
    if (parsed === null) {
      update({ [key]: key === "fee" ? 0 : null });
      return;
    }
    if (!Number.isFinite(parsed)) return;
    update({ [key]: parsed });
    if (key === "budget" && inputs.loss !== null && parsed < inputs.loss)
      setFormError(
        "Your budget is below the current loss limit. Edit the limit explicitly.",
      );
  }

  function validateDrafts() {
    const values = [
      ["budget", budgetDraft],
      ["loss", lossDraft],
      ["target", targetDraft],
      ["fee", feeDraft],
      ["commitment", committedDraft],
    ] as const;
    for (const [label, value] of values) {
      if (value.trim() && !Number.isFinite(parseFinancialInput(value)))
        return `Enter a valid ${label} amount.`;
    }
    return "";
  }

  function showHome(setting?: Setting) {
    setView("home");
    if (setting) setActiveSetting(setting);
    requestAnimationFrame(() => {
      const target = setting
        ? document.getElementById(
            setting === "budget"
              ? "budget"
              : setting === "loss"
                ? "loss-exact"
                : "horizon-options",
          )
        : idea.current;
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      });
      if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    });
  }

  function openWorkspace() {
    setView("workspace");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function goToSection(id: string) {
    setView("home");
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ block: "start" }),
    );
  }

  function loadExample() {
    if (hasDraft(inputs)) {
      exampleTrigger.current = document.activeElement as HTMLElement;
      exampleDialog.current?.showModal();
      return;
    }
    confirmExample();
  }

  function chooseStarter(text: string) {
    update({ thesis: text });
    idea.current?.focus();
  }

  function keepInputs() {
    exampleDialog.current?.close();
    exampleTrigger.current?.focus();
  }

  function confirmExample() {
    requestId.current++;
    abort.current?.abort();
    setBusy(false);
    const next = makeBrief({ ...example.inputs }, brief.version + 1);
    replaceBrief(next);
    setDirty(messages.length > 0);
    setChanged(
      "Hypothetical example loaded. Your previous conversation is preserved.",
    );
    setFormError("");
    setClarify("");
    setError("");
    setCopied("");
    exampleDialog.current?.close();
    showHome();
  }

  async function run(text: string, analysis = false, retry = false) {
    if (busy) return;
    const draftError = validateDrafts();
    if (draftError) {
      setFormError(draftError);
      setError(draftError);
      openWorkspace();
      return;
    }
    const validation = validateInputs(inputs);
    if (
      validation.length &&
      !(!inputs.asset && !inputs.thesis && text.trim() && !analysis)
    ) {
      setFormError(validation[0]);
      setError(validation[0]);
      openWorkspace();
      return;
    }
    const actualInputs =
      !inputs.asset && !inputs.thesis && text.trim()
        ? { ...inputs, thesis: text }
        : inputs;
    openWorkspace();
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
      { role: "user", content: text || "Check my trade" },
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
          replaceBrief(event.brief);
          setDirty(false);
        }
        if (event.change) setChanged(event.change);
        if (event.error) setError(event.error.message);
        if (event.clarification) setClarify(event.clarification);
        if (event.delta) {
          const firstWords = answer.length === 0;
          answer += event.delta;
          setMessages([
            ...next.slice(0, -1),
            { role: "assistant", content: answer },
          ]);
          if (firstWords) {
            requestAnimationFrame(() => {
              if (id !== requestId.current) return;
              const replies = document.querySelectorAll(
                ".workspace-scroll .message.assistant",
              );
              replies[replies.length - 1]?.scrollIntoView({
                block: "start",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              });
            });
          }
        }
      };
      if (
        response.headers.get("content-type")?.includes("application/x-ndjson")
      ) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
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
    } catch (caught) {
      if (id === requestId.current)
        setError(
          caught instanceof DOMException && caught.name === "AbortError"
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

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(inputs.thesis || "Check my trade under these assumptions.", true);
  }

  async function copyPlan() {
    const text =
      planSnapshot(brief) +
      (dirty
        ? "\nInputs changed. Update the analysis. Earlier conversation may refer to previous assumptions."
        : "");
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Plan copied.");
    } catch {
      setCopied("Could not copy. Select and copy the plan manually.");
    }
  }

  function clearSession() {
    requestId.current++;
    abort.current?.abort();
    const next = makeBrief(
      emptyInputs,
      brief.version + 1,
      new Date(`${exampleStartDate}T12:00:00`),
    );
    replaceBrief(next);
    setMessages([]);
    setComposer("");
    setBusy(false);
    setReset(false);
    setError("");
    setClarify("");
    setCopied("");
    setDirty(false);
    setChanged("");
    last.current = null;
    showHome();
  }

  const budgetValue = parseFinancialInput(budgetDraft);
  const validBudget =
    budgetValue !== null && Number.isFinite(budgetValue) && budgetValue > 0;
  const sliderMax = validBudget ? budgetValue : 100;
  const sliderValue =
    inputs.loss === null ? 0 : Math.min(inputs.loss, sliderMax);
  const settingValues = {
    budget: inputs.budget === null ? "Add" : money(inputs.budget),
    time:
      inputs.horizon === "date"
        ? inputs.date || "Choose a date"
        : `${inputs.horizon} month${inputs.horizon === "1" ? "" : "s"}`,
    loss: inputs.loss === null ? "Add" : money(inputs.loss),
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="wordmark"
            aria-label="coin.im home"
            onClick={() => showHome()}
          >
            coin.im
          </button>
          <nav aria-label="Main navigation">
            {view === "home" ? (
              <>
                <button onClick={() => goToSection("difference")}>See example</button>
                {messages.length > 0 && (
                  <button className="nav-action" onClick={openWorkspace}>Back to conversation <span aria-hidden="true">↗</span></button>
                )}
              </>
            ) : (
              <button className="nav-action" onClick={() => showHome()}>Back to start <span aria-hidden="true">↗</span></button>
            )}
          </nav>
        </div>
      </header>

      {view === "home" ? (
        <main id="main-content">
          <section className="hero" id="start" aria-labelledby="headline">
            <div className="composer-width">
              <p className="product-kicker">Your crypto trade, thought through</p>
              <h1 id="headline">What trade are you considering?</h1>
              <p className="hero-lead">
                Ask about a coin. See your potential loss, position size, and exit plan.
              </p>
              <form
                id="trade-form"
                className="intake-card"
                noValidate
                onSubmit={submit}
                aria-describedby={formError ? "form-error" : undefined}
              >
                <div className="idea-label-row">
                  <label className="sr-only" htmlFor="idea">Describe your trade idea</label>
                  {inputs.hypothetical && (
                    <span className="source-tag">Illustrative example</span>
                  )}
                </div>
                <textarea
                  id="idea"
                  ref={idea}
                  maxLength={4000}
                  value={inputs.thesis}
                  onChange={(event) => update({ thesis: event.target.value })}
                  placeholder="I’m thinking of buying SOL with $5,000. What could go wrong?"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />

                <div
                  className="setting-chips"
                  role="group"
                  aria-label="Optional trade settings"
                >
                  {(
                    [
                      ["budget", "Budget"],
                      ["loss", "Loss limit"],
                      ["time", "Exit within"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="setting-chip"
                      aria-expanded={activeSetting === key}
                      aria-controls={`${key}-panel`}
                      onClick={() =>
                        setActiveSetting(activeSetting === key ? null : key)
                      }
                    >
                      <span>{label}</span>
                      <b>{settingValues[key]}</b>
                      {key === "time" && inputs.horizonSource === "default" && (
                        <small>Default</small>
                      )}
                      <i aria-hidden="true">⌄</i>
                    </button>
                  ))}
                </div>

                <div
                  className="setting-panel"
                  id="budget-panel"
                  hidden={activeSetting !== "budget"}
                >
                  <label htmlFor="budget">How much can you invest?</label>
                  <div className="currency-entry">
                    <span aria-hidden="true">$</span>
                    <input
                      id="budget"
                      inputMode="decimal"
                      autoComplete="off"
                      value={budgetDraft}
                      placeholder="5,000"
                      onChange={(event) =>
                        updateAmount("budget", event.target.value)
                      }
                      onBlur={() => {
                        const parsed = parseFinancialInput(budgetDraft);
                        if (parsed !== null && Number.isFinite(parsed))
                          setBudgetDraft(amountDraft(parsed));
                      }}
                    />
                  </div>
                  <input
                    id="budget-range"
                    className="range budget-range"
                    type="range"
                    min="100"
                    max="50000"
                    step="100"
                    value={Math.min(inputs.budget ?? 5000, 50000)}
                    aria-valuetext={
                      inputs.budget === null
                        ? "Budget not set. Move the slider to choose one."
                        : `${money(inputs.budget)} capital available`
                    }
                    style={
                      {
                        "--fill": `${((Math.min(inputs.budget ?? 5000, 50000) - 100) / 49900) * 100}%`,
                      } as CSSProperties
                    }
                    onChange={(event) =>
                      updateAmount("budget", event.target.value)
                    }
                  />
                  <div className="range-limits" aria-hidden="true">
                    <span>$100</span>
                    <span>$50k+</span>
                  </div>
                  <div className="quick-values" aria-label="Budget presets">
                    {[1000, 5000, 10000, 25000].map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={inputs.budget === value}
                        onClick={() => updateAmount("budget", String(value))}
                      >
                        {value >= 1000 ? `$${value / 1000}k` : `$${value}`}
                      </button>
                    ))}
                  </div>
                  <p className="helper">Available cash, not an instruction to spend it all.</p>
                </div>

                <div
                  className="setting-panel"
                  id="time-panel"
                  hidden={activeSetting !== "time"}
                >
                  <span className="field-label" id="horizon-label">
                    When would you exit by?
                  </span>
                  <div
                    className="segments"
                    id="horizon-options"
                    role="group"
                    aria-labelledby="horizon-label"
                    tabIndex={-1}
                  >
                    {[
                      ["1", "1 month"],
                      ["3", "3 months"],
                      ["6", "6 months"],
                      ["date", "Choose a date"],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className="segment"
                        aria-label={label}
                        aria-pressed={inputs.horizon === value}
                        onClick={() =>
                          update({
                            horizon: value as TradeInputs["horizon"],
                            horizonSource: "user",
                          })
                        }
                      >
                        {value === "date" ? "Date" : `${value} mo`}
                      </button>
                    ))}
                  </div>
                  {inputs.horizon === "date" && (
                    <>
                      <label className="sr-only" htmlFor="exit-date">
                        Latest exit date
                      </label>
                      <input
                        className="date-entry"
                        id="exit-date"
                        type="date"
                        value={inputs.date}
                        onChange={(event) =>
                          update({
                            date: event.target.value,
                            horizonSource: "user",
                          })
                        }
                      />
                    </>
                  )}
                  <p className="helper">You can exit earlier.</p>
                </div>

                <div
                  className="setting-panel loss-editor"
                  id="loss-panel"
                  hidden={activeSetting !== "loss"}
                >
                  <div className="loss-editor-head">
                    <label htmlFor="loss-exact">Most I can afford to lose</label>
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => updateAmount("loss", "")}
                    >
                      Not sure yet
                    </button>
                  </div>
                  <input
                    id="loss-range"
                    className="range"
                    type="range"
                    min="0"
                    max={sliderMax}
                    step="0.01"
                    disabled={!validBudget}
                    value={sliderValue}
                    aria-valuetext={
                      inputs.loss === null
                        ? "Loss limit not set"
                        : `${money(inputs.loss)} acceptable price loss`
                    }
                    style={
                      {
                        "--fill": `${sliderMax ? (sliderValue / sliderMax) * 100 : 0}%`,
                      } as CSSProperties
                    }
                    onChange={(event) =>
                      updateAmount("loss", event.target.value)
                    }
                  />
                  <div className="range-limits" aria-hidden="true">
                    <span>$0</span>
                    <span>{validBudget ? money(budgetValue) : "Add a budget"}</span>
                  </div>
                  <div className="currency-entry exact-loss">
                    <span aria-hidden="true">$</span>
                    <input
                      id="loss-exact"
                      inputMode="decimal"
                      autoComplete="off"
                      value={lossDraft}
                      placeholder="Not set"
                      onChange={(event) =>
                        updateAmount("loss", event.target.value)
                      }
                    />
                  </div>
                  {!validBudget && (
                    <p className="helper">Add a budget to set the slider range.</p>
                  )}
                  <p className="helper">This is your risk preference, not a guaranteed stop.</p>
                </div>

                <details className="more-assumptions">
                  <summary>More details (optional)</summary>
                  <div className="assumption-grid">
                    <div>
                      <label htmlFor="asset">Coin</label>
                      <input
                        id="asset"
                        value={inputs.asset}
                        maxLength={180}
                        placeholder="BTC, ETH, SOL, or another coin"
                        onChange={(event) => update({ asset: event.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="target">Target upside, %</label>
                      <input
                        id="target"
                        inputMode="decimal"
                        value={targetDraft}
                        placeholder="Not sure yet"
                        onChange={(event) =>
                          updateAmount("target", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="fee">Fee assumption, % per side</label>
                      <input
                        id="fee"
                        inputMode="decimal"
                        value={feeDraft}
                        onChange={(event) =>
                          updateAmount("fee", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="exit">Exit preference</label>
                      <select
                        id="exit"
                        value={inputs.exit}
                        onChange={(event) =>
                          update({
                            exit: event.target.value as TradeInputs["exit"],
                          })
                        }
                      >
                        {Object.entries(exitLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="committed">Intended commitment, USD</label>
                      <input
                        id="committed"
                        inputMode="decimal"
                        value={committedDraft}
                        placeholder="Not specified"
                        onChange={(event) =>
                          updateAmount("committed", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="reconsider">Reason to reconsider</label>
                      <input
                        id="reconsider"
                        maxLength={2000}
                        value={inputs.reconsider}
                        placeholder="Not defined yet"
                        onChange={(event) =>
                          update({ reconsider: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="restrictions">Restrictions</label>
                      <input
                        id="restrictions"
                        maxLength={2000}
                        value={inputs.restrictions}
                        placeholder="Anything this plan must avoid"
                        onChange={(event) =>
                          update({ restrictions: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="context">Additional context</label>
                      <input
                        id="context"
                        maxLength={2000}
                        value={inputs.context}
                        placeholder="Network, experience, or other constraints"
                        onChange={(event) => update({ context: event.target.value })}
                      />
                    </div>
                  </div>
                  <p className="helper">
                    The target is your scenario, not a forecast. Fees are
                    illustrative—not a venue quote.
                  </p>
                </details>

                <Consequence brief={brief} />
                {formError && (
                  <p id="form-error" className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <div className="intake-actions">
                  <button className="primary-action" disabled={busy}>
                    Get my plan <span aria-hidden="true">↑</span>
                  </button>
                </div>
              </form>
              <div className="starter-row" aria-label="Try a question">
                <span>Try asking</span>
                {starters.map((starter) => (
                  <button key={starter} onClick={() => chooseStarter(starter)}>{starter}</button>
                ))}
                <button onClick={loadExample}>Try an example</button>
              </div>
              <p className="under-form">No account or wallet needed · Nothing is traded</p>
            </div>
          </section>

          <section
            className="content-section difference-section"
            id="difference"
            aria-labelledby="difference-title"
          >
            <div className="section-heading">
              <p className="eyebrow">Try a scenario</p>
              <h2 id="difference-title">
                Move the market.
                <span>See the outcome.</span>
              </h2>
              <p>
                Drag one control. Compare buying the coin, using a call, or
                waiting—in dollars.
              </p>
            </div>
            <InteractiveExample example={example} />
            <p className="section-action">
              <button className="text-action" onClick={() => showHome()}>
                Check my trade
              </button>
            </p>
          </section>

          <section
            className="content-section exit-section"
            id="exit-plan"
            aria-labelledby="exit-title"
          >
            <div className="section-heading">
              <p className="eyebrow">Leave with a plan</p>
              <h2 id="exit-title">
                Set the exit.
                <span>Before the entry.</span>
              </h2>
              <p>
                A position size. An exit date.
                <span>A reason to change your mind.</span>
              </p>
            </div>
            <ExampleExit example={example} />
            <div className="end-action">
              <button className="primary-action" onClick={() => showHome()}>
                Check my trade <span aria-hidden="true">→</span>
              </button>
              <p>A smaller position—or no trade—may fit better.</p>
            </div>
          </section>
        </main>
      ) : (
        <main id="main-content" className="workspace">
          <div className="workspace-width">
            <div className="workspace-scroll">
            <div className="workspace-top">
              <div>
                <span className="workspace-status"><i aria-hidden="true" /> Trade conversation</span>
                <h1>Your trade, explained.</h1>
              </div>
              <button className="text-action" onClick={() => showHome()}>
                Edit trade
              </button>
            </div>
            <div className="brief-chips" aria-label="Current trade brief">
              <button onClick={() => showHome()}>
                Coin <b>{inputs.asset || "Not set"}</b>
              </button>
              <button onClick={() => showHome("budget")}>
                Budget <b>{inputs.budget === null ? "Not set" : money(inputs.budget)}</b>
              </button>
              <button onClick={() => showHome("loss")}>
                Loss limit <b>{inputs.loss === null ? "Not set" : money(inputs.loss)}</b>
              </button>
              <button onClick={() => showHome("time")}>
                Exit by <b>{friendlyDate(brief.latestExitDate)}</b>
              </button>
              <span>
                Data <b>{inputs.hypothetical ? "Illustrative" : "User inputs"}</b>
              </span>
            </div>

            {!messages.length && <p className="workspace-greeting">{greeting}</p>}

            {dirty && (
              <div className="stale-notice" role="status">
                <span>Inputs changed. Update the analysis.</span>
                <button
                  className="quiet-action"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      inputs.thesis || "Update the analysis for these inputs.",
                      true,
                    )
                  }
                >
                  Update analysis
                </button>
              </div>
            )}
            {changed && (
              <p className="change-note" role="status">
                {changed}
              </p>
            )}

            <div className="messages" aria-live="polite">
              {messages
                .filter((message) => message.content)
                .map((message, index) => (
                  <Fragment key={index}>
                    <article className={`message ${message.role}`}>
                      <span className="message-author">
                        {message.role === "user" ? "You" : "coin.im"}
                      </span>
                      <div className="message-copy">
                        <Markdown
                          skipHtml
                          components={{
                            img: () => null,
                            a: ({ children }) => <span>{children}</span>,
                          }}
                        >
                          {message.content}
                        </Markdown>
                      </div>
                    </article>
                    {index === 0 && (brief.calculations || !busy) && (
                      <WorkspaceArtifacts brief={brief} />
                    )}
                  </Fragment>
                ))}
            </div>

            {clarify && (
              <div className="status-note" role="status">
                <p>{clarify}</p>
                {brief.conflicts.slice(1).map((conflict) => (
                  <p key={conflict}>{conflict}</p>
                ))}
                <button className="quiet-action" onClick={() => showHome()}>
                  Resolve assumptions
                </button>
              </div>
            )}
            {error && (
              <div className="error-note" role="alert">
                <p>{error}</p>
                <small>Your inputs and calculations are still available.</small>
                {last.current && !busy && (
                  <button
                    className="quiet-action"
                    onClick={() =>
                      last.current &&
                      void run(last.current.text, last.current.analysis, true)
                    }
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
            {busy && (
              <p className="generation" role="status">
                Reviewing your trade…
              </p>
            )}
            {messages.some(
              (message) => message.role === "assistant" && message.content,
            ) &&
              !busy && (
                <div className="suggestions" aria-label="Follow-up questions">
                  {[
                    "What if it rises only 20%?",
                    "What if I’m right, but late?",
                    "What would change my mind?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => void run(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

            <div className="workspace-actions">
              {hasDraft(inputs) && (
                <button className="text-action" onClick={copyPlan}>
                  Copy plan
                </button>
              )}
              {(hasDraft(inputs) || messages.length > 0) && (
                <button className="text-action" onClick={() => setReset(true)}>
                  Reset
                </button>
              )}
              {copied && <span role="status">{copied}</span>}
            </div>

            {reset && (
              <div className="reset-note">
                <div>
                  <strong>Clear this draft and conversation?</strong>
                  <p>This removes the current session inputs and messages.</p>
                </div>
                <div>
                  <button
                    className="quiet-action"
                    onClick={() => setReset(false)}
                  >
                    Keep it
                  </button>
                  <button className="primary-action" onClick={clearSession}>
                    Clear
                  </button>
                </div>
              </div>
            )}
            </div>

            <form
              className="chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
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
                onChange={(event) => setComposer(event.target.value)}
                placeholder="Ask a question or change an assumption…"
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    if (composer.trim() && !busy) {
                      void run(composer.trim());
                      setComposer("");
                    }
                  }
                }}
              />
              <div className="composer-bottom">
                <small>Do not share seed phrases, private keys, or passwords.</small>
                {busy ? (
                  <button
                    type="button"
                    className="quiet-action"
                    onClick={() => abort.current?.abort()}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    className="primary-action"
                    disabled={!composer.trim()}
                  >
                    Send <span aria-hidden="true">↑</span>
                  </button>
                )}
              </div>
            </form>
            <p className="data-status">{noMarket}</p>
          </div>
        </main>
      )}

      {view === "home" && (
        <footer>
          <div className="footer-inner">
            <button className="wordmark" onClick={() => showHome()}>
              coin.im
            </button>
            <p>
              Compare assumptions, not promises. coin.im does not hold funds or
              place orders. Scenario outcomes are not forecasts. No return is
              guaranteed.
            </p>
          </div>
        </footer>
      )}

      <dialog
        ref={exampleDialog}
        className="confirm-dialog"
        aria-labelledby="example-confirm-title"
        onCancel={(event) => {
          event.preventDefault();
          keepInputs();
        }}
      >
        <h2 id="example-confirm-title">
          Replace your current inputs with the example?
        </h2>
        <p>Your current draft will be replaced by hypothetical inputs.</p>
        <div className="dialog-actions">
          <button className="quiet-action" autoFocus onClick={keepInputs}>
            Keep my inputs
          </button>
          <button className="primary-action" onClick={confirmExample}>
            Load example
          </button>
        </div>
      </dialog>
    </>
  );
}
