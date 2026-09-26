// Loads and validates the editorial investor profiles.
// Public profiles live in data/investors/profiles/*.json. Drafts, import sources,
// rights notes and the suppression list stay in data/investors/private/ (ignored by Git).
const fs = require('node:fs');
const path = require('node:path');
const core = require('../../assets/investor-match-core.js');

const root = path.resolve(__dirname, '..', '..');
const PROFILES_DIR = path.join(root, 'data', 'investors', 'profiles');
const PRIVATE_DIR = path.join(root, 'data', 'investors', 'private');

const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;          // year, month or day precision
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTING = ['not-confirmed', 'confirmed'];
const PAPER = ['accepted', 'not-accepted', 'unknown'];
const STATUS = ['draft', 'published', 'hidden'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'INR', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'ILS', 'BRL'];
const CRITERIA_FIELDS = ['sectors', 'stages', 'investmentGeographies', 'publishedCheckRange'];

function isUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch (_) { return false; }
}

function words(text) { return String(text || '').trim().split(/\s+/).filter(Boolean).length; }

// Returns a list of error strings for one profile object. Empty list means valid.
function validateProfile(p, context) {
  const errors = [];
  const at = (field, message) => errors.push(`${context || p.slug || '?'}: ${field}: ${message}`);
  const requireString = (field, max) => {
    if (typeof p[field] !== 'string' || !p[field].trim()) at(field, 'required text');
    else if (max && p[field].length > max) at(field, `longer than ${max} characters`);
  };
  const enumList = (field, dictionary, required) => {
    const list = p[field];
    if (list == null) { if (required) at(field, 'required'); return; }
    if (!Array.isArray(list)) return at(field, 'must be a list');
    list.forEach(v => { if (!Object.hasOwn(dictionary, v)) at(field, `unknown value "${v}"`); });
  };
  requireString('id', 80);
  requireString('slug', 80);
  if (typeof p.slug === 'string' && !SLUG.test(p.slug)) at('slug', 'lowercase letters, digits and hyphens only');
  requireString('displayName', 200);
  if (!['person', 'organisation'].includes(p.entityType)) at('entityType', 'person or organisation');
  if (!Object.hasOwn(core.INVESTOR_TYPES, p.investorType)) at('investorType', `unknown "${p.investorType}"`);
  if (p.organisationId != null && typeof p.organisationId !== 'string') at('organisationId', 'string or null');
  if (p.organisationName != null && typeof p.organisationName !== 'string') at('organisationName', 'string or null');
  if (p.entityType === 'person' && p.organisationId && !p.organisationName) at('organisationName', 'required when organisationId is set');
  requireString('officialWebsite', 2048);
  if (typeof p.officialWebsite === 'string' && !isUrl(p.officialWebsite)) at('officialWebsite', 'must be an http(s) URL');
  requireString('summary', 1200);
  const count = words(p.summary);
  if (count && (count < 40 || count > 80)) at('summary', `must be 40 to 80 words (has ${count})`);
  if (p.sectorScope != null && !['exhaustive', 'examples'].includes(p.sectorScope)) at('sectorScope', 'exhaustive or examples');
  if (p.geographyScope != null && !['exhaustive', 'examples'].includes(p.geographyScope)) at('geographyScope', 'exhaustive or examples');
  enumList('sectors', core.SECTORS, true);
  enumList('stages', core.STAGES, true);
  enumList('investmentGeographies', core.REGIONS, true);
  const sourceIds = new Set();
  if (!Array.isArray(p.sources) || !p.sources.length) at('sources', 'at least one source is required');
  else p.sources.forEach((s, i) => {
    const f = `sources[${i}]`;
    if (!s || typeof s !== 'object') return at(f, 'object required');
    if (typeof s.id !== 'string' || !s.id) at(f, 'id required');
    else if (sourceIds.has(s.id)) at(f, `duplicate source id "${s.id}"`);
    else sourceIds.add(s.id);
    if (typeof s.url !== 'string' || !isUrl(s.url)) at(f, 'url must be http(s)');
    if (typeof s.publisher !== 'string' || !s.publisher) at(f, 'publisher required');
    if (typeof s.title !== 'string' || !s.title) at(f, 'title required');
    if (s.publishedAt != null && !DATE.test(s.publishedAt)) at(f, 'publishedAt must be YYYY, YYYY-MM or YYYY-MM-DD');
    if (typeof s.checkedAt !== 'string' || !DAY.test(s.checkedAt)) at(f, 'checkedAt must be YYYY-MM-DD');
    if (s.supportsFields != null && !Array.isArray(s.supportsFields)) at(f, 'supportsFields must be a list');
  });
  const ref = (field, id) => { if (typeof id !== 'string' || !sourceIds.has(id)) at(field, `sourceId "${id}" is not in sources`); };
  const range = p.publishedCheckRange;
  if (range !== null && range !== undefined) {
    if (typeof range !== 'object') at('publishedCheckRange', 'object or null');
    else {
      if (range.min == null && range.max == null) at('publishedCheckRange', 'min or max required, or use null');
      ['min', 'max'].forEach(k => { if (range[k] != null && (typeof range[k] !== 'number' || range[k] < 0)) at('publishedCheckRange.' + k, 'non-negative number'); });
      if (range.min != null && range.max != null && range.min > range.max) at('publishedCheckRange', 'min above max');
      if (!CURRENCIES.includes(range.currency)) at('publishedCheckRange.currency', `unknown "${range.currency}"`);
      if (range.constraint != null && !['typical', 'hard'].includes(range.constraint)) at('publishedCheckRange.constraint', 'typical or hard');
      if (range.checkType != null && !['initial', 'follow-on', 'unknown'].includes(range.checkType)) at('publishedCheckRange.checkType', 'initial, follow-on or unknown');
      ref('publishedCheckRange.sourceId', range.sourceId);
    }
  } else if (range === undefined) at('publishedCheckRange', 'required (use null when not published)');
  // Every published criterion must point at a source.
  const evidence = p.fieldEvidence || {};
  CRITERIA_FIELDS.forEach(field => {
    const hasValue = field === 'publishedCheckRange' ? Boolean(range) : Array.isArray(p[field]) && p[field].length > 0;
    if (!hasValue) return;
    if (field === 'publishedCheckRange') return; // carries its own sourceId
    const ids = evidence[field];
    if (!Array.isArray(ids) || !ids.length) at('fieldEvidence.' + field, 'source ids required for a published value');
    else ids.forEach(id => ref('fieldEvidence.' + field, id));
  });
  (p.publicContactPeople || []).forEach((c, i) => {
    const f = `publicContactPeople[${i}]`;
    if (!c || typeof c.name !== 'string' || !c.name) at(f, 'name required');
    if (typeof c.role !== 'string' || !c.role) at(f, 'role required');
    ref(f + '.sourceId', c.sourceId);
    if (typeof c.reviewedAt !== 'string' || !DAY.test(c.reviewedAt)) at(f, 'reviewedAt must be YYYY-MM-DD');
  });
  if (!Array.isArray(p.investmentEvidence)) at('investmentEvidence', 'list required (may be empty)');
  else p.investmentEvidence.forEach((e, i) => {
    const f = `investmentEvidence[${i}]`;
    if (!e || typeof e.company !== 'string' || !e.company) at(f, 'company required');
    if (typeof e.fact !== 'string' || !e.fact) at(f, 'fact required');
    if (e.eventDate != null && !DATE.test(e.eventDate)) at(f, 'eventDate must be YYYY, YYYY-MM or YYYY-MM-DD');
    if (!['day', 'month', 'year', 'unknown'].includes(e.datePrecision)) at(f, 'datePrecision must be day, month, year or unknown');
    if (e.eventDate && e.datePrecision !== 'unknown') {
      const expected = { day: 10, month: 7, year: 4 }[e.datePrecision];
      if (e.eventDate.length !== expected) at(f, `eventDate does not match datePrecision "${e.datePrecision}"`);
    }
    if (!Array.isArray(e.sourceIds) || !e.sourceIds.length) at(f, 'sourceIds required');
    else e.sourceIds.forEach(id => ref(f + '.sourceIds', id));
  });
  const pitch = p.preferredPitchChannel;
  if (pitch !== null && pitch !== undefined) {
    if (!pitch || !Object.hasOwn(core.PITCH_CHANNELS, pitch.type)) at('preferredPitchChannel.type', 'unknown type');
    if (pitch && pitch.url != null && !isUrl(pitch.url) && !(pitch.type === 'email' && /^mailto:[^\s@]+@[^\s@]+$/.test(pitch.url))) at('preferredPitchChannel.url', 'must be http(s), or mailto: for a published email');
    if (pitch && pitch.type !== 'warm-intro' && !pitch.url) at('preferredPitchChannel.url', 'required for this channel type');
    if (pitch) ref('preferredPitchChannel.sourceId', pitch.sourceId);
  } else if (pitch === undefined) at('preferredPitchChannel', 'required (use null when not published)');
  const address = p.businessAddress;
  if (address !== null && address !== undefined) {
    if (!address || typeof address !== 'object') at('businessAddress', 'object or null');
    else {
      if (typeof address.organisation !== 'string' || !address.organisation) at('businessAddress.organisation', 'required');
      if (!Array.isArray(address.lines) || !address.lines.length) at('businessAddress.lines', 'at least one line');
      if (typeof address.city !== 'string' || !address.city) at('businessAddress.city', 'required');
      if (address.postalCode != null && typeof address.postalCode !== 'string') at('businessAddress.postalCode', 'string or null');
      if (!Object.hasOwn(core.COUNTRIES, address.country)) at('businessAddress.country', `unknown country code "${address.country}"`);
      if (!Object.hasOwn(core.ADDRESS_TYPES, address.addressType)) at('businessAddress.addressType', 'unknown type');
      ref('businessAddress.sourceId', address.sourceId);
      if (typeof address.checkedAt !== 'string' || !DAY.test(address.checkedAt)) at('businessAddress.checkedAt', 'must be YYYY-MM-DD');
    }
  } else if (address === undefined) at('businessAddress', 'required (use null when not published)');
  if (!ROUTING.includes(p.recipientRoutingStatus)) at('recipientRoutingStatus', 'not-confirmed or confirmed');
  if (p.recipientRoutingStatus === 'confirmed') {
    if (!address) at('recipientRoutingStatus', 'confirmed routing needs a business address');
    if (!p.recipientRoutingEvidence || !DAY.test(p.recipientRoutingEvidence.checkedAt || '')) at('recipientRoutingEvidence', 'dated evidence required for confirmed routing');
    else ref('recipientRoutingEvidence.sourceId', p.recipientRoutingEvidence.sourceId);
  }
  if (!PAPER.includes(p.paperPitchPolicy)) at('paperPitchPolicy', 'accepted, not-accepted or unknown');
  if (p.paperPitchPolicy !== 'unknown') {
    if (!p.paperPitchEvidence) at('paperPitchEvidence', 'sourceId required when the policy is published');
    else ref('paperPitchEvidence.sourceId', p.paperPitchEvidence.sourceId);
  }
  if (typeof p.editorialUpdatedAt !== 'string' || !DAY.test(p.editorialUpdatedAt)) at('editorialUpdatedAt', 'must be YYYY-MM-DD');
  if (!STATUS.includes(p.publicationStatus)) at('publicationStatus', 'draft, published or hidden');
  if (p.publicationStatus === 'published') {
    if (!Array.isArray(p.investmentEvidence) || !p.investmentEvidence.length) at('investmentEvidence', 'a published profile needs at least one dated investment fact or mandate source');
  }
  return errors;
}

