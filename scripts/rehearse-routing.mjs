// Isolated routing rehearsal: real handlers, in-memory database, fictional accounts.
// Run: node scripts/rehearse-routing.mjs [--serve]
// Never loads .env or writes to the hosted database.
import {start} from '../site/dev/serve.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url));
const out=repo+'.local/routing-rehearsal/';
await mkdir(out,{recursive:true});
// This fixture deliberately tests the keyword/reuse fallback, not live Hydra quality.
delete process.env.HYDRADB_API_KEY;
const site=await start({port:0,quiet:true}),sessions={},projects=JSON.parse(await readFile(repo+'extension/dist/projects.json','utf8'));
const manifest=p=>({...p,source:undefined,cases:undefined});
const hash=p=>createHash('sha256').update(p.source).digest('hex');
function worker(data){return new Promise((resolve,reject)=>{const w=new Worker(repo+'extension/dist/project-worker.cjs',{workerData:data});w.once('message',m=>m.error?reject(new Error(m.error)):resolve(m.result));w.once('error',reject);});}
async function login(name){const r=await fetch(site.url+'/dev-login?as='+encodeURIComponent(name),{redirect:'manual'});sessions[name]=r.headers.get('set-cookie').split(';')[0];}
async function api(who,path,method='GET',body){const r=await fetch(site.url+'/api/'+path,{method,headers:{cookie:sessions[who],'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(path+' '+JSON.stringify(data));return data;}
const A='Anushka Jogalekar',C='Connor hood';
for(const n of[A,C,'Outsider'])await login(n);
const fund=(await api(A,'orgs','POST',{kind:'fund',name:'Meridian Frontier Fund',sharing:'portfolio'})).org;
await api(A,'orgs/'+fund.id,'PATCH',{settings:{crossCompany:true}});
const invite=(await api(A,`orgs/${fund.id}/invites`,'POST',{kind:'company'})).invite;
const from=(await api(A,`invites/${invite.code}/accept`,'POST',{companyName:'Saildrone (demo)' })).orgId;
const to=(await api(C,`invites/${invite.code}/accept`,'POST',{companyName:'Palmetto (demo)' })).orgId;
const mapping={source:'synthetic-demo.csv',binding:{timeColumn:'time',signalColumn:'value',cadenceSeconds:60},result:{state:'verified',detail:'Isolated rehearsal fixture'}};
await api(A,'orgs/'+from,'PATCH',{mapping});await api(C,'orgs/'+to,'PATCH',{mapping});
await api(A,'orgs/'+from,'PATCH',{needs:'Plan offshore survey work around wind, rain and duration limits.'});
await api(C,'orgs/'+to,'PATCH',{needs:'Schedule solar service appointments around wind and rain, keeping a continuous two-hour work slot.'});
const decoys=[];
for(const [name,companyName,needs,optOut] of [
 ['Mira Patel','Ledgerline SaaS','Reconcile subscription invoices against receipts and identify unpaid balances.',false],
 ['Dev Shah','Tensor Forge','Size GPU clusters against throughput, latency and budget constraints.',false],
 ['Rae Chen','Skylark Field Systems','Plan outdoor work windows using wind and rain limits.',true]
]){await login(name);const id=(await api(name,`invites/${invite.code}/accept`,'POST',{companyName})).orgId;await api(name,'orgs/'+id,'PATCH',{mapping,needs});if(optOut)await api(name,'me','PATCH',{pref:{mode:'off',muted:[]}});decoys.push({name,companyName,id,optOut});}
let tools={};for(const p of projects){const {checks}=await worker({verify:true,project:p});assert(checks.every(c=>c.passed));tools[p.id]=(await api(A,'tools','POST',{orgId:from,name:p.id+'-example',description:p.description,hash:hash(p),checks,hours:0,provenance:'reference-template',files:{'inspector.js':p.source,'common-ground.json':JSON.stringify(manifest(p)),'checks.json':JSON.stringify(checks),'README.md':'Prepared example. Synthetic inputs.'}})).tool;await api(A,`tools/${tools[p.id].id}/grants`,'POST',{orgId:from});if(p.id!=='weather')await api(A,`tools/${tools[p.id].id}/grants`,'POST',{userId:'local_connor-hood',companyId:to});}
const match=await api(A,'suggest','POST',{orgId:from,toolId:tools.weather.id});
assert.deepEqual(match.suggestions.map(s=>s.user.name),[C]);
const before=await api(C,'shared?companyId='+to);assert(!before.shared.some(s=>s.tool.id===tools.weather.id));
// Change only a brief: membership stays fixed, and the real matcher must change its answer.
await api('Mira Patel','orgs/'+decoys[0].id,'PATCH',{needs:'Find wind and rain work windows under duration limits.'});
const counterfactual=await api(A,'suggest','POST',{orgId:from,toolId:tools.weather.id});assert(counterfactual.suggestions.some(s=>s.user.name==='Mira Patel'));
await api('Mira Patel','orgs/'+decoys[0].id,'PATCH',{needs:'Reconcile subscription invoices against receipts and identify unpaid balances.'});
await api('Rae Chen','me','PATCH',{pref:{mode:'portfolio',muted:[]}});
const eligible=await api(A,'suggest','POST',{orgId:from,toolId:tools.weather.id});assert(eligible.suggestions.some(s=>s.user.name==='Rae Chen'));
await api('Rae Chen','me','PATCH',{pref:{mode:'off',muted:[]}});
await writeFile(out+'selection.json',JSON.stringify({method:match.method,selected:match.suggestions.map(s=>({name:s.user.name,company:s.company.name,evidence:s.evidence})),fixtures:decoys,briefChangeAltersRecommendation:true,optOutOverridesRelevance:true,noAccessBeforeApproval:true},null,2));

const ready=await api(A,'suggest','POST',{orgId:from,toolId:tools.weather.id});
assert.deepEqual(ready.suggestions.map(s=>s.user.name),[C]);
const hidden=await fetch(site.url+`/api/tools/${tools.weather.id}/package?companyId=${to}`,{headers:{cookie:sessions[C]}});
assert.equal(hidden.status,404,'Recommendation must not grant code access');
const grant=(await api(A,`tools/${tools.weather.id}/grants`,'POST',{userId:'local_connor-hood',companyId:to})).grant;
const downloaded=await api(C,`tools/${tools.weather.id}/package?companyId=${to}`);
assert.equal(downloaded.files['inspector.js'],projects[0].source);
const report=await worker({source:downloaded.files['inspector.js'],input:projects[0].scenarios[0].input,expectedHash:downloaded.hash});
assert.equal(report.report.metrics[0].value,2);
const tighter=await worker({source:downloaded.files['inspector.js'],input:{...projects[0].scenarios[0].input,maxWindMps:4},expectedHash:downloaded.hash});
assert.equal(tighter.report.metrics[0].value,0);
const other=await fetch(site.url+`/api/tools/${tools.weather.id}/package?companyId=${to}`,{headers:{cookie:sessions.Outsider}});assert.equal(other.status,404);
await api(A,'grants/'+grant.id,'DELETE');
console.log('PASS: 28 project checks; one relevant recipient; brief change changes matching; opt-out wins; recommendation grants no access; approved package runs unchanged; unrelated account denied.');
console.log('Prepared 5 fictional company workspaces. No production records changed.');
if(process.argv.includes('--serve')){
 console.log('Anushka: '+site.url+'/dev-login?as='+encodeURIComponent(A)+'&next='+encodeURIComponent(`/dashboard/#/${from}/tools/${tools.weather.id}`));
 console.log('Connor: '+site.url+'/dev-login?as='+encodeURIComponent(C)+'&next='+encodeURIComponent(`/dashboard/#/${to}/tools`));
 console.log('Use separate browser profiles/private windows for separate accounts. Ctrl-C stops and clears this isolated database.');
 process.on('SIGINT',async()=>{await site.close();process.exit(0)});
}else await site.close();
