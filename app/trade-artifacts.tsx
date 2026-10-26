"use client";

import { useState, type CSSProperties } from "react";
import {
  callExpiry,
  money,
  parseFinancialInput,
  spot,
  type TradeBrief,
} from "@/lib/trade";
import {
  callThresholds,
  createExample,
  exitPlan,
  keyIssue,
  scenarioFit,
  thresholdsForBrief,
} from "@/lib/plan";

type Example = ReturnType<typeof createExample>;

function signedPercent(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
}

function friendlyDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function Thresholds({
  value,
}: {
  value: ReturnType<typeof callThresholds>;
}) {
  if (!value)
    return (
      <p className="small muted">
        Verified contract terms and a premium are needed to calculate these
        thresholds.
      </p>
    );
  return (
    <>
      <dl className="threshold-pair">
        <div>
          <dt>Call breaks even</dt>
          <dd>
            +
            {Number(value.breakEvenReturn).toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })}
            % <small>at expiry</small>
          </dd>
        </div>
        <div>
          <dt>Call beats spot</dt>
          <dd>
            {value.crossover
              ? `Above approximately +${Number(value.crossover.returnPercent).toFixed(1)}%`
              : "No valid upside crossover"}{" "}
            {value.crossover && <small>at expiry</small>}
          </dd>
        </div>
      </dl>
      <p className="threshold-note">
        Profitability and outperforming spot are different thresholds. The
        displayed crossover is rounded; the engine compares full-precision
        values.
      </p>
    </>
  );
}