function loadProfiles(dir) {
  const folder = dir || PROFILES_DIR;
  const files = fs.existsSync(folder) ? fs.readdirSync(folder).filter(f => f.endsWith('.json')).sort() : [];
  const profiles = [];
  const errors = [];
  for (const file of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8')); }
    catch (error) { errors.push(`${file}: invalid JSON (${error.message})`); continue; }
    const problems = validateProfile(data, file);
    if (data && data.slug && file !== `${data.slug}.json`) problems.push(`${file}: file name must be ${data.slug}.json`);
    errors.push(...problems);
    profiles.push(data);
  }
  const seen = new Map();
  for (const p of profiles) {
    for (const key of [['id', p.id], ['slug', p.slug]]) {
      const k = key.join(':');
      if (seen.has(k)) errors.push(`${p.slug}: duplicate ${key[0]} shared with ${seen.get(k)}`);
      seen.set(k, p.slug);
    }
  }
  return { profiles, errors };
}

// Latest checkedAt of the sources behind each matching criterion (for the review queue and stale flags).
const CRITERIA_TO_SOURCES = { sectors: 'sectors', stages: 'stages', investmentGeographies: 'investmentGeographies' };
function criteriaCheckedAt(p) {
  const byId = new Map((p.sources || []).map(s => [s.id, s]));
  const out = {};
  for (const field of Object.keys(CRITERIA_TO_SOURCES)) {
    const ids = (p.fieldEvidence || {})[field] || [];
    const dates = ids.map(id => byId.get(id)).filter(Boolean).map(s => s.checkedAt).filter(Boolean).sort();
    if (dates.length) out[field] = dates[dates.length - 1];
  }
  if (p.publishedCheckRange && byId.get(p.publishedCheckRange.sourceId)) out.publishedCheckRange = byId.get(p.publishedCheckRange.sourceId).checkedAt;
  return out;
}

// Strips private notes before anything reaches the page bundle.
function publicView(p) {
  const { privateNotes, importSource, internalReview, ...rest } = p;
  return rest;
}

module.exports = { loadProfiles, validateProfile, publicView, criteriaCheckedAt, PROFILES_DIR, PRIVATE_DIR, isUrl, DATE, DAY };
