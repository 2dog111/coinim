// Local only. Imports are never written to the public catalogue automatically.
const fs=require('node:fs'), path=require('node:path');
const {validate,identityMatch}=require('./investor-schema.cjs');
function csv(input){
  const rows=[];let row=[],cell='',quote=false,line=1,start=1;
  for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quote&&input[i+1]==='"'){cell+='"';i++;}else if(!quote&&cell.length)throw new Error(`row ${line}: unexpected quote`);else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if(c==='\n'&&!quote){row.push(cell.replace(/\r$/,''));if(row.some(Boolean))rows.push({line:start,values:row});row=[];cell='';line++;start=line;}else{cell+=c;if(c==='\n')line++;}}
  if(quote)throw new Error(`row ${start}: unterminated CSV quote`);
  if(cell.length||row.length){row.push(cell);rows.push({line:start,values:row});}
  const header=rows.shift()?.values;
  if(!header||new Set(header).size!==header.length)throw new Error('row 1: missing or duplicate CSV column');
  return rows.map(r=>{if(r.values.length!==header.length)throw new Error(`row ${r.line}: wrong column count`);return {line:r.line,value:Object.fromEntries(header.map((k,i)=>[k,r.values[i]]))};});
}
function run(argv){
  const file=argv[0];if(!file)throw new Error('Usage: node scripts/import-investors.cjs FILE --rights FILE [--mapping FILE] [--dry-run]');
  const option=key=>{const i=argv.indexOf(key);return i<0?null:argv[i+1];};
  const rightsFile=option('--rights');if(!rightsFile)throw new Error('A rights record is required; no import with unknown usage rights.');
  const rights=JSON.parse(fs.readFileSync(rightsFile,'utf8'));
  if(rights.internalUse!=='approved'||!rights.basis||!rights.reviewedAt)throw new Error('Rights record must approve internalUse with basis and reviewedAt. Public publication is reviewed separately.');
  const input=fs.readFileSync(file,'utf8'), mapping=option('--mapping')?JSON.parse(fs.readFileSync(option('--mapping'),'utf8')):null;
  let rows;
  if(path.extname(file).toLowerCase()==='.csv'){
    if(!mapping)throw new Error('CSV requires an explicit --mapping file.');
    rows=csv(input).map(({line,value})=>{const record={};for(const [column,field]of Object.entries(mapping)){if(!(column in value))throw new Error(`row ${line}: missing mapped column ${column}`);let v=value[column];if(!['id','slug','displayName','entityType','investorType','organisationId','organisationName','officialWebsite','summary','officeCountry','editorialUpdatedAt','publicationStatus','researchNotes'].includes(field)){try{v=JSON.parse(v);}catch{throw new Error(`row ${line}: ${column} must contain JSON`);}}record[field]=v===''?null:v;}return {line,value:record};});
  }else{const parsed=JSON.parse(input);if(!Array.isArray(parsed))throw new Error('JSON must be an array of full profile records.');rows=parsed.map((value,i)=>({line:i+1,value}));}
  const root=path.resolve(__dirname,'..'),existing=JSON.parse(fs.readFileSync(path.join(root,'content/investors/profiles.json'),'utf8'));
  const candidates=[],report=[];
  for(const {line,value}of rows){const p={...value,publicationStatus:'draft'},errors=validate(p);const collisions=[...existing,...candidates].map(other=>({other,result:identityMatch(p,other)})).filter(x=>x.result);if(collisions.length)errors.push(...collisions.map(x=>`${x.result}: identity may overlap ${x.other.id}; manual review required`));if(errors.length)report.push({row:line,errors});else candidates.push(p);}
  const result={dryRun:argv.includes('--dry-run'),rows:rows.length,valid:candidates.length,errors:report};
  if(!result.dryRun&&!report.length){const out=path.join(root,'docs/private/investor-match/imports',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(out,{recursive:true,mode:0o700});fs.writeFileSync(path.join(out,'drafts.json'),JSON.stringify(candidates,null,2)+'\n',{mode:0o600});fs.writeFileSync(path.join(out,'rights.json'),JSON.stringify(rights,null,2)+'\n',{mode:0o600});result.output=out;}
  console.log(JSON.stringify(result,null,2));if(report.length)process.exitCode=1;
  return result;
}
if(require.main===module){try{run(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={csv,run};
