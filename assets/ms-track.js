(() => {
  "use strict";

  const endpoint = "/api/open/beacon";
  if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") return;

  const send = (payload) => {
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(endpoint, blob)) return;
      }
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch (error) {
      /* счётчик не должен мешать читателю */
    }
  };

  const page = window.location.pathname;

  // Просмотр засчитываем один раз за вкладку, чтобы возврат по истории
  // не накручивал цифры.
  try {
    if (!window.sessionStorage.getItem(`seen:${page}`)) {
      window.sessionStorage.setItem(`seen:${page}`, "1");
      send({ type: "view", page });
    }
  } catch (error) {
    send({ type: "view", page });
  }

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest("[data-cta]");
      if (!link) return;
      send({ type: "click", page, target: link.getAttribute("data-cta") });
    },
    { capture: true }
  );
})();
