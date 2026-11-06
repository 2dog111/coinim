"use client";

import { useEffect } from "react";

export function TrafficSignals() {
  useEffect(() => {
    if (location.hostname !== "coin.im" && location.hostname !== "www.coin.im") return;
    const send = (signal: string) => {
      void fetch(`/api/traffic/${signal}`, { method: "POST", keepalive: true }).catch(() => {});
    };
    send("js");
    const onInteraction = (event: Event) => {
      if (!event.isTrusted) return;
      send("active");
      cleanup();
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    const cleanup = () => events.forEach((name) => window.removeEventListener(name, onInteraction));
    events.forEach((name) => window.addEventListener(name, onInteraction, { passive: true }));
    return cleanup;
  }, []);
  return null;
}
