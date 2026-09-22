const fs = require('node:fs');
const path = require('node:path');
const core = require('../assets/investor-core.js');
const {validate,identityMatch} = require('./investor-schema.cjs');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'content/investors/profiles.json'),'utf8'));
const rights=JSON.parse(fs.readFileSync(path.join(root,'docs/private/investor-match/publication-review.json'),'utf8'));
const publicKeys=['id','slug','displayName','entityType','investorType','organisationId','organisationName','officialWebsite','summary','sectors','stages','investmentGeographies','publishedCheckRange','publicContactPeople','investmentEvidence','preferredPitchChannel','businessAddress','officeCountry','recipientRoutingStatus','paperPitchPolicy','editorialUpdatedAt','publicationStatus','fieldEvidence','sources','researchNotes'];
const pick=(obj,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(obj,k)).map(k=>[k,obj[k]]));
function publicRecord(input){
 const p=pick(input,publicKeys);
 for(const [field,keys]of Object.entries({publishedCheckRange:['min','max','currency','sourceId'],preferredPitchChannel:['type','url','sourceId'],businessAddress:['organisation','lines','city','postalCode','country','addressType','sourceId','checkedAt'],recipientRoutingStatus:['status','sourceId','checkedAt'],paperPitchPolicy:['status','sourceId','checkedAt']}))if(p[field])p[field]=pick(p[field],keys);
 for(const [field,keys]of Object.entries({publicContactPeople:['name','role','sourceId','reviewedAt'],investmentEvidence:['company','fact','eventDate','datePrecision','sourceIds'],sources:['id','url','publisher','title','publishedAt','checkedAt','supportsFields']}))p[field]=p[field].map(v=>pick(v,keys));
 p.fieldEvidence=Object.fromEntries(['summary','sectors','stages','investmentGeographies','officeCountry'].filter(k=>p.fieldEvidence?.[k]).map(k=>[k,pick(p.fieldEvidence[k],['sourceIds','exhaustive'])]));
 return p;
}
const published=data.filter(p=>p.publicationStatus==='published').map(publicRecord).sort((a,b)=>a.displayName.localeCompare(b.displayName,'en'));
for(const [i,p] of published.entries()){
  const errors=validate(p);
  if(rights[p.id]?.publicPublication!=='approved')errors.push('missing private publication review');
  for(const previous of published.slice(0,i))if(identityMatch(p,previous))errors.push(`identity needs review: ${previous.id}`);
  if(errors.length)throw new Error(`${p.id}: ${errors.join('; ')}`);
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,title)=>`<a href="${esc(url)}" rel="noopener noreferrer">${esc(title)}</a>`;
const labels=(p,f)=>p[f].length?p[f].map(v=>core.label(f,v)).join(', '):'Not published';
function evidence(p,ids){return (ids||[]).map(id=>{const s=p.sources.find(s=>s.id===id);return link(s.url,`${s.title} (reviewed ${s.checkedAt})`);}).join('; ');}
function field(p,f,title){return `<div><dt>${title}</dt><dd>${esc(labels(p,f))}${p[f].length?`<small>${evidence(p,p.fieldEvidence[f].sourceIds)}</small>`:''}</dd></div>`;}
function profile(p){
 const a=p.businessAddress;
 return `<article class="im-row" data-investor="${esc(p.id)}">
 <div class="im-overview"><div><h3>${esc(p.displayName)}</h3><p>${esc(core.label('investorType',p.investorType))}${p.entityType==='person'&&p.organisationName?` · ${esc(p.organisationName)}`:''}</p></div><p>${esc(labels(p,'stages'))}<span>${esc(labels(p,'sectors'))}</span></p><p>${esc(core.formatCheck(p.publishedCheckRange))}<span>Published check</span></p><button class="glass im-select" type="button" data-select="${esc(p.id)}" aria-label="Add ${esc(p.displayName)} to shortlist" aria-pressed="false" hidden>Add to shortlist</button></div>
 <p class="im-match" data-match-label hidden></p>
 <details id="${esc(p.slug)}" class="im-profile"><summary>View profile<span class="im-sr-only">: ${esc(p.displayName)}</span></summary><div class="im-profile-body">
 <p>${esc(p.summary)}</p><p>${link(p.officialWebsite,'Official website')} · ${link(`#${p.slug}`,'Direct profile link')}</p>
 <dl class="im-facts">${field(p,'sectors','Sector')}${field(p,'stages','Stage')}${field(p,'investmentGeographies','Investment geography')}<div><dt>Check size</dt><dd>${esc(core.formatCheck(p.publishedCheckRange))}${p.publishedCheckRange?`<small>${evidence(p,[p.publishedCheckRange.sourceId])}</small>`:''}</dd></div></dl>
 <h4>Investment evidence</h4><ul>${p.investmentEvidence.map(e=>`<li>${esc(e.company?e.company+': ':'')}${esc(e.fact)}${e.eventDate?`<small>Event date: ${esc(e.eventDate)} (${esc(e.datePrecision)} precision)</small>`:'<small>Event date: not established</small>'}<small>${evidence(p,e.sourceIds)}</small></li>`).join('')}</ul>
 <h4>Why this may fit</h4><div data-match-details><p>Select your criteria to see the evidence behind a potential match. Portfolio examples provide context, not proof of a current mandate.</p></div>
 <h4>What still needs checking</h4><p>${!p.publishedCheckRange?'Check size. ':''}${!p.investmentGeographies.length?'Investment geography. ':''}Current mandate, possible portfolio conflicts and the appropriate recipient for your letter.${p.researchNotes?' '+esc(p.researchNotes):''}</p>
 <h4>Business contact route</h4>${p.publicContactPeople.length?`<ul>${p.publicContactPeople.map(c=>`<li>${esc(c.name)}, ${esc(c.role)}. Role reviewed: ${esc(c.reviewedAt)}. ${evidence(p,[c.sourceId])}</li>`).join('')}</ul>`:''}<p>${p.preferredPitchChannel?`${link(p.preferredPitchChannel.url,p.preferredPitchChannel.type==='email-page'?'Published pitch email and instructions':'Published pitch channel')}. ${evidence(p,[p.preferredPitchChannel.sourceId])}`:'Preferred pitch channel: not yet verified.'}</p>
 <p>${a?`Address: published by the organisation.<br>${esc(a.organisation)}<br>${a.lines.map(esc).join('<br>')}<br>${esc(a.city)} ${esc(a.postalCode)}<br>${esc(core.label('investmentGeographies',a.country))}<br>Address type: ${esc(a.addressType.replaceAll('-',' '))}.<br>Business address checked: ${esc(a.checkedAt)}. ${evidence(p,[a.sourceId])}`:'Address not yet verified.'}</p>
 <p>Recipient routing: ${p.recipientRoutingStatus.status==='confirmed'?`confirmed with dated evidence. ${evidence(p,[p.recipientRoutingStatus.sourceId])}`:'not confirmed'}.<br>Paper pitches: ${p.paperPitchPolicy.status==='unknown'?'unknown':p.paperPitchPolicy.status==='accepted'?'accepted':'not accepted. Excluded from the paper plan'}${p.paperPitchPolicy.sourceId?`. ${evidence(p,[p.paperPitchPolicy.sourceId])}`:''}.</p>
 <p class="im-note">A published business address does not confirm that this person works there, accepts unsolicited letters, or will personally receive or read your pitch.</p>
 <h4>Sources and review dates</h4><ul>${p.sources.map(s=>`<li>${link(s.url,s.title)}. ${esc(s.publisher)}.<small>Published: ${esc(s.publishedAt||'not established')}. Reviewed: ${esc(s.checkedAt)}.</small></li>`).join('')}</ul>
 <p>${link('/#start','Suggest a correction / Request removal')}. Include the profile name or direct link.</p>
 </div></details></article>`;
}
const options=f=>`<option value="">Any / not specified</option>`+Object.entries(core.dictionary[f]).map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const header=home.match(/<header\b[\s\S]*?<\/header>/)[0];
const footer=home.match(/<footer>[\s\S]*?<\/footer>/)[0].replace('href="#start"','href="/#start"');
const update=published.map(p=>p.editorialUpdatedAt).sort().at(-1)||'Not yet published';
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Investor Match: Angels &amp; Early-Stage Funds | coin.im</title>
<meta name="description" content="Explore researched angel investors and early-stage funds by sector, stage, geography and published check size. Build a shortlist for thoughtful business outreach.">
<link rel="canonical" href="https://coin.im/investors/"><meta name="theme-color" content="#f8f6f0"><link rel="icon" href="/assets/favicon.ico">
<link rel="stylesheet" href="/assets/direct-mail.css?v=20260906-home3"><link rel="stylesheet" href="/assets/contact-ui.css?v=20260906-v5"><link rel="stylesheet" href="/assets/investors.css?v=20260922-1">
<script defer src="/assets/contact-ui.js?v=20260914-p3"></script><script defer src="/assets/investor-core.js?v=20260922-1"></script><script defer src="/assets/investors.js?v=20260922-1"></script>
</head><body class="im-page"><a class="skip-link" href="#main">Skip to content</a>${header}<main id="main">
<section class="im-intro"><p class="im-title">Investor Match</p><h1>Find investors with a reason to read your pitch.</h1><p class="im-lead">Explore angels, specialist funds and entrepreneur-investors by sector, stage, geography and published check size. See the evidence behind each potential match before planning a thoughtful business letter.</p><div class="actions"><a class="glass primary" href="#catalogue">Explore investors</a><a class="text-action" href="/#start" data-request>Request an investor outreach plan</a></div><p class="im-note">A growing, researched directory. Not a complete investor list.</p><p class="im-note" id="im-published-count">${published.length} investment profiles · Updated ${update}</p><p class="im-process">Find the fit. Check the evidence. Plan the approach.</p></section>
<section id="catalogue" class="im-section"><h2>Who are you building for?</h2>
<form id="im-filters" hidden><div class="im-fields"><label>Sector<select name="sectors">${options('sectors')}</select></label><label>Funding stage<select name="stages">${options('stages')}</select></label><label>Where your company is based<select name="investmentGeographies">${options('investmentGeographies')}</select></label><label>Target check from one investor, USD<input name="check" type="number" min="1" step="1" max="1000000000" inputmode="numeric" aria-describedby="im-check-help"><small id="im-check-help">The amount you are seeking from one investor, not your total round.</small></label></div><div class="actions"><button type="submit" class="glass primary">Find potential matches</button><button type="reset" class="im-text-button">Reset</button></div>
<label class="im-search">Search investors, firms or portfolio companies<input type="search" name="query" placeholder="An investor, firm or portfolio company"></label>
<details class="im-more"><summary>More filters</summary><div class="im-fields"><label>Investor type<select name="investorType">${options('investorType')}</select></label><label>Office country<select name="officeCountry">${options('investmentGeographies')}</select></label><label class="im-checkbox"><input type="checkbox" name="hasAddress">Public business address available</label><label class="im-checkbox"><input type="checkbox" name="showOutside">Include investors outside my selected criteria</label></div><p class="im-note">Office country and investment geography are separate facts.</p></details></form>
<noscript><p>Browse all researched profiles below. Each profile, source and contact link works without JavaScript. Matching and shortlist controls require JavaScript.</p></noscript>
<div class="im-results-heading"><h3>Investment profiles</h3><p id="im-result-status" role="status" aria-live="polite"></p></div><p id="im-deep-link-status" role="status" hidden></p><div id="im-results">${published.map(profile).join('\n')}</div><p id="im-empty" hidden>No investors found. Try fewer filters or reset your search.</p><nav id="im-pagination" aria-label="Investor result pages" hidden><button type="button" class="glass" id="im-prev">Previous</button><span id="im-page-number"></span><button type="button" class="glass" id="im-next">Next</button></nav></section>
<section id="im-shortlist" class="im-section" hidden><h2>Your shortlist</h2><p id="im-selection-count">0 selected</p><p>Choose up to 20 investment profiles for an initial plan. This is a research shortlist; contact routes still need review.</p><p id="im-storage-status" role="status"></p><div class="actions"><a class="text-action" href="#im-review">Review shortlist</a><a class="glass primary" href="/#start" data-request>Request an outreach plan</a><button type="button" class="im-text-button" id="im-clear">Clear shortlist</button></div><div id="im-review" tabindex="-1"></div><label id="im-brief-label">Research brief<textarea id="im-brief" rows="7" readonly></textarea></label><div class="actions"><button type="button" class="glass" id="im-copy">Copy research brief</button></div><p id="im-copy-status" role="status"></p></section>
<section class="im-section"><h2>A researched approach. Not a mass pitch.</h2><p>The shortlist is the starting point. We review why each investor may be relevant, check the appropriate business contact route, and prepare a concise letter around your strongest supported facts. You review the audience and the copy before anything is sent.</p><div class="actions"><a class="glass primary" href="/#start" data-request>Request an investor outreach plan</a></div><p class="im-note">An inquiry, not an order. Scope, delivery availability and any compliance requirements are reviewed separately.</p>
<details class="im-method"><summary>What makes the letter specific?</summary><dl><dt>Why you</dt><dd>A sourced connection to the investor’s stated focus or relevant portfolio.</dd><dt>What we are building</dt><dd>A clear explanation of the company and problem.</dd><dt>What we can prove</dt><dd>Supported product or business evidence, with its limits.</dd><dt>One next step</dt><dd>A small, specific request that respects the recipient’s contact preferences.</dd></dl></details>
<details class="im-method"><summary>How we research</summary><p>We use public professional information to document investment focus, relevant activity and business contact routes. Matches reflect the criteria and evidence shown, not a prediction of interest or an assessment of personal risk tolerance. Information may be incomplete or change over time.</p></details><p class="im-note">This directory is a research tool, not an endorsement, an offer of securities or confirmation of investor eligibility. Any investment-related outreach requires a separate review of the applicable rules and the recipient’s contact preferences.</p></section>
</main>${footer}
<script type="application/json" id="im-data">${JSON.stringify(published).replace(/</g,'\\u003c')}</script></body></html>`;
fs.mkdirSync(path.join(root,'investors'),{recursive:true});fs.writeFileSync(path.join(root,'investors/index.html'),html);
console.log(JSON.stringify({published:published.length,businessAddresses:published.filter(p=>p.businessAddress).length,paperRoutes:published.filter(p=>core.paperState(p)==='confirmed').length,updated:update}));
