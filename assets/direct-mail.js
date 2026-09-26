(() => {
  document.querySelectorAll('[data-native]:not(.contact-whatsapp)').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      let timer;
      const cancel = () => {
        clearTimeout(timer);
        window.removeEventListener('blur', cancel);
        document.removeEventListener('visibilitychange', onVisibility);
      };
      const onVisibility = () => { if (document.hidden) cancel(); };
      window.addEventListener('blur', cancel, { once: true });
      document.addEventListener('visibilitychange', onVisibility);
      timer = setTimeout(() => {
        cancel();
        if (!document.hidden) window.location.assign(link.href);
      }, 1100);
      window.location.assign(link.dataset.native);
    });
  });
})();

// Mobile shortcut to the form: shown once the hero button has scrolled away, hidden while the form is on screen.
(() => {
  const cta = document.querySelector('.mobile-cta'), hero = document.querySelector('.hero-copy .actions'), start = document.querySelector('#start');
  if (!cta || !hero || !start || !('IntersectionObserver' in window)) return;
  let heroVisible = true, startVisible = false;
  const update = () => { cta.hidden = heroVisible || startVisible; };
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting || e.boundingClientRect.top > 0; update(); }).observe(hero);
  new IntersectionObserver(([e]) => { startVisible = e.isIntersecting; update(); }).observe(start);
})();
