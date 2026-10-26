"use client";
import { useState } from "react";
import {
  callExpiry,
  money,
  spot,
  makeBrief,
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
export function Thresholds({
  value,
}: {
  value: ReturnType<typeof callThresholds>;
}) {
  if (!value)
    return (
      <p className="small">
        Cannot calculate this threshold without verified contract terms and a
        premium.
      </p>
    );
  return (
    <>
      <dl className="thresholds">
        <div>
          <dt>Break-even at expiry</dt>
          <dd>
            {Number(value.breakEvenReturn) > 0 ? "+" : ""}
            {Number(value.breakEvenReturn).toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })}
            %
          </dd>
          <small>{money(Number(value.breakEvenPrice))} per unit</small>
        </div>
        <div>
          <dt>Overtakes the spot example</dt>
          <dd>
            {value.crossover
              ? `Above approximately +${Number(value.crossover.returnPercent).toFixed(1)}% at expiry`
              : "No valid upside crossover"}
          </dd>
        </div>
      </dl>
      <p className="small">
        Becoming profitable and becoming the better-paying route are two
        different thresholds.
      </p>
      <p className="scope">
        Calculated from this example’s assumptions. Not a forecast. The routes
        have equal modeled PnL at the exact crossover; the displayed percentage
        is rounded.
      </p>
      <p className="small equal-risk">
        Equal loss limits do not mean equal risk.
      </p>
    </>
  );
}
export function InteractiveExample({ example }: { example: Example }) {
  const [scenario, setScenario] = useState(0.2);
  const { inputs: i } = example,
    q = i.hypothetical!;
  const spotResult = spot(i.budget!, i.committed!, scenario, i.fee),
    call = callExpiry(q, scenario),
    wait = example.calculations.wait;
  const rows = [
    {
      name: `Buy ${money(i.committed!)} of the coin`,
      sub: `${money(spotResult.cash)} stays uncommitted`,
      pnl: spotResult.pnl,
      maxLoss: spotResult.maxLoss,
    },
    {
      name: `Spend ${money(call.maxLoss)} on an illustrative call`,
      sub: `${money(i.budget! - call.maxLoss)} stays uncommitted`,
      pnl: call.pnl,
      maxLoss: call.maxLoss,
    },
    {
      name: "Wait",
      sub: "No market exposure in this model",
      pnl: wait.pnl,
      maxLoss: wait.maxLoss,
    },
  ];
  const thresholds = callThresholds({
    ...q,
    spotAllocation: i.committed!,
    callAllocation: call.maxLoss,
    feePercent: i.fee,
  });
  const explanation =
    scenario === 0.2
      ? `The coin rose ${scenario * 100}%. Spot made ${money(spotResult.pnl)}. The call lost its entire ${money(call.maxLoss)} premium.`
      : scenario === 0.5
        ? "The call earns more here. It needed the larger move to happen by expiry."
        : scenario === 0
          ? "Spot is unchanged before costs. The call expires worthless."
          : `Both routes lose. The call loses its full premium; spot retains ${money(spotResult.saleValue)}.`;
  return (
    <>
      <fieldset className="scenario-selector">
        <legend>What happens to the coin’s price?</legend>
        <div>
          {[
            [0.5, "+50%"],
            [0.2, "+20%"],
            [0, "No change"],
            [-0.3, "−30%"],
          ].map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="example-scenario"
                value={value}
                checked={scenario === value}
                onChange={() => setScenario(Number(value))}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="comparison outcome-comparison">
        <table>
          <caption className="sr-only">
            Hypothetical profit and loss at expiry, not final capital
          </caption>
          <thead>
            <tr>
              <th>Route</th>
              <th>Profit / loss</th>
              <th>Maximum modeled price loss</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">
                  {row.name}
                  <small>{row.sub}</small>
                </th>
                <td
                  data-label="Profit / loss"
                  className={row.pnl > 0 ? "positive" : ""}
                >
                  {money(row.pnl, true)}
                </td>
                <td data-label="Maximum modeled price loss">
                  {money(row.maxLoss)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="scenario-explanation" aria-live="polite" aria-atomic="true">
        {explanation}
      </p>
      <p className="small muted">
        Waiting avoids this price exposure, but it also misses a rally.
      </p>
      <div className="threshold-block">
        <h3>What this call needs</h3>
        <Thresholds value={thresholds} />
      </div>
      <details>
        <summary>Show the assumptions</summary>
        <div className="assumption-copy">
          <p>
            This example uses an imaginary coin and a linear USD option payoff.
          </p>
          <p>
            Reference asset price: {money(q.reference)}. Spot allocation:{" "}
            {money(i.committed!)} ({i.committed! / q.reference} units).
            Available capital: {money(i.budget!)}. Loss limit: {money(i.loss!)}.
          </p>
          <p>
            Call strike: {money(q.strike)}. Premium per underlying unit:{" "}
            {money(q.premium)}. Underlying units covered: {q.units}. Total
            premium: {money(call.maxLoss)}.
          </p>
          <p>
            Example start date (UTC): {example.startDate}. Expiry:{" "}
            {example.deadline}, six calendar months later. Target thesis: +
            {i.target}%.
          </p>
          <p>
            The option results apply at expiry only. They are not estimates of
            what the option could be sold for earlier.
          </p>
          <p>No executable quote is provided.</p>
          <p>
            Fees, slippage, taxes, and returns on uncommitted capital are set to
            zero.
          </p>
        </div>
      </details>
    </>
  );
}
export function ExitRows({ brief }: { brief: TradeBrief }) {
  const plan = exitPlan(brief);
  return (
    <dl className="exit-rows">
      <div>
        <dt>Entry assumption</dt>
        <dd>{plan.entry}</dd>
      </div>
      <div>
        <dt>Target condition</dt>
        <dd>
          {plan.target}
          <small>
            A target is a condition to act on, not a guaranteed fill.
          </small>
        </dd>
      </div>
      <div>
        <dt>Time limit</dt>
        <dd>{plan.time}</dd>
      </div>
      <div>
        <dt>Reason to reconsider</dt>
        <dd>
          {plan.reconsider}
          <small>
            What evidence would make you stop believing this trade is worth
            taking?
          </small>
        </dd>
      </div>
      <div>
        <dt>Downside</dt>
        <dd>
          {plan.downside}
          <small>
            An earlier exit may reduce the loss. A stop order does not guarantee
            a cap.
          </small>
        </dd>
      </div>
      <div>
        <dt>Still unverified</dt>
        <dd>{plan.unverified}</dd>
      </div>
    </dl>
  );
}
export function ExampleExit({ example }: { example: Example }) {
  return (
    <div className="exit-card">
      <p className="eyebrow">Illustrative plan · spot route</p>
      <h3>The six-month plan</h3>
      <ExitRows brief={makeBrief(example.inputs)} />
    </div>
  );
}
export function WorkspaceArtifacts({ brief }: { brief: TradeBrief }) {
  const c = brief.calculations,
    i = brief.inputs,
    thresholds = thresholdsForBrief(brief);
  const routes = c
    ? [
        {
          label: "Full available capital in spot · comparison only",
          value: c.full,
        },
        ...(c.intended
          ? [{ label: "Your intended spot commitment", value: c.intended }]
          : []),
        ...(c.smaller &&
        (!c.intended ||
          c.intended.target.committed !== c.smaller.target.committed)
          ? [{ label: "Loss-limited spot alternative", value: c.smaller }]
          : []),
      ]
    : [];
  return (
    <div className="workspace-artifacts">
      <dl className="evidence-status">
        <div>
          <dt>Scenario fit</dt>
          <dd>{scenarioFit(brief)}</dd>
          <small>
            Intended spot commitment
            {i.committed === null ? " not yet specified" : ""}
          </small>
        </div>
        <div>
          <dt>Market evidence</dt>
          <dd>Not verified</dd>
          <small>A modeled fit is not a verified investment case.</small>
        </div>
      </dl>
      <div className="key-issue">
        <h3>The key issue</h3>
        <p>{keyIssue(brief)}</p>
      </div>
      <details open className="workspace-comparison">
        <summary>Scenario comparison</summary>
        {!c ? (
          <p className="small">
            Add a capital budget to calculate scenarios. Loss tolerance can
            remain unknown.
          </p>
        ) : (
          <>
            <p className="small muted">
              Profit / loss in USD.{" "}
              {c.targetIllustrative
                ? "The +50% scenario is illustrative; your target is unknown."
                : `Target scenario: +${i.target}%.`}{" "}
              Fees: {i.fee.toFixed(2)}% per side · Assumed
            </p>
            {routes.map(({ label, value }) => (
              <div className="route-result" key={label}>
                <h4>{label}</h4>
                <p className="small">
                  {money(value.target.committed)} committed ·{" "}
                  {money(value.target.cash)} uncommitted
                </p>
                <dl className="small-numbers">
                  <div>
                    <dt>
                      At{" "}
                      {c.targetIllustrative
                        ? "+50% · illustrative"
                        : `+${i.target}%`}
                    </dt>
                    <dd>{money(value.target.pnl, true)}</dd>
                  </div>
                  <div>
                    <dt>At −30%</dt>
                    <dd>{money(value.drop.pnl, true)}</dd>
                  </div>
                  <div>
                    <dt>Maximum modeled price loss</dt>
                    <dd>{money(value.target.maxLoss)}</dd>
                  </div>
                  <div>
                    <dt>Final capital at target scenario</dt>
                    <dd>{money(value.target.final)}</dd>
                  </div>
                </dl>
                <p className="small muted">
                  {i.loss === null
                    ? "Needs more information: loss limit unknown."
                    : value.target.maxLoss > i.loss
                      ? "Exceeds the stated price-loss limit."
                      : value.target.committed === 0
                        ? "No market position in this model."
                        : "Fits the stated price-loss limit in the model."}
                </p>
              </div>
            ))}
            {c.call && (
              <div className="route-result">
                <h4>Illustrative call · expiry only</h4>
                <p>
                  {money(c.call.atExpiry.pnl, true)} scenario PnL ·{" "}
                  {money(c.call.atExpiry.maxLoss)} maximum modeled price loss.
                </p>
                <p className="small">{c.call.label}</p>
                <p className="small">
                  {i.loss === null
                    ? "Loss-limit fit unknown."
                    : c.call.atExpiry.maxLoss > i.loss
                      ? "Exceeds the stated price-loss limit."
                      : "Fits the stated price-loss limit in the model."}{" "}
                  Equal loss limits do not mean equal risk.
                </p>
              </div>
            )}
            <div className="route-result">
              <h4>Wait</h4>
              <p>
                {money(c.wait.pnl)} market PnL · {money(c.wait.final)} final
                capital.
              </p>
              <p className="small">
                No market exposure or assumed interest in this model. Other
                risks are excluded.
              </p>
            </div>
          </>
        )}
      </details>
      <details className="route-needs">
        <summary>What this route needs</summary>
        {thresholds ? (
          <>
            <p className="small">
              Hypothetical linear USD call versus the loss-limited spot
              alternative. Zero fees; expiry only.
            </p>
            <Thresholds value={thresholds} />
          </>
        ) : (
          <p className="small">
            {i.hypothetical && i.fee !== 0
              ? "The zero-fee call example is not applied to your nonzero-fee plan. Its thresholds and option scenario are unavailable under these assumptions."
              : "Cannot calculate this threshold without verified contract terms and a premium."}
          </p>
        )}
      </details>
      <details className="workspace-exit" open>
        <summary>Your exit plan</summary>
        <ExitRows brief={brief} />
        <p className="small">{exitPlan(brief).late}</p>
        <p className="scope">
          Your stated conditions only. No price monitoring, alerts or orders are
          active.
        </p>
      </details>
    </div>
  );
}
