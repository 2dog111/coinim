// Investor Match: matching rules, data validity, bundle hygiene and import validation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const core = require('../assets/investor-match-core.js');
const data = require('./lib/investors-data.cjs');
const { build } = require('./build-investors.cjs');
const importer = require('./import-investors.cjs');

const base = {
  id: 'org-test', slug: 'test', displayName: 'Test', entityType: 'organisation', investorType: 'vc', publicationStatus: 'published',
  sectors: ['b2b-software'], stages: ['seed'], investmentGeographies: ['europe'], sectorScope: 'examples', geographyScope: 'examples',
  publishedCheckRange: { min: 100000, max: 500000, currency: 'USD', constraint: 'typical', sourceId: 's1' },
  fieldEvidence: { sectors: ['s1'], stages: ['s1'], investmentGeographies: ['s1'] },
  criteriaCheckedAt: { sectors: '2026-09-17', stages: '2026-09-17', investmentGeographies: '2026-09-17', publishedCheckRange: '2026-09-17' },
  editorialUpdatedAt: '2026-09-17'
};
const T = '2026-09-17';

// 1. No criteria: Browse, never a full match.
assert.equal(core.evaluate(base, {}, T).verdict, null);
assert.deepEqual(core.evaluate(base, {}, T).facts, []);
assert.equal(core.evaluate(base, { stage: 'seed' }, T).verdict, 'match');
assert.equal(core.evaluate(base, { stage: 'seed' }, T).facts[0].reasonCode, 'stage-listed');
assert.deepEqual(core.evaluate(base, { stage: 'seed' }, T).facts[0].sourceIds, ['s1']);
assert.equal(core.evaluate(base, { stage: 'series-a' }, T).verdict, 'mismatch');

// 2. Missing value: unknown, not mismatch. Named examples: unknown; exhaustive list: mismatch.
assert.equal(core.evaluate({ ...base, sectors: [] }, { sector: 'fintech' }, T).verdict, 'unknown');
assert.equal(core.evaluate(base, { sector: 'climate' }, T).facts[0].reasonCode, 'sector-not-listed');
assert.equal(core.evaluate(base, { sector: 'climate' }, T).verdict, 'unknown');
assert.equal(core.evaluate({ ...base, sectorScope: 'exhaustive' }, { sector: 'climate' }, T).verdict, 'mismatch');
assert.equal(core.evaluate({ ...base, sectors: ['agnostic'] }, { sector: 'climate' }, T).verdict, 'match');
assert.equal(core.evaluate(base, { country: 'US' }, T).verdict, 'unknown');
assert.equal(core.evaluate({ ...base, geographyScope: 'exhaustive' }, { country: 'US' }, T).verdict, 'mismatch');
assert.equal(core.evaluate({ ...base, investmentGeographies: [] }, { country: 'US' }, T).verdict, 'unknown');
assert.equal(core.evaluate(base, { country: 'ZZ' }, T).verdict, 'unknown');

// 3. A historical deal never substitutes for the mandate: evidence is not read by evaluate.
const biotechDeal = { ...base, sectors: [], investmentEvidence: [{ company: 'BioCo', fact: 'seed 2019' }], portfolio: ['BioCo'] };
assert.equal(core.evaluate(biotechDeal, { sector: 'biotech' }, T).verdict, 'unknown');

// 4. Office country never substitutes for investment geography.
assert.equal(core.evaluate({ ...base, investmentGeographies: [], officeCountry: 'US', businessAddress: { country: 'US' } }, { country: 'US' }, T).verdict, 'unknown');
assert.equal(core.evaluate(base, { country: 'DE' }, T).verdict, 'match');
assert.equal(core.evaluate({ ...base, investmentGeographies: ['global'] }, { country: 'NG' }, T).verdict, 'match');

