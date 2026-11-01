"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const MEASUREMENT_ID = "G-EHPGM2H1GR";
const subscribeToHost = () => () => undefined;

function getPublicHostSnapshot() {
  return (
    window.location.hostname === "coin.im" ||
    window.location.hostname === "www.coin.im"
  );
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const publicHost = useSyncExternalStore(
    subscribeToHost,
    getPublicHostSnapshot,
    () => false,
  );

  // The private insights route contains its access key in the URL. Never send
  // that path to Google Analytics.
  if (!publicHost || pathname.startsWith("/insights/")) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  anonymize_ip: true
});`}
      </Script>
    </>
  );
}
