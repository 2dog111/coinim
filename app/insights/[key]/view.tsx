"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { readInsights } from "@/lib/insights";

type Data = Awaited<ReturnType<typeof readInsights>>;
const labels: Record<string, string> = { US: "United States", GB: "United Kingdom", RU: "Russia", DE: "Germany", FR: "France", CA: "Canada", AU: "Australia", IN: "India", SG: "Singapore", TH: "Thailand", NL: "Netherlands", BR: "Brazil", JP: "Japan", KR: "South Korea", TR: "Türkiye", UA: "Ukraine", Unknown: "Unknown" };

export default function InsightsDashboard({ data, secret }: { data: Data; secret: string }) {
  const router = useRouter();
  function changePeriod(period: string) { router.push(`/insights/${secret}?period=${period}`); }
  return (
    <main className="insights-shell">
      <header className="insights-head"><Link href="/" prefetch={false} aria-label="coin.im home">coin.im</Link><span>Traffic overview</span><small>Country is estimated from visitor IP. No IP addresses or browser fingerprints are saved.</small></header>
      <section className="insights-toolbar"><div><p className="insights-kicker">SITE ACTIVITY</p><h1>Visitors and bots</h1></div><nav aria-label="Reporting period">{(["24h", "7d", "30d"] as const).map((p) => <button key={p} className={data.period === p ? "selected" : ""} onClick={() => changePeriod(p)}>{p === "24h" ? "24 hours" : p === "7d" ? "7 days" : "30 days"}</button>)}</nav></section>
      <section className="insights-metrics" aria-label="Traffic totals">
        <article><span>Unique visitors</span><strong>{data.visitors.toLocaleString()}</strong><small>Browsers seen during this period</small></article>
        <article><span>Page views</span><strong>{data.pageViews.toLocaleString()}</strong><small>Visits to the homepage</small></article>
        <article><span>Bot visits</span><strong>{data.botVisits.toLocaleString()}</strong><small>Requests identified by browser signature</small></article>
      </section>
      <section className="insights-countries"><div className="insights-section-head"><div><p className="insights-kicker">AUDIENCE</p><h2>Visitors by country</h2></div><span>{data.countries.length} countries</span></div>
        {data.countries.length ? <div className="country-list">{data.countries.map((row) => <div className="country-row" key={row.country}><span>{labels[row.country] || row.country}</span><div className="country-bar"><i style={{ width: `${Math.max(3, Math.round(row.visitors / data.visitors * 100))}%` }} /></div><strong>{row.visitors}</strong></div>)}</div> : <p className="insights-empty">No country data recorded yet. New visits will appear here.</p>}
        {data.unknownCountry > 0 && <p className="insights-note">Country unavailable for {data.unknownCountry} visitors.</p>}
      </section>
      <footer className="insights-foot">Counts start when this tracker is installed. Updated {new Date(data.updatedAt).toLocaleString()}.</footer>
    </main>
  );
}