// 5. Typical check outside the guide: unknown with explanation, not a refusal. 6. Hard limit and boundaries.
const outside = core.evaluate(base, { checkUsd: 750000 }, T);
assert.equal(outside.verdict, 'unknown');
assert.equal(outside.facts[0].reasonCode, 'check-outside-typical');
assert.match(outside.facts[0].text, /not a stated refusal/);
assert.equal(core.evaluate({ ...base, publishedCheckRange: { ...base.publishedCheckRange, constraint: 'hard' } }, { checkUsd: 750000 }, T).verdict, 'mismatch');
assert.equal(core.evaluate(base, { checkUsd: 100000 }, T).verdict, 'match');
assert.equal(core.evaluate(base, { checkUsd: 500000 }, T).verdict, 'match');
assert.equal(core.evaluate(base, { checkUsd: 99999 }, T).verdict, 'unknown');
assert.equal(core.evaluate({ ...base, publishedCheckRange: { min: null, max: 250000, currency: 'USD', constraint: 'hard' } }, { checkUsd: 10 }, T).verdict, 'match');
assert.equal(core.evaluate({ ...base, publishedCheckRange: { min: null, max: 250000, currency: 'USD', constraint: 'hard' } }, { checkUsd: 250001 }, T).verdict, 'mismatch');
assert.equal(core.evaluate({ ...base, publishedCheckRange: { min: 1000000, max: null, currency: 'USD' } }, { checkUsd: 999999 }, T).verdict, 'unknown');
// A single published amount is a guide, not a wall.
const single = core.evaluate({ ...base, publishedCheckRange: { min: 250000, max: 250000, currency: 'USD', constraint: 'typical' } }, { checkUsd: 300000 }, T);
assert.equal(single.verdict, 'unknown');
assert.match(single.facts[0].text, /typical amount/);

// 7. Currencies are never compared as equal.
const euro = core.evaluate({ ...base, publishedCheckRange: { min: 100000, max: 500000, currency: 'EUR' } }, { checkUsd: 250000 }, T);
assert.equal(euro.verdict, 'unknown');
assert.equal(euro.facts[0].reasonCode, 'check-other-currency');
assert.equal(core.formatCheck({ min: 100000, max: 500000, currency: 'EUR' }), '€100,000 to €500,000');

// 8. An empty check is not zero; bad input is explicit.
assert.equal(core.evaluate({ ...base, publishedCheckRange: null }, { checkUsd: '' }, T).verdict, null);
assert.equal(core.evaluate({ ...base, publishedCheckRange: null }, { checkUsd: 250000 }, T).verdict, 'unknown');
assert.deepEqual(core.parseTargetCheck(''), { value: null });
assert.deepEqual(core.parseTargetCheck(' 250000 '), { value: 250000 });
for (const bad of ['0', '-5', 'abc', '250,000', '1e6', '2.5', 'NaN', '100000001']) assert.ok(core.parseTargetCheck(bad).error, bad);
assert.equal(core.evaluate(base, { checkUsd: '0' }, T).verdict, null);
assert.equal(core.evaluate(base, { checkUsd: 'abc' }, T).verdict, null);

// Stale sources keep their state but are flagged.
const stale = core.evaluate({ ...base, criteriaCheckedAt: { ...base.criteriaCheckedAt, stages: '2026-01-01' } }, { stage: 'seed' }, '2026-09-17');
assert.equal(stale.verdict, 'match');
assert.equal(stale.stale, true);
assert.match(stale.facts[0].text, /review recommended/);
assert.equal(core.evaluate(base, { stage: 'seed' }, '2026-12-01').stale, false);
assert.equal(core.evaluate(base, { stage: 'seed' }, '2027-06-01').stale, true);

// Repository: name order in browse mode, verdict groups with criteria, hidden mismatches, page reset, counts.
const repo = core.createRepository([
  { ...base, id: 'b', slug: 'b', displayName: 'Beta Angels', stages: ['seed'] },
  { ...base, id: 'a', slug: 'a', displayName: 'alpha Ventures', stages: ['pre-seed'] },
  { ...base, id: 'c', slug: 'c', displayName: 'Charlie Fund', stages: [] },
  { ...base, id: 'd', slug: 'd', displayName: 'Draft Fund', publicationStatus: 'draft' },
  { ...base, id: 'h', slug: 'h', displayName: 'Hidden Fund', publicationStatus: 'hidden' }
]);
assert.equal(repo.getPublishedInvestorCount(), 3);
assert.deepEqual(repo.listInvestors({}, {}).items.map(i => i.profile.id), ['a', 'b', 'c']);
assert.equal(repo.listInvestors({}, {}).hasCriteria, false);
const seed = repo.listInvestors({ stage: 'seed' }, {});
assert.deepEqual(seed.items.map(i => i.profile.id), ['b', 'c']);
assert.deepEqual(seed.counts, { match: 1, unknown: 1, mismatch: 0 });
assert.equal(seed.hiddenMismatches, 1);
assert.deepEqual(repo.listInvestors({ stage: 'seed', includeMismatches: true }, {}).items.map(i => i.profile.id), ['b', 'c', 'a']);
assert.equal(repo.listInvestors({ query: 'charlie' }, {}).total, 1);
assert.equal(repo.listInvestors({}, { page: 9, perPage: 2 }).page, 2);
assert.equal(repo.getInvestorBySlug('d'), null);
assert.equal(repo.listInvestors({ checkUsd: '0' }, {}).hasCriteria, false);

