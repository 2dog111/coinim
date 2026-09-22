const core = require('../assets/investor-core.js');
const safeUrl = value => {try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;} catch {return false;}};
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
function validate(profile) {
  const errors=[], p=profile;
  const check=(valid,message)=>{if(!valid)errors.push(message);};
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['profile must be an object'];
  for(const key of ['id','slug']) check(typeof p[key]==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p[key])&&p[key].length<=80,`${key}: expected stable slug`);
  check(typeof p.displayName==='string'&&p.displayName.length>1&&p.displayName.length<=120,'displayName: required, max 120');
  check(['person','organisation'].includes(p.entityType),'entityType: invalid');
  check(Object.keys(core.dictionary.investorType).includes(p.investorType),'investorType: invalid');
  check(['draft','published','hidden'].includes(p.publicationStatus),'publicationStatus: invalid');
  check(safeUrl(p.officialWebsite),'officialWebsite: HTTP(S) required');
  check(typeof p.summary==='string'&&p.summary.trim().split(/\s+/).length>=40&&p.summary.trim().split(/\s+/).length<=80,'summary: expected 40 to 80 words');
  check(date(p.editorialUpdatedAt),'editorialUpdatedAt: date required');
  const sources=Array.isArray(p.sources)?p.sources:[];
  check(sources.length>0,'sources: required');
  check(new Set(sources.map(s=>s.id)).size===sources.length,'sources: duplicate id');
  for(const s of sources){check(typeof s.id==='string'&&/^[a-z0-9-]+$/.test(s.id),'source.id: invalid');check(safeUrl(s.url),'source.url: HTTP(S) required');check(date(s.checkedAt),'source.checkedAt: invalid');check(s.publishedAt===null||date(s.publishedAt),'source.publishedAt: invalid');check(typeof s.publisher==='string'&&typeof s.title==='string','source publisher/title required');check(Array.isArray(s.supportsFields)&&s.supportsFields.length>0,'source.supportsFields required');}
  const supported=(id,field)=>sources.some(s=>s.id===id&&s.supportsFields.includes(field));
  const refs=(ids,field)=>Array.isArray(ids)&&ids.length>0&&ids.every(id=>supported(id,field));
  check(refs(p.fieldEvidence?.summary?.sourceIds,'summary'),'summary: field evidence required');
  for(const field of ['sectors','stages','investmentGeographies']){
    check(Array.isArray(p[field])&&p[field].every(v=>Object.hasOwn(core.dictionary[field],v)||field!=='stages'&&v==='*'),`${field}: invalid vocabulary`);
    if(p[field]?.length){check(refs(p.fieldEvidence?.[field]?.sourceIds,field),`${field}: field evidence required`);check(typeof p.fieldEvidence?.[field]?.exhaustive==='boolean',`${field}: exhaustive boolean required`);}
  }
  const range=p.publishedCheckRange;
  check(range===null||range&&Number.isFinite(range.min)&&Number.isFinite(range.max)&&range.min>0&&range.max>=range.min&&/^[A-Z]{3}$/.test(range.currency)&&supported(range.sourceId,'publishedCheckRange'),'publishedCheckRange: invalid range/source');
  check(p.officeCountry===null||Object.hasOwn(core.dictionary.investmentGeographies,p.officeCountry),'officeCountry: invalid');
  if(p.officeCountry)check(refs(p.fieldEvidence?.officeCountry?.sourceIds,'officeCountry'),'officeCountry: evidence required');
  check(Array.isArray(p.investmentEvidence)&&p.investmentEvidence.length>=1&&p.investmentEvidence.length<=3,'investmentEvidence: 1 to 3 facts required');
  for(const e of p.investmentEvidence||[]){check(typeof e.fact==='string'&&e.fact.length>10&&refs(e.sourceIds,'investmentEvidence'),'investmentEvidence: fact/source required');check(e.eventDate===null||e.datePrecision==='day'&&date(e.eventDate)||e.datePrecision==='month'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(e.eventDate)||e.datePrecision==='year'&&/^\d{4}$/.test(e.eventDate),'investmentEvidence: invalid date precision');}
  for(const c of p.publicContactPeople||[])check(c.name&&c.role&&date(c.reviewedAt)&&supported(c.sourceId,'publicContactPeople'),'publicContactPeople: invalid role/evidence/date');
  if(p.preferredPitchChannel)check(safeUrl(p.preferredPitchChannel.url)&&supported(p.preferredPitchChannel.sourceId,'preferredPitchChannel'),'preferredPitchChannel: invalid URL/source');
  const a=p.businessAddress;
  if(a)check(a.organisation&&Array.isArray(a.lines)&&a.lines.length>0&&a.city&&a.country&&['operating-office','headquarters','registered-office','correspondence','type-not-established'].includes(a.addressType)&&date(a.checkedAt)&&supported(a.sourceId,'businessAddress'),'businessAddress: invalid business address/evidence');
  check(p.businessAddress===null||typeof p.businessAddress==='object','businessAddress: required or null');
  check(['not-confirmed','confirmed'].includes(p.recipientRoutingStatus?.status),'recipientRoutingStatus: invalid');
  if(p.recipientRoutingStatus?.status==='confirmed')check(date(p.recipientRoutingStatus.checkedAt)&&supported(p.recipientRoutingStatus.sourceId,'recipientRoutingStatus'),'recipientRoutingStatus: dated evidence required');
  check(['unknown','accepted','not-accepted'].includes(p.paperPitchPolicy?.status),'paperPitchPolicy: invalid');
  if(p.paperPitchPolicy?.status!=='unknown')check(date(p.paperPitchPolicy?.checkedAt)&&supported(p.paperPitchPolicy?.sourceId,'paperPitchPolicy'),'paperPitchPolicy: dated evidence required');
  return errors;
}
const domain=p=>{try{return new URL(p.officialWebsite).hostname.replace(/^www\./,'').toLowerCase();}catch{return '';}};
function identityMatch(a,b){
  if(a.id===b.id || a.slug===b.slug)return 'duplicate';
  if(a.entityType!==b.entityType)return null;
  if(a.entityType==='organisation'&&domain(a)&&domain(a)===domain(b))return 'review';
  if(a.displayName?.toLowerCase()!==b.displayName?.toLowerCase())return null;
  if(a.entityType==='person'&&(a.officialWebsite===b.officialWebsite||a.organisationId&&a.organisationId===b.organisationId))return 'duplicate';
  return 'review';
}
function safeValidate(profile){try{return validate(profile);}catch(_){return ['profile: invalid nested data type; arrays and objects must follow the template'];}}
module.exports={validate:safeValidate,safeUrl,date,identityMatch};
