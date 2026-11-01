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
  title: "coin.im | Plan a crypto trade before you place it",
  description:
    "Set a budget, maximum loss and exit date. Compare spot, call and wait scenarios, then question the plan.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "coin.im",
    title: "Plan a crypto trade before you place it | coin.im",
    description:
      "Turn a crypto idea and explicit limits into a position and exit plan you can question.",
  },
  twitter: {
    card: "summary",
    title: "Plan a crypto trade before you place it | coin.im",
    description:
      "Set the budget, acceptable loss and exit date before the entry.",
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
