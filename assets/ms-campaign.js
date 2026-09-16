(() => {
  'use strict';
  // Reveal every containing disclosure before navigating to a historical anchor.
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    if (!target) return;
    let node = target;
    while (node) {
      if (node.tagName === 'DETAILS') node.open = true;
      node = node.parentElement;
    }
    requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
  }
  window.addEventListener('hashchange', revealHash);
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    if (link.hash === location.hash) revealHash();
  }));
  revealHash();
})();
