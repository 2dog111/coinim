import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInsights, recordBrowserSignal, recordPageVisit } from "../lib/insights";

test("traffic signals are deduplicated, separate from requests and ignore known bots", async () => {
  const dir = await mkdtemp(join(tmpdir(), "coin-insights-"));
  process.env.INSIGHTS_DATA_DIR = dir;
  process.env.INSIGHTS_HASH_KEY = "a".repeat(64);
  const cookies = { get: () => ({ value: "b".repeat(32) }) };
  const browser = new Headers({ accept: "text/html", "user-agent": "Mozilla/5.0" });
  const bot = new Headers({ accept: "text/html", "user-agent": "ExampleBot/1.0" });
  try {
    await recordPageVisit(browser, cookies);
    await recordPageVisit(bot, cookies);
    await recordBrowserSignal(browser, cookies, "js");
    await recordBrowserSignal(browser, cookies, "js");
    await recordBrowserSignal(browser, cookies, "active");
    await recordBrowserSignal(bot, cookies, "active");
    const data = await readInsights("24h");
    assert.deepEqual([data.visitors, data.pageViews, data.botVisits, data.jsVisitors, data.activeVisitors], [1, 1, 1, 1, 1]);
  } finally {
    delete process.env.INSIGHTS_DATA_DIR;
    delete process.env.INSIGHTS_HASH_KEY;
    await rm(dir, { recursive: true, force: true });
  }
});
