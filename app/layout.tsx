import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { GoogleAnalytics } from "./google-analytics";
import "./globals.css";
import "./chat-design.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hanken",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-plex-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};
export const metadata: Metadata = {
  metadataBase: new URL("https://coin.im"),
  title: "Coin.im — One coin. Divided.",
  description: "Calculate a fraction of the planned one-COIN supply at the proposed sale price. Purchases are not yet available.",
  alternates: { canonical: "/" },
  icons: { icon: "/coin-logo.svg", apple: "/coin-logo.svg" },
  openGraph: { type: "website", url: "/", siteName: "Coin.im", title: "Coin.im — One coin. Divided.", description: "Calculate a fraction of the planned one-COIN supply at the proposed sale price.", images: [{ url: "/coin-social-new.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Coin.im — One coin. Divided.", description: "Calculate a fraction of the planned one-COIN supply.", images: ["/coin-social-new.png"] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${hanken.variable} ${plexMono.variable}`}>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