export function InteractiveExample({ example }: { example: Example }) {
  const [scenario, setScenario] = useState(20);
  const [draft, setDraft] = useState("+20");
  const [scenarioError, setScenarioError] = useState("");
  const i = example.inputs;
  const quote = i.hypothetical!;
  const change = scenario / 100;
  const spotResult = spot(i.budget!, i.committed!, change, i.fee);
  const callResult = callExpiry(quote, change);
  const thresholds = callThresholds({
    ...quote,
    spotAllocation: i.committed!,
    callAllocation: callResult.maxLoss,
    feePercent: i.fee,
  });

  function applyScenario(value: number) {
    if (!Number.isFinite(value) || value < -50 || value > 100) {
      setScenarioError("Enter a price change from −50% to +100%.");
      return;
    }
    setScenario(value);
    setDraft(signedPercent(value));
    setScenarioError("");
  }

  function changeExact(value: string) {
    setDraft(value);
    const parsed = parseFinancialInput(value);
    if (
      parsed !== null &&
      Number.isFinite(parsed) &&
      parsed >= -50 &&
      parsed <= 100
    ) {
      setScenario(parsed);
      setScenarioError("");
    }
  }

  const explanation =
    scenario === 20
      ? "The coin rose 20%. The call still lost its full premium."
      : scenario === 50
        ? "The call earns more here. It needed the larger move by expiry."
        : scenario === 0
          ? "Spot is unchanged before costs. The call expires worthless."
          : scenario === -30
            ? "Both routes lose. The call loses its premium; spot retains $700."
            : scenario > 0 && callResult.pnl < 0
              ? "The coin is up. The call still loses money at expiry."
              : callResult.pnl > spotResult.pnl
                ? "The call pays more in this scenario—not in every outcome."
                : scenario < 0
                  ? "Both routes lose. The call loses its full premium at expiry."
                  : "Profit and outperformance are different thresholds.";

  const rows = [
    {
      name: "Buy the coin",
      context: "$1,000 position · $4,000 uncommitted",
      detail: "Own the asset directly.",
      pnl: spotResult.pnl,
    },
    {
      name: "Buy a call option",
      context: "$1,000 premium · $4,000 uncommitted",
      detail: "Can benefit from a rise; the full premium can be lost.",
      pnl: callResult.pnl,
    },
    {
      name: "Wait",
      context: "$5,000 remains uncommitted",
      detail: "No market exposure or assumed interest in this example.",
      pnl: 0,
    },
  ];

  return (
    <div className="scenario-card">
      <div className="scenario-card-top">
        <span className="source-tag">Illustrative example</span>
        <span className="small muted">Not live prices · At expiry</span>
      </div>
      <p className="example-summary">
        $5,000 available · $1,000 loss limit · 6 months
      </p>
      <div className="scenario-control">
        <div className="scenario-label-row">
          <label htmlFor="scenario-range">If the coin moves</label>
          <div className="percent-entry">
            <input
              id="scenario-exact"
              inputMode="decimal"
              aria-label="Exact coin price change percentage"
              value={draft}
              onChange={(event) => changeExact(event.target.value)}
              onBlur={() => applyScenario(parseFinancialInput(draft) ?? scenario)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
            <span aria-hidden="true">%</span>
          </div>
        </div>
        <input
          id="scenario-range"
          className="range"
          type="range"
          min="-50"
          max="100"
          step="1"
          value={scenario}
          aria-valuetext={`${Math.abs(scenario)} percent ${scenario < 0 ? "decrease" : scenario > 0 ? "increase" : "change"}`}
          style={
            { "--fill": `${((scenario + 50) / 150) * 100}%` } as CSSProperties
          }
          onChange={(event) => applyScenario(Number(event.target.value))}
        />
        <div className="range-limits" aria-hidden="true">
          <span>−50%</span>
          <span>+100%</span>
        </div>
        {scenarioError && (
          <p id="scenario-error" className="field-error" role="alert">
            {scenarioError}
          </p>
        )}
        <div className="scenario-presets" aria-label="Scenario presets">
          {[
            [-30, "−30%"],
            [0, "No change"],
            [20, "+20%"],
            [50, "+50%"],
          ].map(([value, label]) => (
            <button
              type="button"
              className="preset"
              aria-pressed={scenario === value}
              key={value}
              onClick={() => applyScenario(Number(value))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="outcome-head" aria-hidden="true">
        <span>Route</span>
        <span>Profit / loss</span>
      </div>
      <div className="outcome-rows">
        {rows.map((row) => (
          <div className="outcome-row" key={row.name}>
            <div>
              <strong>{row.name}</strong>
              <span>{row.context}</span>
              <small>{row.detail}</small>
            </div>
            <b className={row.pnl > 0 ? "gain" : row.pnl < 0 ? "loss" : ""}>
              {money(row.pnl, true)}
            </b>
          </div>
        ))}
      </div>
      <p className="scenario-insight" aria-live="polite" aria-atomic="true">
        {explanation}
      </p>
      <Thresholds value={thresholds} />
      <p className="same-risk-note">
        Same maximum price loss does not mean the same risk. Waiting misses a
        rally.
      </p>
      <details className="assumptions-disclosure">
        <summary>How this example works</summary>
        <div className="disclosure-copy">
          <p>
            The example uses an imaginary coin priced at $100. Buying the coin
            commits $1,000 for 10 units.
          </p>
          <p>
            The illustrative linear USD call has a $120 strike, a $10 premium
            per underlying unit, and 100 underlying units. Its total premium is
            $1,000. The payoff shown applies only at expiry; early-sale value is
            unavailable.
          </p>
          <p>
            The example starts on {example.startDate} and expires on{" "}
            {example.deadline}, six calendar months later. Fees, slippage,
            taxes, and returns on uncommitted capital are zero.
          </p>
          <p>
            The slider is an exploration range, not a bound on real outcomes. A
            coin can fall to zero or rise beyond it. No executable quote is
            provided.
          </p>
        </div>
      </details>
    </div>
  );
}

export function ExampleExit({ example }: { example: Example }) {
  return (
    <div className="plan-receipt">
      <div className="receipt-head">
        <h3>Your trade plan</h3>
        <span className="source-tag">Illustrative · Spot</span>
      </div>
      <dl className="receipt-amounts">
        <div>
          <dt>Put in</dt>
          <dd>$1,000</dd>
        </div>
        <div>
          <dt>Keep uncommitted</dt>
          <dd>$4,000</dd>
        </div>
      </dl>
      <dl className="receipt-rows">
        <div>
          <dt>Target condition</dt>
          <dd>
            Consider an exit at +50%
            <small>A condition to act on, not a guaranteed fill.</small>
          </dd>
        </div>
        <div>
          <dt>Exit by</dt>
          <dd>
            {friendlyDate(example.deadline)}
            <small>Even if the target has not been reached.</small>
          </dd>
        </div>
        <div>
          <dt>Reconsider if</dt>
          <dd>
            Not defined yet
            <small>What would change your reason for buying?</small>
          </dd>
        </div>
        <div>
          <dt>Downside</dt>
          <dd>
            Up to $1,000 in modeled price loss
            <small>A stop order does not guarantee a loss cap.</small>
          </dd>
        </div>
        <div>
          <dt>Still to check</dt>
          <dd>The thesis and current market data</dd>
        </div>
      </dl>
      <p className="receipt-foot">A plan, not an order. Nothing is executed.</p>
    </div>
  );
}

export function WorkspaceArtifacts({ brief }: { brief: TradeBrief }) {
  const calculations = brief.calculations;
  const inputs = brief.inputs;
  const route =
    calculations?.intended ?? calculations?.smaller ?? calculations?.full ?? null;
  const thresholds = thresholdsForBrief(brief);
  const plan = exitPlan(brief);

  return (
    <section className="analysis-summary" aria-label="Calculated trade plan">
      <div className="key-finding">
        <span className="assistant-label">Your numbers</span>
        <h2>{keyIssue(brief)}</h2>
      </div>
      {route ? (
        <div className="mini-comparison">
          <div>
            <span>
              At{" "}
              {calculations!.targetIllustrative
                ? "+50% · illustrative"
                : `+${inputs.target}%`}
            </span>
            <small>
              {money(route.target.committed)} spot position · {inputs.fee}%
              assumed fees per side
            </small>
            <b className={route.target.pnl > 0 ? "gain" : ""}>
              {money(route.target.pnl, true)}
            </b>
          </div>
          <div>
            <span>At a 30% fall</span>
            <b className={route.drop.pnl < 0 ? "loss" : ""}>
              {money(route.drop.pnl, true)}
            </b>
          </div>
          <div>
            <span>Maximum modeled price loss</span>
            <small>If the asset falls to zero</small>
            <b className="loss">{money(-route.target.maxLoss, true)}</b>
          </div>
          <div>
            <span>Capital left uncommitted</span>
            <b>{money(route.target.cash)}</b>
          </div>
        </div>
      ) : (
        <p className="status-note">
          Add a capital budget to calculate a spot comparison. Your loss limit
          can remain unknown while you ask a question.
        </p>
      )}
      <details className="workspace-details">
        <summary>See the exit plan and assumptions</summary>
        <div className="workspace-detail-grid">
          <dl className="evidence-status">
            <div>
              <dt>Scenario fit</dt>
              <dd>{scenarioFit(brief)}</dd>
            </div>
            <div>
              <dt>Market evidence</dt>
              <dd>Not verified</dd>
            </div>
          </dl>
          <div>
            <h3>What this route needs</h3>
            {thresholds ? (
              <Thresholds value={thresholds} />
            ) : (
              <p className="small muted">
                An option comparison needs verified contract terms, fees, and a
                premium. The current spot scenarios remain available.
              </p>
            )}
          </div>
          <div>
            <h3>Your exit plan</h3>
            <dl className="workspace-plan">
              <div>
                <dt>Entry</dt>
                <dd>{plan.entry}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{plan.target}</dd>
              </div>
              <div>
                <dt>Exit by</dt>
                <dd>{plan.time}</dd>
              </div>
              <div>
                <dt>Reconsider if</dt>
                <dd>{plan.reconsider}</dd>
              </div>
            </dl>
          </div>
        </div>
        <p className="scope-note">
          User inputs and illustrative calculations only. No monitoring, alerts,
          or orders are active.
        </p>
      </details>
    </section>
  );
}
