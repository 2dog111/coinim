import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cases, findCase, formatDate } from "@/lib/cases";
import { CasesFooter, CasesHeader, SaleNotice } from "../../cases-chrome";
import "../../cases.css";

export function generateStaticParams() {
  return cases.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = findCase((await params).slug);
  if (!item) return {};
  return {
    title: `${item.title} | Coin.im`,
    description: item.points[0],
    alternates: { canonical: `/cases/${item.slug}` },
    openGraph: { type: "article", url: `/cases/${item.slug}`, siteName: "Coin.im", title: item.title, description: item.points[0] },
    twitter: { card: "summary", title: item.title, description: item.points[0] },
  };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const item = findCase((await params).slug);
  if (!item) notFound();
  return (
    <div className="cx">
      <a className="cx-skip" href="#case">Skip to text</a>
      <SaleNotice />
      <CasesHeader />
      <main>
        <article className="cx-article" id="case">
          <p className="cx-meta">
            <time dateTime={item.date}>{formatDate(item.date)}</time>
            <span>{item.investigator}</span>
            <span>
              {item.company}
              {item.ticker ? ` (${item.ticker})` : ""}
            </span>
            <span>{item.status}</span>
          </p>
          <h1>{item.title}</h1>
          {item.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
          {item.source ? (
            <p className="cx-source">
              Source: <a href={item.source.url} rel="noopener noreferrer">{item.source.label}</a>
            </p>
          ) : null}
          <p className="cx-back">
            <Link href="/">← All cases</Link>
          </p>
        </article>
      </main>
      <CasesFooter />
    </div>
  );
}
