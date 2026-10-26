import { chromium } from "/Users/sergeiriazanov/.local/share/desktop-browser-qa/runtime/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.QA_URL || "http://127.0.0.1:3216";
const widths = process.env.QA_WIDTHS
  ? process.env.QA_WIDTHS.split(",").map(Number)
  : [360, 390, 430, 768, 1440];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Users/sergeiriazanov/.local/share/desktop-browser-qa/browsers/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
});
const report = [];
await fs.mkdir("qa-artifacts", { recursive: true });

for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: width === 1440 ? 900 : 844 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [];
  const aiRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error")
      errors.push(`${message.text()} ${message.location().url}`);
  });
  page.on("request", (request) => {
    if (/\/api\/(?:analyze|chat)$/.test(request.url()))
      aiRequests.push(request.url());
  });

  await page.goto(base);
  await page
    .getByRole("heading", {
      name: "Ask about a crypto trade.",
    })
    .waitFor();
  assert.equal(
    await page.title(),
    "Ask about a crypto trade — coin.im",
  );
  assert.equal(await page.locator("main > section").count(), 3);
  assert.equal(await page.locator("#idea").inputValue(), "");
  await page.getByRole("button", { name: "I have $5,000 for SOL" }).click();
  assert.equal(await page.locator("#idea").inputValue(), "I have $5,000 for SOL");
  await page.locator("#idea").fill("");
  for (const selector of ["#budget", "#budget-range", "#loss-exact", "#loss-range", "#horizon-options", "#exit-date", "#asset"])
    assert.equal(await page.locator(selector).isVisible(), true, selector);
  assert.equal(await page.locator("#trade-form details").count(), 0);
  assert.equal(await page.locator("#loss-range").isEnabled(), true);
  await page.locator("#loss-range").focus();
  await page.locator("#loss-range").press("ArrowRight");
  assert.equal(await page.locator("#loss-exact").inputValue(), "1");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  assert.equal(await page.locator("#loss-exact").inputValue(), "");
  if (width === 390) {
    const primary = await page
      .locator("#trade-form .primary-action")
      .boundingBox();
    assert.ok(primary && primary.y + primary.height <= 844);
  }

  await page.locator("#budget-range").focus();
  await page.locator("#budget-range").press("ArrowRight");
  assert.equal(await page.locator("#budget").inputValue(), "200");
  await page.locator("#budget").fill("$5,000");
  assert.equal(await page.locator("#budget").inputValue(), "$5,000");
  assert.equal(await page.locator("#budget-panel").isVisible(), true);
  assert.equal(await page.locator("#loss-panel").isVisible(), true);
  assert.equal(await page.locator("#loss-exact").inputValue(), "");
  await page.locator("#loss-exact").fill("1000");
  assert.equal(await page.locator("#loss-range").inputValue(), "1000");
  await page.locator("#loss-exact").fill("");
  assert.equal(await page.locator("#loss-panel").isVisible(), true);
  assert.equal(await page.locator("#loss-exact").inputValue(), "");
  await page.locator("#loss-exact").fill("1000");
  await page.locator("#budget").fill("500");
  await page
    .getByText(
      "Your budget is below the current loss limit. Edit the limit explicitly.",
    )
    .waitFor();
  assert.equal(await page.locator("#loss-exact").inputValue(), "1000");
  await page.locator("#budget").fill("5000");

  await page.locator("#exit-date").fill("2027-02-20");
  assert.equal(await page.getByRole("button", { name: "Choose a date" }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "3 months" }).click();
  assert.equal(await page.locator("#exit-date").inputValue(), "");
  assert.equal(
    await page.getByRole("button", { name: "3 months" }).getAttribute("aria-pressed"),
    "true",
  );

  await page.locator("#idea").fill("I want to buy SOL within three months.");
  await page.locator("#asset").fill("SOL");
  const realBudgetBefore = await page.locator("#budget").inputValue();
  const requestsBeforeScenario = aiRequests.length;
  for (const [label, spot, call] of [
    ["+50%", "+$500", "+$2,000"],
    ["+20%", "+$200", "−$1,000"],
    ["No change", "$0", "−$1,000"],
    ["−30%", "−$300", "−$1,000"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const rows = page.locator(".outcome-row");
    assert.equal(await rows.nth(0).locator("b").innerText(), spot);
    assert.equal(await rows.nth(1).locator("b").innerText(), call);
    assert.equal(await page.locator("#budget").inputValue(), realBudgetBefore);
  }
  assert.equal(aiRequests.length, requestsBeforeScenario);
  await page.locator("#scenario-exact").fill("");
  assert.equal(await page.locator("#scenario-exact").inputValue(), "");
  await page.locator("#scenario-exact").fill("35");
  await page.locator("#scenario-exact").blur();
  assert.equal(await page.locator("#scenario-range").inputValue(), "35");
  assert.equal(aiRequests.length, requestsBeforeScenario);

  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "NOT_CONFIGURED",
          message:
            "The scenario calculator is ready. AI chat is not configured on this deployment yet.",
        },
      }),
    }),
  );
  await page.locator("#trade-form .primary-action").click();
  await page
    .getByRole("heading", { name: "Your trade, explained." })
    .waitFor();
  assert.equal(await page.locator("#start").count(), 0);
  assert.equal(await page.locator("dialog.chat").count(), 0);
  const workspaceWidth = await page.locator(".workspace-width").evaluate((node) =>
    Math.round(node.getBoundingClientRect().width),
  );
  assert.ok(workspaceWidth <= 820);
  await page
    .getByText(
      "The scenario calculator is ready. AI chat is not configured on this deployment yet.",
    )
    .waitFor();
  assert.equal(
    await page.locator("#chat-message").evaluate((node) => node === document.activeElement),
    true,
  );
  await page.getByRole("button", { name: "Copy plan", exact: true }).click();
  await page.getByText("Plan copied.", { exact: true }).waitFor();
  const snapshot = await page.evaluate(() => navigator.clipboard.readText());
  for (const part of [
    "Asset: SOL",
    "Loss limit: $1,000",
    "Data provenance: User inputs",
    "Market evidence: Not verified",
    "Your exit plan",
    "Snapshot:",
  ])
    assert.ok(snapshot.includes(part), part);
  assert.ok(!snapshot.includes("assistant:"));
  await page.getByRole("button", { name: "Edit trade", exact: true }).click();
  assert.equal(await page.locator("#idea").inputValue(), "I want to buy SOL within three months.");
  assert.equal(await page.locator("#budget").inputValue(), "5,000");
  await page.unroute("**/api/analyze");

  await page.getByRole("button", { name: "Try an example", exact: true }).click();
  await page
    .getByRole("button", { name: "Keep my inputs", exact: true })
    .click();
  assert.equal(await page.locator("#asset").inputValue(), "SOL");
  await page.getByRole("button", { name: "Try an example", exact: true }).click();
  await page.getByRole("button", { name: "Load example", exact: true }).click();
  assert.equal(await page.locator("#budget").inputValue(), "5,000");
  assert.equal(await page.locator("#loss-exact").inputValue(), "1,000");
  assert.equal(await page.locator("#committed").inputValue(), "1,000");
  assert.equal(await page.locator("#asset").isVisible(), true);
  await page.locator("#asset").fill("ETH");
  assert.equal(
    await page.locator(".scenario-card .source-tag").count(),
    1,
  );

  await page.getByRole("button", { name: /Back to conversation/ }).click();
  await page.route("**/api/chat", async (route) => {
    const body = route.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 1400));
    try {
      await route.fulfill({
        contentType: "application/x-ndjson",
        body:
          JSON.stringify({
            brief: {
              ...body,
              inputs: { ...body.inputs, target: 99 },
              latestExitDate: "2027-04-26",
              calculations: null,
              missing: [],
              conflicts: [],
              provenance: {
                inputs: "User inputs",
                thesis: "User belief, unverified",
                market: "Quote unavailable",
                model: "Interpretation only",
              },
              updatedAt: new Date().toISOString(),
              version: body.version + 1,
            },
          }) +
          "\n" +
          JSON.stringify({ delta: "Old response" }) +
          "\n" +
          JSON.stringify({ done: true }) +
          "\n",
      });
    } catch {}
  });
  await page.locator("#chat-message").fill("Explain my plan.");
  const pendingChat = page.waitForRequest("**/api/chat");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await pendingChat;
  await page.getByRole("button", { name: "Edit trade" }).click();
  await page.waitForFunction(() => document.activeElement?.id === "idea");
  await page.locator("#target").fill("25");
  await page.waitForTimeout(1600);
  assert.equal(await page.locator("#target").inputValue(), "25");
  await page.getByRole("button", { name: /Back to conversation/ }).click();
  await page
    .getByText("Inputs changed. Update the analysis.", { exact: true })
    .waitFor();
  assert.equal(await page.getByText("Old response", { exact: true }).count(), 0);
  await page.unroute("**/api/chat");

  await page.screenshot({
    path: `qa-artifacts/v5-workspace-${width}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "coin.im home" }).click();
  await page.screenshot({
    path: `qa-artifacts/v5-home-${width}.png`,
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  report.push({
    width,
    errors: errors.filter(
      (entry) =>
        !entry.includes("503") &&
        !entry.includes("502") &&
        !entry.includes("ERR_FAILED"),
    ),
    passed: true,
  });
  await context.close();
}

await fs.writeFile(
  "qa-artifacts/v5-browser-report.json",
  JSON.stringify({ browser: browser.version(), base, report }, null, 2),
);
await browser.close();
console.log(JSON.stringify(report));
assert.ok(report.every((entry) => entry.errors.length === 0));
