(function (root) {
  'use strict';
  // Shared by the static build, the local tests and the browser catalog.
  // Explainable matching only: every criterion resolves to match, mismatch or unknown.

  const SECTORS = Object.freeze({
    'agnostic': 'Sector agnostic',
    'b2b-software': 'B2B software',
    'ai': 'AI and machine learning',
    'developer-tools': 'Developer tools and infrastructure',
    'fintech': 'Fintech',
    'healthcare': 'Healthcare and digital health',
    'biotech': 'Biotech and life sciences',
    'consumer': 'Consumer',
    'marketplaces': 'Marketplaces',
    'ecommerce': 'E-commerce and retail',
    'climate': 'Climate and energy',
    'deep-tech': 'Deep tech and science',
    'hardware': 'Hardware and robotics',
    'edtech': 'Education',
    'proptech': 'Real estate and construction',
    'media': 'Media, gaming and creators',
    'crypto': 'Crypto and web3',
    'logistics': 'Logistics and supply chain',
    'security': 'Cybersecurity',
    'agrifood': 'Agriculture and food',
    'space': 'Space and defense'
  });

  const STAGES = Object.freeze({
    'pre-seed': 'Pre-seed',
    'seed': 'Seed',
    'series-a': 'Series A'
  });

  const INVESTOR_TYPES = Object.freeze({
    'angel': 'Angel investor',
    'entrepreneur-investor': 'Entrepreneur-investor',
    'vc': 'Venture fund',
    'syndicate': 'Syndicate lead',
    'family-office': 'Family office',
    'accelerator': 'Accelerator or studio'
  });

  // Investment geographies are regions an investor states it invests in.
  // A company country resolves to the regions that contain it.
  const REGIONS = Object.freeze({
    'global': 'Global',
    'north-america': 'North America',
    'us': 'United States',
    'canada': 'Canada',
    'latam': 'Latin America',
    'europe': 'Europe',
    'uk': 'United Kingdom',
    'nordics': 'Nordics',
    'dach': 'Germany, Austria and Switzerland',
    'france': 'France',
    'benelux': 'Benelux',
    'iberia': 'Spain and Portugal',
    'cee': 'Central and Eastern Europe',
    'baltics': 'Baltics',
    'israel': 'Israel',
    'middle-east': 'Middle East',
    'africa': 'Africa',
    'india': 'India',
    'southeast-asia': 'Southeast Asia',
    'east-asia': 'East Asia',
    'australia-nz': 'Australia and New Zealand',
    'emerging-markets': 'Emerging markets'
  });

  const COUNTRIES = Object.freeze({
    'US': ['United States', ['us', 'north-america']],
    'CA': ['Canada', ['canada', 'north-america']],
    'MX': ['Mexico', ['latam', 'north-america', 'emerging-markets']],
    'BR': ['Brazil', ['latam', 'emerging-markets']],
    'AR': ['Argentina', ['latam', 'emerging-markets']],
    'CL': ['Chile', ['latam', 'emerging-markets']],
    'CO': ['Colombia', ['latam', 'emerging-markets']],
    'GB': ['United Kingdom', ['uk', 'europe']],
    'IE': ['Ireland', ['europe']],
    'DE': ['Germany', ['dach', 'europe']],
    'AT': ['Austria', ['dach', 'europe']],
    'CH': ['Switzerland', ['dach', 'europe']],
    'FR': ['France', ['france', 'europe']],
    'NL': ['Netherlands', ['benelux', 'europe']],
    'BE': ['Belgium', ['benelux', 'europe']],
    'LU': ['Luxembourg', ['benelux', 'europe']],
    'ES': ['Spain', ['iberia', 'europe']],
    'PT': ['Portugal', ['iberia', 'europe']],
    'IT': ['Italy', ['europe']],
    'SE': ['Sweden', ['nordics', 'europe']],
    'NO': ['Norway', ['nordics', 'europe']],
    'DK': ['Denmark', ['nordics', 'europe']],
    'FI': ['Finland', ['nordics', 'europe']],
    'IS': ['Iceland', ['nordics', 'europe']],
    'PL': ['Poland', ['cee', 'europe']],
    'CZ': ['Czech Republic', ['cee', 'europe']],
    'RO': ['Romania', ['cee', 'europe']],
    'HU': ['Hungary', ['cee', 'europe']],
    'UA': ['Ukraine', ['cee', 'europe']],
    'EE': ['Estonia', ['baltics', 'cee', 'europe']],
    'LV': ['Latvia', ['baltics', 'cee', 'europe']],
    'LT': ['Lithuania', ['baltics', 'cee', 'europe']],
    'IL': ['Israel', ['israel', 'middle-east']],
    'AE': ['United Arab Emirates', ['middle-east', 'emerging-markets']],
    'SA': ['Saudi Arabia', ['middle-east', 'emerging-markets']],
    'TR': ['Turkey', ['middle-east', 'europe', 'emerging-markets']],
    'EG': ['Egypt', ['africa', 'middle-east', 'emerging-markets']],
    'NG': ['Nigeria', ['africa', 'emerging-markets']],
    'KE': ['Kenya', ['africa', 'emerging-markets']],
    'ZA': ['South Africa', ['africa', 'emerging-markets']],
    'GH': ['Ghana', ['africa', 'emerging-markets']],
    'IN': ['India', ['india', 'emerging-markets']],
    'PK': ['Pakistan', ['emerging-markets']],
    'BD': ['Bangladesh', ['emerging-markets']],
    'SG': ['Singapore', ['southeast-asia']],
    'ID': ['Indonesia', ['southeast-asia', 'emerging-markets']],
    'VN': ['Vietnam', ['southeast-asia', 'emerging-markets']],
    'TH': ['Thailand', ['southeast-asia', 'emerging-markets']],
    'PH': ['Philippines', ['southeast-asia', 'emerging-markets']],
    'MY': ['Malaysia', ['southeast-asia', 'emerging-markets']],
    'JP': ['Japan', ['east-asia']],
    'KR': ['South Korea', ['east-asia']],
    'TW': ['Taiwan', ['east-asia']],
    'HK': ['Hong Kong', ['east-asia']],
    'CN': ['China', ['east-asia']],
    'AU': ['Australia', ['australia-nz']],
    'NZ': ['New Zealand', ['australia-nz']]
  });

  const ADDRESS_TYPES = Object.freeze({
    'operating-office': 'Operating office',
    'headquarters': 'Headquarters',
    'registered-office': 'Registered office',
    'correspondence': 'Correspondence address',
    'type-not-established': 'Address type not established'
  });

  const PITCH_CHANNELS = Object.freeze({
    'online-form': 'Online application form',
    'email': 'Published email',
    'warm-intro': 'Warm introduction requested',
    'website': 'Website contact page'
  });

  function countryRegions(code) {
    const entry = COUNTRIES[code];
    return entry ? [code.toLowerCase(), ...entry[1], 'global'] : null;
  }

  // Editorial re-check policy (days). A stale source keeps its state but is flagged.
  const REVIEW_INTERVALS = Object.freeze({ mandate: 180, check: 180, role: 90, address: 90 });

  function daysBetween(fromIso, toIso) {
    if (!fromIso || !toIso) return null;
    const a = Date.parse(fromIso), b = Date.parse(toIso);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return Math.floor((b - a) / 86400000);
  }

  // Returns true when the criterion's most recent source check is older than the policy interval.
  function isStale(profile, field, today) {
    const checked = profile.criteriaCheckedAt && profile.criteriaCheckedAt[field];
    const days = daysBetween(checked, today || profile.today);
    if (days == null) return false;
    return days > (field === 'publishedCheckRange' ? REVIEW_INTERVALS.check : REVIEW_INTERVALS.mandate);
  }

  function fact(state, reasonCode, text, sourceIds, extra) {
    return Object.assign({ state, reasonCode, text, sourceIds: sourceIds || [] }, extra || {});
  }
  function sourcesFor(profile, field) {
    const ev = profile.fieldEvidence || {};
    return Array.isArray(ev[field]) ? ev[field] : [];
  }
  function withStale(profile, field, today, f) {
    if (f.state === 'match' && isStale(profile, field, today)) {
      f.stale = true;
      f.text += ' (source checked ' + profile.criteriaCheckedAt[field] + ', review recommended)';
    }
    return f;
  }

  // Sector: a published list is exhaustive only when sectorScope says so. Examples leave other sectors unknown.
  function evaluateSector(profile, sector, today) {
    if (!sector) return null;
    const list = profile.sectors || [];
    const ids = sourcesFor(profile, 'sectors');
    const label = SECTORS[sector] || sector;
    if (!list.length) return fact('unknown', 'sector-not-published', 'Sector focus: not published.', ids);
    if (list.includes('agnostic')) return withStale(profile, 'sectors', today, fact('match', 'sector-agnostic', 'Sector: the investor states it invests across sectors, which includes ' + label + '.', ids));
    if (list.includes(sector)) return withStale(profile, 'sectors', today, fact('match', 'sector-listed', 'Your ' + label + ' sector matches the investor’s published focus.', ids));
    const listed = list.map(v => SECTORS[v] || v).join(', ');
    if (profile.sectorScope === 'exhaustive') return fact('mismatch', 'sector-outside-exhaustive', 'Sector: the investor states it invests only in ' + listed + '. ' + label + ' is outside that list.', ids);
    return fact('unknown', 'sector-not-listed', 'Sector: the investor names ' + listed + ' as its focus but does not say the list is exhaustive. ' + label + ' is not confirmed.', ids);
  }

  function evaluateStage(profile, stage, today) {
    if (!stage) return null;
    const list = profile.stages || [];
    const ids = sourcesFor(profile, 'stages');
    const label = STAGES[stage] || stage;
    if (!list.length) return fact('unknown', 'stage-not-published', 'Stage: not published.', ids);
    if (list.includes(stage)) return withStale(profile, 'stages', today, fact('match', 'stage-listed', 'Your ' + label + ' stage matches the investor’s published focus.', ids));
    return fact('mismatch', 'stage-outside', 'Stage: the published focus is ' + list.map(v => STAGES[v] || v).join(', ') + '. ' + label + ' is outside it.', ids);
  }

  // Geography compares the company's country with the published investment mandate, never with the office country.
  function evaluateGeography(profile, country, today) {
    if (!country) return null;
    const regions = countryRegions(country);
    const ids = sourcesFor(profile, 'investmentGeographies');
    if (!regions) return fact('unknown', 'country-unmapped', 'Investment geography: this country is not in the dictionary yet.', ids);
    const list = profile.investmentGeographies || [];
    const name = COUNTRIES[country][0];
    if (!list.length) return fact('unknown', 'geography-not-published', 'Investment geography: not published.', ids);
    const hit = list.find(g => regions.includes(g));
    if (hit) return withStale(profile, 'investmentGeographies', today, fact('match', 'geography-listed', 'Investment geography: ' + (REGIONS[hit] || hit) + ' is part of the published focus and covers ' + name + '.', ids));
    const listed = list.map(g => REGIONS[g] || g).join(', ');
    if (profile.geographyScope === 'exhaustive') return fact('mismatch', 'geography-outside-exhaustive', 'Investment geography: the investor states it invests only in ' + listed + '. ' + name + ' is outside that.', ids);
    return fact('unknown', 'geography-not-listed', 'Investment geography: the investor names ' + listed + ' but does not say the list is exhaustive. ' + name + ' is not confirmed.', ids);
  }

  function formatCheck(range) {
    if (!range) return 'Not published';
    const symbol = range.currency === 'USD' ? '$' : range.currency === 'EUR' ? '€' : range.currency === 'GBP' ? '£' : range.currency + ' ';
    const amount = value => symbol + Number(value).toLocaleString('en-US');
    if (range.min != null && range.max != null) return range.min === range.max ? amount(range.min) : amount(range.min) + ' to ' + amount(range.max);
    if (range.min != null) return 'from ' + amount(range.min);
    if (range.max != null) return 'up to ' + amount(range.max);
    return 'Not published';
  }

  // Parses the visitor's target check. Returns { value } or { error } and never treats 0 or blanks as a number.
  function parseTargetCheck(input) {
    if (input == null) return { value: null };
    const text = String(input).trim();
    if (!text) return { value: null };
    if (!/^\d+$/.test(text)) return { error: 'Enter a whole number in USD without separators, for example 250000.' };
    const value = Number(text);
    if (!(value > 0)) return { error: 'Enter an amount above zero, or leave the field empty.' };
    if (value > 100000000) return { error: 'Amounts above $100,000,000 are outside this directory. Enter a smaller figure.' };
    return { value };
  }

  // Check size: same currency only. Inside the published range: match. Outside a hard limit: mismatch.
  // Outside a typical guide: unknown with an explanation. A single published amount is a guide, not a wall.
  function evaluateCheck(profile, targetUsd, today) {
    const parsed = parseTargetCheck(targetUsd);
    if (parsed.error || parsed.value == null) return null;
    const target = parsed.value;
    const range = profile.publishedCheckRange;
    const ids = range && range.sourceId ? [range.sourceId] : [];
    if (!range || (range.min == null && range.max == null)) return fact('unknown', 'check-not-published', 'Check size: not published.', ids);
    if (range.currency !== 'USD') return fact('unknown', 'check-other-currency', 'Check size: published in ' + range.currency + ' (' + formatCheck(range) + '). No currency conversion is made, so a USD target is not compared.', ids);
    const shown = formatCheck(range);
    const money = '$' + target.toLocaleString('en-US');
    const kind = range.checkType === 'follow-on' ? 'follow-on' : range.checkType === 'initial' ? 'initial' : '';
    const withinMin = range.min == null || target >= range.min;
    const withinMax = range.max == null || target <= range.max;
    if (withinMin && withinMax) {
      return withStale(profile, 'publishedCheckRange', today, fact('match', 'check-within', 'Check size: your ' + money + ' is within the published ' + (kind ? kind + ' ' : '') + (range.min === range.max ? 'amount' : 'range') + ' of ' + shown + '.', ids));
    }
    if (range.constraint === 'hard') return fact('mismatch', 'check-outside-hard', 'Check size: the investor states a firm limit of ' + shown + '. ' + money + ' is outside it.', ids);
    return fact('unknown', 'check-outside-typical', 'Check size: the published ' + (range.min === range.max ? 'typical amount' : 'typical range') + ' is ' + shown + '. ' + money + ' is outside it, which is not a stated refusal. Ask before assuming.', ids);
  }

  // criteria: { sector, stage, country, checkUsd }. Empty criteria give no personal verdict.
  // One pure function for the catalog, the profile, the shortlist and the brief.
  // No criteria means Browse mode: verdict null, no facts.
  function evaluate(profile, criteria, today) {
    const c = criteria || {};
    const facts = [
      evaluateSector(profile, c.sector, today),
      evaluateStage(profile, c.stage, today),
      evaluateGeography(profile, c.country, today),
      evaluateCheck(profile, c.checkUsd, today)
    ].filter(Boolean);
    if (!facts.length) return { verdict: null, facts: [], stale: false };
    const states = facts.map(f => f.state);
    const verdict = states.includes('mismatch') ? 'mismatch' : states.includes('unknown') ? 'unknown' : 'match';
    return { verdict, facts, stale: facts.some(f => f.stale) };
  }

  const VERDICT_LABELS = Object.freeze({
    match: 'Matches your selected criteria',
    unknown: 'Needs more research',
    mismatch: 'Outside your selected criteria'
  });

  function byName(a, b) {
    return a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' }) || a.slug.localeCompare(b.slug);
  }

  function textOf(profile) {
    return [profile.displayName, profile.organisationName, ...(profile.investmentEvidence || []).map(e => e.company)]
      .filter(Boolean).join(' ').toLowerCase();
  }

  // Data access layer. Profiles are the published bundle; another source can be plugged in later.
  function createRepository(profiles) {
    const published = profiles.filter(p => p.publicationStatus === 'published').slice().sort(byName);

    function listInvestors(filters, pagination) {
      const f = filters || {};
      const page = Math.max(1, Number((pagination || {}).page) || 1);
      const perPage = Math.max(1, Number((pagination || {}).perPage) || 25);
      const query = (f.query || '').trim().toLowerCase();
      const criteria = { sector: f.sector || '', stage: f.stage || '', country: f.country || '', checkUsd: f.checkUsd };
      const hasCriteria = Boolean(criteria.sector || criteria.stage || criteria.country || parseTargetCheck(criteria.checkUsd).value != null);
      let rows = published.filter(p => {
        if (query && !textOf(p).includes(query)) return false;
        if (f.investorType && p.investorType !== f.investorType) return false;
        if (f.officeCountry && (!p.businessAddress || p.businessAddress.country !== f.officeCountry)) return false;
        if (f.addressAvailable && !p.businessAddress) return false;
        return true;
      }).map(p => ({ profile: p, result: evaluate(p, criteria, f.today) }));
      let hiddenMismatches = 0;
      if (hasCriteria) {
        const order = { match: 0, unknown: 1, mismatch: 2 };
        if (!f.includeMismatches) {
          hiddenMismatches = rows.filter(r => r.result.verdict === 'mismatch').length;
          rows = rows.filter(r => r.result.verdict !== 'mismatch');
        }
        rows.sort((a, b) => order[a.result.verdict] - order[b.result.verdict] || byName(a.profile, b.profile));
      }
      const total = rows.length;
      const pages = Math.max(1, Math.ceil(total / perPage));
      const current = Math.min(page, pages);
      const counts = { match: 0, unknown: 0, mismatch: 0 };
      rows.forEach(r => { if (r.result.verdict) counts[r.result.verdict]++; });
      return {
        items: rows.slice((current - 1) * perPage, current * perPage),
        total, page: current, pages, perPage, hasCriteria, hiddenMismatches, counts
      };
    }

    // Empty-result recovery: for each active criterion, count real results with that one criterion removed.
    // Only suggestions that add results are returned, best first, at most two.
    function suggestRelaxations(filters) {
      const f = filters || {};
      const current = listInvestors(f, { perPage: 1 }).total;
      const candidates = [
        ['checkUsd', 'check size', f.checkUsd], ['country', 'company country', f.country],
        ['sector', 'sector', f.sector], ['stage', 'stage', f.stage]
      ].filter(([key, , value]) => value !== '' && value != null && !(key === 'checkUsd' && parseTargetCheck(value).value == null));
      return candidates.map(([key, label]) => {
        const relaxed = { ...f, [key]: '' };
        const total = listInvestors(relaxed, { perPage: 1 }).total;
        return { key, label, count: total, gained: total - current };
      }).filter(s => s.gained > 0).sort((a, b) => b.count - a.count).slice(0, 2);
    }

    function getInvestorBySlug(slug) {
      return published.find(p => p.slug === slug) || null;
    }

    function getPublishedInvestorCount() {
      return published.length;
    }

    function latestEditorialUpdate() {
      return published.map(p => p.editorialUpdatedAt).filter(Boolean).sort().pop() || null;
    }

    return { listInvestors, suggestRelaxations, getInvestorBySlug, getPublishedInvestorCount, latestEditorialUpdate, published };
  }

  const api = {
    SECTORS, STAGES, INVESTOR_TYPES, REGIONS, COUNTRIES, ADDRESS_TYPES, PITCH_CHANNELS, VERDICT_LABELS,
    REVIEW_INTERVALS, countryRegions, evaluate, formatCheck, parseTargetCheck, isStale, daysBetween, createRepository, byName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.coinInvestorMatch = api;
})(typeof window === 'undefined' ? globalThis : window);
