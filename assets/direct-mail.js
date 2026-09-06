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
