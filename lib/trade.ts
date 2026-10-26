import Decimal from "decimal.js";
import { z } from "zod";

const amount = z.number().finite().min(0).max(1e12).nullable();
export const inputSchema = z
  .object({
    asset: z.string().trim().max(180),
    thesis: z.string().max(4000),
    budget: amount,
    loss: amount,
    target: z.number().finite().positive().max(100000).nullable(),
    horizon: z.enum(["1", "3", "6", "date"]),
    date: z.string().max(10),
    resolvedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
    exit: z.enum(["target", "deadline", "help"]),
    fee: z.number().finite().min(0).max(10),
    restrictions: z.string().max(2000),
    context: z.string().max(2000),
    hypothetical: z
      .object({
        reference: z.number().positive().max(1e9),
        strike: z.number().positive().max(1e9),
        premium: z.number().positive().max(1e9),
        units: z.number().positive().max(1e9),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type TradeInputs = z.infer<typeof inputSchema>;
export const emptyInputs: TradeInputs = {
  asset: "",
  thesis: "",
  budget: null,
  loss: null,
  target: null,
  horizon: "6",
  date: "",
  resolvedDate: null,
  exit: "target",
  fee: 0.1,
  restrictions: "",
  context: "",
  hypothetical: null,
};
export const exampleInputs: TradeInputs = {
  ...emptyInputs,
  asset: "Example coin",
  budget: 5000,
  loss: 1000,
  target: 50,
  fee: 0,
  hypothetical: { reference: 100, strike: 120, premium: 10, units: 100 },
};
export const exitLabels = {
  target: "At my target or deadline, whichever comes first",
  deadline: "At my deadline",
  help: "Help me decide",
};
export const noMarket =
  "No verified market data is connected. I can compare scenarios from your inputs, but I cannot verify today’s price, news, or executable instrument quotes.";
const n = (v: Decimal) => v.toDecimalPlaces(8).toNumber();
export function spot(B: number, A: number, r: number, feePercent = 0) {
  if (
    ![B, A, r, feePercent].every(Number.isFinite) ||
    B < 0 ||
    A < 0 ||
    A > B ||
    r < -1 ||
    feePercent < 0 ||
    feePercent > 10
  )
    throw new Error("Invalid scenario");
  const b = new Decimal(B),
    a = new Decimal(A),
    f = new Decimal(feePercent).div(100);
  const exposure = a.div(f.plus(1)),
    value = exposure.mul(new Decimal(r).plus(1)).mul(new Decimal(1).minus(f)),
    pnl = value.minus(a);
  return {
    committed: A,
    exposure: n(exposure),
    entryFee: n(a.minus(exposure)),
    saleValue: n(value),
    pnl: n(pnl),
    cash: n(b.minus(a)),
    final: n(b.plus(pnl)),
    maxLoss: A,
    returnOnCommitted: A ? n(pnl.div(a).mul(100)) : null,
    returnOnBudget: B ? n(pnl.div(b).mul(100)) : null,
  };
}
export function callExpiry(
  q: NonNullable<TradeInputs["hypothetical"]>,
  r: number,
) {
  const end = new Decimal(q.reference).mul(new Decimal(1).plus(r));
  const premium = new Decimal(q.premium).mul(q.units);
  return {
    pnl: n(Decimal.max(end.minus(q.strike), 0).mul(q.units).minus(premium)),
    maxLoss: n(premium),
  };
}
export function calendarDate(months: number, now = new Date()) {
  const year = now.getFullYear(),
    month = now.getMonth() + months;
  const day = Math.min(now.getDate(), new Date(year, month + 1, 0).getDate());
  return `${new Date(year, month, day).getFullYear()}-${String(new Date(year, month, day).getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function validateInputs(i: TradeInputs, now = new Date()) {
  const errors: string[] = [];
  if (i.thesis.length > 4000)
    errors.push("Keep your note under 4,000 characters.");
  if (i.target !== null && (!Number.isFinite(i.target) || i.target <= 0))
    errors.push("Enter a positive target or choose ‘Not sure yet’.");
  if (
    !Number.isFinite(i.fee) ||
    i.fee < 0 ||
    i.fee > 10 ||
    [i.budget, i.loss].some(
      (v) => v !== null && (!Number.isFinite(v) || v < 0 || v > 1e12),
    )
  )
    errors.push("Enter a valid amount.");
  if (!i.asset && !i.thesis.trim())
    errors.push("Describe your idea or enter a coin to begin.");
  if (i.budget !== null && i.budget <= 0)
    errors.push("Enter a budget greater than $0.");
  if (i.loss !== null && i.budget !== null && i.loss > i.budget)
    errors.push(
      "Set a loss budget between $0 and your capital budget, or choose ‘Not sure yet’.",
    );
  if (
    i.horizon === "date" &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(i.date) ||
      isNaN(Date.parse(i.date)) ||
      new Date(i.date + "T23:59:59") <= now ||
      new Date(i.date + "T12:00:00Z").toISOString().slice(0, 10) !== i.date)
  )
    errors.push("Choose a future exit date.");
  return errors;
}
export function calculate(i: TradeInputs) {
  if (!inputSchema.safeParse(i).success || i.budget === null || i.budget <= 0)
    return null;
  const B = i.budget,
    target = (i.target ?? 50) / 100,
    A = i.loss === null ? null : Math.min(B, i.loss);
  return {
    targetIllustrative: i.target === null,
    full: { target: spot(B, B, target, i.fee), drop: spot(B, B, -0.3, i.fee) },
    smaller:
      A === null
        ? null
        : { target: spot(B, A, target, i.fee), drop: spot(B, A, -0.3, i.fee) },
    wait: { pnl: 0, final: B },
    exceedsLoss: i.loss !== null && B > i.loss,
    call:
      i.hypothetical && i.asset === "Example coin"
        ? {
            atExpiry: callExpiry(i.hypothetical, target),
            label:
              "Hypothetical linear USD payoff at expiry only; early-exit value unavailable.",
          }
        : null,
  };
}
export type TradeBrief = {
  inputs: TradeInputs;
  latestExitDate: string;
  calculations: ReturnType<typeof calculate>;
  missing: string[];
  conflicts: string[];
  provenance: {
    inputs: "User inputs" | "Illustrative assumptions";
    thesis: "User belief, unverified";
    market: "Quote unavailable";
    model: "Interpretation only";
  };
  updatedAt: string;
  version: number;
};
export function makeBrief(
  input: TradeInputs,
  version = 1,
  now = new Date(),
  conflicts: string[] = [],
  resolve = false,
): TradeBrief {
  const inputs = {
    ...input,
    hypothetical: input.asset === "Example coin" ? input.hypothetical : null,
  };
  const deadline =
    inputs.horizon === "date"
      ? inputs.date
      : inputs.resolvedDate || calendarDate(Number(inputs.horizon), now);
  if (resolve) inputs.resolvedDate = deadline;
  return {
    inputs,
    latestExitDate: deadline,
    calculations: calculate(inputs),
    missing: [
      ...(!inputs.asset ? ["Which coin are you considering?"] : []),
      ...(inputs.budget === null
        ? ["What capital budget would you like to use?"]
        : []),
      ...(inputs.loss === null
        ? ["What is the most you are willing to lose in USD?"]
        : []),
    ],
    conflicts,
    provenance: {
      inputs: inputs.hypothetical ? "Illustrative assumptions" : "User inputs",
      thesis: "User belief, unverified",
      market: "Quote unavailable",
      model: "Interpretation only",
    },
    updatedAt: now.toISOString(),
    version,
  };
}
const numberText = "([\\d,]+(?:\\.\\d+)?)";
function matchNumber(text: string, pattern: string) {
  const v = text.match(new RegExp(pattern, "i"))?.[1];
  return v ? Number(v.replaceAll(",", "")) : undefined;
}
export function extractExplicit(text: string): Partial<TradeInputs> {
  const patch: Partial<TradeInputs> = {};
  if (/\b(?:not|never|don.t|cannot|can.t|unless|maybe|perhaps)\b/i.test(text))
    return patch;
  const budget = matchNumber(
    text,
    `(?:(?<!loss )budget(?: is| of| to)?|buy|invest|commit|spend)\\s*\\$${numberText}`,
  );
  const loss = matchNumber(
    text,
    `(?:I(?: am|[’']m)(?: only)? willing to lose|I (?:can|will|would) (?:lose|risk)(?: up to)?|my loss (?:budget|limit)(?: is| of| to)?|(?:set|change|increase|raise|lower|reduce|update) (?:my )?loss (?:budget|limit)(?: is| of| to)?|^loss (?:budget|limit)(?: is| of| to)?)\\s*\\$${numberText}`,
  );
  const target = matchNumber(
    text,
    `(?:rises?|rise only|rises only|rise by|rises by|upside(?: is| of| to)?|target(?: is| of| to)?)\\s*${numberText}\\s*%`,
  );
  const asset = text.match(/\b(BTC|ETH|SOL)\b/i)?.[1];
  if (budget !== undefined) patch.budget = budget;
  if (loss !== undefined) patch.loss = loss;
  if (target !== undefined && target > 0) patch.target = target;
  if (asset) patch.asset = asset.toUpperCase();
  const months = text
    .match(/\b(?:within|in|for) (1|3|6|one|three|six) months?\b/i)?.[1]
    ?.toLowerCase();
  if (months) {
    patch.horizon = ({ one: "1", three: "3", six: "6" }[months] ??
      months) as TradeInputs["horizon"];
    patch.resolvedDate = null;
  }
  return patch;
}
export function reconcile(i: TradeInputs) {
  const found = extractExplicit(i.thesis),
    next = { ...i },
    conflicts: string[] = [];
  for (const [key, value] of Object.entries(found)) {
    const k = key as keyof TradeInputs;
    if (k === "resolvedDate") continue;
    if (k === "horizon") {
      if (i.horizon !== value)
        conflicts.push(
          `Latest exit: form says ${i.horizon === "date" ? i.date : i.horizon + " months"}; your idea says ${value} months.`,
        );
      continue;
    }
    if (i[k] === null || i[k] === "") Object.assign(next, { [k]: value });
    else if (i[k] !== value)
      conflicts.push(`${key}: form says ${i[k]}; your idea says ${value}.`);
  }
  return { inputs: next, conflicts };
}
export const money = (v: number, signed = false) =>
  `${signed && v > 0 ? "+" : v < 0 ? "−" : ""}${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.abs(v))}`;
