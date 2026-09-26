// Renders /investors/ from the editorial profiles. Static HTML first: the catalog,
// every published profile, its sources and the inquiry form work without JavaScript.
const fs = require('node:fs');
const path = require('node:path');
const core = require('../assets/investor-match-core.js');
const data = require('./lib/investors-data.cjs');

const root = path.resolve(__dirname, '..');
const VERSION = '20260917-im1';

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function attrUrl(value) {
  if (!data.isUrl(value) && !/^mailto:[^\s@]+@[^\s@]+$/.test(value)) throw new Error(`Refusing non-http URL: ${value}`);
  return esc(value);
}
function label(dictionary, key) { return dictionary[key] || key; }
function list(dictionary, keys) { return (keys || []).map(k => label(dictionary, k)).join(', '); }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  if (!m) return y;
  if (!d) return `${MONTHS[Number(m) - 1]} ${y}`;
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function sourceRefs(profile, ids, index) {
  return (ids || []).map(id => {
    const n = index.get(id);
    return n ? `<a class="im-ref" href="#${esc(profile.slug)}-source-${n}" aria-label="Source ${n}">[${n}]</a>` : '';
  }).join(' ');
}

function renderProfile(p) {
  const index = new Map(p.sources.map((s, i) => [s.id, i + 1]));
  const ev = p.fieldEvidence || {};
  const refs = ids => sourceRefs(p, ids, index);
  const criteria = [
    ['Stages', p.stages.length ? list(core.STAGES, p.stages) : 'Not published', ev.stages],
    ['Sectors', p.sectors.length ? list(core.SECTORS, p.sectors) : 'Not published', ev.sectors],
    ['Investment geography', p.investmentGeographies.length ? list(core.REGIONS, p.investmentGeographies) : 'Not published', ev.investmentGeographies],
    ['Published check size', core.formatCheck(p.publishedCheckRange), p.publishedCheckRange ? [p.publishedCheckRange.sourceId] : []]
  ];
  const criteriaHtml = criteria.map(([k, v, ids]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)} ${refs(ids)}</dd></div>`).join('\n');
  const evidenceHtml = p.investmentEvidence.slice(0, 3).map(e => {
    const date = e.eventDate && e.datePrecision !== 'unknown' ? `<span class="im-date">Investment announced: ${esc(formatDate(e.eventDate))}</span>` : '';
    return `<li><span class="im-company">${esc(e.company)}</span>: ${esc(e.fact)} ${refs(e.sourceIds)} ${date}</li>`;
  }).join('\n');
  const reviewed = p.sources.filter(s => (s.supportsFields || []).some(f => ['sectors', 'stages', 'investmentGeographies', 'publishedCheckRange'].includes(f))).map(s => s.checkedAt).sort().pop() || p.editorialUpdatedAt;
  const checks = [];
  if (p.paperPitchPolicy === 'not-accepted') checks.push('The organisation states that it does not accept paper pitches. It is excluded from any paper plan and can only be approached through its published channel.');
  if (!p.publishedCheckRange) checks.push('Check size is not published. Confirm the typical first check before proposing an amount.');
  else if (p.publishedCheckRange.currency !== 'USD') checks.push(`Check size is published in ${p.publishedCheckRange.currency}. Confirm the equivalent before proposing an amount.`);
  checks.push(p.businessAddress ? (p.recipientRoutingStatus === 'confirmed' ? 'The letter route is confirmed with dated evidence; re-check it before sending.' : 'The letter route: who should receive it at the published address, and whether unsolicited letters are read.') : 'No published business address yet: the contact route has to be established before any letter is planned.');
  checks.push(`Whether the published mandate is still current (criteria reviewed ${formatDate(reviewed)}) and whether a portfolio company competes with you.`);
  const pitch = p.preferredPitchChannel;
  const pitchHtml = pitch
    ? (pitch.url ? `<a href="${attrUrl(pitch.url)}" rel="noopener nofollow" target="_blank">${esc(label(core.PITCH_CHANNELS, pitch.type))}${pitch.url.startsWith('mailto:') ? ': ' + esc(pitch.url.slice(7)) : ''}</a>` : esc(label(core.PITCH_CHANNELS, pitch.type))) + ' ' + refs([pitch.sourceId])
    : 'Not published';
  const address = p.businessAddress;
  const addressHtml = address
    ? `<p class="im-address">${esc(address.organisation)}<br/>${address.lines.map(esc).join('<br/>')}<br/>${esc(address.city)}${address.postalCode ? ' ' + esc(address.postalCode) : ''}<br/>${esc(core.COUNTRIES[address.country][0])}</p>
        <p class="im-meta-line">${esc(label(core.ADDRESS_TYPES, address.addressType))} ${refs([address.sourceId])}. Business address checked: ${esc(formatDate(address.checkedAt))}.</p>`
    : '<p class="im-address">Address not yet verified</p>';
  const routing = { 'not-confirmed': 'Not confirmed', 'confirmed': 'Confirmed with dated evidence' }[p.recipientRoutingStatus];
  const paper = { accepted: 'Accepted', 'not-accepted': 'Not accepted', unknown: 'Unknown' }[p.paperPitchPolicy];
  const people = (p.publicContactPeople || []).map(c => `<li>${esc(c.name)}, ${esc(c.role)} ${refs([c.sourceId])}. Role reviewed: ${esc(formatDate(c.reviewedAt))}</li>`).join('\n');
  const sources = p.sources.map((s, i) => `<li id="${esc(p.slug)}-source-${i + 1}"><a href="${attrUrl(s.url)}" rel="noopener nofollow" target="_blank">${esc(s.title)}</a>. ${esc(s.publisher)}${s.publishedAt ? ', published ' + esc(formatDate(s.publishedAt)) : ''}. Checked ${esc(formatDate(s.checkedAt))}.</li>`).join('\n');
  const mail = `mailto:mail@coin.im?subject=${encodeURIComponent('Investor Match: ' + p.displayName + ' (' + p.slug + ')')}`;
  const scopeNote = (scope, hasList) => hasList ? (scope === 'exhaustive' ? ' (stated as the full list)' : ' (named examples, not stated as exhaustive)') : '';
  const checkNote = p.publishedCheckRange ? ` (${p.publishedCheckRange.constraint === 'hard' ? 'stated as a firm limit' : 'typical guide'}${p.publishedCheckRange.checkType && p.publishedCheckRange.checkType !== 'unknown' ? ', ' + p.publishedCheckRange.checkType + ' check' : ''})` : '';
  return `
       <div class="im-profile-body">
        <p class="im-summary-text">${esc(p.summary)}</p>
        <p class="im-meta-line">Official website: <a href="${attrUrl(p.officialWebsite)}" rel="noopener nofollow" target="_blank">${esc(p.officialWebsite.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></p>
        <h4>Why this may fit</h4>
        <div class="im-why" data-why=""><p>Browse mode: enter your sector, stage, country or target check above to see which published criteria match. This explains the fit against your parameters, never the investor’s interest.</p></div>
        <h4>What still needs checking</h4>
        <ul class="im-checks-dynamic" data-checks="" hidden=""></ul>
        <ul class="im-checks">
${checks.slice(0, 3).map(c => `<li>${esc(c)}</li>`).join('\n')}
        </ul>
        <h4>Published investment criteria (current mandate)</h4>
        <dl class="im-criteria-list">
${criteriaHtml}
        </dl>
        <p class="im-meta-line">Sectors${esc(scopeNote(p.sectorScope, p.sectors.length && !p.sectors.includes('agnostic')))}; geography${esc(scopeNote(p.geographyScope, p.investmentGeographies.length && !p.investmentGeographies.includes('global')))}; check${esc(checkNote)}. Named examples leave other sectors or countries unknown, not excluded.</p>
        <h4>Investment evidence (historical)</h4>
        <ul class="im-evidence">
${evidenceHtml}
        </ul>
        <p class="im-meta-line">Past investments and portfolio similarity are reasons to look closer, not proof of a current mandate.</p>
        <h4>Business contact route</h4>
        <dl class="im-route">
         <div><dt>Published pitch channel</dt><dd>${pitchHtml}</dd></div>
         <div><dt>Address</dt><dd>${address ? 'Published by the organisation' : 'Not yet verified'}</dd></div>
         <div><dt>Recipient routing</dt><dd>${esc(routing)}</dd></div>
         <div><dt>Paper pitches</dt><dd>${esc(paper)}</dd></div>
        </dl>
        ${addressHtml}
        <p class="im-disclaimer">A published business address does not confirm that this person works there, accepts unsolicited letters, or will personally receive or read your pitch. Delivery availability is checked separately for each business address.</p>
        ${people ? `<h4>Publicly listed people</h4>\n        <ul class="im-people">\n${people}\n        </ul>` : ''}
        <h4>Sources and dates</h4>
        <ol class="im-sources">
${sources}
        </ol>
        <p class="im-meta-line">Profile updated: ${esc(formatDate(p.editorialUpdatedAt))}. <a href="${mail}">Suggest a correction</a> or <a href="${mail.replace('Investor%20Match%3A', 'Investor%20Match%20removal%3A')}">request removal</a>.</p>
       </div>`;
}

function renderRow(p) {
  const type = label(core.INVESTOR_TYPES, p.investorType);
  const org = p.entityType === 'person' && p.organisationName ? `<span class="im-org">${esc(p.organisationName)}</span>` : '';
  return `       <li class="im-row" data-id="${esc(p.id)}" data-slug="${esc(p.slug)}" id="${esc(p.slug)}">
        <div class="im-row-head">
         <div class="im-row-name">
          <h3>${esc(p.displayName)}</h3>
          <p class="im-row-type">${esc(type)}${org ? ' at ' + org : ''}</p>
         </div>
         <p class="im-row-stages"><span class="im-cell-label">Stages</span>${esc(p.stages.length ? list(core.STAGES, p.stages) : 'Not published')}</p>
         <p class="im-row-sectors"><span class="im-cell-label">Sectors</span>${esc(p.sectors.length ? list(core.SECTORS, p.sectors.slice(0, 4)) + (p.sectors.length > 4 ? ' and more' : '') : 'Not published')}</p>
         <p class="im-row-check"><span class="im-cell-label">Check</span>${esc(core.formatCheck(p.publishedCheckRange))}</p>
         <div class="im-row-actions">
          <button class="im-shortlist-toggle" data-id="${esc(p.id)}" hidden="" type="button" aria-pressed="false">Add to shortlist</button>
         </div>
        </div>
        <p class="im-verdict" hidden=""></p>
        <ul class="im-facts" hidden=""></ul>
        <details class="im-profile">
         <summary>View profile</summary>${renderProfile(p)}
        </details>
       </li>`;
}

function options(dictionary, keys) {
  return keys.map(k => `          <option value="${esc(k)}">${esc(dictionary[k])}</option>`).join('\n');
}

function publicBundle(p) {
  return {
    id: p.id, slug: p.slug, displayName: p.displayName, entityType: p.entityType, investorType: p.investorType,
    organisationId: p.organisationId || null, organisationName: p.organisationName || null,
    sectors: p.sectors, stages: p.stages, investmentGeographies: p.investmentGeographies,
    sectorScope: p.sectorScope || 'examples', geographyScope: p.geographyScope || 'examples',
    fieldEvidence: p.fieldEvidence || {},
    criteriaCheckedAt: data.criteriaCheckedAt(p),
    publishedCheckRange: p.publishedCheckRange ? { min: p.publishedCheckRange.min ?? null, max: p.publishedCheckRange.max ?? null, currency: p.publishedCheckRange.currency, constraint: p.publishedCheckRange.constraint || 'typical', checkType: p.publishedCheckRange.checkType || 'unknown', sourceId: p.publishedCheckRange.sourceId } : null,
    officeCountry: p.businessAddress ? p.businessAddress.country : null,
    addressPublished: Boolean(p.businessAddress),
    recipientRoutingStatus: p.recipientRoutingStatus,
    paperPitchPolicy: p.paperPitchPolicy,
    pitchChannel: p.preferredPitchChannel ? p.preferredPitchChannel.type : null,
    portfolio: p.investmentEvidence.map(e => e.company),
    officialWebsite: p.officialWebsite,
    pitchUrl: p.preferredPitchChannel ? p.preferredPitchChannel.url || null : null,
    addressLine: p.businessAddress ? `${p.businessAddress.city}, ${core.COUNTRIES[p.businessAddress.country][0]} (${core.ADDRESS_TYPES[p.businessAddress.addressType]}, checked ${p.businessAddress.checkedAt})` : null,
    sources: p.sources.map((s, i) => ({ id: s.id, n: i + 1, url: s.url, title: s.title, checkedAt: s.checkedAt })),
    publicationStatus: 'published'
  };
}

function build({ write = true } = {}) {
  const { profiles, errors } = data.loadProfiles();
  if (errors.length) throw new Error('Investor profiles are invalid:\n' + errors.join('\n'));
  const repo = core.createRepository(profiles.map(data.publicView));
  const published = repo.published;
  const updated = repo.latestEditorialUpdate() || '';
  const officeCountries = [...new Set(published.map(p => p.businessAddress && p.businessAddress.country).filter(Boolean))].sort();
  const template = fs.readFileSync(path.join(root, 'data', 'investors', 'page.template.html'), 'utf8');
  const bundle = JSON.stringify({ version: 1, generatedAt: updated, profiles: published.map(publicBundle) }).replace(/</g, '\\u003c');
  const replacements = {
    version: VERSION,
    release: `${VERSION}-${published.length}`,
    count: String(published.length),
    updated: formatDate(updated),
    updatedIso: updated,
    sectorOptions: options(core.SECTORS, Object.keys(core.SECTORS).filter(k => k !== 'agnostic')),
    stageOptions: options(core.STAGES, Object.keys(core.STAGES)),
    countryOptions: Object.keys(core.COUNTRIES).sort((a, b) => core.COUNTRIES[a][0].localeCompare(core.COUNTRIES[b][0])).map(k => `          <option value="${k}">${esc(core.COUNTRIES[k][0])}</option>`).join('\n'),
    typeOptions: options(core.INVESTOR_TYPES, Object.keys(core.INVESTOR_TYPES)),
    officeOptions: officeCountries.map(k => `           <option value="${k}">${esc(core.COUNTRIES[k][0])}</option>`).join('\n'),
    rows: published.map(renderRow).join('\n'),
    data: bundle
  };
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(replacements, key)) throw new Error(`Unknown placeholder ${key}`);
    return replacements[key];
  });
  if (write) {
    fs.mkdirSync(path.join(root, 'investors'), { recursive: true });
    fs.writeFileSync(path.join(root, 'investors', 'index.html'), html);
    fs.writeFileSync(path.join(root, 'investors.html'), html);
  }
  return { html, published, profiles };
}

if (require.main === module) {
  // --check validates the data and renders in memory without touching the routes.
  const { published, profiles } = build({ write: !process.argv.includes('--check') });
  const withAddress = published.filter(p => p.businessAddress).length;
  const routed = published.filter(p => p.recipientRoutingStatus === 'confirmed').length;
  const paperOk = published.filter(p => p.paperPitchPolicy === 'accepted').length;
  console.log(`Investor Match: ${published.length} published of ${profiles.length} profiles; ${withAddress} with a published business address; ${routed} with confirmed recipient routing; ${paperOk} with accepted paper pitches.`);
}

module.exports = { build, renderRow, renderProfile, formatDate, VERSION };
