#!/usr/bin/env node
// Local import of permitted CSV or JSON files into draft investor profiles.
// Nothing is published by this script: candidates land in data/investors/private/queue/
// as drafts with a row-numbered error report. Run with --dry-run to validate only.
//
//   node scripts/import-investors.cjs --file owner-list.csv --mapping data/investors/import-mapping.example.json --dry-run
//   node scripts/import-investors.cjs --file owner-list.json --rights "Owner's own research, 2026-09-17"
//
// The --rights note is mandatory: an export from a third-party service is not by itself
// a right to publish, build a derivative directory or serve clients with it.
const fs = require('node:fs');
const path = require('node:path');
const core = require('../assets/investor-match-core.js');
const data = require('./lib/investors-data.cjs');

const LIST_FIELDS = ['sectors', 'stages', 'investmentGeographies'];
const DEFAULT_MAPPING = {
  displayName: 'name', entityType: 'entity_type', investorType: 'investor_type', organisationName: 'organisation',
  officialWebsite: 'website', summary: 'summary', sectors: 'sectors', stages: 'stages',
  investmentGeographies: 'investment_geographies', checkMin: 'check_min', checkMax: 'check_max', checkCurrency: 'check_currency',
  pitchUrl: 'pitch_url', sourceUrl: 'source_url', sourceTitle: 'source_title', sourcePublisher: 'source_publisher', checkedAt: 'checked_at'
};

function args() {
  const out = { dryRun: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--file') out.file = argv[++i];
    else if (a === '--mapping') out.mapping = argv[++i];
    else if (a === '--rights') out.rights = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else throw new Error(`Unknown argument ${a}`);
  }
  if (!out.file) throw new Error('--file is required');
  return out;
}

// Minimal RFC 4180 parser: quotes, escaped quotes, CRLF.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows.filter(r => r.some(v => v.trim()));
  return body.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

function slugify(name) {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return null; }
}
function splitList(value) {
  return String(value || '').split(/[;|,]/).map(v => v.trim().toLowerCase()).filter(Boolean);
}

function toProfile(record, mapping, meta, rowNumber) {
  const get = key => { const column = mapping[key]; return column ? String(record[column] ?? '').trim() : ''; };
  const errors = [];
  const name = get('displayName');
  if (!name) errors.push(`row ${rowNumber}: name is required`);
  const website = get('officialWebsite');
  if (!data.isUrl(website)) errors.push(`row ${rowNumber}: website must be an http(s) URL`);
  const sourceUrl = get('sourceUrl') || website;
  const checkedAt = get('checkedAt') || meta.today;
  if (!data.DAY.test(checkedAt)) errors.push(`row ${rowNumber}: checked_at must be YYYY-MM-DD`);
  const lists = {};
  for (const field of LIST_FIELDS) {
    const dictionary = { sectors: core.SECTORS, stages: core.STAGES, investmentGeographies: core.REGIONS }[field];
    lists[field] = splitList(get(field));
    lists[field].forEach(v => { if (!Object.hasOwn(dictionary, v)) errors.push(`row ${rowNumber}: ${field} value "${v}" is not in the dictionary`); });
  }
  const min = get('checkMin'), max = get('checkMax');
  let range = null;
  if (min || max) {
    const currency = (get('checkCurrency') || 'USD').toUpperCase();
    const n = v => (v === '' ? null : Number(v.replace(/[,\s]/g, '')));
    range = { min: n(min), max: n(max), currency, sourceId: 'import-1' };
    if ([range.min, range.max].some(v => v != null && (!Number.isFinite(v) || v < 0))) errors.push(`row ${rowNumber}: check_min and check_max must be non-negative numbers`);
    if (range.min != null && range.max != null && range.min > range.max) errors.push(`row ${rowNumber}: check_min above check_max`);
  }
  const investorType = (get('investorType') || 'vc').toLowerCase();
  const entityType = (get('entityType') || 'organisation').toLowerCase();
  const pitchUrl = get('pitchUrl');
  const profile = {
    id: `${entityType === 'person' ? 'person' : 'org'}-${slugify(name)}`,
    slug: slugify(name),
    displayName: name,
    entityType,
    investorType,
    organisationId: null,
    organisationName: get('organisationName') || null,
    officialWebsite: website,
    summary: get('summary') || '',
    sectors: lists.sectors,
    stages: lists.stages,
    investmentGeographies: lists.investmentGeographies,
    publishedCheckRange: range,
    fieldEvidence: Object.fromEntries(LIST_FIELDS.filter(f => lists[f].length).map(f => [f, ['import-1']])),
    publicContactPeople: [],
    investmentEvidence: [],
    preferredPitchChannel: pitchUrl ? { type: 'online-form', url: pitchUrl, sourceId: 'import-1' } : null,
    businessAddress: null,
    recipientRoutingStatus: 'not-confirmed',
    paperPitchPolicy: 'unknown',
    editorialUpdatedAt: checkedAt,
    publicationStatus: 'draft',
    sources: [{ id: 'import-1', url: sourceUrl, publisher: get('sourcePublisher') || name, title: get('sourceTitle') || 'Imported source, to be verified', publishedAt: null, checkedAt, supportsFields: [...LIST_FIELDS.filter(f => lists[f].length), ...(range ? ['publishedCheckRange'] : [])] }],
    importSource: { file: meta.file, row: rowNumber, importedAt: meta.today, rights: meta.rights },
    internalReview: { status: 'needs-verification', notes: 'Imported. Verify every field on the official website before publication.' }
  };
  // Draft-level validation: the full schema still applies before publication.
  const schema = data.validateProfile({ ...profile, summary: profile.summary || 'x '.repeat(40).trim() }, `row ${rowNumber}`)
    .filter(e => !/summary|investmentEvidence/.test(e));
  return { profile, errors: [...errors, ...schema] };
}

