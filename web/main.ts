import './style.css';
// The Start view inside VS Code / Cursor. It looks like the editor it lives in (VS Code's own theme variables).
// Hosted Common Ground: your account, what's shared with you, sharing your tools. Local builder (optional, `npm start`):
// build a tool and run its seven checks on this machine before it can be shared.
declare const acquireVsCodeApi:undefined|(()=>{postMessage:(m:any)=>void});
const vscode=typeof acquireVsCodeApi==='function'?acquireVsCodeApi():null;
const root=document.querySelector<HTMLDivElement>('#app')!;
const pending=new Map<string,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
function bridge(action:string,payload:any={}):Promise<any>{return new Promise((resolve,reject)=>{if(!vscode)return reject(new Error('Open Common Ground inside VS Code or Cursor.'));const id=crypto.randomUUID();pending.set(id,{resolve,reject});vscode.postMessage({id,action,...payload});setTimeout(()=>{if(pending.delete(id))reject(new Error('The editor didn’t answer in time.'));},90000);});}
const hosted=(path:string,method='GET',body?:any)=>bridge('hosted',{path,method,body});
const local=(path:string,method='GET',body?:any)=>bridge('request',{path,method,body});

// ── state ──
let companyId='';
let signedIn=false,server='',me:any=null,orgs:any[]=[],shared:any[]=[],recents:any[]=[],receipts:any[]=[],lineage:any=null;
let builder:'unknown'|'ready'|'off'='unknown', builderLabel='';
let refreshEpoch=0,refreshInFlight=false;
let view:'start'|'shared'|'tool'|'build'|'built'|'already'|'solar'='start',active:any=null,built:any=null,job:any=null,report:any=null,share:any=null;
let busy=false,notice='',noticeKind:'ok'|'bad'='ok',already:any=null;
let solarResult:any=null,solarReceipt:any=null;
let brief='Build a CSV telemetry completeness inspector. Detect missing timestamps and duplicates, distinguish missing values from zero, and preserve local time without guessing a timezone.';

const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ago=(iso:string)=>{const m=Math.round((Date.now()-Date.parse(iso))/60000);if(m<1)return 'just now';if(m<60)return `${m}m ago`;const h=Math.round(m/60);if(h<24)return `${h}h ago`;return `${Math.round(h/24)}d ago`;};
const initials=(n:string)=>(String(n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('')||'?').toUpperCase();
const hue=(s:string)=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))%360,7);
const person=(u:any)=>u?.picture?`<img class="av" src="${esc(u.picture)}" alt="">`:`<span class="av" style="--h:${hue(u?.id||u?.name||'')}">${esc(initials(u?.name))}</span>`;
const logo=(o:any)=>o?.iconUrl?`<img class="logo" src="${esc(o.iconUrl)}" alt="">`:`<span class="logo">${esc(initials(o?.name))}</span>`;
const ICON={file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',package:'<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/>',user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',back:'<path d="m15 18-6-6 6-6"/>',check:'<path d="M20 6 9 17l-5-5"/>'};
const ic=(k:keyof typeof ICON)=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const companies=()=>orgs.filter(o=>o.kind==='company');
const currentCompany=()=>companies().find(o=>o.id===companyId);
async function companyShares(){
 if(!companyId)return [];
 const r=await hosted(`shared?companyId=${companyId}`);
 if(r.companyId!==companyId)throw new Error('The hosted service needs the company-selection update. Deploy the latest site, then click Refresh companies.');
 return r.shared;
}

async function load(){
 refreshEpoch++;
 const a=await bridge('account');signedIn=a.signedIn;server=a.server;
 me=null;orgs=[];shared=[];companyId='';
 if(signedIn){try{const r=await bridge('workspace');me=r.user;orgs=r.orgs;companyId=r.companyId;shared=await companyShares();}catch(e){notice=(e as Error).message;noticeKind='bad';if(!me)signedIn=false;}}
 recents=await bridge('recents');receipts=await bridge('receipts').catch(()=>[]);
 builder='unknown';local('/health').then((h:any)=>{builder='ready';builderLabel=h.integrations?.builder||'';render();}).catch(()=>{builder='off';render();});
}
async function run(fn:()=>Promise<void>){if(busy)return;busy=true;notice='';render();try{await fn();}catch(e){notice=e instanceof Error?e.message:'Something went wrong';noticeKind='bad';}finally{busy=false;render();}}
const say=(m:string)=>{notice=m;noticeKind='ok';};

