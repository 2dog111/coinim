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
  title: "coin.im | Talk through a crypto trade",
  description:
    "Describe a crypto trade in one message. Turn your budget, acceptable loss and exit timing into a plan you can question.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "coin.im",
    title: "Talk through a crypto trade | coin.im",
    description:
      "Write the trade in your own words, then question the calculated plan.",
  },
  twitter: {
    card: "summary",
    title: "Talk through a crypto trade | coin.im",
    description:
      "Describe the coin, budget, acceptable loss and exit timing in one message.",
  },
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
