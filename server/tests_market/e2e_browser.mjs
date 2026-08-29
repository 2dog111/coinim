import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "/Users/sergeiriazanov/.local/share/desktop-browser-qa/runtime/node_modules/playwright/index.mjs";

const baseURL = process.env.COIN_MARKET_E2E_URL || "http://127.0.0.1:8782";
const outputDir = process.env.COIN_MARKET_E2E_OUTPUT || path.resolve("qa-screens/wall-e2e");
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];
const httpErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`));
page.on("response", (response) => {
  if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
});

await page.goto(baseURL, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Every word on this page was paid for." }).waitFor();

const snapshot = await page.evaluate(() => ({
  slots: document.querySelectorAll("main .slot").length,
  prices: [...document.querySelectorAll("[data-current-price]")].map((node) => node.textContent?.trim()),
  siteHref: document.querySelector(".site .card-hit")?.getAttribute("href"),
  socialHref: document.querySelector(".social .card-hit")?.getAttribute("href"),
  outbidHrefs: [...document.querySelectorAll("[data-outbid]")].map((node) => node.getAttribute("href")),
  messageTag: document.querySelector(".message > .block")?.tagName,
  bodyBackground: getComputedStyle(document.body).backgroundColor,
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  imagesLoaded: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  maxWeight: Math.max(...[...document.querySelectorAll("body *")].map((node) => Number(getComputedStyle(node).fontWeight) || 400)),
  minFontSize: Math.min(...[...document.querySelectorAll("body *")].filter((node) => node.textContent?.trim()).map((node) => parseFloat(getComputedStyle(node).fontSize))),
  forbiddenCopy: document.body.textContent.includes(["open", "slot"].join(" ")) || document.body.textContent.includes(["Claim", "slot"].join(" ")),
}));

if (snapshot.slots !== 3) throw new Error(`expected three slots, got ${snapshot.slots}`);
if (JSON.stringify(snapshot.prices) !== JSON.stringify(["14", "12", "10"])) throw new Error(`wrong prices: ${JSON.stringify(snapshot.prices)}`);
if (snapshot.siteHref !== "https://www.pen.dev/") throw new Error(`wrong pen.dev href: ${snapshot.siteHref}`);
if (snapshot.socialHref !== "https://x.com/midnightdrafter") throw new Error(`wrong X href: ${snapshot.socialHref}`);
if (JSON.stringify(snapshot.outbidHrefs) !== JSON.stringify(["/takeover?slot=1&amount=15", "/takeover?slot=2&amount=13", "/takeover?slot=3&amount=11"])) throw new Error(`wrong outbid links: ${JSON.stringify(snapshot.outbidHrefs)}`);
if (snapshot.messageTag !== "DIV") throw new Error(`wrong message block: ${JSON.stringify(snapshot)}`);
if (snapshot.bodyBackground !== "rgb(250, 249, 246)") throw new Error(`wrong page background: ${snapshot.bodyBackground}`);
if (snapshot.scrollWidth > snapshot.clientWidth) throw new Error(`horizontal overflow ${snapshot.scrollWidth} > ${snapshot.clientWidth}`);
if (!snapshot.imagesLoaded) throw new Error("one or more page images failed to load");
if (snapshot.maxWeight > 500) throw new Error(`font weight above 500: ${snapshot.maxWeight}`);
if (snapshot.minFontSize < 16) throw new Error(`font size below 16px: ${snapshot.minFontSize}`);
if (snapshot.forbiddenCopy) throw new Error("a removed fourth-slot phrase is still visible");

await page.getByText("Design on a canvas, ship it as code.").waitFor();
await page.getByText("@midnightdrafter", { exact: false }).waitFor();
await page.getByText("On silence.").waitFor();
await page.getByRole("link", { name: "Outbid website · 15 USDT" }).waitFor();
await page.getByRole("heading", { name: "How to take a place on coin.im" }).waitFor();
await page.screenshot({ path: path.join(outputDir, "wall-390.png"), fullPage: true });
await page.getByRole("link", { name: "Outbid website · 15 USDT" }).click();
await page.waitForURL(/\/takeover\?slot=1&amount=15$/);
await page.getByRole("heading", { name: "Replace slot № 1 with your website." }).waitFor();
await page.getByLabel("Website headline").waitFor();
await page.getByLabel("Website description").waitFor();
await page.getByLabel("Website URL").waitFor();
await page.getByRole("button", { name: "Create private payment receipt" }).waitFor();
if (await page.locator("form[data-wall-slot='1'] input[name='customAmount']").inputValue() !== "15") throw new Error("slot one amount was not prefilled");
await page.screenshot({ path: path.join(outputDir, "outbid-slot-1-390.png"), fullPage: true });

const report = {
  ok: consoleErrors.length === 0 && pageErrors.length === 0 && requestFailures.length === 0 && httpErrors.length === 0,
  browser: "chromium",
  browserVersion: browser.version(),
  viewport: { width: 390, height: 844 },
  consoleErrors,
  pageErrors,
  requestFailures,
  httpErrors,
};
await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
await browser.close();
if (!report.ok) throw new Error(JSON.stringify(report));
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
