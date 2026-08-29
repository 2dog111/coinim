(() => {
  "use strict";

  const slots = [...document.querySelectorAll("[data-wall-slot]")];
  let totalMicro = 0;

  slots.forEach((slot) => {
    const currentMicro = Number(slot.dataset.currentPriceMicro || 0);
    if (!Number.isSafeInteger(currentMicro) || currentMicro <= 0) return;
    totalMicro += currentMicro;
    const nextMicro = currentMicro + 1_000_000;
    const next = String(nextMicro / 1_000_000);
    slot.querySelectorAll("[data-outbid-price]").forEach((node) => {
      node.textContent = next;
    });
    slot.querySelectorAll("[data-outbid]").forEach((link) => {
      const target = new URL(link.getAttribute("href") || "/takeover", window.location.origin);
      target.searchParams.set("slot", slot.dataset.wallSlot || "");
      target.searchParams.set("amount", next);
      link.setAttribute("href", target.pathname + target.search);
    });
  });

  document.querySelectorAll("[data-wall-total]").forEach((node) => {
    node.textContent = String(totalMicro / 1_000_000);
  });
})();
