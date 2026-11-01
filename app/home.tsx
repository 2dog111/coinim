"use client";

import Link from "next/link";
import Markdown from "react-markdown";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  emptyInputs,
  makeBrief,
  money,
  noMarket,
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
import { HeaderActions } from "./site-chrome";

type Message = { role: "user" | "assistant"; content: string };

const greeting = "What trade would you like to explore?";
const starters = [
  "I have $5,000 for SOL, can lose $1,000, and want to exit within six months.",
  "I’m considering BTC. Help me decide what I still need to define.",
  "Compare buying ETH now with waiting. Ask me one question at a time.",
];

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [reset, setReset] = useState(false);
  const [clarify, setClarify] = useState("");
  const [changed, setChanged] = useState("");
  const [dirty, setDirty] = useState(false);

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

  function replaceBrief(next: TradeBrief) {
    setBrief(next);
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
  }

  function showHome() {
    if (busy) {
      requestId.current++;
      abort.current?.abort();
      abort.current = null;
      setBusy(false);
    }
    setView("home");
    requestAnimationFrame(() => {
      const target = idea.current;
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

  function chooseStarter(text: string) {
    update({ thesis: text });
    requestAnimationFrame(() => idea.current?.focus({ preventScroll: true }));
  }

  function prepareChange(text: string) {
    setComposer(text);
    requestAnimationFrame(() => chatInput.current?.focus({ preventScroll: true }));
  }

  async function run(text: string, analysis = false, retry = false) {
    if (busy) return;
    const validation = validateInputs(inputs);
    if (
      validation.length &&
      !(!inputs.asset && !inputs.thesis && text.trim() && !analysis)
    ) {
      setError(validation[0]);
      if (view !== "home") openWorkspace();
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
    if (inputs.thesis.trim()) void run(inputs.thesis.trim(), true);
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
            <Link href="/blog">Research</Link>
            {view === "home" ? (
              <>
                <button onClick={() => goToSection("difference")}>See example</button>
                {messages.length > 0 && (
                  <button className="nav-action" onClick={openWorkspace}>Back to conversation</button>
                )}
              </>
            ) : (
              <button className="nav-action" onClick={() => showHome()}>Back to start</button>
            )}
          </nav>
          <HeaderActions />
        </div>
      </header>

      {view === "home" ? (
        <main id="main-content">
          <section className="chat-landing" id="start" aria-labelledby="headline">
            <div className="chat-landing-inner">
              <p className="chat-kicker"><span aria-hidden="true" /> AI trade planner</p>
              <h1 id="headline">What trade are you considering?</h1>
              <p className="chat-lead">
                Describe it naturally. Include the coin, budget, loss you can
                accept and when you want to exit — or let the chat ask.
              </p>

              <form id="trade-form" className="chat-entry" onSubmit={submit}>
                <label className="sr-only" htmlFor="idea">Your trade question</label>
                <textarea
                  id="idea"
                  ref={idea}
                  maxLength={4000}
                  autoFocus
                  value={inputs.thesis}
                  onChange={(event) => update({ thesis: event.target.value })}
                  placeholder="I have $5,000 for SOL, can lose $1,000, and want to exit within six months. What should I consider?"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <div className="chat-entry-bottom">
                  <span>Write everything in one message</span>
                  <button
                    className="chat-send"
                    disabled={busy || !inputs.thesis.trim()}
                    aria-label="Send trade question"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                </div>
              </form>

              <div className="chat-starters" aria-label="Example questions">
                {starters.map((starter) => (
                  <button type="button" key={starter} onClick={() => chooseStarter(starter)}>
                    {starter}
                  </button>
                ))}
              </div>

              <p className="chat-safety">
                No account or wallet connection. Nothing is traded.
              </p>
            </div>
          </section>

          <section className="output-library" aria-labelledby="output-library-title">
            <header className="output-library-head">
              <div>
                <span className="section-kicker">What the planner returns</span>
                <h2 id="output-library-title">See the plan before you trade.</h2>
              </div>
              <ul aria-label="Plan output categories">
                <li>Comparison</li>
                <li>Exit plan</li>
                <li>Research</li>
              </ul>
            </header>
            <div className="plan-gallery">
          <section className="research-brief" aria-labelledby="research-title">
            <div>
              <h2 id="research-title">Research the risk around the trade.</h2>
              <p>
                The research desk separates company claims, transaction records
                and analyst inference. The first report reconstructs the Binance
                hot-wallet incident and tracks what is still unknown.
              </p>
            </div>
            <Link href="/blog/binance-hot-wallet-incident">
              Read the Binance incident report
            </Link>
          </section>

          <section
            className="content-section difference-section"
            id="difference"
            aria-labelledby="difference-title"
          >
            <div className="section-heading">
              <h2 id="difference-title">
                Compare three ways to take the same view.
              </h2>
              <p>
                Move one market assumption. Compare buying the coin, using a
                call, or waiting in dollars.
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
              <h2 id="exit-title">
                Write the exit before the entry.
              </h2>
              <p>
                Leave with a position size, an exit date and a reason to
                change your mind.
              </p>
            </div>
            <ExampleExit example={example} />
            <div className="end-action">
              <button className="primary-action" onClick={() => showHome()}>
                Check my trade
              </button>
              <p>A smaller position, or no trade, may fit better.</p>
            </div>
          </section>
            </div>
          </section>
        </main>
      ) : (
        <main id="main-content" className="workspace">
          <div className="workspace-width">
            <div className="workspace-scroll">
            <div className="workspace-top">
              <div>
                <h1>Plan it in one conversation.</h1>
                <p className="workspace-status">Add or change any assumption below.</p>
              </div>
              <button className="text-action" onClick={() => showHome()}>
                New question
              </button>
            </div>
            <div className="brief-chips" aria-label="Current trade brief">
              <button onClick={() => prepareChange("Change the coin to ")}>
                Coin <b>{inputs.asset || "Not set"}</b>
              </button>
              <button onClick={() => prepareChange("Set my available budget to $")}>
                Budget <b>{inputs.budget === null ? "Not set" : money(inputs.budget)}</b>
              </button>
              <button onClick={() => prepareChange("Set my loss limit to $")}>
                Loss limit <b>{inputs.loss === null ? "Not set" : money(inputs.loss)}</b>
              </button>
              <button onClick={() => prepareChange("Set my exit deadline to ")}>
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
                <button
                  className="quiet-action"
                  onClick={() => prepareChange("Use this assumption instead: ")}
                >
                  Resolve in chat
                </button>
              </div>
            )}
            {error && (
              <div className="error-note" role="alert">
                <p>{error}</p>
                <small>Your inputs and calculations are still available.</small>
                {!busy && (
                  <button
                    className="quiet-action"
                    disabled={!messages.length}
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
                placeholder="Add a detail, change a limit, or ask a follow-up…"
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
                    Send
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

    </>
  );
}
