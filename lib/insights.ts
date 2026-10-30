import { createHmac } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const cookieName = "coin_visit";
const botPattern = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|preview|facebookexternalhit|telegrambot|whatsapp|skypeuripreview|discordbot|twitterbot|linkedinbot|embedly|quora link|vkshare|curl\/|wget\/|python-requests|go-http-client|axios\/|node-fetch/i;
type HourBucket = { hour: number; visitors: Record<string, string>; pageViews: number; botVisits: number };
type Store = { hours: HourBucket[] };
type CookieStore = { get(name: string): { value: string } | undefined };

function dataFile() {
  return join(process.env.INSIGHTS_DATA_DIR || "/var/lib/coin-im-planner", "insights.json");
}

function visitorHash(cookies: CookieStore) {
  const id = cookies.get(cookieName)?.value || "";
  const key = process.env.INSIGHTS_HASH_KEY || process.env.INSIGHTS_SECRET || "";
  if (!/^[a-f0-9]{32}$/.test(id) || key.length < 32) return null;
  return createHmac("sha256", key).update(id).digest("hex");
}

async function load(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(dataFile(), "utf8")) as Store;
    return { hours: Array.isArray(parsed.hours) ? parsed.hours : [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { hours: [] };
    throw error;
  }
}

let writeQueue = Promise.resolve();
async function record(visit: { at: number; visitor: string; country: string; bot: boolean }) {
  const next = writeQueue.then(async () => {
    const store = await load();
    const cutoff = Date.now() - 31 * 86_400_000;
    store.hours = store.hours.filter((row) => row.hour >= cutoff);
    const hour = Math.floor(visit.at / 3_600_000) * 3_600_000;
    let bucket = store.hours.find((row) => row.hour === hour);
    if (!bucket) {
      bucket = { hour, visitors: {}, pageViews: 0, botVisits: 0 };
      store.hours.push(bucket);
    }
    if (visit.bot) bucket.botVisits++;
    else {
      bucket.pageViews++;
      if (!bucket.visitors[visit.visitor] || bucket.visitors[visit.visitor] === "Unknown")
        bucket.visitors[visit.visitor] = visit.country;
    }
    await mkdir(dirname(dataFile()), { recursive: true, mode: 0o700 });
    const temporary = `${dataFile()}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(store), { mode: 0o600 });
    await rename(temporary, dataFile());
  });
  writeQueue = next.catch(() => {});
  await next;
}

function validCountry(value: unknown): string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) && value !== "XX" ? value : "Unknown";
}

const countryCache = new Map<string, { country: string; until: number }>();
async function countryFor(headers: Headers): Promise<string> {
  const ip = headers.get("x-real-ip")?.trim() || "";
  if (!ip || ip === "127.0.0.1" || ip === "::1") return "Unknown";
  const key = process.env.INSIGHTS_HASH_KEY || process.env.INSIGHTS_SECRET || "";
  const cacheKey = createHmac("sha256", key).update(ip).digest("hex");
  const cached = countryCache.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.country;
  try {
    const response = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(900),
      cache: "no-store",
    });
    if (!response.ok) return "Unknown";
    const body = (await response.json()) as { country?: unknown };
    const country = validCountry(body.country);
    if (countryCache.size > 10_000) countryCache.clear();
    countryCache.set(cacheKey, { country, until: Date.now() + 6 * 60 * 60 * 1000 });
    return country;
  } catch {
    return "Unknown";
  }
}

export async function recordPageVisit(headers: Headers, cookies: CookieStore) {
  if (!headers.get("accept")?.includes("text/html")) return;
  const ua = headers.get("user-agent") || "";
  const visitor = visitorHash(cookies);
  if (!visitor) return;
  const bot = !ua || botPattern.test(ua);
  const country = bot ? "Unknown" : await countryFor(headers);
  try {
    await record({ at: Date.now(), visitor, country, bot });
  } catch {
    console.error("Insights storage is unavailable.");
  }
}

export async function readInsights(period: "24h" | "7d" | "30d") {
  const store = await load();
  const since = Date.now() - ({ "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000 }[period]);
  const rows = store.hours.filter((row) => row.hour >= since);
  const visitors = new Map<string, string>();
  for (const row of rows) for (const [visitor, country] of Object.entries(row.visitors)) {
    if (!visitors.has(visitor) || visitors.get(visitor) === "Unknown") visitors.set(visitor, country);
  }
  const countries = new Map<string, Set<string>>();
  for (const [visitor, country] of visitors) {
    if (country === "Unknown") continue;
    const set = countries.get(country) || new Set<string>();
    set.add(visitor);
    countries.set(country, set);
  }
  return {
    period,
    visitors: visitors.size,
    pageViews: rows.reduce((total, row) => total + row.pageViews, 0),
    botVisits: rows.reduce((total, row) => total + row.botVisits, 0),
    countries: [...countries.entries()].map(([country, visitors]) => ({ country, visitors: visitors.size })).sort((a, b) => b.visitors - a.visitors),
    unknownCountry: [...visitors.values()].filter((country) => country === "Unknown").length,
    updatedAt: Date.now(),
  };
}
