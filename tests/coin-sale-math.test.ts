import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUsdt, quoteRaw, formatRaw, sharePercent } from "../lib/coin-sale";
test("fixed sale conversion is exact through the smallest USDT unit", () => {
  for (const [input, coin, percent] of [
    ["1","0.000001","0.0001%"],["10","0.00001","0.001%"],["50","0.00005","0.005%"],
    ["100","0.0001","0.01%"],["500","0.0005","0.05%"],["1000","0.001","0.1%"],
    ["10000","0.01","1%"],["1000000","1","100%"],["0.0001","0.0000000001","0.00000001%"],
    ["0.000001","0.000000000001","0.0000000001%"],
  ]) { const raw = parseUsdt(input)!; assert.equal(formatRaw(quoteRaw(raw),18),coin);assert.equal(sharePercent(quoteRaw(raw)),percent); }
  for (const bad of ["", "-1", "1.0000001", "1e3", "1,000"]) assert.equal(parseUsdt(bad),null);
});
