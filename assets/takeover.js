(() => {
  "use strict";

  const jsonRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch (_error) {
      payload = {};
    }
    if (!response.ok) {
      const error = new Error(payload.error || "The request could not be completed.");
      error.code = payload.code || "request_failed";
      error.status = response.status;
      throw error;
    }
    return payload;
  };

  const tronlinkUri = (payload) => `tronlinkoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(payload))}`;

  const walletErrorCopy = (error) => {
    if (error?.code === 4001) return "Wallet connection was cancelled. Try again or use the payment details below.";
    if (error?.code === -32000 || error?.code === -32002) return "TronLink already has a request open. Finish it in the wallet, then try again.";
    if (error?.code === 4200) return "This TronLink version cannot start the payment here. Use the payment details below.";
    return "TronLink could not open the payment. Use the address and amount below.";
  };

  const segmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

  const graphemes = (value) => segmenter
    ? [...segmenter.segment(value)].map((item) => item.segment)
    : Array.from(value);

  document.querySelectorAll("[data-takeover-form]").forEach((form) => {
    const messageInput = form.querySelector("[data-message-input]");
    const preview = form.querySelector("[data-message-preview]");
    const count = form.querySelector("[data-grapheme-count]");
    const errorNode = form.querySelector("[data-form-error]");

    const updatePreview = () => {
      if (!messageInput) return;
      const parts = graphemes(messageInput.value);
      let current = parts.reduce((total, part) => total + (/^\s+$/u.test(part) ? 0 : 1), 0);
      while (current > 888 && parts.length) {
        const removed = parts.pop();
        if (!/^\s+$/u.test(removed)) current -= 1;
      }
      if (parts.join("") !== messageInput.value) messageInput.value = parts.join("");
      if (count) count.textContent = String(current);
      if (preview) preview.textContent = messageInput.value || (form.dataset.wallSlot ? "Your content will appear here." : "Your message will appear here.");
      const previewName = form.querySelector("[data-preview-name]");
      const nameInput = form.querySelector("[name='signature']");
      if (previewName) previewName.textContent = nameInput?.value || "";
      const previewAmount = form.querySelector("[data-preview-amount]");
      const amountInput = form.querySelector("[name='customAmount']");
      if (previewAmount && amountInput) previewAmount.textContent = amountInput.value;
    };
    messageInput?.addEventListener("input", updatePreview);
    form.querySelector("[name='signature']")?.addEventListener("input", updatePreview);
    form.querySelector("[name='customAmount']")?.addEventListener("input", updatePreview);
    updatePreview();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const submit = form.querySelector("button[type='submit']");
      const data = new FormData(form);
      const kind = form.dataset.kind;
      const choice = String(data.get("amountChoice") || "minimum");
      const minimum = Number(form.dataset.priceMicro || 0) / 1_000_000;
      let amount = minimum;
      if (kind === "defend" && choice !== "custom") amount = Number(choice);
      if (kind === "takeover" && choice === "stronger") amount = Math.max(minimum + 25, 50);
      if (choice === "custom") amount = String(data.get("customAmount") || "");
      const payload = kind === "defend"
        ? { currentReignId: form.dataset.currentReign, amount }
        : {
            currentReignId: form.dataset.currentReign || "",
            quotedPriceMicro: Number(form.dataset.priceMicro || 0),
            amount,
            message: String(data.get("message") || ""),
            signature: String(data.get("signature") || ""),
            location: String(data.get("location") || ""),
            url: String(data.get("url") || ""),
            ctaLabel: String(data.get("ctaLabel") || ""),
            targetMessageSlug: String(data.get("targetMessageSlug") || ""),
            wallSlot: form.dataset.wallSlot ? Number(form.dataset.wallSlot) : null,
          };
      if (submit) submit.disabled = true;
      if (errorNode) errorNode.textContent = "";
      try {
        const endpoint = kind === "defend" ? "/api/market/defend-intents" : "/api/market/takeover-intents";
        const result = await jsonRequest(endpoint, { method: "POST", body: JSON.stringify(payload) });
        window.location.assign(result.receiptUrl);
      } catch (error) {
        if (errorNode) errorNode.textContent = error.message;
        if (error.code === "price_changed" || error.code === "stale_reign") {
          window.setTimeout(() => window.location.reload(), 1800);
        }
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.openDialog)?.showModal());
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.querySelectorAll("[data-countdown]").forEach((node) => {
    let seconds = Number(node.dataset.countdown || 0);
    const render = () => {
      const minutes = Math.floor(Math.max(0, seconds) / 60);
      const remainder = Math.max(0, seconds) % 60;
      node.textContent = `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
      if (seconds <= 0) {
        window.location.reload();
        return;
      }
      seconds -= 1;
      window.setTimeout(render, 1000);
    };
    render();
  });

  document.querySelectorAll("[data-copy-value]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copyValue || "");
        button.textContent = "Copied";
      } catch (_error) {
        button.textContent = "Copy failed";
      }
    });
  });

  const receiptRoot = document.querySelector("[data-receipt-token]");
  if (receiptRoot) {
    const token = receiptRoot.dataset.receiptToken;
    const qr = document.querySelector("[data-qr-value]");
    if (qr && token) {
      const image = document.createElement("img");
      image.src = `/api/market/receipt/${encodeURIComponent(token)}/qr.svg`;
      image.alt = "QR code for this exact USDT payment";
      image.width = 280;
      image.height = 280;
      qr.replaceChildren(image);
    }
    const walletButton = document.querySelector("[data-open-wallet]");
    const walletStatus = document.querySelector("[data-wallet-status]");
    let tronProvider = window.tron?.isTronLink ? window.tron : null;
    const showDetectedWallet = () => {
      if (!walletButton || !tronProvider) return;
      walletButton.textContent = `Pay ${receiptRoot.dataset.amount} USDT in TronLink`;
      if (walletStatus) walletStatus.textContent = "TronLink detected. You will confirm the exact recipient and amount inside the wallet.";
    };
    window.addEventListener("TIP6963:announceProvider", (event) => {
      if (event.detail?.info?.name === "TronLink" || event.detail?.provider?.isTronLink) {
        tronProvider = event.detail.provider;
        showDetectedWallet();
      }
    });
    window.dispatchEvent(new Event("TIP6963:requestProvider"));
    showDetectedWallet();
    walletButton?.addEventListener("click", async (event) => {
      tronProvider ||= window.tron?.isTronLink ? window.tron : null;
      if (!tronProvider) return;
      event.preventDefault();
      if (walletButton.getAttribute("aria-busy") === "true") return;
      walletButton.setAttribute("aria-busy", "true");
      if (walletStatus) walletStatus.textContent = "Opening secure confirmation in TronLink.";
      try {
        const accounts = await tronProvider.request({ method: "eth_requestAccounts" });
        await tronProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x2b6653dc" }],
        });
        const from = String(accounts?.[0] || tronProvider.tronWeb?.defaultAddress?.base58 || "");
        if (!from) throw new Error("wallet_address_unavailable");
        const actionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        window.location.assign(tronlinkUri({
          url: receiptRoot.dataset.paymentUrl,
          callbackUrl: receiptRoot.dataset.callbackUrl,
          dappName: "coin.im",
          protocol: "TronLink",
          version: "1.0",
          chainId: "0x2b6653dc",
          from,
          to: receiptRoot.dataset.receivingAddress,
          loginAddress: from,
          tokenId: "",
          contract: receiptRoot.dataset.contractAddress,
          amount: receiptRoot.dataset.amount,
          action: "transfer",
          actionId,
        }));
      } catch (error) {
        if (walletStatus) walletStatus.textContent = walletErrorCopy(error);
        walletButton.removeAttribute("aria-busy");
      }
    });
    const verifyForm = document.querySelector("[data-verify-payment]");
    verifyForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorNode = verifyForm.querySelector("[data-form-error]");
      const submit = verifyForm.querySelector("button[type='submit']");
      const txid = String(new FormData(verifyForm).get("txid") || "").trim();
      if (errorNode) errorNode.textContent = "";
      if (submit) submit.disabled = true;
      try {
        const result = await jsonRequest(`/api/market/receipt/${encodeURIComponent(token)}/verify`, {
          method: "POST",
          body: JSON.stringify({ txid }),
        });
        if (result.status === "confirmed") window.location.reload();
      } catch (error) {
        if (errorNode) errorNode.textContent = error.message;
        if (error.code === "payment_pending") window.setTimeout(() => window.location.reload(), 2500);
      } finally {
        if (submit) submit.disabled = false;
      }
    });
    const status = receiptRoot.dataset.receiptStatus;
    if (["created", "payment_found", "expired"].includes(status)) {
      window.setInterval(async () => {
        try {
          const next = await jsonRequest(`/api/market/receipt/${encodeURIComponent(token)}`);
          if (next.status !== status) window.location.reload();
        } catch (_error) {
          // The private receipt stays usable on the next successful poll.
        }
      }, 7000);
    }
    document.querySelector("[data-replacement-notice]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const errorNode = form.querySelector("[data-form-error]");
      const submit = form.querySelector("button[type='submit']");
      if (errorNode) errorNode.textContent = "";
      if (submit) submit.disabled = true;
      try {
        const contact = String(new FormData(form).get("contact") || "");
        await jsonRequest(`/api/market/receipt/${encodeURIComponent(token)}/notification`, {
          method: "POST",
          body: JSON.stringify({ contact }),
        });
        form.innerHTML = "<p>You’ll get one message when this reign is replaced.</p>";
      } catch (error) {
        if (errorNode) errorNode.textContent = error.message;
        if (submit) submit.disabled = false;
      }
    });
  }

  const shareData = () => {
    return {
      title: "I took over coin.im",
      text: "I took over coin.im.\nMy message stays until someone pays more.",
      url: `${window.location.origin}/`,
    };
  };

  document.querySelectorAll("[data-share-current]").forEach((button) => {
    button.addEventListener("click", async () => {
      const data = shareData();
      if (navigator.share) {
        try {
          await navigator.share(data);
          return;
        } catch (_error) {
          return;
        }
      }
      await navigator.clipboard?.writeText(`${data.text}\n${data.url}`);
      button.textContent = "Link copied";
    });
  });

  document.querySelectorAll("[data-share-result]").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = button.dataset.shareText || (button.dataset.shareType === "defend"
        ? "I kept this message here on coin.im."
        : "I changed coin.im. The whole homepage is now my message.");
      const data = { title: "coin.im", text, url: button.dataset.shareUrl };
      if (navigator.share) {
        try {
          await navigator.share(data);
          return;
        } catch (_error) {
          return;
        }
      }
      await navigator.clipboard?.writeText(data.url || window.location.href);
      button.textContent = "Link copied";
    });
  });

  let audioContext = null;
  const playCoin = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(920, now);
    oscillator.frequency.exponentialRampToValueAtTime(510, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.26);
  };

  const soundButton = document.querySelector("[data-live-sound]");
  if (soundButton) {
    const stored = localStorage.getItem("coin-live-sound") === "on";
    soundButton.setAttribute("aria-pressed", String(stored));
    soundButton.textContent = stored ? "Live sound on" : "Live sound off";
    soundButton.addEventListener("click", async () => {
      const next = soundButton.getAttribute("aria-pressed") !== "true";
      if (next) {
        audioContext = audioContext || new AudioContext();
        await audioContext.resume();
        playCoin();
      }
      soundButton.setAttribute("aria-pressed", String(next));
      soundButton.textContent = next ? "Live sound on" : "Live sound off";
      localStorage.setItem("coin-live-sound", next ? "on" : "off");
    });
  }

  const stateRoot = document.querySelector("[data-market-state]");
  let currentReign = stateRoot?.dataset.reignId || "";
  const refreshLiveState = async () => {
    if (!stateRoot) return;
    try {
      const next = await jsonRequest("/api/market/state");
      if ((next.currentReignPublicId || "") !== currentReign) {
        document.documentElement.classList.add("reign-changing");
        window.setTimeout(() => window.location.reload(), 1000);
        return;
      }
      document.querySelectorAll("[data-live-price]").forEach((node) => { node.textContent = next.takeoverPrice; });
      document.querySelectorAll("[data-live-backing]").forEach((node) => { node.textContent = next.activeBacking || "0"; });
      document.querySelectorAll("[data-live-duration]").forEach((node) => { node.textContent = next.message?.duration || "0m"; });
      document.querySelectorAll("[data-live-readers]").forEach((node) => { node.textContent = Number(next.message?.verifiedReaders || 0).toLocaleString("en-US"); });
      document.querySelectorAll("[data-live-readers-wrap]").forEach((node) => { node.hidden = Number(next.message?.verifiedReaders || 0) < 20; });
    } catch (_error) {
    }
  };
  if (stateRoot) window.setInterval(refreshLiveState, 1000);
  if (stateRoot && typeof EventSource !== "undefined") {
    const events = new EventSource("/api/market/events");
    let reloadTimer = 0;
    ["takeover_quote_started", "payment_found", "new_reign_activated", "current_message_backed", "current_reign_ended"].forEach((name) => {
      events.addEventListener(name, () => {
        if (name === "new_reign_activated" && localStorage.getItem("coin-live-sound") === "on") playCoin();
        window.clearTimeout(reloadTimer);
        reloadTimer = window.setTimeout(refreshLiveState, 80);
      });
    });
  }

  if (stateRoot?.dataset.reignId) {
    const reignId = stateRoot.dataset.reignId;
    const beacon = (type) => {
      const body = JSON.stringify({ type, reignId });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/market/analytics", new Blob([body], { type: "application/json" }));
      else fetch("/api/market/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    };
    beacon("visit");
    window.setTimeout(() => {
      if (document.visibilityState === "visible") beacon("reader");
    }, 5000);
  }
})();