// ── views ──
function start(){
 if(!signedIn)return `<h1>Common Ground</h1><p class="lede">A software factory in your editor. Describe a tool and an agent builds it against your portfolio’s shared standard. Seven checks seal the exact version, and the people across the portfolio who need it get it here.</p>
  <div class="actions"><button class="primary" data-act="signin">Sign in to Common Ground</button></div>
  <p class="muted">Your fund or company sends you a link to join. Setting one up? <a href="${esc(server)}/join/">Set up your fund</a>.</p>
  ${recentList()}`;
 const co=currentCompany();
 return `<h1>Common Ground</h1><p class="lede">${!co?(companies().length?'Choose the company you’re working for.':'Create or join a company to start building and receiving tools.'):shared.length?`${shared.length} ${shared.length===1?'tool has':'tools have'} been shared with you at ${esc(co.name)}.`:`No tools have been shared with you at ${esc(co.name)} yet.`}</p>
  <div class="cols"><div>
   <h2>Start</h2><ul class="links">
    <li><button data-act="buildview" ${!co?'disabled':''}>${ic('plus')}Build a tool…</button></li>
    <li><button data-act="openfolder">${ic('folder')}Open folder…</button></li>
   </ul>
   <h2>Shared with you</h2>${shared.length?`<ul class="rows">${shared.map((s:any)=>`<li><button class="row" data-shared="${esc(s.tool.id)}">${s.grant.scope==='portfolio'?logo(s.from):person(s.owner)}<span><b>${esc(s.tool.name)}</b><small>${esc(s.owner.name)}${s.from?` · ${esc(s.from.name)}`:''}</small></span><time>${ago(s.grant.at)}</time></button></li>`).join('')}</ul>`:'<p class="muted">Nothing yet.</p>'}
   ${receiptList()}
   ${recentList()}
  </div><div>
   <h2>You</h2><p class="who">${person(me)}<span><b>${esc(me.name)}</b><small>${esc(co?co.name:companies().length?'Choose a company below':'Not in a company yet')}${co?.fundId?' · in a fund portfolio':''}</small></span></p>
   ${companies().length?`<label for="working-company">Working company</label><select id="working-company" ${busy?'disabled':''}><option value="" disabled ${!companyId?'selected':''}>Choose your company…</option>${companies().map(c=>`<option value="${esc(c.id)}" ${c.id===companyId?'selected':''}>${esc(c.name)} · ${esc(c.role||'member')}</option>`).join('')}</select><p class="muted">Build and receive tools for this company.</p>`:''}
   <ul class="links"><li><button data-act="refreshcompanies">Refresh companies</button></li><li><a href="${esc(server)}/dashboard/${companyId?'#/'+esc(companyId)+'/setup':''}">${ic('user')}Open your dashboard</a></li><li><button data-act="signout">Sign out</button></li></ul>
   <h2>Builder</h2><p class="muted">${builder==='ready'?'The local builder is running. Tools you build are checked on this machine before anyone else can see them.':builder==='off'?'Building needs the local builder: run <span class="kbd">npm start</span> in the Common Ground repo. Receiving tools works without it.':'Looking for the local builder…'}</p>
  </div></div>`;
}
function receiptList(){
 const visible=receipts.filter(r=>companyId&&r.companyId===companyId&&r.userId===me?.id&&r.server===server);
 if(!visible.length)return '';
 const word=(r:any)=>r.state==='sealed'?`<span class="ok">Sealed ${esc(String(r.hash).slice(0,7))}</span>`:r.state==='drifted'?`<span class="warn">Drifted from ${esc(String(r.hash).slice(0,7))}</span>`:'<span class="muted">Folder missing</span>';
 return `<h2>Opened from Common Ground</h2><ul class="rows">${visible.slice(0,6).map((r:any)=>`<li><button class="row" data-receipt="${r.index}">${ic('package')}<span><b>${esc(r.name)}</b><small>${word(r)}</small></span><time>${ago(r.at)}</time></button><button class="linkish" data-run-receipt="${r.index}">Run on solar sample</button></li>`).join('')}</ul>${visible.some((r:any)=>r.state==='drifted')?'<p class="muted">A drifted copy has changed since it passed the factory’s checks. It still runs locally, but it isn’t the version that was shared.</p>':''}`;
}
function solarView(){
 const r=solarResult;
 return `<button class="back" data-act="start">${ic('back')}Start</button><h1>Your shared tool. Solar data.</h1>
  <p class="lede">Run the downloaded inspector in a local sandbox. No builder, model call or upload is required.</p>
  ${!r?`<p>${busy?'Running the original sample and an altered copy…':'Select a downloaded project under Opened from Common Ground.'}</p>`:`
  <p class="who">${ic('package')}<span><b>${esc(solarReceipt?.name)}</b><small>${esc(r.company)} · ${esc(r.timeColumn)} → time · ${esc(r.valueColumn)} → value</small></span></p>
  <p class="${r.caught?'ok':'bad'} solar-verdict">${r.caught?'Caught all injected faults. Core code unchanged.':'The downloaded code did not pass this challenge.'}</p>
  <table class="solar-report"><thead><tr><th>Measured result</th><th>Original sample</th><th>With injected faults</th></tr></thead><tbody>
  ${[['Readings',r.baseline.rows,r.challenge.rows],['Missing timestamps',r.baseline.missingTimestamps.length,r.challenge.missingTimestamps.length],['Duplicate readings',r.baseline.duplicateRows,r.challenge.duplicateRows],['Negative values preserved',r.baseline.negativeValues,r.challenge.negativeValues]].map(([label,b,c])=>`<tr><th>${esc(label)}</th><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table>
  <h2>What it found</h2><p>Missing observations: ${r.challenge.missingTimestamps.length? r.challenge.missingTimestamps.map((t:string)=>`<span class="kbd">${esc(t)}</span>`).join(', '):'none'}.</p>
  <h2>What changed in the data</h2><p class="muted">For this controlled demonstration, we removed 10:00, 10:01 and 10:02, and duplicated 15:00 from January 1, 2015. Both reports above come from executing your downloaded code. Original files stay untouched.</p>
  <h2>Same code, recipient mapping</h2><p class="muted">Downloaded source matches the saved receipt. SHA-256:</p><code class="source-hash">${esc(r.sourceHash)}</code>
  <p class="muted">${esc(r.sample)} Timezone remains unspecified; physical validity is not assessed.</p>`}
  ${solarReceipt?`<div class="actions"><button data-act="rerunsolar" ${busy?'disabled':''}>Run on solar sample again</button></div>`:''}`;
}
async function runSolarReceipt(receipt:any){
 solarReceipt=receipt;solarResult=null;view='solar';render();
 solarResult=await bridge('runSolar',{uri:receipt.uri,hash:receipt.hash});
}
function recentList(){return recents.length?`<h2>Recent folders on this computer</h2><ul class="links">${recents.slice(0,6).map((r:any,i:number)=>`<li><button data-local="${i}">${ic('folder')}${esc(r.name)}</button></li>`).join('')}</ul>`:'';}
function sharedView(){
 const s=active;
 return `<button class="back" data-act="start">${ic('back')}Start</button><h1>${esc(s.tool.name)}</h1>
  <p class="lede">${esc(s.tool.description||'A tool shared with you.')}</p>
  <p class="who">${s.grant.scope==='portfolio'?logo(s.from):person(s.owner)}<span><b>${esc(s.owner.name)}</b><small>${esc(s.from?.name||'')} · shared ${ago(s.grant.at)}${s.grant.scope==='portfolio'?' · from across your portfolio':' · from your team'}</small></span></p>
  <p>This is the exact version that passed all ${s.tool.checks} checks${s.tool.hours?`. It took about ${s.tool.hours} hours to build`:''}. Opening it saves a copy into a new folder; nothing runs until you choose to run it.</p>
  <div class="actions"><button class="primary" data-act="download">Open in editor</button></div>
  <p class="muted">If the share is revoked later, you keep the copy you saved.</p>`;
}
function buildView(){
 if(builder!=='ready')return `<button class="back" data-act="start">${ic('back')}Start</button><h1>Build a tool</h1><p class="lede">Building runs on this machine so the code can be checked before anyone sees it.</p><p>Start the local builder with <span class="kbd">npm start</span> in the Common Ground repo, then come back.</p><div class="actions"><button data-act="recheck">Check again</button></div>`;
 return `<button class="back" data-act="start">${ic('back')}Start</button><h1>Build a tool</h1><p class="lede">Describe it. An agent builds it against Sensor time-series v1, the standard your portfolio shares, so it runs at any company that has mapped its data. Seven checks on real ocean and solar data decide whether it ships.</p>
  <p class="muted">Current builder: ${esc(builderLabel)}${builderLabel.includes('Offline')?' — uses a hand-authored template, not generated code.':''}</p><label for="brief">What should it do?</label><textarea id="brief" rows="5">${esc(brief)}</textarea>
  <p class="muted">Or start from the meeting where someone asked for it: <button class="linkish" data-act="audio">use a recording…</button> It’s transcribed with ElevenLabs Scribe into a brief you can edit before anything is built.</p>
  <div class="actions"><button class="primary" data-act="build" ${busy?'disabled':''}>${busy?'Building…':'Build and check'}</button></div>
  ${signedIn?'<p class="muted">Before anything is built, Common Ground looks for a checked tool in your portfolio that already does this.</p>':''}
  ${job?`<ul class="log">${job.events.map((e:string)=>`<li>${ic('check')}${esc(e)}</li>`).join('')}${job.status==='building'?'<li class="muted">Building and checking…</li>':''}${job.error?`<li class="bad">${esc(job.error)}</li>`:''}</ul>`:''}`;
}
// look before you build: a checked tool on the same standard may already exist in the portfolio
function alreadyView(){
 const s=already;
 return `<button class="back" data-act="buildview">${ic('back')}Brief</button><h1>Already built.</h1>
  <p class="lede">${esc(s.owner.name)} at ${esc(s.from?.name||'your company')} built ${esc(s.tool.name)} against the same standard${s.tool.uses?.length?`, and it has been reused ${s.tool.uses.length} ${s.tool.uses.length===1?'time':'times'}`:''}. It passed the same seven checks.</p>
  <p class="who">${s.grant?.scope==='portfolio'?logo(s.from):person(s.owner)}<span><b>${esc(s.tool.name)}</b><small>${esc(s.tool.description||'')}</small></span></p>
  <div class="actions"><button class="primary" data-act="takeit">Open it instead</button><button data-act="buildanyway">Build my own anyway</button></div>
  <p class="muted">Opening it binds the checked code to your company’s mapping of the standard. Nothing runs until you choose to run it.</p>`;
}
function builtView(){
 const a=built,passed=a.checks.filter((c:any)=>c.passed).length;
 const cos=companies();if(!share)share={orgId:companyId,people:null,pick:new Set<string>(),team:true,name:a.name,description:'Finds missing, duplicate and off-grid readings in a sensor time series before they reach a model.',hours:16};
 const r=report?.report;
 return `<button class="back" data-act="start">${ic('back')}Start</button><h1>${esc(a.name)}</h1>
  <p class="lede">${passed===a.checks.length?`Passed all ${passed} checks.`:`${passed} of ${a.checks.length} checks passed; it can’t be shared until they all pass.`} ${a.provenance==='eve-generated'||a.provenance==='agent-generated'?'Written by the coding agent from your brief.':'Built from the offline reference template.'}${a.requirementId?` Filed in 8090’s Software Factory as requirement ${esc(String(a.requirementId).slice(0,12))}; the tool carries that link wherever it goes.`:''}</p>
  ${a.blueprint?`<h2>Blueprint</h2><p>${esc(a.blueprint.summary)}</p><p class="muted">Reads ${a.blueprint.inputs.map(esc).join(', ')} from ${esc(a.blueprint.standard)}. Returns ${a.blueprint.outputs.length} report fields.${a.blueprint.notes?.length?' '+a.blueprint.notes.map(esc).join(' '):''}</p>`:''}
  <h2>Checks</h2><ul class="log">${a.checks.map((c:any)=>`<li class="${c.passed?'':'bad'}">${ic('check')}${esc(c.name)}</li>`).join('')}</ul>
  ${lineage?.lineage?`<h2>Lineage</h2><p class="muted">${lineage.requirement?.id?`Requirement ${esc(String(lineage.requirement.id).slice(0,10))} in 8090 → `:''}${lineage.lineage.blueprintHash?`blueprint ${esc(lineage.lineage.blueprintHash.slice(0,7))} → `:''}code ${esc(lineage.lineage.sourceHash.slice(0,7))} → checks ${esc(lineage.lineage.checksHash.slice(0,7))} → binding ${esc(lineage.lineage.bindingHash.slice(0,7))}. Work order ${esc(String(lineage.lineage.workOrder).slice(0,8))}, sealed ${ago(lineage.lineage.sealedAt)}.</p>`:''}
  <div class="actions"><button data-act="runsrc">Run on the ocean sample</button><button data-act="openlocal">Open in editor</button></div>
  ${r?`<p>${r.rows.toLocaleString()} readings, ${r.missingTimestamps.length} missing timestamps, ${r.duplicateRows} duplicate rows and ${r.missingValues} missing values.</p>`:''}
  <h2>Share it</h2>
  ${!signedIn?'<p>Sign in to Common Ground to share this with your team or your portfolio.</p><div class="actions"><button class="primary" data-act="signin">Sign in</button></div>'
   :!cos.length?'<p>You’re not in a company yet. Open the invite link your company sent you.</p>'
   :passed!==a.checks.length?'<p class="muted">Fix the failing checks first.</p>'
   :`${cos.length>1?`<label for="co">Company</label><select id="co">${cos.map((c:any)=>`<option value="${esc(c.id)}" ${c.id===share.orgId?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`:''}
    <label for="desc">What it does</label><input id="desc" value="${esc(share.description)}">
    <label for="hours">Hours it took to build</label><input id="hours" type="number" min="1" max="400" value="${share.hours}" class="short">
    <h2>Who should get it</h2><p class="muted">Suggestions use company-authored workflow briefs and recorded reuse, filtered by receiving permissions. A matching schema alone is not evidence of need.</p>${peoplePicker()}
    <div class="actions"><button class="primary" data-act="share" ${busy?'disabled':''}>Share this version${share.pick.size?` with ${share.pick.size}`:''}</button><button data-act="resuggest">Suggest again</button></div>
    <p class="muted">Only this checked version is shared, and only with the people you pick. You can revoke it from your dashboard.</p>`}`;
}
function peoplePicker(){
 if(!share.people)return '<p class="muted">Reading the portfolio’s ontology…</p>';
 if(!share.people.length)return `<p class="muted">${esc(share.note||'Nobody else can receive this yet. Invite your team, or map your data to join the portfolio.')}</p>`;
 return `<ul class="picks">${share.people.map((p:any)=>`<li><label><input type="checkbox" data-person="${esc(p.key)}" ${share.pick.has(p.key)?'checked':''}> ${p.user?person(p.user):logo(p.company)}<span>${esc(p.user?.name||p.label)}${p.portfolio?` <small style="display:inline">· ${esc(p.company.name)}</small>`:''}<small>${p.reasons.map(esc).join(' ')}</small></span></label></li>`).join('')}</ul>${share.note?`<p class="muted">${esc(share.note)}</p>`:''}`;
}
// the end of the factory cycle: suggest who else should get this, from the fund's ontology
async function loadPeople(){
 const r=await hosted('suggest','POST',{orgId:share.orgId,name:share.name,text:share.description});
 share.standard=r.standard;share.note=r.note;
 share.people=r.suggestions.map((x:any,i:number)=>({key:x.user?`${x.user.id}:${x.target.companyId||''}`:`team:${x.target.orgId}`,user:x.user,label:x.label,company:x.company,portfolio:!!x.portfolio,reasons:x.reasons,body:x.target}));
 share.pick=new Set();share.team=false;
 render();
}
function render(){
 const body=view==='solar'?solarView():view==='shared'?sharedView():view==='build'?buildView():view==='built'?builtView():view==='already'?alreadyView():start();
 root.innerHTML=`<main>${notice?`<p class="notice ${noticeKind}" role="status">${esc(notice)}</p>`:''}${body}</main>`;
}

// ── events ──
root.addEventListener('input',e=>{const t=e.target as HTMLInputElement;if(t.id==='brief')brief=t.value;if(t.id==='desc')share.description=t.value;if(t.id==='hours')share.hours=Number(t.value)||1;});
root.addEventListener('change',e=>{const t=e.target as HTMLInputElement;
 if(t.id==='working-company'){void run(async()=>{await bridge('workspace',{companyId:t.value});share=null;active=null;already=null;view='start';await load();});}
 if(t.id==='co'){void run(async()=>{await bridge('workspace',{companyId:t.value});companyId=t.value;share.orgId=t.value;share.toolId=null;share.people=null;share.pick.clear();await loadPeople();});}
 if(t.dataset.team!==undefined)share.team=t.checked;
 if(t.dataset.person){t.checked?share.pick.add(t.dataset.person):share.pick.delete(t.dataset.person);render();}
});
root.addEventListener('click',e=>{
 const el=(e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-shared],[data-local],[data-receipt],[data-run-receipt]');if(!el)return;
 const act=el.dataset.act;
 void run(async()=>{
  if(el.dataset.runReceipt!==undefined){const r=receipts.find((r:any)=>r.index===Number(el.dataset.runReceipt));if(!r)throw new Error('Refresh Start and select your downloaded project.');await runSolarReceipt(r);return;}
  if(act==='rerunsolar'){await runSolarReceipt(solarReceipt);return;}
  if(el.dataset.shared){active=shared.find((s:any)=>s.tool.id===el.dataset.shared);view='shared';return;}
  if(el.dataset.receipt){await bridge('openReceipt',{index:Number(el.dataset.receipt)});return;}
  if(el.dataset.local){await bridge('openRecent',{index:Number(el.dataset.local)});return;}
  if(act==='signin'){await bridge('signIn');say('Finish signing in in your browser. You’ll come straight back here.');}
  if(act==='signout'){await bridge('signOut');active=null;built=null;share=null;job=null;await load();view='start';}
  if(act==='refreshcompanies'){await load();view='start';}
  if(act==='start'){await load();view='start';}
  if(act==='openfolder')await bridge('openFolder');
  if(act==='buildview'||act==='recheck'){view='build';job=null;await local('/health').then((h:any)=>{builder='ready';builderLabel=h.integrations?.builder||'';}).catch(()=>{builder='off';});}
  if(act==='download'){const r=await bridge('openHosted',{toolId:active.tool.id,companyId});if(r.cancelled)say('Cancelled. Nothing was saved.');else say('Saved and opened in a new window.');}
  if(act==='takeit'){active=already;view='shared';const r=await bridge('openHosted',{toolId:already.tool.id,companyId});say(r.cancelled?'Cancelled. Nothing was saved.':'Saved and opened in a new window, bound to your company’s mapping.');return;}
  if(act==='build'&&signedIn){
   // the portfolio's checked tools on this standard: shared with you, or your own company's
   const words=brief.toLowerCase().match(/[a-z]{5,}/g)||[];
   const pool:any[]=[...shared];
   for(const c of companies().filter(c=>c.id===companyId)){const v=await hosted(`orgs/${c.id}`).catch(()=>null);for(const t of v?.tools||[])if(t.checks===7&&t.owner!==me.id&&!pool.some((x:any)=>x.tool.id===t.id))pool.push({tool:t,owner:v.members.find((m:any)=>m.user.id===t.owner)?.user||{name:'A teammate'},from:c,grant:{scope:'team'}});}
   const score=(x:any)=>words.filter((w:string)=>`${x.tool.name} ${x.tool.description||''}`.toLowerCase().includes(w)).length;
   const best=pool.map((x:any)=>[score(x),x] as [number,any]).sort((a,b)=>b[0]-a[0])[0];
   if(best&&best[0]>=2){already=best[1];view='already';return;}
  }
  if(act==='build'||act==='buildanyway'){
   if(signedIn&&!companyId)throw new Error('Select your working company on Start first.');
   // the local builder keeps its own demo identity; the hosted account decides who can receive the result
   await local('/demo-session','POST',{userId:'fabio'}).catch(()=>{});
   job=await local('/build','POST',{prompt:brief});render();
   while(job.status==='building'){await new Promise(r=>setTimeout(r,700));job=await local('/jobs/'+job.id);render();}
   if(job.status==='failed')throw new Error(job.error||'The build failed.');
   built=await local('/artifacts/'+job.artifactId);lineage=await local(`/artifacts/${job.artifactId}/lineage`).catch(()=>null);report=null;share=null;view='built';
   if(signedIn&&companyId){builtView();void loadPeople();}
  }
  if(act==='audio'){
   const input=document.createElement('input');input.type='file';input.accept='audio/*';
   input.onchange=()=>void run(async()=>{const f=input.files?.[0];if(!f)return;if(f.size>5_000_000)throw new Error('Choose a recording under 5 MB.');
    const base64=await new Promise<string>((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(f);});
    const mime=(['audio/webm','audio/wav','audio/mpeg','audio/mp4','audio/ogg'].includes(f.type)?f.type:'audio/mpeg');
    const t=await local('/audio-brief','POST',{base64,mime});brief=t.text;say('Transcribed with ElevenLabs Scribe. Edit the brief, then build.');});
   input.click();
  }
  if(act==='resuggest'){share.people=null;render();await loadPeople();return;}
  if(act==='runsrc')report=await local(`/artifacts/${built.id}/run`,'POST',{challenge:false});
  if(act==='openlocal'){const r=await bridge('openArtifact',{artifactId:built.id});if(!r.cancelled)say('Saved and opened in a new window.');}
  if(act==='share'){
   const picks=(share.people||[]).filter((p:any)=>share.pick.has(p.key));
   if(!picks.length)throw new Error('Pick at least one.');
   const tool=share.toolId?{id:share.toolId}:(await bridge('publishHosted',{artifactId:built.id,orgId:share.orgId,name:built.name,description:share.description,hours:share.hours})).tool;share.toolId=tool.id;
   for(const p of picks)await hosted(`tools/${tool.id}/grants`,'POST',p.body);
   say(`Shared ${built.name} with ${picks.map((p:any)=>p.user?.name||p.label).join(', ')}. Each of them gets it bound to their own company’s mapping.`);share.people=share.people.filter((p:any)=>!share.pick.has(p.key));share.pick=new Set();
  }
 });
});
window.addEventListener('message',e=>{
 if(e.data?.action==='offersChanged'){void refreshOffers();return;}
 if(e.data?.action==='signedIn'){void run(async()=>{await load();if(view==='built'&&signedIn&&companyId){share=null;builtView();void loadPeople();}});return;}
 if(e.data?.action==='showSettings'){window.open?.(`${server}/dashboard/`);return;}
 const p=pending.get(e.data?.id);if(p){pending.delete(e.data.id);e.data.error?p.reject(new Error(e.data.error)):p.resolve(e.data.data);}
});
// One request at a time; responses from an old account/view cannot overwrite the current UI.
async function refreshOffers(){
 if(refreshInFlight||busy||!signedIn||view!=='start'||document.visibilityState!=='visible')return;
 refreshInFlight=true;const epoch=refreshEpoch;
 try{const next=await companyShares();if(epoch!==refreshEpoch||busy||view!=='start'||!signedIn)return;
  if(JSON.stringify(next)!==JSON.stringify(shared)){shared=next;render();}
 }catch{/* Explicit actions surface authentication errors; polling stays quiet. */}
 finally{refreshInFlight=false;}
}
setInterval(()=>void refreshOffers(),8000);
document.addEventListener('visibilitychange',()=>void refreshOffers());

render();
if(vscode)load().then(render).catch(e=>{notice=e.message;noticeKind='bad';render();});
else{root.innerHTML='<main><h1>Common Ground</h1><p class="lede">Open this view inside VS Code or Cursor: install the extension and run “Common Ground: Open Start”.</p></main>';}
