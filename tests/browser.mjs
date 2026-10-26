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
for (const width of [360, 390, 430, 768, 1440]) {
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
  assert.equal(await page.locator("main>section").count(), 3);
  assert.equal(
    await page.locator("dialog.chat").evaluate((d) => d.open),
    false,
  );
  assert.equal(await page.locator("#idea").inputValue(), "");
  assert.equal(await page.locator("#horizon").inputValue(), "6");
  const form = page.locator("#trade-form"),
    ask = page.locator("nav").getByRole("button", { name: "Ask a question" });
  await page.locator("#asset").fill("ETH");
  await page.locator("#budget").fill("2500");
  await page.locator("#loss").fill("500");
  for (const [label, spot, call] of [
    ["+50%", "+$500", "+$2,000"],
    ["+20%", "+$200", "−$1,000"],
    ["No change", "$0", "−$1,000"],
    ["−30%", "−$300", "−$1,000"],
  ]) {
    await page.getByRole("radio", { name: label, exact: true }).check();
    const cells = page.locator("#example tbody tr");
    assert.equal(await cells.nth(0).locator("td").first().innerText(), spot);
    assert.equal(await cells.nth(1).locator("td").first().innerText(), call);
    assert.equal(await page.locator("#budget").inputValue(), "2500");
    assert.equal(await page.locator("#asset").inputValue(), "ETH");
  }
  await page.getByRole("radio", { name: "+20%", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("radio", { name: "No change", exact: true })
      .isChecked(),
    true,
  );
  await page.getByRole("radio", { name: "+20%", exact: true }).check();
  await page
    .locator("#exit-plan")
    .getByRole("button", { name: "Build my trade plan" })
    .click();
  assert.equal(
    await page.locator("#idea").evaluate((e) => e === document.activeElement),
    true,
  );
  assert.equal(await page.locator("#budget").inputValue(), "2500");
  await page
    .getByRole("button", { name: "Load the worked example", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep my inputs", exact: true })
    .click();
  assert.equal(await page.locator("#budget").inputValue(), "2500");
  await page
    .getByRole("button", { name: "Load the worked example", exact: true })
    .click();
  await page.getByRole("button", { name: "Load example", exact: true }).click();
  assert.equal(await page.locator("#budget").inputValue(), "5000");
  assert.equal(await page.locator("#committed").inputValue(), "1000");
  await page
    .getByText(
      "Putting the full $5,000 into spot could lose more than your $1,000 limit.",
      { exact: true },
    )
    .waitFor();
  await page.locator("#asset").fill("SOL");
  assert.equal(
    await page.getByText("Hypothetical example", { exact: true }).count(),
    0,
  );
  await ask.click();
  await page.waitForFunction(
    () => document.activeElement?.id === "chat-message",
  );
  assert.equal(
    await page
      .locator("#chat-message")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("dialog.chat").evaluate((d) => d.open),
    false,
  );
  assert.equal(await ask.evaluate((e) => e === document.activeElement), true);
  await page.route("**/api/analyze", (r) =>
    r.fulfill({
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
  await form.getByRole("button", { name: "Build my trade plan" }).click();
  await page
    .getByText(
      "The scenario calculator is ready. AI chat is not configured on this deployment yet.",
    )
    .waitFor();
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
  await page.getByRole("button", { name: "Reset conversation" }).click();
  await page.getByRole("button", { name: "Keep it", exact: true }).click();
  assert.equal(await page.locator("#budget").inputValue(), "5000");
  await page.getByRole("button", { name: "Reset conversation" }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("button", { name: "Edit trade brief" }).click();
  assert.equal(await page.locator("#budget").inputValue(), "");
  await page.locator("#idea").fill("I want to understand SOL trade-offs.");
  await page.locator("#idea").press("Enter");
  assert.ok((await page.locator("#idea").inputValue()).includes("\n"));
  await form.getByRole("button", { name: "Build my trade plan" }).click();
  await page
    .getByText(
      "The scenario calculator is ready. AI chat is not configured on this deployment yet.",
    )
    .waitFor();
  await page.getByRole("button", { name: "Close chat" }).click();
  await page.unroute("**/api/analyze");
  await page.getByRole("button", { name: "Load the worked example" }).click();
  await page.getByRole("button", { name: "Load example", exact: true }).click();
  await page.locator("#idea").fill("I want to buy $9,000 of SOL.");
  await form.getByRole("button", { name: "Build my trade plan" }).click();
  await page
    .getByText(/Your idea and form use different assumptions/)
    .waitFor();
  assert.equal(await page.locator("#budget").inputValue(), "5000");
  await page.getByRole("button", { name: "Close chat" }).click();
  await page.locator("#idea").fill("");
  await ask.click();
  await page.route("**/api/chat", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      await r.fulfill({
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
  await page.unroute("**/api/chat");
  // A late response to an old request must not replace edited assumptions.
  await page.route("**/api/chat", async (r) => {
    const body = r.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      await r.fulfill({
        contentType: "application/x-ndjson",
        body:
          JSON.stringify({
            brief: {
              inputs: { ...body.inputs, target: 99 },
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
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Edit trade brief" }).click();
  await page.locator("#target").fill("25");
  await page.waitForTimeout(1700);
  assert.equal(await page.locator("#target").inputValue(), "25");
  await ask.click();
  await page
    .getByText(
      "Your inputs changed. Update the plan to use the new assumptions.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await page.getByText("Old response", { exact: true }).count(),
    0,
  );
  await page.unroute("**/api/chat");
  await page.locator(".chat-scroll").evaluate((e) => (e.scrollTop = 0));
  await page.screenshot({ path: `qa-artifacts/v2-panel-${width}.png` });
  if (width === 390) {
    await page.setViewportSize({ width, height: 420 });
    await page.locator("#chat-message").focus();
    await page.waitForTimeout(200);
    const box = await page.locator(".composer").boundingBox();
    assert.ok(box && box.y + box.height <= 421);
    await page.setViewportSize({ width, height: 844 });
  }
  await page.getByRole("button", { name: "Close chat" }).click();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: `qa-artifacts/v2-home-${width}.png`,
    fullPage: true,
  });
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
  "qa-artifacts/v2-browser-report.json",
  JSON.stringify({ browser: browser.version(), base, report }, null, 2),
);
await browser.close();
console.log(JSON.stringify(report));
assert.ok(report.every((r) => r.errors.length === 0));
