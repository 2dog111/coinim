(() => {
  "use strict";

  const messageContainers = [...document.querySelectorAll("[data-message-start]")];
  const composer = document.querySelector("#message-composer");
  const form = document.querySelector("#message-request-form");
  const messageField = document.querySelector("#request-message");
  const linkField = document.querySelector("#request-link");
  const contactField = document.querySelector("#request-contact");
  const count = document.querySelector("#message-count-value");
  const preview = document.querySelector("#composer-preview");
  const previewText = document.querySelector("#composer-preview-text");
  const previewLink = document.querySelector("#composer-preview-link");

  const createMessage = (message) => {
    const article = document.createElement("article");
    const hasLink = message.messageType === "message-link" && message.url && message.displayDomain;
    article.className = `wire-message ${hasLink ? "wire-message--link" : "wire-message--only"}`;
    article.dataset.messageId = message.id;

    const meta = document.createElement("p");
    meta.className = "wire-message__meta";
    const number = document.createElement("span");
    number.textContent = `#${message.id}`;
    meta.append(number);

    const isVerified = message.paymentStatus === "verified"
      && message.transactionHash
      && message.transactionUrl
      && message.amount !== null
      && message.currency;

    if (isVerified) {
      const amount = document.createElement("span");
      amount.textContent = `${message.amount} ${message.currency}`;
      meta.append(amount);

      const verified = document.createElement("a");
      verified.className = "wire-message__verified";
      verified.href = message.transactionUrl;
      verified.target = "_blank";
      verified.rel = "noopener noreferrer";
      verified.textContent = "VERIFIED PAYMENT";
      meta.append(verified);
    }

    const text = document.createElement("p");
    text.className = "wire-message__text";
    text.textContent = message.text;
    article.append(meta, text);

    if (hasLink) {
      const link = document.createElement("a");
      link.className = "wire-message__domain";
      link.href = message.url;
      link.textContent = message.displayDomain;
      if (new URL(message.url, window.location.href).origin !== window.location.origin) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      article.append(link);
    }

    return article;
  };

  const renderMessages = async () => {
    if (!messageContainers.length) return;
    try {
      const response = await fetch("/assets/wire-messages.json", { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Message data returned ${response.status}`);
      const messages = await response.json();
      messageContainers.forEach((container) => {
        const start = Number(container.dataset.messageStart || 0);
        const end = Number(container.dataset.messageEnd || messages.length);
        container.replaceChildren(...messages.slice(start, end).map(createMessage));
        container.setAttribute("aria-busy", "false");
      });
    } catch (error) {
      messageContainers.forEach((container) => {
        container.setAttribute("aria-busy", "false");
        container.dataset.loadError = "true";
      });
    }
  };

  const updatePreview = () => {
    if (!messageField || !linkField || !preview || !previewText || !previewLink || !count) return;
    const text = messageField.value;
    const link = linkField.value.trim();
    previewText.textContent = text;
    count.textContent = String(text.length);
    preview.classList.toggle("wire-message--only", !link);
    preview.classList.toggle("wire-message--link", Boolean(link));
    previewLink.hidden = !link;
    if (!link) {
      previewLink.removeAttribute("href");
      previewLink.textContent = "";
      return;
    }
    previewLink.textContent = link.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    previewLink.href = link;
  };

  const openComposer = () => {
    if (!composer) return;
    if (typeof composer.showModal === "function") composer.showModal();
    else composer.setAttribute("open", "");
    window.setTimeout(() => messageField?.focus(), 0);
  };

  const closeComposer = () => {
    if (!composer) return;
    if (typeof composer.close === "function") composer.close();
    else composer.removeAttribute("open");
  };

  document.querySelectorAll("[data-open-composer]").forEach((button) => {
    button.addEventListener("click", openComposer);
  });
  document.querySelectorAll("[data-close-composer]").forEach((button) => {
    button.addEventListener("click", closeComposer);
  });

  composer?.addEventListener("click", (event) => {
    if (event.target === composer) closeComposer();
  });

  messageField?.addEventListener("input", updatePreview);
  linkField?.addEventListener("input", updatePreview);
  updatePreview();

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const subject = "coin.im message placement request";
    const body = [
      "Message:",
      messageField.value.trim(),
      "",
      "Optional link:",
      linkField.value.trim() || "None",
      "",
      "Email or Telegram:",
      contactField.value.trim(),
    ].join("\n");
    window.location.href = `mailto:mail@coin.im?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  document.querySelectorAll("[data-native-url]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const fallback = link.href;
      const nativeUrl = link.dataset.nativeUrl;
      const fallbackTimer = window.setTimeout(() => {
        window.location.href = fallback;
      }, 850);
      const cancelFallback = () => window.clearTimeout(fallbackTimer);
      const onVisibility = () => {
        if (document.visibilityState === "hidden") cancelFallback();
      };
      window.addEventListener("blur", cancelFallback, { once: true });
      document.addEventListener("visibilitychange", onVisibility, { once: true });
      window.location.href = nativeUrl;
    });
  });

  renderMessages();
})();
