import type { Metadata } from "next";
import BinanceBreakdown from "../../binance-breakdown";
import { SiteFooter, SiteHeader } from "../../site-chrome";

export const metadata: Metadata = {
  title: "Binance hot-wallet incident: mechanics, freezes and open loss | coin.im",
  description:
    "A sourced reconstruction of the October 29, 2026 Binance hot-wallet drain, the EIP-7702 path, cross-chain transfers, asset freezes and unresolved net loss.",
  alternates: { canonical: "/blog/binance-hot-wallet-incident" },
  openGraph: {
    type: "article",
    url: "/blog/binance-hot-wallet-incident",
    siteName: "coin.im",
    title: "How Binance's hot wallets were drained",
    description:
      "What the transactions show, what Binance says and why a freeze is not a recovery.",
    publishedTime: "2026-10-30T00:00:00Z",
    modifiedTime: "2026-11-01T00:00:00Z",
  },
  twitter: {
    card: "summary",
    title: "How Binance's hot wallets were drained | coin.im",
    description:
      "A sourced account of the withdrawal path, asset freezes and unresolved loss.",
  },
};

export default function BinanceIncidentPage() {
  return (
    <>
      <a className="skip-link" href="#incident-title">
        Skip to report
      </a>
      <SiteHeader />
      <main>
        <BinanceBreakdown />
      </main>
      <SiteFooter />
    </>
  );
}
