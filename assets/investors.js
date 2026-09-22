(() => {
  'use strict';
  const core=window.InvestorCore, data=JSON.parse(document.querySelector('#im-data').textContent), store=core.createStore(data);
  const $=s=>document.querySelector(s), form=$('#im-filters'), results=$('#im-results');
  const rows=new Map([...results.children].map(row=>[row.dataset.investor,row]));
  const byId=new Map(data.map(p=>[p.id,p]));
  const key='coin-investor-shortlist-v1';
  let ids=[],storageAvailable=true,page=1,criteria={},linkedSlug='';
  try {ids=core.restoreShortlist(localStorage.getItem(key),data);} catch (_) {storageAvailable=false;}
  function save(){try{localStorage.setItem(key,JSON.stringify({version:1,ids}));}catch(_){storageAvailable=false;} $('#im-storage-status').textContent=storageAvailable?'':'Your browser cannot save this shortlist. It is available here until you leave or reload. Copy the research brief to keep it.';}
  const text=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
  const names={sectors:'Sector',stages:'Stage',investmentGeographies:'Investment geography',check:'Check size'};
  function matchDetails(p,container){
    const m=core.match(p,criteria);container.replaceChildren();
    if(!m.details.length){container.append(text('p','Select your criteria to see the evidence behind a potential match. Portfolio examples provide context, not proof of a current mandate.'));return;}
    const list=document.createElement('ul');
    for(const d of m.details){const li=text('li',`${names[d.field]}: ${d.reason}. ${d.state}.`);for(const id of d.sourceIds){const s=p.sources.find(s=>s.id===id);if(!s)continue;const small=document.createElement('small'),a=text('a',`${s.title}. Reviewed ${s.checkedAt}`);a.href=s.url;a.rel='noopener noreferrer';small.append(a);li.append(small);}list.append(li);}
    container.append(list);
  }
  function filters(){const v=Object.fromEntries(new FormData(form));return {criteria,query:v.query,investorType:v.investorType,officeCountry:v.officeCountry,hasAddress:Boolean(v.hasAddress),showOutside:Boolean(v.showOutside)};}
  function render(){
    const found=store.listInvestors(filters(),{page,size:25});page=found.page;
    for(const row of rows.values())row.hidden=true;
    for(const {profile:p,match:m} of found.items){const row=rows.get(p.id);row.hidden=false;results.append(row);const status=row.querySelector('[data-match-label]');status.textContent=m.label;status.hidden=m.state==='none';matchDetails(p,row.querySelector('[data-match-details]'));}
    const linked=store.getInvestorBySlug(linkedSlug),notice=$('#im-deep-link-status');notice.hidden=true;
    if(linked){const row=rows.get(linked.id);if(row.hidden){row.hidden=false;results.prepend(row);notice.textContent='Showing the directly linked profile in addition to this result page. Your filters are unchanged.';notice.hidden=false;const m=core.match(linked,criteria);row.querySelector('[data-match-label]').textContent=m.label;row.querySelector('[data-match-label]').hidden=m.state==='none';matchDetails(linked,row.querySelector('[data-match-details]'));}row.querySelector('details').open=true;}
    $('#im-empty').hidden=found.total!==0;
    $('#im-result-status').textContent=`${found.total} results${Object.keys(criteria).length?' for your selected criteria':''}`;
    $('#im-pagination').hidden=found.pages<=1;
    $('#im-page-number').textContent=`Page ${page} of ${found.pages}`;
    $('#im-prev').disabled=page<=1;$('#im-next').disabled=page>=found.pages;
  }
  function selected(){return ids.map(id=>byId.get(id)).filter(Boolean);}
  function brief(){return core.makeBrief(selected(),criteria);}
  function shortlist(){
    $('#im-selection-count').textContent=`${ids.length} selected`;
    for(const button of document.querySelectorAll('[data-select]')){const p=byId.get(button.dataset.select),chosen=ids.includes(p.id);button.textContent=chosen?'Remove':'Add to shortlist';button.setAttribute('aria-label',`${chosen?'Remove':'Add'} ${p.displayName} ${chosen?'from':'to'} shortlist`);button.setAttribute('aria-pressed',String(chosen));}
    const review=$('#im-review');review.replaceChildren();
    // One organisation group prevents suggesting a separate campaign for each partner.
    const groups=new Map();for(const p of selected()){const group=p.organisationId||p.id;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(p);}
    for(const group of groups.values()){
      const article=document.createElement('article');
      if(group.length>1)article.append(text('p',`One organisation: ${group[0].organisationName}. Review a single appropriate recipient route.`));
      for(const p of group){article.append(text('h3',p.displayName));const m=core.match(p,criteria);article.append(text('p',m.label||'No matching criteria selected.'));const evidence=document.createElement('div');matchDetails(p,evidence);article.append(evidence);article.append(text('p',core.paperState(p)==='excluded'?'Excluded from the paper plan: paper pitches are not accepted.':core.paperState(p)==='confirmed'?'Dated evidence confirms a paper route. Review it again before outreach.':'Paper route needs research. Check the current mandate, portfolio conflicts, address and recipient preferences.'));const button=text('button','Remove','im-text-button');button.type='button';button.addEventListener('click',()=>{toggle(p.id);$('#im-review').focus();});article.append(button);}
      review.append(article);
    }
    if(!ids.length)review.append(text('p','Your shortlist is empty. Add an investor from the catalogue.'));
    $('#im-brief').value=brief();$('#im-clear').disabled=!ids.length;
  }
  function toggle(id){if(ids.includes(id))ids=ids.filter(v=>v!==id);else if(ids.length<20)ids.push(id);else{$('#im-storage-status').textContent='You have selected 20 profiles. Remove one before adding another.';return;}save();shortlist();}
  document.querySelectorAll('[data-select]').forEach(b=>{b.hidden=false;b.addEventListener('click',()=>toggle(b.dataset.select));});
  form.addEventListener('submit',event=>{event.preventDefault();const v=Object.fromEntries(new FormData(form));criteria=Object.fromEntries(['sectors','stages','investmentGeographies','check'].filter(k=>v[k]!=='').map(k=>[k,v[k]]));page=1;render();shortlist();});
  form.addEventListener('input',event=>{if(event.target.name==='query'){page=1;render();}});
  form.addEventListener('change',event=>{if(['investorType','officeCountry','hasAddress','showOutside'].includes(event.target.name)){page=1;render();}});
  form.addEventListener('reset',()=>{criteria={};page=1;linkedSlug='';if(location.hash)history.replaceState(null,'',location.pathname+location.search);queueMicrotask(()=>{render();shortlist();});});
  for(const [id,delta] of [['#im-prev',-1],['#im-next',1]])$(id).addEventListener('click',()=>{page+=delta;render();$('#im-result-status').scrollIntoView({block:'center'});});
  $('#im-clear').addEventListener('click',()=>{ids=[];save();shortlist();});
  $('#im-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(brief());$('#im-copy-status').textContent='Research brief copied. You can paste it into the inquiry form.';}catch(_){$('#im-brief').focus();$('#im-brief').select();$('#im-copy-status').textContent='Select and copy the brief above. Clipboard access is unavailable.';}});
  document.querySelectorAll('[data-request]').forEach(a=>a.addEventListener('click',event=>{
    const value=brief();if(value.length>2000){event.preventDefault();$('#im-shortlist').scrollIntoView();$('#im-copy-status').textContent='This brief exceeds the contact field limit. Copy it and discuss the full shortlist through the contact options. Nothing has been sent.';return;}
    // Public profile names and criteria only; no email, pitch or form values in the URL.
    a.href='/#investor-brief='+encodeURIComponent(value);
  }));
  function hash(){let slug;try{slug=decodeURIComponent(location.hash.slice(1));}catch(_){return;}if(store.getInvestorBySlug(slug)){linkedSlug=slug;render();document.getElementById(slug).scrollIntoView({block:'start'});}else linkedSlug='';}
  window.addEventListener('hashchange',hash);
  form.hidden=false;$('#im-shortlist').hidden=false;save();render();shortlist();hash();
})();
