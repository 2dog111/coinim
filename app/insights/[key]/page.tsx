import { createHmac, timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readInsights } from "@/lib/insights";
import InsightsDashboard from "./view";
import "./insights.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Site traffic | coin.im", robots: { index: false, follow: false } };

function authorized(key: string) {
  const expected = process.env.INSIGHTS_SECRET || "";
  if (!/^[a-f0-9]{64}$/.test(key) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  const left = createHmac("sha256", "coin.im-insights").update(key).digest();
  const right = createHmac("sha256", "coin.im-insights").update(expected).digest();
  return timingSafeEqual(left, right);
}

export default async function InsightsPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ period?: string }> }) {
  const [{ key }, query] = await Promise.all([params, searchParams]);
  if (!authorized(key)) notFound();
  const period = query.period === "24h" || query.period === "7d" ? query.period : "30d";
  const data = await readInsights(period);
  return <InsightsDashboard data={data} secret={key} />;
}
