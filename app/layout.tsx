import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "coin.im — You picked the coin. Now choose the trade.",
  description:
    "Turn a crypto idea into a trade plan. Compare scenarios, understand the downside, and plan your exit around your budget and deadline.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
