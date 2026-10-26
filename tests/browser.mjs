import { chromium } from "/Users/sergeiriazanov/.local/share/desktop-browser-qa/runtime/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.QA_URL || "http://127.0.0.1:3216";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Users/sergeiriazanov/.local/share/desktop-browser-qa/browsers/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
});
const report = [];
await fs.mkdir("qa-artifacts", { recursive: true });
for (const width of [1440, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: width === 1440 ? 900 : 844 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text() + " " + m.location().url);
  });
  await page.goto(base);
  await page
    .getByRole("heading", {
      name: "You picked the coin. Now choose the trade.",
    })
    .waitFor();
  assert.equal(await page.locator("main > section").count(), 2);
  assert.equal(await page.locator("dialog").evaluate((d) => d.open), false);
  await page.screenshot({
    path: `qa-artifacts/home-${width}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Try the worked example" }).click();
  await page.locator("#budget").evaluate((e) => {
    if (e.value !== "5000") throw Error("Example did not load");
  });
  assert.equal(await page.locator("#loss").inputValue(), "1000");
  await page
    .getByText(
      "The full-size spot position can lose more than your stated limit.",
    )
    .first()
    .waitFor();
  await page.locator("#asset").fill("SOL");
  assert.equal(
    await page.getByText("Hypothetical example", { exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Ask a question" }).click();
  await page.locator("#chat-message").waitFor();
  assert.equal(
    await page
      .locator("#chat-message")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").evaluate((d) => d.open), false);
  assert.equal(
    await page
      .getByRole("button", { name: "Ask a question" })
      .evaluate((e) => e === document.activeElement),
    true,
  );
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
  await page.getByRole("button", { name: "Build my trade plan" }).click();
  await page
    .getByText(
      "The scenario calculator is ready. AI chat is not configured on this deployment yet.",
    )
    .waitFor();
  await page.getByRole("button", { name: "Copy plan", exact: true }).click();
  await page.getByText("Plan copied.", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Reset conversation", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep it", exact: true }).click();
  assert.equal(await page.locator("#budget").inputValue(), "5000");
  await page
    .getByRole("button", { name: "Reset conversation", exact: true })
    .click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit trade brief", exact: true })
    .click();
  assert.equal(await page.locator("#budget").inputValue(), "");
  await page.locator("#idea").fill("I want to understand SOL trade-offs.");
  await page.locator("#idea").press("Enter");
  assert.ok((await page.locator("#idea").inputValue()).includes("\n"));
  await page.getByRole("button", { name: "Build my trade plan" }).click();
  await page
    .getByText(
      "The scenario calculator is ready. AI chat is not configured on this deployment yet.",
    )
    .waitFor();
  await page.screenshot({ path: `qa-artifacts/chat-${width}.png` });
  await page.getByRole("button", { name: "Close chat" }).click();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.unroute("**/api/analyze");
  await page.getByRole("button", { name: "Try the worked example" }).click();
  await page.locator("#idea").fill("I want to buy $9,000 of SOL.");
  await page.getByRole("button", { name: "Build my trade plan" }).click();
  await page
    .getByText(/Your idea and form use different assumptions/)
    .waitFor();
  assert.equal(await page.locator("#budget").inputValue(), "5000");
  await page.getByRole("button", { name: "Close chat" }).click();
  await page.locator("#idea").fill("");
  await page.getByRole("button", { name: "Ask about this trade" }).click();
  await page.route("**/api/chat", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            message: "Connection interrupted. Your inputs are still here.",
          },
        }),
      });
    } catch {}
  });
  await page.locator("#chat-message").fill("Please review this.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page
    .getByText("Generation stopped. Your inputs are still here.")
    .waitFor();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page
    .getByText("Connection interrupted. Your inputs are still here.", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "Close chat" }).click();
  report.push({
    width,
    errors: errors.filter(
      (e) =>
        !e.includes("503") && !e.includes("502") && !e.includes("ERR_FAILED"),
    ),
    passed: true,
  });
  await context.close();
}
await fs.writeFile(
  "qa-artifacts/browser-report.json",
  JSON.stringify({ browser: browser.version(), base, report }, null, 2),
);
await browser.close();
console.log(JSON.stringify(report));
assert.ok(report.every((r) => r.errors.length === 0));
