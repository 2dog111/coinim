// Pre-render both pricing blocks and both selectors from one price source.
const fs = require('node:fs');
const path = require('node:path');
const plans = require('../assets/campaign-pricing.js');
const file = path.join(__dirname, '../index.html');
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/(<[^>]+data-pricing="(pilot|scale):(volume|price|unit)"[^>]*>)[\s\S]*?(<\/[^>]+>)/g, (_, open, key, field, close) => {
  const p = plans[key];
  const value = field === 'volume' ? `${p.letters.toLocaleString('en-US')} letters` : field === 'price' ? `$${(p.priceCents / 100).toLocaleString('en-US')}` : `$${(p.priceCents / p.letters / 100).toFixed(2)} per letter`;
  return open + value + close;
});
html = html.replace(/(<option[^>]+data-campaign-option="(pilot|scale)"[^>]*>)[\s\S]*?(<\/option>)/g, (_, open, key, close) => open + plans[key].label + close);
fs.writeFileSync(file, html);
console.log('Homepage pricing generated from assets/campaign-pricing.js');
