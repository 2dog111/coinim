import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./chat-design.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};
export const metadata: Metadata = {
  title: "Ask about a crypto trade — coin.im",
  description:
    "Ask about a crypto trade. Compare potential loss, position size and exit plans before you buy.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
