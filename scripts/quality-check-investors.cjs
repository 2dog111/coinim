#!/usr/bin/env node
// Local data quality report for Investor Match. Errors block publication; warnings describe gaps.
// Usage: node scripts/quality-check-investors.cjs [--json] [--today YYYY-MM-DD]
const fs = require('node:fs');
const path = require('node:path');
const core = require('../assets/investor-match-core.js');
const data = require('./lib/investors-data.cjs');
const { build } = require('./build-investors.cjs');

const PRIVATE_KEYS = ['privateNotes', 'importSource', 'internalReview', 'reviewNotes', 'rightsNote', 'suppression'];
const CRITERIA = ['sectors', 'stages', 'investmentGeographies'];

function daysAgo(iso, today) { return core.daysBetween(iso, today); }
function validDay(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') && !Number.isNaN(Date.parse(iso)) && new Date(iso).toISOString().slice(0, 10) === iso; }

function run({ today } = {}) {
  const todayIso = today || new Date().toISOString().slice(0, 10);
  const errors = [];
  const warnings = [];
  const review = [];
  const loaded = data.loadProfiles();
  loaded.errors.forEach(e => errors.push('schema: ' + e));
  const profiles = loaded.profiles;
  const published = profiles.filter(p => p.publicationStatus === 'published');
  const domains = new Map();
  for (const p of profiles) {
    const tag = p.slug || p.id || '?';
    const byId = new Map((p.sources || []).map(s => [s.id, s]));
    // Domain identity: two organisations on the same domain need a manual look.
    try {
      const domain = new URL(p.officialWebsite).hostname.replace(/^www\./, '');
      if (p.entityType === 'organisation') {
        if (domains.has(domain) && domains.get(domain) !== p.slug) warnings.push(`${tag}: shares the domain ${domain} with ${domains.get(domain)}; confirm they are distinct organisations`);
        domains.set(domain, p.slug);
      }
    } catch (_) { /* schema already reported the URL */ }
    // Organisation links must resolve.
    if (p.organisationId && !profiles.some(o => o.id === p.organisationId)) errors.push(`${tag}: organisationId ${p.organisationId} does not exist`);
    // Dates: no future checks, event <= published <= checked where all are known, exact day validity.
    for (const s of p.sources || []) {
      if (!validDay(s.checkedAt)) errors.push(`${tag}: source ${s.id} checkedAt is not a valid day`);
      else if (s.checkedAt > todayIso) errors.push(`${tag}: source ${s.id} checkedAt ${s.checkedAt} is in the future`);
      if (s.publishedAt && s.checkedAt && s.publishedAt.slice(0, s.checkedAt.length) > s.checkedAt) errors.push(`${tag}: source ${s.id} publishedAt is after checkedAt`);
    }
    for (const e of p.investmentEvidence || []) {
      if (!e.eventDate) continue;
      for (const id of e.sourceIds || []) {
        const s = byId.get(id);
        if (s && s.publishedAt && e.eventDate.slice(0, 4) > s.publishedAt.slice(0, 4)) errors.push(`${tag}: evidence ${e.company} event date is after its source publication date`);
        if (s && e.eventDate.length === 10 && s.checkedAt && e.eventDate > s.checkedAt) errors.push(`${tag}: evidence ${e.company} event date is after the check date`);
      }
    }
    if (p.businessAddress) {
      if (!validDay(p.businessAddress.checkedAt)) errors.push(`${tag}: businessAddress.checkedAt invalid`);
      else if (p.businessAddress.checkedAt > todayIso) errors.push(`${tag}: businessAddress.checkedAt is in the future`);
      if (p.businessAddress.addressType === 'type-not-established') warnings.push(`${tag}: address type not established; do not treat it as an operating office`);
      if (/\b(c\/o|po box|p\.o\. box|pmb)\b/i.test(p.businessAddress.lines.join(' ')) && p.businessAddress.addressType === 'operating-office') warnings.push(`${tag}: address looks like a mailbox or care-of line but is typed operating-office`);
    }
    for (const c of p.publicContactPeople || []) {
      if (!validDay(c.reviewedAt)) errors.push(`${tag}: reviewedAt for ${c.name} invalid`);
      else if (c.reviewedAt > todayIso) errors.push(`${tag}: reviewedAt for ${c.name} is in the future`);
    }
    if (p.editorialUpdatedAt > todayIso) errors.push(`${tag}: editorialUpdatedAt is in the future`);
    if (p.publicationStatus !== 'published') continue;
    // Publication basis.
    if (!(p.investmentEvidence || []).length) errors.push(`${tag}: published without investment evidence`);
    if (!p.sectors.length && !p.stages.length && !p.investmentGeographies.length && !p.publishedCheckRange) warnings.push(`${tag}: no published matching criteria at all; the profile can only ever be "needs more research"`);
    if (!p.publishedCheckRange) warnings.push(`${tag}: check size not published (incomplete, not a reason to invent one)`);
    if (!p.businessAddress) warnings.push(`${tag}: no published business address`);
    if (p.recipientRoutingStatus === 'confirmed' && !p.recipientRoutingEvidence) errors.push(`${tag}: routing confirmed without evidence`);
    if (p.paperPitchPolicy !== 'unknown' && !p.paperPitchEvidence) errors.push(`${tag}: paper pitch policy without evidence`);
    if (p.sectors.length && !p.sectors.includes('agnostic') && !p.sectorScope) warnings.push(`${tag}: sectorScope not set; treated as named examples`);
    if (p.investmentGeographies.length && !p.investmentGeographies.includes('global') && !p.geographyScope) warnings.push(`${tag}: geographyScope not set; treated as named examples`);
    if (p.publishedCheckRange && !p.publishedCheckRange.constraint) warnings.push(`${tag}: check constraint not set; treated as typical`);
    if (p.publishedCheckRange && p.publishedCheckRange.currency !== 'USD') warnings.push(`${tag}: check published in ${p.publishedCheckRange.currency}; not compared with USD targets`);
    // Re-check queue.
    const checked = data.criteriaCheckedAt(p);
    for (const field of [...CRITERIA, 'publishedCheckRange']) {
      if (!checked[field]) continue;
      const limit = field === 'publishedCheckRange' ? core.REVIEW_INTERVALS.check : core.REVIEW_INTERVALS.mandate;
      const age = daysAgo(checked[field], todayIso);
      if (age > limit) review.push({ slug: p.slug, field, checkedAt: checked[field], ageDays: age, policyDays: limit });
    }
    for (const c of p.publicContactPeople || []) {
      const age = daysAgo(c.reviewedAt, todayIso);
      if (age > core.REVIEW_INTERVALS.role) review.push({ slug: p.slug, field: 'role:' + c.name, checkedAt: c.reviewedAt, ageDays: age, policyDays: core.REVIEW_INTERVALS.role });
    }
    if (p.businessAddress) {
      const age = daysAgo(p.businessAddress.checkedAt, todayIso);
      if (age > core.REVIEW_INTERVALS.address) review.push({ slug: p.slug, field: 'businessAddress', checkedAt: p.businessAddress.checkedAt, ageDays: age, policyDays: core.REVIEW_INTERVALS.address });
    }
  }
  // Public artifact hygiene.
  let publishedCount = null;
  let bundleCount = null;
  try {
    const { html } = build({ write: false });
    const rendered = (html.match(/class="im-row"/g) || []).length;
    const start = html.indexOf('<script id="investor-data" type="application/json">') + 52;
    const bundle = JSON.parse(html.slice(start, html.indexOf('</script>', start)));
    publishedCount = published.length; bundleCount = bundle.profiles.length;
    if (rendered !== published.length || bundle.profiles.length !== published.length) errors.push(`published count mismatch: data ${published.length}, rows ${rendered}, bundle ${bundle.profiles.length}`);
    if (!html.includes(`<span>${published.length} investment profiles</span>`)) errors.push('page counter does not equal the published count');
    for (const key of PRIVATE_KEYS) if (html.includes(key)) errors.push(`private field "${key}" appears in the public artifact`);
    if (/"publicationStatus":"(draft|hidden)"/.test(html)) errors.push('draft or hidden status appears in the public artifact');
    const privateDir = path.join(data.PRIVATE_DIR, 'queue');
    if (fs.existsSync(privateDir)) for (const f of fs.readdirSync(privateDir)) {
      const slug = f.replace(/\.json$/, '');
      if (html.includes(`id="${slug}"`) && !published.some(p => p.slug === slug)) errors.push(`queued draft ${slug} appears in the public artifact`);
    }
  } catch (error) { errors.push('build failed: ' + error.message); }
  const stale = review.filter(r => published.some(p => p.slug === r.slug));
  return { today: todayIso, profiles: profiles.length, published: publishedCount, bundle: bundleCount,
    withAddress: published.filter(p => p.businessAddress).length,
    withCheck: published.filter(p => p.publishedCheckRange).length,
    routingConfirmed: published.filter(p => p.recipientRoutingStatus === 'confirmed').length,
    paperAccepted: published.filter(p => p.paperPitchPolicy === 'accepted').length,
    paperNotAccepted: published.filter(p => p.paperPitchPolicy === 'not-accepted').length,
    errors, warnings, reviewRecommended: stale };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const today = args.includes('--today') ? args[args.indexOf('--today') + 1] : undefined;
  const report = run({ today });
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Investor Match quality check (${report.today}): ${report.published} published of ${report.profiles}; ${report.withAddress} with address; ${report.withCheck} with check; ${report.routingConfirmed} routing confirmed; ${report.paperAccepted} paper accepted, ${report.paperNotAccepted} not accepted.`);
    console.log(`Errors: ${report.errors.length}. Warnings: ${report.warnings.length}. Review recommended: ${report.reviewRecommended.length}.`);
    report.errors.forEach(e => console.log('  ERROR ' + e));
    report.warnings.forEach(w => console.log('  warn  ' + w));
    report.reviewRecommended.forEach(r => console.log(`  review ${r.slug} ${r.field}: checked ${r.checkedAt}, ${r.ageDays} days old (policy ${r.policyDays})`));
  }
  if (report.errors.length) process.exitCode = 1;
}

module.exports = { run };
