(() => {
  "use strict";

  const resume = document.querySelector("[data-ms-resume]");
  const link = resume ? resume.querySelector("[data-ms-resume-link]") : null;
  const headings = Array.from(
    document.querySelectorAll(".ms-story-part h2, .ms-story-part h3")
  );

  if (!headings.length) return;

  const key = `ms-read:${window.location.pathname}`;
  const store = (() => {
    try {
      window.localStorage.setItem("ms-read:test", "1");
      window.localStorage.removeItem("ms-read:test");
      return window.localStorage;
    } catch (error) {
      return null;
    }
  })();

  const read = () => {
    if (!store) return null;
    try {
      const raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const write = (value) => {
    if (!store) return;
    try {
      store.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* приватный режим или переполнение: молча живём без сохранения */
    }
  };

  const clear = () => {
    if (!store) return;
    try {
      store.removeItem(key);
    } catch (error) {
      /* нечего чистить */
    }
  };

  // Заголовок, под которым читатель находится сейчас.
  const currentHeading = () => {
    let found = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 140) found = heading;
      else break;
    }
    return found;
  };

  let frame = null;
  const remember = () => {
    frame = null;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;

    if (ratio > 0.95) {
      clear();
      return;
    }
    if (ratio < 0.04) return;

    const heading = currentHeading();
    write({
      y: Math.round(window.scrollY),
      title: heading ? heading.textContent.trim().replace(/\s+/g, " ") : "",
    });
  };

  const onScroll = () => {
    if (frame === null) frame = window.requestAnimationFrame(remember);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pagehide", remember);

  // Предложение вернуться показываем только тому, кто уже читал
  // и открыл страницу сверху.
  const saved = read();
  if (
    resume &&
    link &&
    saved &&
    saved.y > window.innerHeight &&
    saved.title &&
    window.scrollY < 120 &&
    !window.location.hash
  ) {
    link.textContent = saved.title;
    link.href = "#";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.scrollTo({ top: saved.y, behavior: "smooth" });
      resume.hidden = true;
    });
    resume.hidden = false;
  }
})();
