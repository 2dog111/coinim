// The homepage is the canonical markup for shared pricing, form and navigation.
// Static rendering keeps both routes useful without a JavaScript hydration step.
const fs = require('node:fs');
const path = require('node:path');
const plans = require('../assets/campaign-pricing.js');
const root = path.resolve(__dirname, '..');
function element(html, start, tag) {
  if (start < 0) throw new Error(`Missing shared ${tag}`);
  const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g');
  tags.lastIndex = start;
  let depth = 0, match;
  while ((match = tags.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(start, tags.lastIndex);
  }
  throw new Error(`Unclosed shared ${tag}`);
}
function prices(html) {
  html = html.replace(/(<[^>]+data-pricing="(pilot|scale):(volume|price|unit)"[^>]*>)[\s\S]*?(<\/[^>]+>)/g, (_, open, key, field, close) => {
    const p = plans[key];
    const value = field === 'volume' ? `${p.letters.toLocaleString('en-US')} letters` : field === 'price' ? `$${(p.priceCents / 100).toLocaleString('en-US')}` : `$${(p.priceCents / p.letters / 100).toFixed(2)} per letter`;
    return open + value + close;
  });
  return html.replace(/(<option[^>]+data-campaign-option="(pilot|scale)"[^>]*>)[\s\S]*?(<\/option>)/g, (_, open, key, close) => open + plans[key].label + close);
}
const home = prices(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
fs.writeFileSync(path.join(root, 'index.html'), home);
const campaign = home.indexOf('id="campaign"');
const formStart = home.indexOf('<form action="/api/open/leads"');
const successStart = home.indexOf('<div aria-live="polite" hidden="" id="enquiry-success"');
const shared = {
  header: element(home, home.indexOf('<header '), 'header'),
  pricing: element(home, home.indexOf('<div class="pricing-grid">', campaign), 'div'),
  form: home.slice(formStart, successStart) + element(home, successStart, 'div'),
  contacts: element(home, home.indexOf('<div class="after-form">'), 'div'),
  footer: element(home, home.indexOf('<footer>'), 'footer').replace('href="#main"', 'href="#main-content"')
};
let ms = fs.readFileSync(path.join(root, 'ms.html'), 'utf8');
for (const [name, html] of Object.entries(shared)) {
  const pattern = new RegExp(`<!-- shared:${name}:start -->[\\s\\S]*?<!-- shared:${name}:end -->`);
  if (!pattern.test(ms)) throw new Error(`Missing ${name} slot`);
  ms = ms.replace(pattern, () => `<!-- shared:${name}:start -->\n${html}\n<!-- shared:${name}:end -->`);
}
ms = prices(ms);
const p = plans.pilot;
const description = `Find the reason for the audience before printing the letter. Market Scan is included in coin.im physical-mail campaigns. Start with ${p.letters.toLocaleString('en-US')} letters for $${(p.priceCents / 100).toLocaleString('en-US')}.`;
ms = ms.replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*(")/g, (_, open, close) => open + description + close);
fs.writeFileSync(path.join(root, 'ms.html'), ms);
fs.writeFileSync(path.join(root, 'ms/index.html'), ms);
console.log('Homepage and Market Scan: shared pricing, form, navigation and metadata generated.');
