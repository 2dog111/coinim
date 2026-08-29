(() => {
  "use strict";

  const header = document.querySelector("[data-site-header]");
  const progress = document.querySelector("[data-site-progress]");
  const sections = Array.from(document.querySelectorAll("[data-ms-section]"));
  const navs = Array.from(document.querySelectorAll("[data-story-nav]"));
  const links = navs.flatMap((nav) => Array.from(nav.querySelectorAll("a[href^='#']")));
  const rail = document.querySelector(".ms-story-nav--rail");
  const chapterStrip = document.querySelector("[data-chapter-strip]");
  const readingMeta = document.querySelector("[data-reading-meta]");
  const readingDuration = document.querySelector("[data-reading-duration]");
  const language = document.documentElement.lang === "en" ? "en" : "ru";
  const proofNotes = Array.from(document.querySelectorAll(".ms-proof-note"));
  const delayedRail = rail && rail.hasAttribute("data-delayed-rail");
  const revealAfter = 120000;
  const readingStartedKey = "ms-story-reading-started-at";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let startedAt = Date.now();
  let readingLongEnough = !delayedRail;
  let lastScrollY = window.scrollY;
  let frame = null;
  let lastReadingLabel = "";
  let scrollAnimation = null;

  const mainText = document.querySelector("main")?.innerText || "";
  const wordCount = mainText.trim() ? mainText.trim().split(/\s+/u).length : 0;
  const totalMinutes = Math.max(1, Math.ceil(wordCount / 200));

  if (readingDuration) readingDuration.textContent = String(totalMinutes);

  if (window.matchMedia("(max-width: 700px)").matches) {
    proofNotes.forEach((note) => note.removeAttribute("open"));
  }

  if (delayedRail) {
    try {
      const savedStartedAt = Number(window.sessionStorage.getItem(readingStartedKey));
      if (savedStartedAt > 0 && savedStartedAt <= startedAt) startedAt = savedStartedAt;
      else window.sessionStorage.setItem(readingStartedKey, String(startedAt));
    } catch (error) {
      startedAt = Date.now();
    }
    readingLongEnough = Date.now() - startedAt >= revealAfter;
  }

  const setActive = (id) => {
    for (const link of links) {
      const active = link.hash === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");

      if (active && link.parentElement === chapterStrip) {
        const left = link.offsetLeft - (chapterStrip.clientWidth - link.clientWidth) / 2;
        chapterStrip.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? "auto" : "smooth" });
      }
    }
  };

  const scrollToTarget = (target) => {
    const headerOffset = header && !header.classList.contains("is-hidden") ? header.offsetHeight : 0;
    const stripOffset = chapterStrip ? chapterStrip.offsetHeight : 0;
    const from = window.scrollY;
    const to = Math.max(0, from + target.getBoundingClientRect().top - headerOffset - stripOffset - 12);

    if (reducedMotion) {
      window.scrollTo(0, to);
      return;
    }

    if (scrollAnimation !== null) window.cancelAnimationFrame(scrollAnimation);
    const started = performance.now();
    const duration = 720;

    const step = (now) => {
      const elapsed = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 5);
      window.scrollTo(0, from + (to - from) * eased);
      if (elapsed < 1) scrollAnimation = window.requestAnimationFrame(step);
      else scrollAnimation = null;
    };

    scrollAnimation = window.requestAnimationFrame(step);
  };

  const update = () => {
    frame = null;
    const scrollY = window.scrollY;
    const scrollDelta = scrollY - lastScrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? scrollY / max : 0;

    if (progress) progress.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;

    if (header) {
      const headerFocused = header.contains(document.activeElement);
      header.classList.toggle("is-scrolled", scrollY > 56);
      if (scrollY <= 120 || scrollDelta < -4 || headerFocused) header.classList.remove("is-hidden");
      else if (scrollDelta > 4) header.classList.add("is-hidden");
    }

    if (sections.length) {
      const threshold = Math.min(window.innerHeight * 0.34, 260);
      let current = sections[0];

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= threshold) current = section;
        else break;
      }

      if (rail) {
        const reachedLaterStory = sections[1]
          ? sections[1].getBoundingClientRect().top <= window.innerHeight * 0.72
          : sections[0].getBoundingClientRect().bottom < 0;
        rail.classList.toggle("is-visible", readingLongEnough && reachedLaterStory);
      }

      setActive(current.id);

      if (chapterStrip) chapterStrip.classList.toggle("is-header-hidden", Boolean(header?.classList.contains("is-hidden")));

      if (readingMeta) {
        const chapter = Math.max(1, sections.indexOf(current) + 1);
        const remaining = Math.max(1, Math.ceil(totalMinutes * (1 - Math.max(0, Math.min(1, ratio)))));
        const label = language === "en"
          ? `Chapter ${chapter}/${sections.length} · ${remaining} min left`
          : `Глава ${chapter}/${sections.length} · осталось ${remaining} мин`;
        if (label !== lastReadingLabel) {
          readingMeta.textContent = label;
          lastReadingLabel = label;
        }
      }
    }

    lastScrollY = scrollY;
  };

  const requestUpdate = () => {
    if (frame === null) frame = window.requestAnimationFrame(update);
  };

  for (const link of links) {
    link.addEventListener("click", (event) => {
      const contents = link.closest("details");
      if (contents) contents.open = false;
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        event.preventDefault();
        scrollToTarget(target);
        window.history.replaceState(null, "", link.hash);
      }
      setActive(link.hash.slice(1));
    });
  }

  if (header) {
    header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
  }

  if (!reducedMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("ms-motion-ready");
    const revealTargets = Array.from(document.querySelectorAll(
      ".ms-hero-v2 h1, .ms-hero-intro > p, .ms-hero-passport, .ms-story-part h2, .ms-story-part h3, .data-table, .ms-benchmark-display, .ms-benchmark-conclusion, .ms-quote-spread, .ms-quiet-cta, .ms-editor-note, .ms-anti-filter, .ms-inventory, .ms-faq, .ms-story-closing"
    ));

    revealTargets.forEach((target, index) => {
      target.classList.add("ms-reveal");
      target.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });

    revealTargets.forEach((target) => revealObserver.observe(target));
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("hashchange", requestUpdate);
  window.addEventListener("scrollend", update);

  if (delayedRail) {
    const remaining = Math.max(0, revealAfter - (Date.now() - startedAt));
    window.setTimeout(() => {
      readingLongEnough = Date.now() - startedAt >= revealAfter;
      requestUpdate();
    }, remaining);
  }

  update();
})();