// 9. Empty results suggest only real recounts. 10. Suppression is not a filter to relax (no such filter exists).
const strict = core.createRepository([
  { ...base, id: 'b', slug: 'b', displayName: 'Beta', stages: ['seed'], sectorScope: 'exhaustive' },
  { ...base, id: 'a', slug: 'a', displayName: 'Alpha', stages: ['pre-seed'], sectorScope: 'exhaustive' },
  { ...base, id: 'c', slug: 'c', displayName: 'Charlie', stages: ['seed'], sectors: ['fintech'], sectorScope: 'exhaustive', publicationStatus: 'hidden' }
]);
assert.equal(strict.listInvestors({ stage: 'series-a', sector: 'fintech', checkUsd: 250000 }, {}).total, 0);
const relax = strict.suggestRelaxations({ stage: 'series-a', sector: 'fintech', checkUsd: 250000 });
assert.deepEqual(relax, []); // removing one filter still leaves a contradiction on the other
const relax2 = strict.suggestRelaxations({ stage: 'series-a', checkUsd: 250000 });
assert.deepEqual(relax2.map(s => [s.key, s.count]), [['stage', 2]]); // the hidden profile never counts
assert.deepEqual(strict.suggestRelaxations({ stage: 'seed', sector: 'b2b-software' }).map(s => s.key), ['stage']); // only the filter that actually adds results
assert.ok(relax2.every(s => ['sector', 'stage', 'country', 'checkUsd'].includes(s.key)));

// Real data: valid, and the published counter equals the rendered rows and the bundle.
const loaded = data.loadProfiles();
assert.deepEqual(loaded.errors, [], loaded.errors.join('\n'));
const { html, published } = build({ write: false });
assert.equal((html.match(/class="im-row"/g) || []).length, published.length);
assert.ok(html.includes(`<span>${published.length} investment profiles</span>`));
const bundle = JSON.parse(html.slice(html.indexOf('<script id="investor-data" type="application/json">') + 52, html.indexOf('</script>', html.indexOf('<script id="investor-data"'))));
assert.equal(bundle.profiles.length, published.length);
assert.ok(bundle.profiles.every(p => p.publicationStatus === 'published'));
for (const key of ['privateNotes', 'importSource', 'internalReview', 'suppression', 'reviewNotes', 'rightsNote']) assert.ok(!html.includes(key), `${key} leaked into the page`);
assert.ok(!html.includes('"publicationStatus":"draft"') && !html.includes('"publicationStatus":"hidden"'));
// Every published profile in the bundle carries per-field sources and check dates for the matching criteria.
for (const p of bundle.profiles) {
  for (const field of ['sectors', 'stages', 'investmentGeographies']) if (p[field].length) assert.ok(p.fieldEvidence[field] && p.fieldEvidence[field].length && p.criteriaCheckedAt[field], `${p.slug} ${field} evidence`);
  if (p.publishedCheckRange) assert.ok(p.publishedCheckRange.sourceId && p.criteriaCheckedAt.publishedCheckRange, `${p.slug} check evidence`);
  assert.ok(p.sources.every(s => /^https?:/.test(s.url)));
}
assert.ok(!/javascript:/i.test(html));
assert.ok(!/href="(?!https?:|#|\/|mailto:|sms:|whatsapp:)/.test(html), 'unexpected link scheme');
for (const p of published) {
  assert.ok(html.includes(`id="${p.slug}"`));
  if (p.paperPitchPolicy === 'not-accepted') assert.ok(html.includes('excluded from any paper plan'));
  if (!p.businessAddress) assert.ok(html.includes('Address not yet verified'));
}
assert.equal(fs.readFileSync(path.join(__dirname, '..', 'investors', 'index.html'), 'utf8'), fs.readFileSync(path.join(__dirname, '..', 'investors.html'), 'utf8'), 'investors mirror differs');
assert.equal(fs.readFileSync(path.join(__dirname, '..', 'investors', 'index.html'), 'utf8'), html, 'investors/index.html is stale: run node scripts/build-investors.cjs');

// Validator catches the important omissions.
const sample = JSON.parse(fs.readFileSync(path.join(data.PROFILES_DIR, 'hustle-fund.json'), 'utf8'));
assert.deepEqual(data.validateProfile(sample), []);
assert.ok(data.validateProfile({ ...sample, fieldEvidence: {} }).some(e => /fieldEvidence.sectors/.test(e)));
assert.ok(data.validateProfile({ ...sample, recipientRoutingStatus: 'confirmed' }).some(e => /recipientRoutingEvidence/.test(e)));
assert.ok(data.validateProfile({ ...sample, paperPitchPolicy: 'accepted' }).some(e => /paperPitchEvidence/.test(e)));
assert.ok(data.validateProfile({ ...sample, investmentEvidence: [{ ...sample.investmentEvidence[0], eventDate: '2026-05', datePrecision: 'day' }] }).some(e => /datePrecision/.test(e)));
assert.ok(data.validateProfile({ ...sample, officialWebsite: 'javascript:alert(1)' }).some(e => /officialWebsite/.test(e)));

// Import: row numbers in errors, dictionary checks, duplicates to manual review, dry run writes nothing.
const rows = importer.parseCsv('name,website,sectors,stages,check_min,check_max\n"Acme, Ventures",https://acme.example,b2b-software;nope,seed,10,5\nHustle Fund,https://www.hustlefund.vc/,ai,seed,,\n');
const meta = { file: 'x.csv', rights: 'test', today: '2026-09-17' };
const bad = importer.toProfile(rows[0], importer.DEFAULT_MAPPING, meta, 2);
assert.ok(bad.errors.some(e => /row 2: sectors value "nope"/.test(e)));
assert.ok(bad.errors.some(e => /row 2: check_min above check_max/.test(e)));
const dupe = importer.toProfile(rows[1], importer.DEFAULT_MAPPING, meta, 3);
assert.deepEqual(dupe.errors, []);
assert.equal(dupe.profile.publicationStatus, 'draft');
assert.equal(importer.duplicates(dupe.profile, loaded.profiles)[0].reason, 'same domain and name');
assert.deepEqual(importer.duplicates({ ...dupe.profile, entityType: 'person', displayName: 'Someone Else' }, loaded.profiles), []);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'im-import-'));
const { execFileSync } = require('node:child_process');
const out = execFileSync('node', [path.join(__dirname, 'import-investors.cjs'), '--file', path.join(__dirname, '..', 'data', 'investors', 'import-template.csv'), '--dry-run', '--out', tmp], { encoding: 'utf8' });
assert.match(out, /Dry run: nothing written/);
assert.deepEqual(fs.readdirSync(tmp), []);
fs.rmSync(tmp, { recursive: true });

