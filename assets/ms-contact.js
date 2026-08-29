(() => {
  "use strict";

  document.querySelectorAll("[data-native-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      const nativeHref = link.getAttribute("data-native-link");
      const webHref = link.href;
      if (!nativeHref || !webHref) return;

      let timer = window.setTimeout(() => {
        window.location.href = webHref;
      }, 700);

      const cancelFallback = () => {
        if (timer === null) return;
        window.clearTimeout(timer);
        timer = null;
        window.removeEventListener("blur", cancelFallback);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };

      const onVisibilityChange = () => {
        if (document.hidden) cancelFallback();
      };

      window.addEventListener("blur", cancelFallback, { once: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.location.href = nativeHref;
    });
  });
})();
