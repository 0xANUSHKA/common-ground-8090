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
let signedIn=false,server='',me:any=null,orgs:any[]=[],shared:any[]=[],recents:any[]=[];
let builder:'unknown'|'ready'|'off'='unknown';
let view:'start'|'shared'|'tool'|'build'|'built'='start',active:any=null,built:any=null,job:any=null,report:any=null,share:any=null;
let busy=false,notice='',noticeKind:'ok'|'bad'='ok';
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

async function load(){
 const a=await bridge('account');signedIn=a.signedIn;server=a.server;
 if(signedIn){try{const r=await hosted('me');me=r.user;orgs=r.orgs;shared=(await hosted('shared')).shared;}catch(e){signedIn=false;notice=(e as Error).message;noticeKind='bad';}}
 recents=await bridge('recents');
 builder='unknown';local('/health').then(()=>{builder='ready';render();}).catch(()=>{builder='off';render();});
}
async function run(fn:()=>Promise<void>){if(busy)return;busy=true;notice='';render();try{await fn();}catch(e){notice=e instanceof Error?e.message:'Something went wrong';noticeKind='bad';}finally{busy=false;render();}}
const say=(m:string)=>{notice=m;noticeKind='ok';};

// ── views ──
function start(){
 if(!signedIn)return `<h1>Common Ground</h1><p class="lede">Tools other engineers in your company and portfolio have built, checked and shared with you, right where you work.</p>
  <div class="actions"><button class="primary" data-act="signin">Sign in to Common Ground</button></div>
  <p class="muted">Your fund or company sends you a link to join. Setting one up? <a href="${esc(server)}/join/">Set up your fund</a>.</p>
  ${recentList()}`;
 const co=companies()[0];
 return `<h1>Common Ground</h1><p class="lede">${shared.length?`${shared.length} ${shared.length===1?'tool has':'tools have'} been shared with you.`:'Nothing has been shared with you yet. When someone in your company or portfolio shares a tool with you, it shows up here.'}</p>
  <div class="cols"><div>
   <h2>Start</h2><ul class="links">
    <li><button data-act="buildview">${ic('plus')}Build a tool…</button></li>
    <li><button data-act="openfolder">${ic('folder')}Open folder…</button></li>
   </ul>
   <h2>Shared with you</h2>${shared.length?`<ul class="rows">${shared.map((s:any)=>`<li><button class="row" data-shared="${esc(s.tool.id)}">${s.grant.scope==='portfolio'?logo(s.from):person(s.owner)}<span><b>${esc(s.tool.name)}</b><small>${esc(s.owner.name)}${s.from?` · ${esc(s.from.name)}`:''}</small></span><time>${ago(s.grant.at)}</time></button></li>`).join('')}</ul>`:'<p class="muted">Nothing yet.</p>'}
   ${recentList()}
  </div><div>
   <h2>You</h2><p class="who">${person(me)}<span><b>${esc(me.name)}</b><small>${esc(co?co.name:'Not in a company yet')}${co?.fundId?' · in a fund portfolio':''}</small></span></p>
   <ul class="links"><li><a href="${esc(server)}/dashboard/">${ic('user')}Open your dashboard</a></li><li><button data-act="signout">Sign out</button></li></ul>
   <h2>Builder</h2><p class="muted">${builder==='ready'?'The local builder is running. Tools you build are checked on this machine before anyone else can see them.':builder==='off'?'Building needs the local builder: run <span class="kbd">npm start</span> in the Common Ground repo. Receiving tools works without it.':'Looking for the local builder…'}</p>
  </div></div>`;
}
function recentList(){return recents.length?`<h2>Recent</h2><ul class="links">${recents.slice(0,6).map((r:any,i:number)=>`<li><button data-local="${i}">${ic('folder')}${esc(r.name)}</button></li>`).join('')}</ul>`:'';}
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
 return `<button class="back" data-act="start">${ic('back')}Start</button><h1>Build a tool</h1><p class="lede">Describe it. An agent builds it, then seven checks run against real ocean and solar data.</p>
  <label for="brief">What should it do?</label><textarea id="brief" rows="5">${esc(brief)}</textarea>
  <div class="actions"><button class="primary" data-act="build" ${busy?'disabled':''}>${busy?'Building…':'Build and check'}</button></div>
  ${job?`<ul class="log">${job.events.map((e:string)=>`<li>${ic('check')}${esc(e)}</li>`).join('')}${job.status==='building'?'<li class="muted">Building and checking…</li>':''}${job.error?`<li class="bad">${esc(job.error)}</li>`:''}</ul>`:''}`;
}
function builtView(){
 const a=built,passed=a.checks.filter((c:any)=>c.passed).length;
 const cos=companies();if(!share)share={orgId:cos[0]?.id||'',people:null,pick:new Set<string>(),team:true,name:a.name,description:'Finds missing, duplicate and off-grid readings in a sensor time series before they reach a model.',hours:16};
 const r=report?.report;
 return `<button class="back" data-act="start">${ic('back')}Start</button><h1>${esc(a.name)}</h1>
  <p class="lede">${passed===a.checks.length?`Passed all ${passed} checks.`:`${passed} of ${a.checks.length} checks passed; it can’t be shared until they all pass.`} ${a.provenance==='eve-generated'?'Built by the agent from your brief.':'Built from the offline reference template.'}</p>
  <ul class="log">${a.checks.map((c:any)=>`<li class="${c.passed?'':'bad'}">${ic('check')}${esc(c.name)}</li>`).join('')}</ul>
  <div class="actions"><button data-act="runsrc">Run on the ocean sample</button><button data-act="openlocal">Open in editor</button></div>
  ${r?`<p>${r.rows.toLocaleString()} readings, ${r.missingTimestamps.length} missing timestamps, ${r.duplicateRows} duplicate rows and ${r.missingValues} missing values.</p>`:''}
  <h2>Share it</h2>
  ${!signedIn?'<p>Sign in to Common Ground to share this with your team or your portfolio.</p><div class="actions"><button class="primary" data-act="signin">Sign in</button></div>'
   :!cos.length?'<p>You’re not in a company yet. Open the invite link your company sent you.</p>'
   :passed!==a.checks.length?'<p class="muted">Fix the failing checks first.</p>'
   :`${cos.length>1?`<label for="co">Company</label><select id="co">${cos.map((c:any)=>`<option value="${esc(c.id)}" ${c.id===share.orgId?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`:''}
    <label for="desc">What it does</label><input id="desc" value="${esc(share.description)}">
    <label for="hours">Hours it took to build</label><input id="hours" type="number" min="1" max="400" value="${share.hours}" class="short">
    <label>Who gets it</label>${peoplePicker()}
    <div class="actions"><button class="primary" data-act="share" ${busy?'disabled':''}>Share this version</button></div>
    <p class="muted">Only this checked version is shared, and only with the people you pick. You can revoke it from your dashboard.</p>`}`;
}
function peoplePicker(){
 if(!share.people)return '<p class="muted">Loading people…</p>';
 const co=orgs.find(o=>o.id===share.orgId);
 return `<ul class="picks"><li><label><input type="checkbox" data-team ${share.team?'checked':''}> Everyone at ${esc(co?.name||'your company')}</label></li>${share.people.map((p:any)=>`<li><label><input type="checkbox" data-person="${esc(p.key)}" ${share.pick.has(p.key)?'checked':''}> ${person(p.user)}<span>${esc(p.user.name)}<small>${esc(p.company)}</small></span></label></li>`).join('')}</ul>`;
}
async function loadPeople(){
 const v=await hosted(`orgs/${share.orgId}`);
 share.people=[...v.members.filter((m:any)=>m.user.id!==me.id&&m.receiver).map((m:any)=>({key:m.user.id,user:m.user,company:'Your team',body:{userId:m.user.id}})),
  ...(v.peerPeople||[]).map((p:any)=>({key:`${p.user.id}:${p.companyId}`,user:p.user,company:(v.peers||[]).find((c:any)=>c.id===p.companyId)?.name||'Portfolio',body:{userId:p.user.id,companyId:p.companyId}}))];
 render();
}
function render(){
 const body=view==='shared'?sharedView():view==='build'?buildView():view==='built'?builtView():start();
 root.innerHTML=`<main>${notice?`<p class="notice ${noticeKind}" role="status">${esc(notice)}</p>`:''}${body}</main>`;
}

// ── events ──
root.addEventListener('input',e=>{const t=e.target as HTMLInputElement;if(t.id==='brief')brief=t.value;if(t.id==='desc')share.description=t.value;if(t.id==='hours')share.hours=Number(t.value)||1;});
root.addEventListener('change',e=>{const t=e.target as HTMLInputElement;
 if(t.id==='co'){share.orgId=t.value;share.people=null;share.pick.clear();render();void loadPeople();}
 if(t.dataset.team!==undefined)share.team=t.checked;
 if(t.dataset.person){t.checked?share.pick.add(t.dataset.person):share.pick.delete(t.dataset.person);}
});
root.addEventListener('click',e=>{
 const el=(e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-shared],[data-local]');if(!el)return;
 const act=el.dataset.act;
 void run(async()=>{
  if(el.dataset.shared){active=shared.find((s:any)=>s.tool.id===el.dataset.shared);view='shared';return;}
  if(el.dataset.local){await bridge('openRecent',{index:Number(el.dataset.local)});return;}
  if(act==='signin'){await bridge('signIn');say('Finish signing in in your browser. You’ll come straight back here.');}
  if(act==='signout'){await bridge('signOut');await load();view='start';}
  if(act==='start'){await load();view='start';}
  if(act==='openfolder')await bridge('openFolder');
  if(act==='buildview'||act==='recheck'){view='build';job=null;await local('/health').then(()=>{builder='ready';}).catch(()=>{builder='off';});}
  if(act==='download'){const r=await bridge('openHosted',{toolId:active.tool.id});if(r.cancelled)say('Cancelled. Nothing was saved.');else say('Saved and opened in a new window.');}
  if(act==='build'){
   // the local builder keeps its own demo identity; the hosted account decides who can receive the result
   await local('/demo-session','POST',{userId:'fabio'}).catch(()=>{});
   job=await local('/build','POST',{prompt:brief});render();
   while(job.status==='building'){await new Promise(r=>setTimeout(r,700));job=await local('/jobs/'+job.id);render();}
   if(job.status==='failed')throw new Error(job.error||'The build failed.');
   built=await local('/artifacts/'+job.artifactId);report=null;share=null;view='built';
   if(signedIn&&companies().length){builtView();void loadPeople();}
  }
  if(act==='runsrc')report=await local(`/artifacts/${built.id}/run`,'POST',{challenge:false});
  if(act==='openlocal'){const r=await bridge('openArtifact',{artifactId:built.id});if(!r.cancelled)say('Saved and opened in a new window.');}
  if(act==='share'){
   const picks=(share.people||[]).filter((p:any)=>share.pick.has(p.key));
   if(!share.team&&!picks.length)throw new Error('Pick your team or at least one person.');
   const {tool}=await bridge('publishHosted',{artifactId:built.id,orgId:share.orgId,name:built.name,description:share.description,hours:share.hours});
   if(share.team)await hosted(`tools/${tool.id}/grants`,'POST',{orgId:share.orgId});
   for(const p of picks)await hosted(`tools/${tool.id}/grants`,'POST',p.body);
   say(`Shared ${built.name} with ${[share.team?'your team':'',...picks.map((p:any)=>p.user.name)].filter(Boolean).join(', ')}.`);
  }
 });
});
window.addEventListener('message',e=>{
 if(e.data?.action==='signedIn'){void run(async()=>{await load();if(view==='built'&&signedIn&&companies().length){share=null;builtView();void loadPeople();}});return;}
 if(e.data?.action==='showSettings'){window.open?.(`${server}/dashboard/`);return;}
 const p=pending.get(e.data?.id);if(p){pending.delete(e.data.id);e.data.error?p.reject(new Error(e.data.error)):p.resolve(e.data.data);}
});
// a quiet refresh while the view is open, so new shares arrive without a reload
setInterval(()=>{if(!busy&&signedIn&&view==='start'&&document.visibilityState==='visible')hosted('shared').then(x=>{if(JSON.stringify(x.shared.map((s:any)=>s.grant.id))!==JSON.stringify(shared.map((s:any)=>s.grant.id))){shared=x.shared;render();}}).catch(()=>{});},8000);
render();
if(vscode)load().then(render).catch(e=>{notice=e.message;noticeKind='bad';render();});
else{root.innerHTML='<main><h1>Common Ground</h1><p class="lede">Open this view inside VS Code or Cursor: install the extension and run “Common Ground: Open Start”.</p></main>';}
