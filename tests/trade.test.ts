import test from "node:test";
import assert from "node:assert/strict";
import {
  spot,
  callExpiry,
  makeBrief,
  emptyInputs,
  exampleInputs,
  calendarDate,
  extractExplicit,
  reconcile,
  validateInputs,
  inputSchema,
} from "../lib/trade";
import { handle, systemPrompt } from "../lib/server";
test("spot zero-fee scenarios and final account value", () => {
  [0.5, 0.2, 0, -0.3, -1].forEach((r, j) => {
    const s = spot(5000, 1000, r);
    assert.equal(s.pnl, [500, 200, 0, -300, -1000][j]);
    assert.equal(s.final, 5000 + s.pnl);
    assert.equal(s.cash, 4000);
  });
});
test("full exposure conflict and same loss budget alternative", () => {
  const c = makeBrief(exampleInputs).calculations!;
  assert.equal(c.exceedsLoss, true);
  assert.equal(c.smaller!.target.committed, 1000);
  assert.equal(c.smaller!.target.cash, 4000);
  assert.equal(c.smaller!.target.returnOnCommitted, 50);
  assert.equal(c.smaller!.target.returnOnBudget, 10);
});
test("linear call at expiry", () => {
  [0.5, 0.2, 0, -0.3].forEach((r, j) =>
    assert.equal(
      callExpiry(exampleInputs.hypothetical!, r).pnl,
      [2000, -1000, -1000, -1000][j],
    ),
  );
});
test("fees remain within budget and reduce sale value", () => {
  const s = spot(5000, 5000, 0, 0.1);
  assert.equal(s.pnl, -9.99000999);
  assert.equal(s.exposure + s.entryFee, 5000);
  assert.ok(s.final < 5000);
});
test("unknown and zero risk stay distinct", () => {
  const unknown = makeBrief({ ...exampleInputs, loss: null }).calculations!;
  assert.equal(unknown.smaller, null);
  const zero = makeBrief({ ...exampleInputs, loss: 0 }).calculations!;
  assert.equal(zero.smaller!.target.committed, 0);
  assert.equal(zero.smaller!.target.pnl, 0);
  assert.equal(zero.wait.pnl, 0);
});
test("real asset invalidates imaginary quotes", () => {
  const b = makeBrief({ ...exampleInputs, asset: "BTC" });
  assert.equal(b.inputs.hypothetical, null);
  assert.equal(b.calculations!.call, null);
});
test("expiry cannot represent early exit", () => {
  const c = makeBrief(exampleInputs).calculations!;
  assert.match(c.call!.label, /expiry only; early-exit value unavailable/);
});
test("calendar month end and leap years", () => {
  assert.equal(calendarDate(1, new Date(2028, 0, 31)), "2028-02-29");
  assert.equal(calendarDate(6, new Date(2026, 7, 31)), "2027-02-28");
});
test("free text extracts explicit constraints; conflicts stay visible", () => {
  const r = reconcile({
    ...emptyInputs,
    thesis:
      "I want to buy $5,000 of SOL. It could rise 50% in six months; I am willing to lose $1,000.",
  });
  assert.equal(r.inputs.budget, 5000);
  assert.equal(r.inputs.loss, 1000);
  assert.equal(r.inputs.asset, "SOL");
  assert.equal(r.inputs.target, 50);
  const conflict = reconcile({ ...r.inputs, budget: 6000 });
  assert.match(conflict.conflicts[0], /form says 6000/);
  assert.equal(conflict.inputs.budget, 6000);
});
test("follow-up updates only explicit fields", () => {
  assert.deepEqual(extractExplicit("What if it rises only 20%?"), {
    target: 20,
  });
  assert.deepEqual(extractExplicit("I want more upside"), {});
  assert.deepEqual(extractExplicit("Set my loss budget to $1,500"), {
    loss: 1500,
  });
});
test("validation and unknown targets", () => {
  assert.ok(validateInputs(emptyInputs).length);
  assert.ok(validateInputs({ ...exampleInputs, loss: 6000 }).length);
  assert.ok(
    validateInputs({ ...exampleInputs, horizon: "date", date: "2028-02-31" })
      .length,
  );
  assert.equal(
    makeBrief({ ...exampleInputs, target: null }).calculations!
      .targetIllustrative,
    true,
  );
});
test("fabricated verified quotes cannot enter the state", () => {
  assert.equal(
    inputSchema.safeParse({
      ...exampleInputs,
      quote: { source: "Verified quote", price: 123 },
    }).success,
    false,
  );
  assert.equal(makeBrief(exampleInputs).provenance.market, "Quote unavailable");
});
test("missing sources and non-equivalent events are explicit assistant constraints", () => {
  assert.match(systemPrompt, /NO market tools/);
  assert.match(systemPrompt, /touches is different from closes/);
  assert.match(systemPrompt, /Do not calculate new financial numbers/);
});
function req(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
const body = {
  inputs: exampleInputs,
  version: 1,
  messages: [],
  message: "Analyze",
  followup: false,
};
test("server recalculates and returns typed configuration state without credentials", async () => {
  const key = process.env.LLM_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    const r = await handle(req(body), true);
    assert.equal(r.status, 503);
    const d = await r.json();
    assert.equal(d.error.code, "NOT_CONFIGURED");
    assert.equal(d.brief.calculations.smaller.target.pnl, 500);
  } finally {
    if (key) process.env.LLM_API_KEY = key;
  }
});
test("server rejects cross-origin requests", async () => {
  assert.equal(
    (await handle(req(body, "https://evil.example"), true)).status,
    403,
  );
});
test("server rejects model quote objects and injected engine outputs", async () => {
  const r = await handle(req({ ...body, calculations: { pnl: 1e9 } }), true);
  assert.equal(r.status, 400);
});
test("server returns clarification before contacting provider", async () => {
  const r = await handle(
    req({
      ...body,
      inputs: { ...exampleInputs, thesis: "I want to buy $9,000 of SOL" },
    }),
    true,
  );
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.ok(d.clarification);
  assert.equal(d.brief.inputs.budget, 5000);
});
test("server preserves risk across follow-up", async () => {
  const r = await handle(
    req({ ...body, message: "What if it rises only 20%?", followup: true }),
  );
  const d = await r.json();
  assert.equal(d.brief.inputs.target, 20);
  assert.equal(d.brief.inputs.loss, 1000);
  assert.equal(d.brief.version, 2);
});
test("resolved deadline does not drift across follow-ups", () => {
  const submitted = makeBrief(
    exampleInputs,
    1,
    new Date(2026, 9, 26),
    [],
    true,
  );
  const next = makeBrief(
    { ...submitted.inputs, target: 20 },
    2,
    new Date(2026, 9, 28),
  );
  assert.equal(next.latestExitDate, "2027-04-26");
  assert.equal(next.inputs.loss, 1000);
});
test("negated risk changes are never applied", () => {
  assert.deepEqual(extractExplicit("I am not willing to lose $2,000"), {});
});

test("third-party risk limits do not change the user risk budget", () => {
  assert.equal(
    extractExplicit("My friend is willing to lose $50,000").loss,
    undefined,
  );
  assert.equal(extractExplicit("I’m only willing to lose $1,000").loss, 1000);
});