console.log(`Investor Match: matching rules, ${published.length} published profiles, bundle hygiene and import validation pass.`);

// Repeated import: no duplicates, editorial fixes kept, hidden never re-published, conflicts recorded.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-reimport-'));
  const csv = path.join(dir, 'list.csv');
  fs.writeFileSync(csv, 'name,website,sectors,stages,check_min,check_max\nReimport Fund,https://reimport.example,fintech,seed,100000,300000\n');
  const run = extra => execFileSync('node', [path.join(__dirname, 'import-investors.cjs'), '--file', csv, '--rights', 'test', '--out', dir, ...extra], { encoding: 'utf8' });
  run([]);
  const file = path.join(dir, 'reimport-fund.json');
  const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(draft.publicationStatus, 'draft');
  draft.summary = 'Editorial summary written by hand.';
  draft.publicationStatus = 'hidden';
  draft.sectors = ['fintech', 'ai'];
  fs.writeFileSync(file, JSON.stringify(draft, null, 2));
  const second = run([]);
  assert.equal(fs.readdirSync(dir).filter(f => f.endsWith('.json')).length, 1, 'no duplicate file');
  const after = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(after.summary, 'Editorial summary written by hand.');
  assert.equal(after.publicationStatus, 'hidden');
  assert.deepEqual(after.sectors, ['fintech', 'ai']);
  assert.ok(after.internalReview.conflicts.some(c => c.field === 'sectors'), 'conflict recorded for the editor');
  assert.match(second, /"updated": 1/);
  assert.match(second, /importedDiffers/);
  const third = run([]);
  assert.match(third, /"unchanged": 1/);
  // A slug that exists as an editorial profile is refused for manual review.
  fs.writeFileSync(csv, 'name,website,sectors,stages\nHustle Fund,https://www.hustlefund.vc/,ai,seed\n');
  assert.match(run([]), /editorial profile exists/);
  fs.rmSync(dir, { recursive: true });
}

// Quality check: the real data has no errors, and synthetic problems are caught.
const quality = require('./quality-check-investors.cjs').run({ today: '2026-09-17' });
assert.deepEqual(quality.errors, [], quality.errors.join('\n'));
assert.equal(quality.published, published.length);
assert.equal(require('./quality-check-investors.cjs').run({ today: '2027-06-01' }).reviewRecommended.length > 0, true);

console.log('Investor Match: re-import idempotency and quality check pass.');
