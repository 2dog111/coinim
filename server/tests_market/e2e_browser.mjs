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

await page.goto(`${baseURL}/message`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Каждое слово здесь куплено." }).waitFor();

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
  publishHref: document.querySelector(".publish-cta")?.getAttribute("href"),
}));

if (snapshot.slots !== 3) throw new Error(`expected three slots, got ${snapshot.slots}`);
if (JSON.stringify(snapshot.prices) !== JSON.stringify(["14", "12", "10"])) throw new Error(`wrong prices: ${JSON.stringify(snapshot.prices)}`);
if (snapshot.siteHref !== "https://coin.im/") throw new Error(`wrong coin.im href: ${snapshot.siteHref}`);
if (snapshot.socialHref !== "https://www.instagram.com/adrieves19/") throw new Error(`wrong Instagram href: ${snapshot.socialHref}`);
if (JSON.stringify(snapshot.outbidHrefs) !== JSON.stringify(["/takeover?slot=1&amount=15", "/takeover?slot=2&amount=13", "/takeover?slot=3&amount=11"])) throw new Error(`wrong outbid links: ${JSON.stringify(snapshot.outbidHrefs)}`);
if (snapshot.messageTag !== "DIV") throw new Error(`wrong message block: ${JSON.stringify(snapshot)}`);
if (snapshot.bodyBackground !== "rgb(250, 249, 246)") throw new Error(`wrong page background: ${snapshot.bodyBackground}`);
if (snapshot.scrollWidth > snapshot.clientWidth) throw new Error(`horizontal overflow ${snapshot.scrollWidth} > ${snapshot.clientWidth}`);
if (!snapshot.imagesLoaded) throw new Error("one or more page images failed to load");
if (snapshot.maxWeight > 500) throw new Error(`font weight above 500: ${snapshot.maxWeight}`);
if (snapshot.minFontSize < 16) throw new Error(`font size below 16px: ${snapshot.minFontSize}`);
if (snapshot.forbiddenCopy) throw new Error("a removed fourth-slot phrase is still visible");
if (snapshot.publishHref !== "/takeover") throw new Error(`wrong publish href: ${snapshot.publishHref}`);

await page.getByText("Coin.im не доска объявлений.", { exact: false }).waitFor();
await page.getByRole("heading", { name: /@adrieves19/ }).waitFor();
await page.getByRole("heading", { name: "Просто сообщение" }).waitFor();
await page.getByRole("link", { name: "Занять место: сайт · 15 USDT" }).waitFor();
await page.getByRole("link", { name: /Website · Social · Message/ }).waitFor();
await page.getByRole("heading", { name: "Поставь свои слова здесь." }).waitFor();
await page.screenshot({ path: path.join(outputDir, "wall-390.png"), fullPage: true });
await page.getByRole("link", { name: /Website · Social · Message/ }).click();
await page.waitForURL(/\/takeover$/);
await page.getByRole("heading", { name: "Put your words here." }).waitFor();
await page.getByLabel("Your message").waitFor();
if (await page.locator("form[data-wall-slot='3'] input[name='url']").count()) throw new Error("plain message exposed a URL field");
if (await page.locator("form[data-wall-slot='3'] input[name='signature']").count()) throw new Error("plain message exposed a name field");
await page.getByRole("link", { name: /Website.*15 USDT/ }).click();
await page.waitForURL(/\/takeover\?slot=1$/);
await page.getByRole("heading", { name: "Put your website here." }).waitFor();
await page.getByLabel("Website text").waitFor();
await page.getByLabel("Website link").waitFor();
await page.getByText("The title, favicon and a fresh first-screen screenshot are added automatically.").waitFor();
if (await page.locator("input[type='file']").count()) throw new Error("website form still exposes a screenshot upload");
if (await page.locator("input[name='signature']").count()) throw new Error("website form still exposes a headline field");
await page.getByRole("button", { name: /Continue to payment.*15 USDT/ }).waitFor();
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
