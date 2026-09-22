(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InvestorCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const dictionary = {
    sectors: {'b2b-software':'B2B software', ai:'AI', fintech:'Fintech', health:'Healthcare', biotech:'Biotechnology', climate:'Climate & energy', 'deep-tech':'Deep tech', consumer:'Consumer', marketplaces:'Marketplaces', 'developer-tools':'Developer tools', security:'Cybersecurity', industrial:'Industrial technology', food:'Food & agriculture'},
    stages: {'pre-seed':'Pre-seed',seed:'Seed','series-a':'Series A'},
    investmentGeographies: {US:'United States',CA:'Canada',GB:'United Kingdom',EU:'European Union',IL:'Israel',IN:'India',AU:'Australia',SG:'Singapore',other:'Other location'},
    investorType: {vc:'Venture firm',angel:'Independent angel',syndicate:'Syndicate', 'entrepreneur-investor':'Entrepreneur-investor','family-office':'Family office'}
  };
  const label = (field,value) => dictionary[field]?.[value] || (value === '*' ? field === 'investmentGeographies' ? 'Worldwide' : 'Sector agnostic' : value);
  const states = {match:'Matches your selected criteria',unknown:'Needs more research',mismatch:'Outside your selected criteria',none:''};
  function match(profile, criteria = {}) {
    const details = [];
    for (const field of ['sectors','stages','investmentGeographies','check']) {
      const selected = criteria[field];
      if (selected === '' || selected === null || selected === undefined) continue;
      let state = 'unknown', reason = 'Not published', sourceIds = [];
      if (field === 'check') {
        const amount = Number(selected), range = profile.publishedCheckRange;
        if (!Number.isFinite(amount) || amount <= 0) continue;
        if (range) {
          sourceIds = [range.sourceId]; reason = formatCheck(range);
          if (range.currency === 'USD') state = amount >= range.min && amount <= range.max ? 'match' : 'mismatch';
          else reason += '. Currency is not USD; amount match unknown';
        }
      } else {
        const values = profile[field] || [], evidence = profile.fieldEvidence?.[field];
        if (values.length && evidence?.sourceIds?.length) {
          sourceIds = evidence.sourceIds; reason = values.map(v => label(field,v)).join(', ');
          state = values.includes(selected) || values.includes('*') ? 'match' : evidence.exhaustive ? 'mismatch' : 'unknown';
          if (state === 'unknown') reason += '. Listed focus does not establish an exclusion';
        }
      }
      details.push({field,state,reason,sourceIds});
    }
    const state = !details.length ? 'none' : details.some(d => d.state === 'mismatch') ? 'mismatch' : details.some(d => d.state === 'unknown') ? 'unknown' : 'match';
    return {state,label:states[state],details};
  }
  function formatCheck(range) {
    if (!range) return 'Not published';
    const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:range.currency,maximumFractionDigits:0}).format(n);
    return range.min === range.max ? `${money(range.min)} ${range.currency}` : `${money(range.min)} to ${money(range.max)} ${range.currency}`;
  }
  const compare = (a,b) => a.displayName.localeCompare(b.displayName,'en') || a.id.localeCompare(b.id,'en');
  function createStore(data) {
    const records = data.filter(p => p.publicationStatus === 'published').sort(compare);
    return {
      getPublishedInvestorCount: () => records.length,
      getInvestorBySlug: slug => records.find(p => p.slug === slug) || null,
      listInvestors(filters = {}, pagination = {}) {
        const criteria = filters.criteria || {}, query = String(filters.query || '').trim().toLowerCase();
        const results = records.map(profile => ({profile,match:match(profile,criteria)})).filter(({profile:p,match:m}) => {
          const haystack = [p.displayName,p.organisationName,...p.investmentEvidence.map(e => e.company || '')].join(' ').toLowerCase();
          return (!query || haystack.includes(query)) && (!filters.investorType || p.investorType === filters.investorType) && (!filters.officeCountry || p.officeCountry === filters.officeCountry) && (!filters.hasAddress || Boolean(p.businessAddress)) && (filters.showOutside || m.state !== 'mismatch');
        });
        const order = {none:0,match:0,unknown:1,mismatch:2};
        results.sort((a,b) => order[a.match.state]-order[b.match.state] || compare(a.profile,b.profile));
        const size = Math.max(1,Math.min(100,Number(pagination.size) || 25));
        const pages = Math.max(1,Math.ceil(results.length/size));
        const page = Math.max(1,Math.min(pages,Number(pagination.page) || 1));
        return {items:results.slice((page-1)*size,page*size),total:results.length,pages,page};
      }
    };
  }
  function restoreShortlist(raw, data) {
    try { const value=JSON.parse(raw); return value?.version===1 && Array.isArray(value.ids) ? [...new Set(value.ids)].filter(id=>data.some(p=>p.id===id && p.publicationStatus==='published')).slice(0,20) : []; } catch (_) { return []; }
  }
  // A public refusal is a hard exclusion from the paper plan. Unknown routes need review.
  function paperState(p) { return p.paperPitchPolicy.status==='not-accepted' ? 'excluded' : p.businessAddress && p.recipientRoutingStatus.status==='confirmed' && p.paperPitchPolicy.status==='accepted' ? 'confirmed' : 'research'; }
  function makeBrief(profiles, criteria) {
    const selected = Object.entries(criteria).filter(([,v])=>v!=='' && v!=null).map(([k,v])=>`${k === 'check' ? 'Check USD' : k}: ${label(k,v)}`).join('; ');
    return `Investor Match inquiry. Scope and price to be agreed.\n${selected || 'No matching criteria selected.'}\n${profiles.map(p=>`${p.displayName} [${p.id}]${paperState(p)==='excluded'?' (excluded from paper plan: no paper pitches)':''}`).join('\n')}\nReview mandate, portfolio conflicts and recipient routing before any outreach.`;
  }
  return {dictionary,label,states,match,formatCheck,createStore,restoreShortlist,paperState,makeBrief};
});