// Fills only empty fields of an existing draft from a fresh import row and reports what changed.
const MERGEABLE = ['organisationName', 'officialWebsite', 'summary', 'sectors', 'stages', 'investmentGeographies', 'publishedCheckRange', 'preferredPitchChannel'];
function mergeDraft(current, incoming) {
  const profile = JSON.parse(JSON.stringify(current));
  const changes = [];
  const isEmpty = v => v == null || v === '' || (Array.isArray(v) && !v.length);
  for (const field of MERGEABLE) {
    if (isEmpty(profile[field]) && !isEmpty(incoming[field])) {
      profile[field] = incoming[field];
      changes.push({ field, from: current[field], to: incoming[field] });
      if (LIST_FIELDS.includes(field)) profile.fieldEvidence = { ...(profile.fieldEvidence || {}), [field]: ['import-1'] };
    } else if (!isEmpty(profile[field]) && !isEmpty(incoming[field]) && JSON.stringify(profile[field]) !== JSON.stringify(incoming[field])) {
      const conflicts = (profile.internalReview || {}).conflicts || [];
      const known = conflicts.some(c => c.field === field && JSON.stringify(c.import) === JSON.stringify(incoming[field]));
      if (!known) {
        profile.internalReview = { ...(profile.internalReview || {}), conflicts: [...conflicts, { field, draft: current[field], import: incoming[field] }] };
        changes.push({ field, kept: current[field], importedDiffers: incoming[field] });
      }
    }
  }
  profile.publicationStatus = current.publicationStatus; // never changed by an import
  profile.importSource = { ...current.importSource, lastImportedAt: incoming.importSource.importedAt, row: incoming.importSource.row };
  return { profile, changes };
}

