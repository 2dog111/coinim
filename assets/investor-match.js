(() => {
  'use strict';
  const core = window.coinInvestorMatch;
  const dataNode = document.querySelector('#investor-data');
  if (!core || !dataNode) return;
  let bundle;
  try { bundle = JSON.parse(dataNode.textContent); } catch (_) { return; }
  const repo = core.createRepository(bundle.profiles);
  const PER_PAGE = 25;
  const MAX_SHORTLIST = 20;
  const STORAGE_KEY = 'coinim.investorShortlist';
  const STORAGE_VERSION = 1;
  const today = new Date().toISOString().slice(0, 10);

  const $ = selector => document.querySelector(selector);
  const form = $('#investor-criteria');
  const rowsList = $('#investor-rows');
  const rows = new Map([...rowsList.querySelectorAll('.im-row')].map(row => [row.dataset.id, row]));
  const summary = $('#catalog-summary');
  const empty = $('#catalog-empty');
  const suggestions = $('#catalog-suggestions');
  const pagination = $('#catalog-pagination');
  const hashNotice = $('#hash-notice');
  const relaxNotice = $('#relax-notice');
  const checkError = $('#check-error');
  const bar = $('#shortlist-bar');
  let formInView = false;
  const barCount = $('#shortlist-count');
  const review = $('#shortlist-review');
  const reviewEmpty = $('#shortlist-empty');
  const groups = $('#shortlist-groups');
  const copyStatus = $('#copy-status');
  const fallbackLabel = $('#brief-fallback-label');
  const fallback = $('#brief-fallback');
  const briefField = $('#lead-brief');
  const slugsField = $('#lead-slugs');
  const restoreNotice = $('#shortlist-restore-notice');
  const undoNote = $('#shortlist-undo');
  const printSection = $('#brief-print');

  document.querySelectorAll('.im-nojs').forEach(node => { node.hidden = true; });
  form.hidden = false;
  rowsList.querySelectorAll('.im-shortlist-toggle').forEach(button => { button.hidden = false; });

  let state = { filters: {}, page: 1 };
  let pinnedSlug = null;
  let relaxed = null; // { key, label, previous } after the visitor removed one filter from a suggestion
  const profileById = id => repo.published.find(p => p.id === id) || null;
  const LABELS = { sector: 'sector', stage: 'stage', country: 'company country', checkUsd: 'check size' };

  function readFilters() {
    const data = new FormData(form);
    const parsed = core.parseTargetCheck(data.get('checkUsd'));
    checkError.hidden = !parsed.error;
    checkError.textContent = parsed.error || '';
    $('#criteria-check').setAttribute('aria-invalid', String(Boolean(parsed.error)));
    return {
      sector: data.get('sector') || '', stage: data.get('stage') || '', country: data.get('country') || '',
      checkUsd: parsed.value == null ? '' : String(parsed.value),
      query: String(data.get('query') || ''), investorType: data.get('investorType') || '',
      officeCountry: data.get('officeCountry') || '', addressAvailable: Boolean(data.get('addressAvailable')),
      includeMismatches: Boolean(data.get('includeMismatches')), today
    };
  }
  const criteriaOf = f => ({ sector: f.sector, stage: f.stage, country: f.country, checkUsd: f.checkUsd });

  function describeCriteria(filters) {
    const parts = [];
    if (filters.sector) parts.push('Sector: ' + core.SECTORS[filters.sector]);
    if (filters.stage) parts.push('Stage: ' + core.STAGES[filters.stage]);
    if (filters.country) parts.push('Company based in: ' + core.COUNTRIES[filters.country][0]);
    if (filters.checkUsd) parts.push('Target check from one investor: $' + Number(filters.checkUsd).toLocaleString('en-US'));
    return parts;
  }

  // Source references next to a fact link to the numbered source inside the same profile.
  function sourceRefs(profile, ids) {
    const fragment = document.createDocumentFragment();
    (ids || []).forEach(id => {
      const source = (profile.sources || []).find(s => s.id === id);
      if (!source) return;
      const a = document.createElement('a');
      a.className = 'im-ref'; a.href = '#' + profile.slug + '-source-' + source.n;
      a.setAttribute('aria-label', 'Source ' + source.n); a.textContent = '[' + source.n + ']';
      fragment.append(' ', a);
    });
    return fragment;
  }
  function factItem(profile, f) {
    const li = document.createElement('li');
    li.className = 'is-' + f.state;
    li.append(f.text, sourceRefs(profile, f.sourceIds));
    return li;
  }
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };

  function applyVerdict(row, profile, result) {
    const verdict = row.querySelector('.im-verdict');
    const facts = row.querySelector('.im-facts');
    const why = row.querySelector('[data-why]');
    const dynamicChecks = row.querySelector('[data-checks]');
    if (!result.verdict) {
      verdict.hidden = true; facts.hidden = true; dynamicChecks.hidden = true;
      verdict.className = 'im-verdict';
      why.replaceChildren(el('p', 'Browse mode: enter your sector, stage, country or target check above to see which published criteria match. This explains the fit against your parameters, never the investor’s interest.'));
      return;
    }
    verdict.hidden = false; facts.hidden = false;
    verdict.className = 'im-verdict is-' + result.verdict;
    verdict.textContent = core.VERDICT_LABELS[result.verdict] + (result.stale ? ' (review recommended: a source is older than our re-check policy)' : '');
    facts.replaceChildren(...result.facts.map(f => factItem(profile, f)));
    const matched = result.facts.filter(f => f.state === 'match').slice(0, 3);
    why.replaceChildren();
    if (!matched.length) {
      why.append(el('p', 'None of your selected criteria is confirmed by the published information yet. The facts above show what is published and what is unknown.'));
    } else {
      why.append(el('p', 'Against your parameters, the published information supports:'));
      const list = document.createElement('ul');
      list.replaceChildren(...matched.map(f => factItem(profile, f)));
      why.append(list);
    }
    const open = result.facts.filter(f => f.state !== 'match').slice(0, 3);
    dynamicChecks.hidden = !open.length;
    dynamicChecks.replaceChildren(...open.map(f => factItem(profile, f)));
  }

  function heading(text, verdict) {
    const li = el('li', text, 'im-group-heading is-' + verdict);
    li.setAttribute('role', 'presentation');
    return li;
  }

  function render() {
    const result = repo.listInvestors(state.filters, { page: state.page, perPage: PER_PAGE });
    state.page = result.page;
    const visible = new Set(result.items.map(item => item.profile.id));
    rows.forEach(row => { row.hidden = true; });
    rowsList.querySelectorAll('.im-group-heading').forEach(node => node.remove());
    const fragment = document.createDocumentFragment();
    const criteria = criteriaOf(state.filters);
    let notice = '';
    if (pinnedSlug) {
      const pinned = repo.getInvestorBySlug(pinnedSlug);
      if (pinned && !visible.has(pinned.id)) {
        const row = rows.get(pinned.id);
        row.hidden = false;
        applyVerdict(row, pinned, core.evaluate(pinned, criteria, today));
        fragment.append(row);
        notice = pinned.displayName + ' is shown at the top because you followed a direct link. It is outside the current filters or page.';
      }
    }
    let lastVerdict = null;
    for (const item of result.items) {
      if (result.hasCriteria && item.result.verdict !== lastVerdict) {
        lastVerdict = item.result.verdict;
        fragment.append(heading(core.VERDICT_LABELS[lastVerdict] + ' (' + result.counts[lastVerdict] + ')', lastVerdict));
      }
      const row = rows.get(item.profile.id);
      row.hidden = false;
      applyVerdict(row, item.profile, item.result);
      fragment.append(row);
    }
    rowsList.append(fragment);
    hashNotice.hidden = !notice;
    hashNotice.textContent = notice;
    const described = describeCriteria(state.filters);
    let text;
    if (!result.total) text = 'No profiles match these criteria.';
    else if (!result.hasCriteria) text = result.total + ' profiles, sorted by name.' + (result.total > PER_PAGE ? ' Showing ' + ((result.page - 1) * PER_PAGE + 1) + ' to ' + ((result.page - 1) * PER_PAGE + result.items.length) + '.' : '');
    else {
      text = result.counts.match + ' full ' + (result.counts.match === 1 ? 'match' : 'matches') + ', ' + result.counts.unknown + ' needing more research' + (result.counts.mismatch ? ', ' + result.counts.mismatch + ' outside your criteria' : '') + '.';
      if (!result.counts.match && result.counts.unknown) text += ' No full match yet; the profiles below have no confirmed contradiction but unknown conditions.';
      if (result.pages > 1) text += ' Page ' + result.page + ' of ' + result.pages + '.';
    }
    if (described.length) text += ' Criteria: ' + described.join('; ') + '.';
    if (result.hiddenMismatches) text += ' ' + result.hiddenMismatches + (result.hiddenMismatches === 1 ? ' profile is' : ' profiles are') + ' outside your criteria and hidden. Use the toggle next to Find potential matches to show them.';
    summary.textContent = text;
    empty.hidden = result.total > 0;
    if (!result.total) renderSuggestions();
    renderPagination(result);
    renderReview();
    updateToggles();
  }

  // Empty-result recovery: real recounts with one filter removed, applied only on click.
  function renderSuggestions() {
    const list = repo.suggestRelaxations(state.filters);
    suggestions.replaceChildren(...list.map(s => {
      const li = document.createElement('li');
      const button = el('button', 'Remove the ' + s.label + ' filter: ' + s.count + ' potential ' + (s.count === 1 ? 'match' : 'matches') + ' (full and needing research)', 'im-suggestion');
      button.type = 'button';
      button.addEventListener('click', () => relaxFilter(s.key));
      li.append(button);
      return li;
    }));
    suggestions.hidden = !list.length;
  }
  const fieldFor = key => form.elements[key];
  function clearRelax() { relaxed = null; relaxNotice.hidden = true; relaxNotice.replaceChildren(); }
  function relaxFilter(key) {
    const field = fieldFor(key);
    relaxed = { key, label: LABELS[key], previous: field.value };
    field.value = '';
    applyForm(true);
    relaxNotice.hidden = false;
    relaxNotice.replaceChildren('Filter removed: ' + relaxed.label + '. Your other criteria still apply. ');
    const restore = el('button', 'Restore the previous selection', 'im-text-button');
    restore.type = 'button';
    restore.addEventListener('click', () => { fieldFor(relaxed.key).value = relaxed.previous; clearRelax(); applyForm(true); });
    relaxNotice.append(restore);
    $('#catalog').scrollIntoView({ block: 'start' });
  }

  function renderPagination(result) {
    pagination.hidden = result.pages <= 1;
    if (result.pages <= 1) { pagination.replaceChildren(); return; }
    const button = (label, page, current) => {
      const b = el('button', label);
      b.type = 'button';
      if (current) b.setAttribute('aria-current', 'page');
      b.disabled = page < 1 || page > result.pages;
      b.addEventListener('click', () => { state.page = page; render(); $('#catalog').scrollIntoView({ block: 'start' }); });
      return b;
    };
    const nodes = [button('Previous', result.page - 1)];
    for (let p = 1; p <= result.pages; p++) nodes.push(button(String(p), p, p === result.page));
    nodes.push(button('Next', result.page + 1));
    nodes.push(el('span', 'Page ' + result.page + ' of ' + result.pages, 'im-page-status'));
    pagination.replaceChildren(...nodes);
  }

  function applyForm(resetPage) {
    state.filters = readFilters();
    if (resetPage) state.page = 1;
    render();
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    pinnedSlug = null;
    if (relaxed && fieldFor(relaxed.key).value) clearRelax();
    applyForm(true);
    $('#catalog').scrollIntoView({ block: 'start' });
  });
  form.addEventListener('reset', () => {
    setTimeout(() => { pinnedSlug = null; clearRelax(); applyForm(true); }, 0);
  });
  let timer;
  $('#criteria-query').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => applyForm(true), 250); });
  ['#criteria-type', '#criteria-office', '#criteria-address', '#criteria-mismatches'].forEach(id => $(id).addEventListener('change', () => applyForm(true)));

  // Shortlist: only a version and public profile ids are stored. Ids that are no longer published are dropped.
  let memory = [];
  let storageAvailable = true;
  let droppedOnRestore = 0;
  let lastRemoved = null;
  function loadShortlist() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.ids)) return [];
      return parsed.ids.filter(id => typeof id === 'string' && rows.has(id));
    } catch (_) { storageAvailable = false; return memory; }
  }
  function saveShortlist(ids) {
    memory = ids;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ids })); }
    catch (_) { storageAvailable = false; }
  }
  const shortlist = () => (storageAvailable ? loadShortlist() : memory);

  // One organisation = one potential approach. People are grouped only through a confirmed organisationId.
  function groupShortlist(ids) {
    const grouped = new Map();
    for (const id of ids) {
      const p = profileById(id);
      if (!p) continue;
      const key = p.organisationId || p.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(p);
    }
    return [...grouped.values()];
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { formInView = entries[0].isIntersecting; updateToggles(); }).observe($('#outreach-plan'));
  }
  new MutationObserver(() => updateToggles()).observe($('#enquiry-success'), { attributes: true, attributeFilter: ['hidden'] });

  function updateToggles() {
    const ids = shortlist();
    const full = ids.length >= MAX_SHORTLIST;
    rowsList.querySelectorAll('.im-shortlist-toggle').forEach(button => {
      const selected = ids.includes(button.dataset.id);
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? 'Remove from shortlist' : full ? 'Shortlist full (20)' : 'Add to shortlist';
      button.disabled = !selected && full;
    });
    // The bar leads to the form, so it steps aside while the form is on screen and after a confirmed send.
    const showBar = ids.length > 0 && !formInView && $('#enquiry-success').hidden;
    bar.hidden = !showBar;
    document.body.classList.toggle('has-shortlist-bar', showBar);
    const approaches = groupShortlist(ids).length;
    barCount.textContent = ids.length + ' selected' + (ids.length ? ', ' + approaches + ' potential ' + (approaches === 1 ? 'approach' : 'approaches') + ' to confirm' : '') + (full ? ', maximum reached' : '');
  }

  function contactState(p) {
    return [
      p.pitchChannel ? 'Published channel: ' + core.PITCH_CHANNELS[p.pitchChannel] : 'No published pitch channel',
      p.addressPublished ? 'Business address published' : 'Address not yet verified',
      p.recipientRoutingStatus === 'confirmed' ? 'Recipient routing confirmed' : 'Recipient routing not confirmed',
      { accepted: 'Paper pitches accepted', 'not-accepted': 'Paper pitches not accepted: excluded from any paper plan', unknown: 'Paper pitch policy unknown: to research' }[p.paperPitchPolicy]
    ];
  }
  function missingChecks(p, result) {
    const items = result && result.facts ? result.facts.filter(f => f.state !== 'match').map(f => f.text) : [];
    if (!p.publishedCheckRange && !items.some(t => t.startsWith('Check size'))) items.push('Check size not published.');
    return items.slice(0, 4);
  }

  function renderReview() {
    const ids = shortlist();
    review.hidden = ids.length === 0;
    reviewEmpty.hidden = ids.length > 0;
    restoreNotice.hidden = !droppedOnRestore;
    restoreNotice.textContent = droppedOnRestore ? droppedOnRestore + (droppedOnRestore === 1 ? ' saved profile is' : ' saved profiles are') + ' no longer published and ' + (droppedOnRestore === 1 ? 'was' : 'were') + ' removed from your shortlist.' : '';
    if (!ids.length) { groups.replaceChildren(); return; }
    const criteria = criteriaOf(state.filters);
    const described = describeCriteria(state.filters);
    const grouped = groupShortlist(ids);
    $('#shortlist-intro').textContent = ids.length + ' of ' + MAX_SHORTLIST + ' selected, ' + grouped.length + ' potential ' + (grouped.length === 1 ? 'approach' : 'approaches') + ' to confirm. ' + (described.length ? 'Fit is shown against your current criteria: ' + described.join('; ') + '. Changing the criteria updates these statuses; it never removes a selection.' : 'Browse mode: set your criteria above to see the fit for each selection.') + (storageAvailable ? '' : ' Your browser blocks storage, so this shortlist lasts only for this page view.');
    const nodes = [];
    for (const members of grouped) {
      const wrapper = el('div', null, 'im-shortlist-group');
      const org = members[0];
      if (members.length > 1) {
        wrapper.append(el('h3', org.organisationName || org.displayName), el('p', members.length + ' entries linked to the same organisation: one potential approach, one letter to the right recipient, not the same pitch to every partner.', 'im-group-note'));
      } else if (org.entityType === 'person' && !org.organisationId && org.organisationName) {
        wrapper.append(el('p', 'Listed with ' + org.organisationName + ', but the link to an organisation profile is not established. Confirm whether this is a separate approach.', 'im-group-note'));
      }
      for (const p of members) {
        const item = el('div', null, 'im-shortlist-item');
        const body = document.createElement('div');
        const title = document.createElement('h4');
        const link = el('a', p.displayName); link.href = '#' + p.slug;
        title.append(link, ' (' + core.INVESTOR_TYPES[p.investorType] + ')');
        body.append(title);
        const result = core.evaluate(p, criteria, today);
        const list = document.createElement('ul');
        if (result.verdict) {
          list.append(el('li', core.VERDICT_LABELS[result.verdict] + (result.stale ? ' (review recommended)' : '')));
          result.facts.filter(f => f.state === 'match').slice(0, 2).forEach(f => list.append(factItem(p, f)));
        } else list.append(el('li', 'Fit not assessed: no criteria selected.'));
        missingChecks(p, result).forEach(m => list.append(el('li', 'Unknown: ' + m)));
        contactState(p).forEach(m => list.append(el('li', m)));
        body.append(list);
        const remove = el('button', 'Remove', 'im-text-button');
        remove.type = 'button';
        remove.addEventListener('click', () => { lastRemoved = p; toggle(p.id); showUndo(); });
        item.append(body, remove);
        wrapper.append(item);
      }
      nodes.push(wrapper);
    }
    groups.replaceChildren(...nodes);
  }
  function showUndo() {
    if (!lastRemoved) { undoNote.hidden = true; return; }
    undoNote.hidden = false;
    undoNote.replaceChildren(lastRemoved.displayName + ' removed. ');
    const undo = el('button', 'Undo', 'im-text-button');
    undo.type = 'button';
    undo.addEventListener('click', () => { const p = lastRemoved; lastRemoved = null; undoNote.hidden = true; if (p && !shortlist().includes(p.id)) toggle(p.id); });
    undoNote.append(undo);
  }

  function toggle(id) {
    let ids = shortlist();
    if (ids.includes(id)) ids = ids.filter(x => x !== id);
    else if (ids.length < MAX_SHORTLIST) ids = [...ids, id];
    saveShortlist(ids);
    updateToggles();
    renderReview();
  }
  rowsList.addEventListener('click', event => {
    const button = event.target.closest('.im-shortlist-toggle');
    if (button) toggle(button.dataset.id);
  });
  $('#shortlist-clear').addEventListener('click', () => { saveShortlist([]); lastRemoved = null; undoNote.hidden = true; updateToggles(); renderReview(); });

  // Research brief: deterministic text from the current data. No private fields, no visitor contact data.
  function briefModel() {
    const ids = shortlist();
    const criteria = criteriaOf(state.filters);
    return {
      createdAt: today, dataVersion: bundle.generatedAt, criteria: describeCriteria(state.filters), count: ids.length,
      groups: groupShortlist(ids).map(members => ({
        title: members.length > 1 ? (members[0].organisationName || members[0].displayName) : members[0].displayName,
        linked: members.length > 1,
        members: members.map(p => {
          const result = core.evaluate(p, criteria, today);
          return {
            profile: p, name: p.displayName, slug: p.slug, type: core.INVESTOR_TYPES[p.investorType], website: p.officialWebsite,
            verdict: result.verdict ? core.VERDICT_LABELS[result.verdict] + (result.stale ? ' (review recommended)' : '') : 'Fit not assessed: no criteria selected',
            reasons: result.facts.filter(f => f.state === 'match').slice(0, 2).map(f => f.text),
            unknowns: missingChecks(p, result),
            contact: contactState(p).concat(p.addressLine ? ['Address: ' + p.addressLine] : []).concat(p.pitchUrl ? ['Channel: ' + p.pitchUrl] : [])
          };
        })
      }))
    };
  }
  function briefText() {
    const m = briefModel();
    const lines = ['Investor Match research brief (internal, for discussion with coin.im; not an offer and not a letter to any investor)',
      'Created ' + m.createdAt + '. Directory data version ' + m.dataVersion + '. Fact check dates are listed per source.',
      m.criteria.length ? 'Criteria: ' + m.criteria.join('; ') : 'Criteria: none selected (browse mode)',
      m.count + ' selected profiles, ' + m.groups.length + ' potential approaches to confirm.', ''];
    m.groups.forEach((g, i) => {
      lines.push((i + 1) + '. ' + g.title + (g.linked ? ' (one approach for ' + g.members.length + ' linked entries)' : ''));
      g.members.forEach(p => {
        lines.push('   ' + p.name + ' [' + p.slug + '], ' + p.type + ', ' + p.website);
        lines.push('   Fit: ' + p.verdict);
        p.reasons.forEach(r => lines.push('   Reason: ' + r));
        p.unknowns.forEach(u => lines.push('   Unknown: ' + u));
        p.contact.forEach(c => lines.push('   Contact: ' + c));
        (p.profile.sources || []).forEach(s => lines.push('   Source: ' + s.title + ': ' + s.url + ' (checked ' + s.checkedAt + ')'));
      });
      lines.push('');
    });
    lines.push('Next step: manual research of each approach and an outreach plan prepared with coin.im. Delivery availability is checked separately for each business address.');
    return lines.join('\n');
  }
  function shortBrief(limit) {
    const text = briefText();
    if (text.length <= limit) return text;
    return text.slice(0, limit - 80).replace(/\n[^\n]*$/, '') + '\n(Brief shortened to fit the form. The full brief is in your shortlist.)';
  }

  async function copyBrief() {
    const text = briefText();
    fallbackLabel.hidden = true;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('unsupported');
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = 'Research brief copied (' + text.length + ' characters).';
    } catch (_) {
      copyStatus.textContent = 'Copying did not work. The brief is shown below for manual selection.';
      fallback.value = text;
      fallbackLabel.hidden = false;
      fallback.focus();
      fallback.select();
    }
  }
  $('#copy-brief').addEventListener('click', copyBrief);

  function renderPrint() {
    const m = briefModel();
    const list = items => { const ul = document.createElement('ul'); items.forEach(t => ul.append(el('li', t))); return ul; };
    const nodes = [el('h1', 'Investor Match research brief'), el('p', 'Internal brief for discussion with coin.im. Not an investment offer and not a letter to any investor.'),
      el('p', 'Created ' + m.createdAt + '. Directory data version ' + m.dataVersion + '. Each source lists its own check date.'),
      el('p', m.criteria.length ? 'Criteria: ' + m.criteria.join('; ') : 'Criteria: none selected (browse mode)'),
      el('p', m.count + ' selected profiles, ' + m.groups.length + ' potential approaches to confirm.')];
    m.groups.forEach((g, i) => {
      const section = document.createElement('section');
      section.append(el('h2', (i + 1) + '. ' + g.title + (g.linked ? ' (one approach, ' + g.members.length + ' linked entries)' : '')));
      g.members.forEach(p => {
        section.append(el('h3', p.name + ' (' + p.type + ')'));
        const site = el('p', 'Website: '); const a = el('a', p.website); a.href = p.website; site.append(a); section.append(site);
        section.append(el('p', 'Fit: ' + p.verdict));
        if (p.reasons.length) section.append(el('h4', 'Why this may fit'), list(p.reasons));
        if (p.unknowns.length) section.append(el('h4', 'Still unknown'), list(p.unknowns));
        section.append(el('h4', 'Contact limits'), list(p.contact), el('h4', 'Sources'));
        const ul = document.createElement('ul');
        (p.profile.sources || []).forEach(s => { const li = document.createElement('li'); const link = el('a', s.title); link.href = s.url; li.append(link, ' (checked ' + s.checkedAt + ')'); ul.append(li); });
        section.append(ul);
      });
      nodes.push(section);
    });
    nodes.push(el('p', 'Next step: manual research of each approach and an outreach plan prepared with coin.im. Delivery availability is checked separately for each business address.'));
    printSection.replaceChildren(...nodes);
  }
  $('#print-brief').addEventListener('click', () => {
    renderPrint();
    printSection.hidden = false;
    document.body.classList.add('is-printing-brief');
    const done = () => { document.body.classList.remove('is-printing-brief'); printSection.hidden = true; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  });

  // Hand-off to the existing inquiry form: fills the read-only brief field and the slug list. Nothing is sent until submit.
  function toForm(withShortlist) {
    const ids = withShortlist ? shortlist() : [];
    const described = describeCriteria(state.filters);
    briefField.value = ids.length ? shortBrief(8000) : 'Tailored investor search requested.\n' + (described.length ? 'Criteria: ' + described.join('; ') : 'Criteria: none selected') + '\nNo profiles from the current directory were shortlisted.';
    slugsField.value = ids.map(id => profileById(id).slug).join(',');
    $('#outreach-plan').scrollIntoView({ block: 'start' });
    setTimeout(() => $('#lead-website').focus({ preventScroll: true }), 300);
  }
  $('#shortlist-to-form').addEventListener('click', () => toForm(true));
  $('#shortlist-bar-request').addEventListener('click', () => toForm(true));
  document.querySelectorAll('[data-tailored]').forEach(b => b.addEventListener('click', () => toForm(false)));

  function openHash() {
    const slug = decodeURIComponent(location.hash.slice(1));
    const profile = slug && repo.getInvestorBySlug(slug);
    if (!profile) return;
    pinnedSlug = slug;
    render();
    const row = rows.get(profile.id);
    const details = row.querySelector('.im-profile');
    details.open = true;
    row.scrollIntoView({ block: 'start' });
    details.querySelector('summary').focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', openHash);

  // Restore: count ids that are no longer published, store the cleaned list, then render.
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.version === STORAGE_VERSION && Array.isArray(parsed.ids)) droppedOnRestore = parsed.ids.filter(id => !rows.has(id)).length;
  } catch (_) { storageAvailable = false; }
  const initial = loadShortlist();
  if (storageAvailable) saveShortlist(initial);
  state.filters = readFilters();
  render();
  if (location.hash) openHash();
})();
