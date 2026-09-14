(function (root) {
  'use strict';
  // Shared by the static pricing build, calculator and inquiry choices.
  const plan = (letters, priceCents, name) => Object.freeze({
    letters, priceCents,
    label: `${letters.toLocaleString('en-US')}-letter ${name} — $${(priceCents / 100).toLocaleString('en-US')}`
  });
  const plans = Object.freeze({pilot: plan(1000, 380000, 'pilot'), scale: plan(10000, 3000000, 'campaign')});
  if (typeof module !== 'undefined' && module.exports) module.exports = plans;
  else root.coinCampaignPricing = plans;
})(typeof window === 'undefined' ? globalThis : window);
