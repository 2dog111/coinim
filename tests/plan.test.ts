import test from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import {
  callThresholds,
  compareExpiryAtPrice,
  createExample,
  describeChange,
  exitPlan,
  hasDraft,
  keyIssue,
  planSnapshot,
  scenarioFit,
  thresholdsForBrief,
} from "../lib/plan";
import { emptyInputs, exampleInputs, makeBrief, reconcile } from "../lib/trade";
const inputs = {
  reference: 100,
  strike: 120,
  premium: 10,
  spotAllocation: 1000,
  callAllocation: 1000,
  feePercent: 0,
};
test("break-even and crossover use calculated full-precision thresholds", () => {
  const t = callThresholds(inputs)!;
  assert.equal(t.breakEvenPrice, "130");
  assert.equal(t.breakEvenReturn, "30");
  assert.ok(
    new Decimal(t.crossover!.price)
      .minus(new Decimal(400).div(3))
      .abs()
      .lt("1e-16"),
  );
  assert.ok(t.crossover!.returnPercent.startsWith("33.333333333333"));
  assert.equal(
    compareExpiryAtPrice(inputs, t.crossover!).callComparedWithSpot,
    0,
  );
});
test("exact crossover equality and neighbors are not changed by display rounding", () => {
  assert.equal(
    compareExpiryAtPrice(inputs, { numerator: "400", denominator: "3" })
      .callComparedWithSpot,
    0,
  );
  assert.equal(
    compareExpiryAtPrice(inputs, "133.333333333334").callComparedWithSpot,
    1,
  );
  assert.equal(
    compareExpiryAtPrice(inputs, "133.333333333333").callComparedWithSpot,
    -1,
  );
  assert.equal(compareExpiryAtPrice(inputs, "133.3").callComparedWithSpot, -1);
});
test("invalid and absent upside crossovers are explicit", () => {
  for (const bad of [
    { premium: 0 },
    { reference: 0 },
    { feePercent: 0.1 },
    { spotAllocation: -1 },
    { callAllocation: NaN },
  ])
    assert.equal(callThresholds({ ...inputs, ...bad }), null);
  assert.equal(
    callThresholds({ ...inputs, callAllocation: 100 })!.crossover,
    null,
  );
  assert.equal(
    callThresholds({ ...inputs, callAllocation: 50 })!.crossover,
    null,
  );
  assert.equal(callThresholds({ ...inputs, strike: 10 })!.crossover, null);
  assert.throws(() =>
    compareExpiryAtPrice(inputs, { numerator: "1", denominator: "0" }),
  );
});
test("threshold changes follow inputs, not hardcoded fixtures", () => {
  const t = callThresholds({ ...inputs, strike: 140, premium: 20 })!;
  assert.equal(t.breakEvenPrice, "160");
  assert.equal(t.breakEvenReturn, "60");
  assert.equal(t.crossover!.price, "175");
});
test("zero-fee hypothetical thresholds never leak into paid user scenarios", () => {
  const b = makeBrief({ ...exampleInputs, fee: 0.1 });
  assert.equal(thresholdsForBrief(b), null);
  assert.equal(b.calculations!.call, null);
  assert.ok(b.calculations!.smaller!.target.pnl < 500);
  assert.equal(
    thresholdsForBrief(makeBrief({ ...exampleInputs, asset: "SOL" })),
    null,
  );
});
test("example date is calendar based and shared with its exit plan", () => {
  const e = createExample("2027-08-31");
  assert.equal(e.deadline, "2028-02-29");
  assert.match(exitPlan(makeBrief(e.inputs)).time, /2028-02-29/);
  assert.match(exitPlan(makeBrief(e.inputs)).target, /\$150/);
  assert.equal(e.inputs.target, 50);
});
test("capital availability is not an intended commitment", () => {
  const b = makeBrief({
    ...emptyInputs,
    asset: "SOL",
    budget: 5000,
    loss: 1000,
  });
  assert.equal(scenarioFit(b), "Needs more information");
  assert.match(keyIssue(b), /Putting the full \$5,000/);
  assert.match(exitPlan(b).entry, /No entry amount chosen/);
  const r = reconcile({ ...b.inputs, thesis: "I want to buy $1,000 of SOL." });
  assert.equal(r.inputs.budget, 5000);
  assert.equal(r.inputs.committed, 1000);
  assert.deepEqual(r.conflicts, []);
});
test("fit and evidence are separate, including unknown and zero loss", () => {
  assert.equal(
    scenarioFit(makeBrief(exampleInputs)),
    "Fits the stated price-loss limit",
  );
  assert.equal(
    scenarioFit(makeBrief({ ...exampleInputs, loss: null })),
    "Needs more information",
  );
  assert.equal(
    scenarioFit(makeBrief({ ...exampleInputs, loss: 0 })),
    "Exceeds the stated price-loss limit",
  );
  assert.match(
    keyIssue(makeBrief({ ...exampleInputs, loss: 0 })),
    /no room for a risky/,
  );
  assert.equal(makeBrief(exampleInputs).provenance.market, "Quote unavailable");
});
test("plain-text snapshot exports engine plan, provenance and unknowns, never transcript", () => {
  const b = makeBrief({
    ...exampleInputs,
    thesis: "I believe adoption may grow.",
  });
  const text = planSnapshot(b, new Date("2026-10-26T09:00:00Z"));
  for (const part of [
    "Snapshot: 2026-10-26T09:00:00.000Z",
    "Illustrative assumptions",
    "Market evidence: Not verified",
    "User thesis: I believe",
    "Fees: 0.00%",
    "+50%",
    "+$500",
    "Your exit plan",
    "Reason to reconsider: Not defined yet.",
    "No monitoring",
  ])
    assert.ok(text.includes(part), part);
  assert.ok(!text.includes("assistant:"));
  const unknown = planSnapshot(
    makeBrief({ ...exampleInputs, target: null, loss: null }),
  );
  assert.match(unknown, /Loss limit: Unknown/);
  assert.match(unknown, /Target scenario: Unknown/);
});
test("changes retain risk and describe explicit updates", () => {
  assert.equal(
    describeChange(exampleInputs, { ...exampleInputs, target: 20 }),
    "Target updated from +50% to +20%. Your loss limit is unchanged.",
  );
  assert.equal(describeChange(exampleInputs, exampleInputs), "");
  assert.equal(hasDraft(emptyInputs), false);
  assert.equal(hasDraft({ ...emptyInputs, fee: 0 }), true);
});
test("exit plans honor deadline-only or undecided early-exit preferences", () => {
  assert.match(
    exitPlan(makeBrief({ ...exampleInputs, exit: "deadline" })).target,
    /No early target exit/,
  );
  assert.match(
    exitPlan(makeBrief({ ...exampleInputs, exit: "help" })).target,
    /undecided/,
  );
  assert.equal(
    exitPlan(
      makeBrief({
        ...exampleInputs,
        reconsider: "My own thesis no longer holds.",
      }),
    ).reconsider,
    "My own thesis no longer holds.",
  );
});
