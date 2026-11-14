// Regression coverage for setup, permission-consistent suggestions and package reads.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { start } from './serve.mjs';
const {url,close}=await start({port:0,quiet:true});
const sessions={}; let checks=0;
async function login(name){const r=await fetch(`${url}/dev-login?as=${name}`,{redirect:'manual'});sessions[name]=r.headers.get('set-cookie').split(';')[0];}
async function call(who,method,path,body){const r=await fetch(`${url}/api/${path}`,{method,headers:{cookie:sessions[who],'content-type':'application/json'},body:method==='GET'?undefined:JSON.stringify(body||{})});return {status:r.status,...await r.json()};}
const check=(name,condition)=>{assert.ok(condition,name);checks++;console.log('PASS',name);};
try{
 for(const n of ['fund','author','recipient','colleague','outsider'])await login(n);
 const fund=(await call('fund','POST','orgs',{kind:'fund',name:'Northstar',sharing:'company'})).org;
 check('onboarding company-only choice persists',fund.settings.crossCompany===false);
 const invite=(await call('fund','POST',`orgs/${fund.id}/invites`,{kind:'company'})).invite;
 const from=(await call('author','POST',`invites/${invite.code}/accept`,{companyName:'Marine'})).orgId;
 // A second company owned by the recipient is created first: it must never be picked as the rebinding destination.
 const unrelated=(await call('recipient','POST','orgs',{kind:'company',name:'Unrelated'})).org.id;
 const to=(await call('recipient','POST',`invites/${invite.code}/accept`,{companyName:'Solar'})).orgId;
 const member=(await call('author','POST',`orgs/${from}/invites`,{kind:'member'})).invite;
 await call('colleague','POST',`invites/${member.code}/accept`);
 const mapping={source:'sample.csv',binding:{timeColumn:'time',signalColumn:'power',cadenceSeconds:60},result:{state:'verified',detail:'admin supplied sample result'}};
 await call('author','PATCH',`orgs/${from}`,{mapping});
 await call('recipient','PATCH',`orgs/${unrelated}`,{mapping});
 await call('recipient','PATCH',`orgs/${to}`,{mapping});
 const source='function inspect(rows){return {rows:rows.length}}';
 const tool=(await call('author','POST','tools',{orgId:from,name:'telemetry-gap-check',description:'Find missing timestamps and telemetry gaps',hash:createHash('sha256').update(source).digest('hex'),files:{'inspector.js':source},checks:Array.from({length:7},(_,i)=>({name:`local-reported-${i}`,passed:true}))})).tool;
 const suggest=()=>call('author','POST','suggest',{orgId:from,toolId:tool.id});
 check('no suggestion solely because schemas match',(await suggest()).suggestions.length===0);
 await call('recipient','PATCH',`orgs/${to}`,{needs:'Find missing timestamps in solar telemetry.'});
 check('fund boundary gates names before recommendations',(await suggest()).suggestions.length===0);
 await call('fund','PATCH',`orgs/${fund.id}`,{settings:{crossCompany:true}});
 let s=await suggest();
 check('recommendation cites the company-authored brief',s.suggestions.length===1&&s.suggestions[0].user.id==='local_recipient'&&s.suggestions[0].evidence[0].kind==='company-brief');
 check('non-admin cannot change the workflow brief',(await call('colleague','PATCH',`orgs/${from}`,{needs:'fake'})).status===404);
 check('another author cannot request a tool suggestion',(await call('colleague','POST','suggest',{orgId:from,toolId:tool.id})).status===404);
 for(const pref of [{mode:'off'},{mode:'company'},{mode:'portfolio',muted:['local_author']}]){
  await call('recipient','PATCH','me',{pref});
  check(`suggestions obey ${JSON.stringify(pref)}`,(await suggest()).suggestions.length===0);
 }
 await call('recipient','PATCH','me',{pref:{mode:'portfolio',muted:[]}});
 const g=(await call('author','POST',`tools/${tool.id}/grants`,{userId:'local_recipient',companyId:to})).grant;
 check('named approved share succeeds',!!g);
 const pkg=await call('recipient','GET',`tools/${tool.id}/package`);
 check('binding follows the authorized destination, not first membership',JSON.parse(pkg.files['binding.json']).company==='Solar');
 check('already shared person is not repeatedly recommended',(await suggest()).suggestions.length===0);
 for(const pref of [{mode:'off'},{mode:'company'},{mode:'portfolio',muted:['local_author']}]){
  await call('recipient','PATCH','me',{pref});
  check(`package access obeys ${JSON.stringify(pref)}`,(await call('recipient','GET',`tools/${tool.id}/package`)).status===404);
  check('blocked recipient cannot record reuse',(await call('recipient','POST',`tools/${tool.id}/uses`,{kind:'download'})).status===404);
 }
 await call('recipient','PATCH','me',{pref:{mode:'portfolio',muted:[]}});
 await call('author','PATCH',`orgs/${from}/members/local_author`,{exporter:false});
 check('removing exporter revokes existing cross-company downloads',(await call('recipient','GET',`tools/${tool.id}/package`)).status===404);
 await call('author','PATCH',`orgs/${from}/members/local_author`,{exporter:true});
 check('restored exporter permits still-valid grant',(await call('recipient','GET',`tools/${tool.id}/package`)).status===200);
 await call('author','POST',`tools/${tool.id}/grants`,{userId:'local_colleague'});
 check('named teammate can fetch',(await call('colleague','GET',`tools/${tool.id}/package`)).status===200);
 await call('author','PATCH',`orgs/${from}/members/local_colleague`,{receiver:false});
 check('team membership does not bypass receiver off',(await call('colleague','GET',`tools/${tool.id}/package`)).status===404);
 await call('author','PATCH',`orgs/${from}/members/local_colleague`,{receiver:true});
 await call('author','PATCH',`orgs/${from}/members/local_author`,{publisher:false,exporter:false});
 check('removing publisher revokes existing team grants',(await call('colleague','GET',`tools/${tool.id}/package`)).status===404);
 check('publisher removal prevents recommendations',(await suggest()).suggestions.length===0);
 check('fund admin still cannot fetch company code',(await call('fund','GET',`tools/${tool.id}/package`)).status===404);
 console.log(`${checks} setup and sharing regression checks passed.`);
}finally{await close();}
