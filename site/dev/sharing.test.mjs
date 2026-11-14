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
 // Same account can run a fund and its own company, without role bleed or duplicate joins.
 const own=(await call('fund','POST',`invites/${invite.code}/accept`,{companyName:'Fund Engineering'})).orgId;
 const repeat=await call('fund','POST',`invites/${invite.code}/accept`,{companyName:' fund engineering '});
 check('repeated company creation resumes the same owned company',repeat.already===true&&repeat.orgId===own);
 const again=await call('fund','POST',`invites/${invite.code}/accept`,{companyId:own});
 check('explicit rejoin is idempotent',again.already===true&&again.orgId===own);
 const memberships=(await call('fund','GET','me')).orgs;
 check('one account holds distinct fund and company memberships',memberships.some(o=>o.id===fund.id&&o.kind==='fund')&&memberships.some(o=>o.id===own&&o.kind==='company'));
 check('invitation does not connect a similarly named existing company implicitly',(await call('recipient','POST',`invites/${invite.code}/accept`,{companyName:'Unrelated'})).status===409);
 check('cannot attach a company owned by someone else',(await call('outsider','POST',`invites/${invite.code}/accept`,{companyId:own})).status===403);
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
 // Reproduce Connor: accidentally joined the author's company, and owns other companies too.
 await call('author','PATCH',`orgs/${from}/members/local_author`,{publisher:true,exporter:true});
 await call('recipient','POST',`invites/${member.code}/accept`);
 const selected=await call('recipient','GET',`shared?companyId=${to}`);
 check('selected company receives only its own grants',selected.companyId===to&&selected.shared.length===1);
 check('old company shares stay out of another company inbox',(await call('recipient','GET',`shared?companyId=${unrelated}`)).shared.length===0);
 check('accidental source membership does not import a portfolio grant into source inbox',(await call('recipient','GET',`shared?companyId=${from}`)).shared.length===0);
 const scoped=await call('recipient','GET',`tools/${tool.id}/package?companyId=${to}`);
 check('selected recipient mapping wins over accidental author-company membership',scoped.companyId===to&&JSON.parse(scoped.files['binding.json']).company==='Solar');
 check('an unrelated membership cannot borrow another company grant',(await call('recipient','GET',`tools/${tool.id}/package?companyId=${unrelated}`)).status===404);
 check('a fund admin cannot select a company without direct membership',(await call('fund','GET',`shared?companyId=${to}`)).status===404);
 check('reuse cannot be attributed to an unauthorized company',(await call('recipient','POST',`tools/${tool.id}/uses`,{companyId:unrelated})).status===404);
 const to2=(await call('recipient','POST',`invites/${invite.code}/accept`,{companyName:'Second Solar'})).orgId;
 await call('recipient','PATCH',`orgs/${to2}`,{mapping:{...mapping,binding:{...mapping.binding,signalColumn:'watts'}}});
 await call('author','POST',`tools/${tool.id}/grants`,{userId:'local_recipient',companyId:to2});
 const second=await call('recipient','GET',`tools/${tool.id}/package?companyId=${to2}`);
 check('two grants for one person bind to the explicitly selected destination',JSON.parse(second.files['binding.json']).value==='watts'&&second.companyId===to2);
 check('first company records its own reuse',(await call('recipient','POST',`tools/${tool.id}/uses`,{companyId:to})).ok===true);
 const secondUse=await call('recipient','POST',`tools/${tool.id}/uses`,{companyId:to2});
 check('second company reuse is not suppressed by the first company download',secondUse.ok===true&&!secondUse.already);
 const view=await call('recipient','GET',`orgs/${to2}`);
 check('reuse is attributed to the selected company',view.reuse.length===1&&view.reuse[0].to.id===to2);
 await call('recipient','PATCH',`orgs/${to}/members/local_recipient`,{receiver:false});
 check('selected context still enforces live receiving permissions',(await call('recipient','GET',`shared?companyId=${to}`)).shared.length===0&&(await call('recipient','GET',`tools/${tool.id}/package?companyId=${to}`)).status===404);
 check('disabling one membership does not break another authorized context',(await call('recipient','GET',`shared?companyId=${to2}`)).shared.length===1);
 const decisionSource='function run(input){return input}';
 const decision=(await call('author','POST','tools',{orgId:from,name:'decision-example',hours:0,provenance:'reference-template',hash:createHash('sha256').update(decisionSource).digest('hex'),files:{'inspector.js':decisionSource,'common-ground.json':JSON.stringify({contract:'decision-report/v1',scenarios:[{name:'Synthetic baseline',input:{}}]})},checks:Array.from({length:7},(_,i)=>({name:`Project-specific check ${i+1}`,passed:true}))})).tool;
 check('prepared decisions retain their own contract and unmeasured build time',decision.contract==='decision-report/v1'&&decision.hours===0&&decision.checkResults[0].name==='Project-specific check 1');
 await call('author','POST',`tools/${decision.id}/grants`,{orgId:from});
 check('decision example supports teammate access',!!(await call('colleague','GET',`tools/${decision.id}/package?companyId=${from}`)).files);
 await call('author','POST',`tools/${decision.id}/grants`,{userId:'local_recipient',companyId:to2});
 const decisionPackage=await call('recipient','GET',`tools/${decision.id}/package?companyId=${to2}`);
 check('cross-company decision project preserves code without inserting a false sensor mapping',decisionPackage.files['inspector.js']===decisionSource&&!decisionPackage.files['binding.json']);
 check('another membership cannot access decision code without a grant',(await call('recipient','GET',`tools/${decision.id}/package?companyId=${unrelated}`)).status===404);
 console.log(`${checks} setup and sharing regression checks passed.`);
}finally{await close();}
