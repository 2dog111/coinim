import Decimal from "decimal.js";
import {
  calculate,
  calendarDate,
  exampleInputs,
  exitLabels,
  money,
  type TradeBrief,
  type TradeInputs,
} from "./trade";

// Preserve decimal precision through comparisons; round only in presentation.
const D = Decimal.clone({ precision: 60 });
export type ThresholdInputs = {
  reference: number;
  strike: number;
  premium: number;
  spotAllocation: number;
  callAllocation: number;
  feePercent: number;
};
export type PriceRatio = { numerator: string; denominator: string };
export function callThresholds(i: ThresholdInputs) {
  if (
    !Object.values(i).every(Number.isFinite) ||
    [i.reference, i.strike, i.premium, i.spotAllocation, i.callAllocation].some(
      (v) => v <= 0,
    ) ||
    i.feePercent !== 0
  )
    return null;
  const S = new D(i.reference),
    K = new D(i.strike),
    q = new D(i.spotAllocation).div(S),
    u = new D(i.callAllocation).div(i.premium);
  const breakEven = K.plus(new D(i.callAllocation).div(u));
  const denominator = u.minus(q),
    numerator = u.mul(K).plus(i.callAllocation).minus(i.spotAllocation);
  const candidate = denominator.isZero() ? null : numerator.div(denominator);
  const valid =
    denominator.gt(0) &&
    candidate !== null &&
    candidate.gt(K) &&
    candidate.gt(S);
  return {
    breakEvenPrice: breakEven.toString(),
    breakEvenReturn: breakEven.div(S).minus(1).mul(100).toString(),
    crossover: valid
      ? {
          price: candidate!.toString(),
          returnPercent: candidate!.div(S).minus(1).mul(100).toString(),
          numerator: numerator.toString(),
          denominator: denominator.toString(),
        }
      : null,
  };
}
export function compareExpiryAtPrice(
  i: ThresholdInputs,
  price: Decimal.Value | PriceRatio,
) {
  if (!callThresholds(i))
    throw new Error("Valid zero-fee linear USD assumptions are required.");
  const ratio =
    typeof price === "object" && price !== null && "numerator" in price
      ? price
      : {
          numerator: new D(price as Decimal.Value).toString(),
          denominator: "1",
        };
  const top = new D(ratio.numerator),
    bottom = new D(ratio.denominator);
  if (!top.isFinite() || !bottom.isFinite() || top.lt(0) || bottom.lte(0))
    throw new Error("Invalid price.");
  const spotScaled = new D(i.spotAllocation)
    .div(i.reference)
    .mul(top)
    .minus(new D(i.spotAllocation).mul(bottom));
  const callScaled = D.max(top.minus(new D(i.strike).mul(bottom)), 0)
    .mul(new D(i.callAllocation).div(i.premium))
    .minus(new D(i.callAllocation).mul(bottom));
  return {
    spotPnl: spotScaled.div(bottom).toString(),
    callPnl: callScaled.div(bottom).toString(),
    callComparedWithSpot: callScaled.comparedTo(spotScaled),
  };
}
export function thresholdsForBrief(brief: TradeBrief) {
  const i = brief.inputs,
    c = brief.calculations;
  if (
    !i.hypothetical ||
    i.asset !== "Example coin" ||
    i.fee !== 0 ||
    !c?.smaller ||
    c.smaller.target.committed <= 0
  )
    return null;
  return callThresholds({
    ...i.hypothetical,
    spotAllocation: c.smaller.target.committed,
    callAllocation: new D(i.hypothetical.premium)
      .mul(i.hypothetical.units)
      .toNumber(),
    feePercent: i.fee,
  });
}
export function scenarioFit(brief: TradeBrief) {
  const i = brief.inputs;
  if (
    brief.conflicts.length ||
    i.committed === null ||
    i.loss === null ||
    !brief.calculations?.intended
  )
    return "Needs more information";
  return i.committed > i.loss
    ? "Exceeds the stated price-loss limit"
    : "Fits the stated price-loss limit";
}
export function keyIssue(brief: TradeBrief) {
  const i = brief.inputs,
    c = brief.calculations;
  if (brief.conflicts.length)
    return (
      brief.conflicts[0] + " Clarify these assumptions before choosing a route."
    );
  if (brief.missing.length) return brief.missing[0];
  if (i.loss === 0)
    return "A zero loss limit leaves no room for a risky crypto position. Waiting has zero market PnL in this model; other risks remain outside it.";
  if (i.committed !== null && i.loss !== null && i.committed > i.loss)
    return `Your intended ${money(i.committed)} spot commitment could lose more than your ${money(i.loss)} limit.`;
  if (c?.exceedsLoss)
    return `Putting the full ${money(i.budget!)} into spot could lose more than your ${money(i.loss!)} limit. Available capital is not an instruction to commit it all.`;
  return "A position can fit a modeled price-loss limit without having a verified investment case.";
}
export function exitPlan(brief: TradeBrief) {
  const i = brief.inputs,
    ref = i.hypothetical?.reference;
  const entry =
    i.committed === null
      ? "No entry amount chosen. Available capital is not an instruction to commit it all."
      : `${money(i.committed)}${ref ? ` at ${money(ref)} per unit` : ""}. ${i.budget !== null ? `${money(i.budget - i.committed)} remains uncommitted.` : ""}`;
  const target =
    i.target === null
      ? "No target condition defined yet."
      : i.exit === "deadline"
        ? "No early target exit selected. The target remains a scenario."
        : i.exit === "help"
          ? "Early-exit preference is undecided. Discuss a target condition before adopting it."
          : `Review an exit if the coin ${ref ? `reaches ${money(new D(ref).mul(new D(1).plus(new D(i.target).div(100))).toNumber())}` : `reaches your +${i.target}% scenario`} before the deadline.`;
  return {
    entry,
    target,
    time: brief.latestExitDate
      ? `Plan to exit no later than ${brief.latestExitDate}, whether or not the target has been reached.`
      : "Choose an exit deadline.",
    reconsider: i.reconsider || "Not defined yet.",
    downside:
      i.committed !== null
        ? `Up to ${money(i.committed)} of modeled price loss.`
        : "No entry amount chosen; modeled position loss is not set.",
    unverified:
      "The investment thesis, current market prices, and executable liquidity.",
    late: `A target reached after ${brief.latestExitDate || "the deadline"} is outside this plan. Spot has no contractual expiry, but this plan still exits by the deadline.${i.hypothetical ? " A call's payoff depends on the price at expiry, not a later rally. Missing the target alone does not imply a full premium loss." : ""}`,
  };
}
export function planSnapshot(brief: TradeBrief, snapshot = new Date()) {
  const i = brief.inputs,
    c = brief.calculations,
    p = exitPlan(brief),
    threshold = thresholdsForBrief(brief);
  const lines = [
    "coin.im — Conditional trade plan",
    `Snapshot: ${snapshot.toISOString()}`,
    `Brief version: ${brief.version}`,
    `Data provenance: ${brief.provenance.inputs}. User beliefs are unverified.`,
    "Market evidence: Not verified",
    `Scenario fit (intended spot commitment): ${scenarioFit(brief)}`,
    `Asset: ${i.asset || "Not specified"}`,
    `User thesis: ${i.thesis || "Not specified"}`,
    `Capital available: ${i.budget === null ? "Unknown" : money(i.budget)}`,
    `Intended commitment: ${i.committed === null ? "Not specified" : money(i.committed)}`,
    `Loss limit: ${i.loss === null ? "Unknown" : money(i.loss)}`,
    `Target scenario: ${i.target === null ? "Unknown" : `+${i.target}%`}`,
    `Deadline: ${brief.latestExitDate || "Not specified"}`,
    `Exit preference: ${exitLabels[i.exit]}`,
    `Fees: ${i.fee.toFixed(2)}% per side · Assumed`,
    `Restrictions: ${i.restrictions || "None supplied"}`,
    `Additional context: ${i.context || "None supplied"}`,
    "",
    "The key issue",
    keyIssue(brief),
    "",
    "Scenario comparison (profit/loss, not final capital)",
  ];
  if (c) {
    for (const [label, route] of [
      ["Full available capital in spot (comparison only)", c.full],
      ["Loss-limited spot alternative", c.smaller],
      ["Intended spot commitment", c.intended],
    ] as const) {
      if (route)
        lines.push(
          `${label}: committed ${money(route.target.committed)}; uncommitted ${money(route.target.cash)}; at ${c.targetIllustrative ? "+50% (illustrative)" : `+${i.target}%`}: ${money(route.target.pnl, true)}; at −30%: ${money(route.drop.pnl, true)}; maximum modeled price loss: ${money(route.target.maxLoss)}; target-scenario final capital: ${money(route.target.final)}.`,
        );
    }
    lines.push(`Wait: ${money(c.wait.pnl)} market PnL. No interest assumed.`);
    if (c.call)
      lines.push(
        `Hypothetical linear USD call: ${money(c.call.atExpiry.pnl, true)} at expiry under ${c.targetIllustrative ? "+50% (illustrative)" : `+${i.target}%`}; maximum modeled price loss ${money(c.call.atExpiry.maxLoss)}. Early-exit value unavailable.`,
      );
  } else lines.push("Not enough inputs to calculate a route.");
  if (i.hypothetical)
    lines.push(
      `Hypothetical inputs: reference ${money(i.hypothetical.reference)}, strike ${money(i.hypothetical.strike)}, premium per unit ${money(i.hypothetical.premium)}, units ${i.hypothetical.units}. No executable quote.`,
    );
  if (threshold)
    lines.push(
      `Hypothetical call break-even at expiry: ${money(Number(threshold.breakEvenPrice))} (${Number(threshold.breakEvenReturn).toFixed(1)}%).`,
      threshold.crossover
        ? `Call overtakes the loss-limited spot example above approximately +${Number(threshold.crossover.returnPercent).toFixed(1)}% at expiry. Rounded display, not an execution threshold.`
        : "No valid upside crossover for these assumptions.",
    );
  lines.push(
    "",
    "Your exit plan",
    `Entry assumption: ${p.entry}`,
    `Target condition: ${p.target}`,
    `Time limit: ${p.time}`,
    `Reason to reconsider: ${p.reconsider}`,
    `Downside: ${p.downside}`,
    `Still unverified: ${p.unverified}`,
    `If the thesis is right but late: ${p.late}`,
    "A target is a condition to act on, not a guaranteed fill. A stop order does not guarantee a cap.",
    "Equal loss limits do not mean equal risk.",
    "Price-movement scenarios only. Platform, custody, currency, tax, and other risks are not included.",
    "This is a snapshot of assumptions, not an approved or execution-ready plan. No monitoring, alerts or orders are active.",
  );
  return lines.join("\n");
}
export function describeChange(before: TradeInputs, after: TradeInputs) {
  const changes: string[] = [];
  if (before.target !== after.target)
    changes.push(
      `Target updated from ${before.target === null ? "unknown" : `+${before.target}%`} to ${after.target === null ? "unknown" : `+${after.target}%`}.`,
    );
  if (before.budget !== after.budget)
    changes.push(
      `Capital available updated to ${after.budget === null ? "unknown" : money(after.budget)}.`,
    );
  if (before.committed !== after.committed)
    changes.push(
      `Intended commitment updated to ${after.committed === null ? "not specified" : money(after.committed)}.`,
    );
  if (before.loss !== after.loss)
    changes.push(
      `Loss limit updated to ${after.loss === null ? "unknown" : money(after.loss)}.`,
    );
  if (before.asset !== after.asset)
    changes.push(`Asset updated to ${after.asset}.`);
  if (before.horizon !== after.horizon || before.date !== after.date)
    changes.push("Exit deadline updated.");
  if (before.reconsider !== after.reconsider)
    changes.push("Your stated reason to reconsider was updated.");
  if (changes.length && before.loss === after.loss)
    changes.push("Your loss limit is unchanged.");
  return changes.join(" ");
}
export function hasDraft(i: TradeInputs) {
  return Boolean(
    i.asset ||
      i.thesis ||
      i.budget !== null ||
      i.loss !== null ||
      i.target !== null ||
      i.committed !== null ||
      i.reconsider ||
      i.restrictions ||
      i.context ||
      i.horizon !== "6" ||
      i.exit !== "target" ||
      i.fee !== 0.1,
  );
}
export function createExample(startDate: string) {
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const inputs = { ...exampleInputs, resolvedDate: calendarDate(6, date) };
  return {
    inputs,
    startDate,
    deadline: inputs.resolvedDate!,
    calculations: calculate(inputs)!,
  };
}
