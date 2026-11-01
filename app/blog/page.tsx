import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../site-chrome";

export const metadata: Metadata = {
  title: "Crypto incident research | coin.im",
  description:
    "Sourced crypto incident reports that separate company statements, transaction records and analyst inference.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    siteName: "coin.im",
    title: "Crypto incident research | coin.im",
    description:
      "Transaction records, company statements and the questions that remain open.",
  },
};

export default function BlogPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className="blog-index">
        <header className="blog-index-head">
          <h1>Research for the part of the trade that can break.</h1>
          <p>
            Each report follows the money, names the source behind every claim
            and leaves unresolved accounting unresolved.
          </p>
        </header>

        <ol className="article-index">
          <li>
            <article>
              <time dateTime="2026-11-01">Updated November 1, 2026</time>
              <h2>
                <Link href="/blog/binance-hot-wallet-incident">
                  How Binance&apos;s hot wallets were drained
                </Link>
              </h2>
              <p>
                The signed Ethereum authorization, the ten-chain outflow, the
                freezes and the gap between frozen assets and recovered money.
              </p>
              <dl>
                <div>
                  <dt>Reported impact</dt>
                  <dd>About $6.3 billion</dd>
                </div>
                <div>
                  <dt>Final net loss</dt>
                  <dd>Not reconciled</dd>
                </div>
              </dl>
            </article>
          </li>
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
