import type { Metadata } from "next";
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { TrafficSignals } from "./traffic-signals";
import { recordPageVisit } from "@/lib/insights";
import { cases, formatDate } from "@/lib/cases";
import { CasesFooter, CasesHeader, SaleNotice } from "./cases-chrome";
import "./cases.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coin.im — Corporate fraud, exposed",
  description:
    "Corporate fraud cases exposed by short sellers and investigative reporters in 2025–2026, retold in plain English from the original report.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Coin.im",
    title: "Coin.im — Corporate fraud, exposed",
    description: "What the short seller found, what the stock did and what the company said.",
  },
  twitter: {
    card: "summary",
    title: "Coin.im — Corporate fraud, exposed",
    description: "What the short seller found, what the stock did and what the company said.",
  },
};

export default async function Page() {
  await recordPageVisit(await headers(), await cookies());
  return (
    <div className="cx">
      <TrafficSignals />
      <a className="cx-skip" href="#cases">Skip to cases</a>
      <SaleNotice />
      <CasesHeader />
      <main>
        <section className="cx-hero" aria-labelledby="cx-title">
          <h1 id="cx-title">Corporate fraud, exposed.</h1>
          <p>
            Short sellers and investigative reporters publish the evidence. We retell each case in plain English: what the report
            found, what the stock did, what the company answered. {cases.length} cases from 2025–2026, newest first.
          </p>
        </section>
        <ol className="cx-list" id="cases">
          {cases.map((item) => (
            <li key={item.slug}>
              <article className="cx-card">
                <p className="cx-meta">
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                  <span>{item.investigator}</span>
                  <span>
                    {item.company}
                    {item.ticker ? ` (${item.ticker})` : ""}
                  </span>
                </p>
                <h2>
                  <Link href={`/cases/${item.slug}`}>{item.title}</Link>
                </h2>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Link className="cx-read" href={`/cases/${item.slug}`} aria-label={`Read the case: ${item.title}`}>
                  Read the case <span aria-hidden="true">→</span>
                </Link>
              </article>
            </li>
          ))}
        </ol>
      </main>
      <CasesFooter />
    </div>
  );
}
