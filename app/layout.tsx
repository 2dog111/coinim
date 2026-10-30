import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./chat-design.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};
export const metadata: Metadata = {
  metadataBase: new URL("https://coin.im"),
  title: "Binance Hack Breakdown: EIP-7702 and Frozen Funds | coin.im",
  description:
    "A sourced breakdown of Binance’s October 29, 2026 hot-wallet drain: the withdrawal path, EIP-7702 authorization, Arbitrum freeze, and unresolved net loss.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "article",
    url: "/",
    siteName: "coin.im",
    title: "Binance Hack Breakdown: EIP-7702 and Frozen Funds",
    description:
      "How Binance’s hot wallets were drained, what the Arbitrum freeze changed, and why the final net loss remains unknown.",
  },
  twitter: {
    card: "summary",
    title: "Binance Hack Breakdown: EIP-7702 and Frozen Funds | coin.im",
    description:
      "A sourced account of the October 29 Binance wallet drain, asset freezes, and unresolved losses.",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
