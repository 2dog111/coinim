(function (root) {
  'use strict';
  const plans = typeof module !== 'undefined' && module.exports ? require('./campaign-pricing.js') : root.coinCampaignPricing;
  function decimal(value) {
    const text = String(value).trim();
    if (text.length > 32 || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    return { units: BigInt((whole || '0') + fraction), scale: fraction.length };
  }
  function formatAmount(units, scale) {
    const padded = units.toString().padStart(scale + 1, '0');
    const whole = scale ? padded.slice(0, -scale) : padded;
    const fraction = scale ? padded.slice(-scale).replace(/0+$/, '') : '';
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? '.' + fraction.padEnd(2, '0') : '');
  }
  function calculate(plan, contribution, other) {
    if (!Object.hasOwn(plans, plan)) return { error: 'campaign' };
    const c = decimal(contribution), o = decimal(String(other).trim() || '0');
    if (!o) return { error: 'other' };
    if (!String(contribution).trim()) return { empty: true };
    if (!c || c.units === 0n) return { error: 'contribution' };
    const scale = Math.max(2, c.scale, o.scale);
    const total = BigInt(plans[plan].priceCents) * 10n ** BigInt(scale - 2) + o.units * 10n ** BigInt(scale - o.scale);
    const divisor = c.units * 10n ** BigInt(scale - c.scale);
    return { customers: ((total + divisor - 1n) / divisor).toString(), total: formatAmount(total, scale) };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { calculate }; return; }

  // Existing first-party beacon. Only an allowlisted event name is transmitted.
  const events = new Set(['campaign_selected', 'calculator_used', 'lead_form_started', 'lead_submitted', 'lead_submit_failed']);
  root.coinCampaignEvent = name => {
    if (!events.has(name) || ['localhost', '127.0.0.1'].includes(location.hostname)) return;
    const page = document.body.dataset.campaignSource === '/ms' ? '/ms' : '/';
    const body = JSON.stringify({type:'click', page, target:name});
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/open/beacon', new Blob([body], {type:'application/json'}))) return;
      fetch('/api/open/beacon', {method:'POST', headers:{'Content-Type':'application/json'}, body, keepalive:true}).catch(() => {});
    } catch (_) { /* Analytics cannot interrupt the inquiry. */ }
  };
  const interest = document.querySelector('#lead-interest');
  document.querySelectorAll('[data-plan]').forEach(link => link.addEventListener('click', () => {
    interest.value = link.dataset.plan;
    root.coinCampaignEvent('campaign_selected');
  }));
  interest.addEventListener('change', () => root.coinCampaignEvent('campaign_selected'));
  document.querySelector('#campaign-enquiry').addEventListener('input', () => root.coinCampaignEvent('lead_form_started'), {once:true});

  const campaign = document.querySelector('#cost-campaign');
  const contribution = document.querySelector('#customer-contribution');
  const other = document.querySelector('#other-costs');
  const result = document.querySelector('#cost-result');
  if (!campaign || !contribution || !other || !result) return;
  let used = false;
  function update(event) {
    const value = calculate(campaign.value, contribution.value, other.value);
    const firstError = value.error === 'contribution';
    const otherError = value.error === 'other';
    document.querySelector('#contribution-error').hidden = !firstError;
    document.querySelector('#other-costs-error').hidden = !otherError;
    contribution.setAttribute('aria-invalid', String(firstError));
    other.setAttribute('aria-invalid', String(otherError));
    result.textContent = value.customers
      ? `At your inputs, ${value.customers.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} additional customers would cover $${value.total} in costs.`
      : value.empty ? 'Enter your contribution per customer to see the calculation.' : '';
    if (event && !used) { used = true; root.coinCampaignEvent('calculator_used'); }
  }
  [campaign, contribution, other].forEach(input => input.addEventListener('input', update));
  update();
})(typeof window === 'undefined' ? globalThis : window);
