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
  parseFinancialInput,
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
  assert.equal(r.inputs.budget, null);
  assert.equal(r.inputs.committed, 5000);
  assert.equal(r.inputs.loss, 1000);
  assert.equal(r.inputs.asset, "SOL");
  assert.equal(r.inputs.target, 50);
  assert.equal(r.inputs.horizonSource, "user");
  const conflict = reconcile({ ...r.inputs, committed: 6000 });
  assert.match(conflict.conflicts[0], /form says 6000/);
  assert.equal(conflict.inputs.committed, 6000);
});
test("formatted financial input and default deadline provenance remain distinct", () => {
  assert.equal(parseFinancialInput("$5,000.25"), 5000.25);
  assert.equal(parseFinancialInput(""), null);
  assert.ok(Number.isNaN(parseFinancialInput("five thousand")));
  const extracted = reconcile({
    ...emptyInputs,
    thesis: "I want to buy SOL within three months.",
  });
  assert.equal(extracted.inputs.horizon, "3");
  assert.equal(extracted.inputs.horizonSource, "user");
  assert.deepEqual(extracted.conflicts, []);
  const conflict = reconcile({
    ...emptyInputs,
    horizon: "6",
    horizonSource: "user",
    thesis: "I want to buy SOL within three months.",
  });
  assert.match(conflict.conflicts[0], /form says 6 months/);
});
test("a natural chat sentence sets available capital, price-loss limit and exit", () => {
  const sentence =
    "I want to buy SOL with $5,000 available, a $1,000 price-loss limit and a six-month exit.";
  const result = reconcile({ ...emptyInputs, thesis: sentence });
  assert.equal(result.inputs.asset, "SOL");
  assert.equal(result.inputs.budget, 5000);
  assert.equal(result.inputs.loss, 1000);
  assert.equal(result.inputs.committed, null);
  assert.equal(result.inputs.horizon, "6");
  assert.equal(result.inputs.horizonSource, "user");
  assert.deepEqual(result.conflicts, []);
  assert.equal(extractExplicit("My friend has a $50,000 loss limit.").loss, undefined);
  assert.equal(extractExplicit("I have $1,000 price-loss limit.").budget, undefined);
  assert.equal(extractExplicit("My friend has $50,000 available.").budget, undefined);
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
  assert.equal(
    d.change,
    "Target updated from +50% to +20%. Your loss limit is unchanged.",
  );
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

test("provider transport failure preserves validated follow-up and hides raw errors", async () => {
  const originalFetch = globalThis.fetch;
  const names = ["LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL"] as const;
  const saved = names.map((n) => process.env[n]);
  process.env.LLM_API_KEY = "synthetic-test-key";
  process.env.LLM_MODEL = "synthetic-test-model";
  process.env.LLM_BASE_URL = "https://provider.invalid";
  globalThis.fetch = async () => {
    throw new Error("private provider details");
  };
  try {
    const r = await handle(
      req({ ...body, message: "What if it rises only 20%?", followup: true }),
    );
    assert.equal(r.status, 502);
    const d = await r.json();
    assert.equal(d.brief.inputs.target, 20);
    assert.equal(d.brief.inputs.loss, 1000);
    assert.equal(d.error.code, "NETWORK");
    assert.ok(!JSON.stringify(d).includes("private provider details"));
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((n, j) => {
      if (saved[j] === undefined) delete process.env[n];
      else process.env[n] = saved[j];
    });
  }
});
test("provider capacity error keeps the calculated brief and gives a clear retry state", async () => {
  const originalFetch = globalThis.fetch;
  const names = ["LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL"] as const;
  const saved = names.map((n) => process.env[n]);
  process.env.LLM_API_KEY = "synthetic-test-key";
  process.env.LLM_MODEL = "synthetic-test-model";
  process.env.LLM_BASE_URL = "https://provider.invalid";
  globalThis.fetch = async () =>
    new Response("private quota details", { status: 429 });
  try {
    const r = await handle(req(body), true);
    const d = await r.json();
    assert.equal(r.status, 503);
    assert.equal(d.error.code, "PROVIDER_LIMIT");
    assert.match(d.error.message, /Try again later/);
    assert.equal(d.brief.inputs.loss, 1000);
    assert.ok(!JSON.stringify(d).includes("private quota details"));
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((n, j) => {
      if (saved[j] === undefined) delete process.env[n];
      else process.env[n] = saved[j];
    });
  }
});
test("Market Scan Gemini web route queues and returns a safe narrative", async () => {
  const originalFetch = globalThis.fetch;
  const names = [
    "LLM_PROVIDER",
    "MARKET_SCAN_WEBCHAT_URL",
    "MARKET_SCAN_WEBCHAT_KEY",
    "MARKET_SCAN_WEBCHAT_TIMEOUT_MS",
  ] as const;
  const saved = names.map((n) => process.env[n]);
  let answerPolls = 0;
  process.env.LLM_PROVIDER = "market-scan-gemini-web";
  process.env.MARKET_SCAN_WEBCHAT_URL = "https://mscan.test/scan/api/webchat";
  process.env.MARKET_SCAN_WEBCHAT_KEY = "synthetic-market-scan-key";
  process.env.MARKET_SCAN_WEBCHAT_TIMEOUT_MS = "30000";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/ask"))
      return new Response(JSON.stringify({ id: "job-test" }), { status: 201 });
    answerPolls++;
    if (answerPolls === 1)
      return new Response(JSON.stringify({ status: "sent" }), { status: 202 });
    return new Response(
      JSON.stringify({
        status: "answered",
        complete: true,
        a: "Start with the stated constraint.\nWaiting remains a legitimate route.",
      }),
      { status: 200 },
    );
  };
  try {
    const r = await handle(req(body), true);
    assert.equal(r.status, 200);
    const events = (await r.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(events[0].brief.inputs.loss, 1000);
    assert.ok(events.some((event) => event.delta?.includes("Waiting remains")));
    assert.ok(events.some((event) => event.done));
    assert.equal(answerPolls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((n, j) => {
      if (saved[j] === undefined) delete process.env[n];
      else process.env[n] = saved[j];
    });
  }
});
test("late and reconsideration questions preserve constraints until explicit edits", () => {
  assert.deepEqual(extractExplicit("What if I’m right, but late?"), {});
  assert.deepEqual(extractExplicit("What would make me walk away?"), {});
  assert.deepEqual(
    extractExplicit(
      "My reason to reconsider is the evidence I specified no longer holds.",
    ),
    { reconsider: "the evidence I specified no longer holds." },
  );
});
test("missing a fifty-percent target does not imply a total call loss", () => {
  for (const [r, pnl] of [
    [0.25, -500],
    [0.3, 0],
    [0.35, 500],
  ])
    assert.equal(callExpiry(exampleInputs.hypothetical!, r).pnl, pnl);
});
test("stream with an invented financial figure is rejected before reaching narrative UI", async () => {
  const originalFetch = globalThis.fetch;
  const names = ["LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL"] as const,
    saved = names.map((n) => process.env[n]);
  process.env.LLM_API_KEY = "synthetic-test-key";
  process.env.LLM_MODEL = "synthetic-test-model";
  process.env.LLM_BASE_URL = "https://provider.invalid";
  globalThis.fetch = async () =>
    new Response(
      "data: " +
        JSON.stringify({
          choices: [
            { delta: { content: "Read the plan.\nYour target is $14" } },
          ],
        }) +
        "\n\n" +
        "data: " +
        JSON.stringify({
          choices: [{ delta: { content: "0.\n" }, finish_reason: "stop" }],
        }) +
        "\n\ndata: [DONE]\n\n",
    );
  try {
    const r = await handle(req(body));
    const events = (await r.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(
      events.find((e) => e.brief).brief.calculations.smaller.target.pnl,
      500,
    );
    assert.ok(!events.some((e) => e.delta?.includes("$14")));
    assert.equal(events.find((e) => e.error).error.code, "NARRATIVE_FIGURES");
    assert.ok(!events.some((e) => e.done));
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((n, j) => {
      if (saved[j] === undefined) delete process.env[n];
      else process.env[n] = saved[j];
    });
  }
});