function duplicates(profile, existing) {
  const domain = domainOf(profile.officialWebsite);
  const hits = [];
  for (const other of existing) {
    const sameDomain = domain && domainOf(other.officialWebsite) === domain;
    const sameName = other.displayName.toLowerCase() === profile.displayName.toLowerCase();
    if (profile.entityType === 'organisation' && other.entityType === 'organisation' && (sameDomain || sameName)) {
      hits.push({ slug: other.slug, reason: sameDomain && sameName ? 'same domain and name' : sameDomain ? 'same domain, different name: manual review' : 'same name, different domain: manual review' });
    } else if (profile.entityType === 'person' && other.entityType === 'person' && sameName) {
      const sameOrg = (profile.organisationName || '').toLowerCase() === (other.organisationName || '').toLowerCase();
      hits.push({ slug: other.slug, reason: sameOrg ? 'same person and organisation' : 'same name, different organisation: manual review' });
    }
    // Several people on one organisation domain are not duplicates of each other.
  }
  return hits;
}

function main() {
  const options = args();
  if (!options.dryRun && !options.rights) throw new Error('--rights "<who granted what use>" is required to write drafts. Use --dry-run to validate only.');
  const mapping = { ...DEFAULT_MAPPING, ...(options.mapping ? JSON.parse(fs.readFileSync(options.mapping, 'utf8')) : {}) };
  const text = fs.readFileSync(options.file, 'utf8');
  const records = options.file.endsWith('.json') ? JSON.parse(text) : parseCsv(text);
  if (!Array.isArray(records)) throw new Error('JSON import must be a list of records');
  const today = new Date().toISOString().slice(0, 10);
  const meta = { file: path.basename(options.file), rights: options.rights || null, today };
  const existing = [...data.loadProfiles().profiles];
  const queueDir = options.out || path.join(data.PRIVATE_DIR, 'queue');
  if (fs.existsSync(queueDir)) existing.push(...data.loadProfiles(queueDir).profiles);
  const report = { file: meta.file, rows: records.length, valid: 0, invalid: 0, duplicates: 0, unchanged: 0, updated: 0, written: 0, errors: [], review: [], diff: [] };
  const drafts = [];
  const queued = new Map(fs.existsSync(queueDir) ? data.loadProfiles(queueDir).profiles.map(p => [p.slug, p]) : []);
  const editorial = new Set(data.loadProfiles().profiles.map(p => p.slug));
  records.forEach((record, i) => {
    const rowNumber = i + 2; // header is row 1
    const { profile, errors } = toProfile(record, mapping, meta, rowNumber);
    if (errors.length) { report.invalid++; report.errors.push(...errors); return; }
    // Re-import of the same draft: merge only fields the draft leaves empty, never touch its status or edits.
    if (queued.has(profile.slug) && (queued.get(profile.slug).importSource || {}).file === meta.file) {
      const current = queued.get(profile.slug);
      const merged = mergeDraft(current, profile);
      if (!merged.changes.length) { report.unchanged++; return; }
      report.updated++;
      report.diff.push({ row: rowNumber, slug: profile.slug, changes: merged.changes });
      drafts.push(merged.profile);
      return;
    }
    // An editorial profile (published or hidden) with the same slug is never overwritten or re-published by an import.
    if (editorial.has(profile.slug)) { report.duplicates++; report.review.push({ row: rowNumber, slug: profile.slug, matches: [{ slug: profile.slug, reason: 'editorial profile exists; imports never change its status or content' }] }); return; }
    const dupes = duplicates(profile, existing);
    if (dupes.length) { report.duplicates++; report.review.push({ row: rowNumber, slug: profile.slug, matches: dupes }); return; }
    report.valid++;
    drafts.push(profile);
    existing.push(profile);
  });
  if (!options.dryRun) {
    fs.mkdirSync(queueDir, { recursive: true });
    for (const draft of drafts) {
      fs.writeFileSync(path.join(queueDir, `${draft.slug}.json`), JSON.stringify(draft, null, 2) + '\n');
      report.written++;
    }
  }
  console.log(JSON.stringify(report, null, 2));
  console.log(options.dryRun ? 'Dry run: nothing written.' : `${report.written} draft(s) written to ${queueDir}. Drafts are never published automatically.`);
  if (report.invalid) process.exitCode = 1;
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exit(2); }
}
module.exports = { parseCsv, toProfile, duplicates, mergeDraft, DEFAULT_MAPPING };
