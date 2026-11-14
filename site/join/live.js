// Join. With ?invite=CODE: see who invited you, sign in with Google, join (a fund's company link asks which company
// you're bringing in). Without one: a fund sets itself up, then sends its company link to the portfolio.
import { api, googleUrl, G } from '../api.js';

const q = new URLSearchParams(location.search);
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const host = (s) => { try { return new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname; } catch { return ''; } };
const mono = (n) => `<span class="fav is-mono">${esc((n || '?')[0].toUpperCase())}</span>`;
const fav = (url, name) => url ? `<img class="fav" src="${esc(url)}" alt="" onerror="this.outerHTML='${mono(name).replace(/"/g, '&quot;')}'">` : mono(name);
const who = (u) => (u?.handle || (u?.email || u?.name || 'you').split('@')[0]).replace(/[^\w-]/g, '') || 'you';
const ic = { company: '<path d="M3 21h18M5 21V8l6-4v17M11 21V10h8v11"/>', fund: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>' };
const dash = (orgId, page = 'overview') => `/dashboard/#/${orgId}/${page}`;
const form = $('#form'), preview = $('#preview'), F = (n) => form.elements.namedItem(n);
$('.join-fine').textContent = 'Your company controls its code. Joining a network does not publish a tool.';

let ME = null, ORGS = [];
try { const r = await api('me'); ME = r.user; ORGS = r.orgs; } catch {}
const google = (next, label = 'Continue with Google') => `<a class="btn is-blue is-full" href="${esc(googleUrl(next))}">${G}${label}</a>`;
const err = (m) => { const e = $('#err'); if (e) e.textContent = m; };
const initials = (n) => (String(n || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || '?').toUpperCase();
const hue = (str) => [...String(str)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const av = (u) => u.picture ? `<img class="av" src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer" title="${esc(u.name)}">` : `<span class="av" style="--h:${hue(u.id || u.name)}" title="${esc(u.name)}">${esc(initials(u.name))}</span>`;
const card = (icon, name, sub, people = []) => `<div class="pv-card"><div class="pv-co">${icon}<span><b>${esc(name)}</b><small>${esc(sub)}</small></span></div><div class="pv-team">${people.map(av).join('')}</div></div>`;

async function invite(code) {
  let inv;
  try { inv = await api(`invites/${encodeURIComponent(code)}`); } catch (e) { form.innerHTML = `<h1>Invite link</h1><p class="err">${esc(e.message)}</p><div class="join-act"><a class="btn" href="./">Start your own</a></div>`; return; }
  const o = inv.org, forCompany = inv.kind === 'company', icon = fav(o.iconUrl, o.name);
  const draw = (extra = '') => { preview.innerHTML = `<p class="pv-l">${forCompany ? 'Your fund' : 'Your team'}</p>${card(icon, o.name, `${inv.memberCount} ${inv.memberCount === 1 ? 'person' : 'people'}${inv.invitedBy ? ` · ${inv.invitedBy.name} invited you` : ''}`, [inv.invitedBy, ME].filter(Boolean))}${extra}`; };
  draw(forCompany?'<div class="setup-hierarchy invite-explainer"><div><span class="setup-number">01</span><h3>Choose your company</h3><p>Create one or connect a company you already administer.</p></div><div><span class="setup-number">02</span><h3>Make useful connections</h3><p>Map a sample and describe your work. You control publishing; each engineer controls receiving.</p></div></div>':'');
  const head = `<h1>${forCompany ? `Create your company in ${esc(o.name)}` : `Join ${esc(o.name)}`}</h1>`;
  if (!ME) { form.innerHTML = head + google(`/join/?invite=${encodeURIComponent(code)}`) + '<p class="err" id="err"></p>'; return; }
  if (!forCompany) {
    const teamLabel=o.kind==='company'?'an engineer':'a fund team member';
    const existing=ORGS.some(x=>x.id===o.id);
    const introduction=`<p class="setup-kicker">${o.kind==='company'?'ENGINEER INVITATION':'FUND TEAM INVITATION'}</p><h1>${existing?'You already belong to':'Join the team at'} ${esc(o.name)}</h1><p class="setup-intro">This invitation adds you as ${teamLabel} inside <strong>${esc(o.name)}</strong>. It does not create your own company.</p><p>Signed in as ${esc(ME.email)}</p>`;
    form.innerHTML=introduction+(existing
      ? `<a class="btn is-blue" href="${dash(o.id,'setup')}">Open ${esc(o.name)}</a><p class="setup-note">Joined the wrong company? <a href="${dash(o.id,'settings')}">Open Settings to leave</a>.</p>`
      : `<label class="fld"><span><input name="confirmTeam" type="checkbox" required> I want to join ${esc(o.name)} as ${teamLabel}.</span></label><p class="err" id="err" role="alert"></p><div class="join-act"><button type="submit" class="btn is-blue" disabled>Join ${esc(o.name)} as ${teamLabel}</button></div>`)
      + `<div class="personal-company"><b>Creating your own company instead?</b><p>Ask the fund admin for the <strong>company invitation</strong>. That link lets you create a separate company in the same fund.</p><a href="/join/">Back to workspace setup →</a></div>`;
    if(existing)return;
    let saving=false;
    form.onchange=()=>{form.querySelector('button[type="submit"]').disabled=saving||!F('confirmTeam').checked;};
    form.onsubmit=async(e)=>{e.preventDefault();if(saving||!F('confirmTeam').checked)return;saving=true;form.querySelector('button[type="submit"]').disabled=true;try{const r=await api(`invites/${encodeURIComponent(code)}/accept`,{method:'POST'});location.href=dash(r.orgId,'setup');}catch(x){err(x.message);saving=false;form.querySelector('button[type="submit"]').disabled=false;}};
    return;
  }
  const joined = ORGS.filter(x => x.kind === 'company' && x.fundId === o.id && ['owner','admin'].includes(x.role));
  const mine = ORGS.filter(x => x.kind === 'company' && ['owner', 'admin'].includes(x.role) && !x.fundId);
  let pick = mine.length ? null : 'new', saving = false;
  const draft = {name:'',site:''};
  const render = () => {
    form.innerHTML = `<p class="setup-kicker">COMPANY INVITATION</p>` + head
      + `<p class="setup-intro">Signed in as <strong>${esc(ME.email)}</strong>. <button type="button" class="chip-btn" data-account>Use another account</button><br>Choose the company you represent. Your fund role and company role are separate.</p>`
      + (joined.length ? `<div class="existing-workspaces"><p class="pv-l">ALREADY IN THIS NETWORK</p>${joined.map(c=>`<a class="workspace-link" href="${dash(c.id,'setup')}">${fav(c.iconUrl,c.name)}<span><b>${esc(c.name)}</b><small>Continue setup · ${esc(c.role)}</small></span><span aria-hidden="true">→</span></a>`).join('')}</div>` : '')
      + `<div class="kind">${mine.map(c => `<button type="button" data-co="${c.id}" aria-pressed="${pick === c.id}">${fav(c.iconUrl,c.name)}<span><b>Connect ${esc(c.name)}</b><small>Use your existing company</small></span></button>`).join('')}<button type="button" data-co="new" aria-pressed="${pick==='new'}"><svg viewBox="0 0 24 24">${ic.company}</svg><span><b>${joined.length?'Register another company':'Register a new company'}</b><small>You will be its company admin</small></span></button></div>`
      + (pick === 'new' ? `<div class="company-fields"><label class="fld"><span>Company name</span><input name="name" maxlength="60" required autocomplete="organization" value="${esc(draft.name)}" placeholder="e.g. Ocean Labs"></label><label class="fld"><span>Website <small>optional</small></span><input name="site" maxlength="120" placeholder="example.com" inputmode="url" value="${esc(draft.site)}"></label></div>` : '')
      + `<p class="err" id="err" role="alert"></p><div class="join-act"><a href="./" class="quiet-link">All workspaces</a><button type="submit" class="btn is-blue" ${pick===null?'disabled':''}>${pick==='new'?'Create company & join':'Connect company'}</button></div><p class="setup-note">Joining does not share code. Next, map a sample and describe your team's needs.</p>`;
  };
  render();
  form.onclick = async e => { if(e.target.closest('[data-account]')&&!saving){saving=true;try{await api('auth/signout',{method:'POST'});location.href=googleUrl('/join/?invite='+encodeURIComponent(code));}catch(x){saving=false;err(x.message);}return;} const button = e.target.closest('[data-co]'); if(button && !saving){pick=button.dataset.co;render();F('name')?.focus();} };
  form.oninput = () => { if(F('name')) {draft.name=F('name').value;draft.site=F('site').value;} };
  form.onsubmit = async e => {
    e.preventDefault(); if(saving || pick===null)return;
    const body = pick === 'new' ? {companyName:draft.name.trim(),site:draft.site.trim()} : {companyId:pick};
    if(pick==='new' && !body.companyName)return err('Give your company a name.');
    saving=true; for(const button of form.querySelectorAll('button'))button.disabled=true;
    try { const r=await api(`invites/${encodeURIComponent(code)}/accept`,{method:'POST',body});location.href=dash(r.orgId,'setup'); }
    catch(x){err(x.message);saving=false;for(const button of form.querySelectorAll('button'))button.disabled=false;}
  };
}

function choose() {
  preview.innerHTML = `<p class="pv-l">ONE ACCOUNT. TWO CONNECTED ROLES.</p><h2 class="setup-promise">Manage the network.<br>Build with your team.</h2><div class="setup-hierarchy"><div><span class="setup-number">01</span><h3>The fund connects companies</h3><p>Invite company leads and set the boundaries for sharing across the portfolio.</p></div><div><span class="setup-number">02</span><h3>The company connects engineers</h3><p>Map your data, describe your team's needs, and share useful work in your editor.</p></div></div><p class="setup-note">You can do both with the same account. Each workspace keeps its own membership and permissions.</p>`;
  form.innerHTML = `<p class="setup-kicker">COMMON GROUND / YOUR WORKSPACE</p><h1>${ORGS.length?'Pick up where you left off.':'Where does your work begin?'}</h1><p class="setup-intro">${ME?'Signed in as '+esc(ME.email):'Choose what you want to set up. You can add another workspace later.'}</p>`
    + (ORGS.length?`<div class="existing-workspaces"><p class="pv-l">YOUR WORKSPACES</p>${ORGS.map(c=>`<a class="workspace-link" href="${dash(c.id,'setup')}">${fav(c.iconUrl,c.name)}<span><b>${esc(c.name)}</b><small>${c.kind==='fund'?'Fund network':'Company'} · ${esc(c.role)}</small></span><span aria-hidden="true">→</span></a>`).join('')}</div>`:'')
    + `<div class="intent-options"><a class="intent-card" href="?kind=fund"><svg viewBox="0 0 24 24">${ic.fund}</svg><span><b>Set up a fund network</b><small>Connect portfolio companies and set sharing boundaries.</small></span><span>→</span></a><a class="intent-card" href="?kind=company"><svg viewBox="0 0 24 24">${ic.company}</svg><span><b>Set up my company</b><small>Bring engineers together. Build, share, and receive tools.</small></span><span>→</span></a></div><div class="invite-entry"><label class="fld"><span>Have an invitation?</span><input name="inviteLink" type="url" placeholder="Paste your Common Ground invitation"></label><button class="btn is-full" type="submit">Open invitation →</button><p class="err" id="err" role="alert"></p><p class="setup-note">Engineers join through their company invitation. You don't need to create a fund.</p></div>`;
  form.onsubmit=e=>{e.preventDefault();try{const u=new URL(F('inviteLink').value);const code=u.searchParams.get('invite');if(u.origin!==location.origin || !/^\/join\/?$/.test(u.pathname)||!code)throw Error();location.href='/join/?invite='+encodeURIComponent(code);}catch{err('Paste an invitation link from this Common Ground site.');}};
}

function start() {
  const kind = q.get('kind') === 'company' ? 'company' : 'fund', fund = kind === 'fund';
  let step = 0, saving = false, created = null;
  const draft = { name: '', site: '', sharing: 'company' };
  const steps = fund ? ['Your network', 'Sharing boundaries', 'Invite companies'] : ['Your company', 'Your engineers'];
  const progress = () => `<ol class="onboarding-progress" aria-label="Setup progress">${steps.map((x,i)=>`<li ${i===step?'aria-current="step"':''} class="${i<step?'done':''}"><span>${i<step?'✓':i+1}</span>${x}</li>`).join('')}</ol>`;
  const draw = () => {
    preview.innerHTML = `<p class="pv-l">ONE NETWORK. CLEAR OWNERSHIP.</p><h2 class="setup-promise">Good work should<br>travel further.</h2><div class="setup-hierarchy">
      <div><span class="setup-number">01</span><h3>${esc(draft.name || (fund?'Your fund':'The network'))}</h3><p>Sets the network boundary and invites company leads.</p></div>
      <div><span class="setup-number">02</span><h3>Company admins</h3><p>Map their data, describe the team's needs, and choose who can publish.</p></div>
      <div><span class="setup-number">03</span><h3>Engineers in their IDE</h3><p>Build and verify. Approve a suggested recipient. Receive useful work where they already code.</p></div>
      </div><p class="setup-note">A fund membership never grants blanket access to a company's code. Engineers can switch receiving off.</p>`;
  };
  const render = () => {
    draw(); form.onclick = onClick;
    if (!ME) {
      form.innerHTML = `<p class="setup-kicker">COMMON GROUND / GET STARTED</p><h1>${fund?'Bring your portfolio together.':'Bring your engineers together.'}</h1><p class="setup-intro">${fund?'Set up the network. Invite company leads. Let engineers share checked tools in their existing editor.':'Join your fund using its company invite, or set up your own company first.'}</p>${google(`/join/?kind=${kind}`)}<p class="auth-alt">${fund?'Have a company invitation? Open that link instead. <a href="?kind=company">Set up a company</a>.':'<a href="./">Set up a fund instead</a>.'}<br><a href="#" data-demo>Explore an illustrative demo network</a></p><p class="err" id="err" role="alert"></p>`;
      return;
    }
    form.innerHTML = `<a class="quiet-link back-choice" href="./">← Workspaces & setup options</a>` + progress() + (step === 0
      ? `<p class="setup-kicker">${fund?'FOR FUND OPERATING TEAMS':'FOR COMPANY ADMINS'}</p><h1>${fund?'Name your network.':'Name your company.'}</h1><p class="setup-intro">${fund?'Start with the identity your portfolio companies will recognize. No code or employee directory is imported.':'Your company keeps control of its code and its team.'}</p>${!fund&&ORGS.some(x=>x.kind==='fund'&&['owner','admin'].includes(x.role))?`<div class="personal-company"><b>Part of your fund?</b><p>Connect your company directly to a network you manage.</p>${ORGS.filter(x=>x.kind==='fund'&&['owner','admin'].includes(x.role)).map(x=>`<a class="workspace-link" href="?fund=${x.id}"><span><b>Join ${esc(x.name)}</b><small>Create or connect my company in this fund</small></span>→</a>`).join('')}<p>Or create a standalone company below.</p></div>`:''}<label class="fld"><span>${fund?'Fund name':'Company name'}</span><input name="name" maxlength="60" required autocomplete="organization" value="${esc(draft.name)}" placeholder="${fund?'e.g. Northstar Ventures':'e.g. Ocean Labs'}"></label><label class="fld"><span>Website <small>optional · used for the company icon</small></span><input name="site" inputmode="url" placeholder="example.com" value="${esc(draft.site)}"></label><p class="err" id="err" role="alert"></p><div class="join-act"><button type="submit" class="btn is-blue">${fund?'Continue →':'Create company →'}</button></div>`
      : `<p class="setup-kicker">YOU SET THE CEILING</p><h1>Choose how work travels.</h1><p class="setup-intro">Company admins choose their publishers. Authors approve each shared version. This setting never shares existing code.</p><div class="sharing-choices"><label><input type="radio" name="sharing" value="company" ${draft.sharing==='company'?'checked':''}><span><b>Within each company first</b><small>Invite and set up your portfolio. Enable cross-company sharing when you're ready.</small></span></label><label><input type="radio" name="sharing" value="portfolio" ${draft.sharing==='portfolio'?'checked':''}><span><b>Allow named cross-company shares</b><small>Both companies must participate and be mapped. Only authorized publishers can share; recipients can opt out.</small></span></label></div><p class="setup-note">Current factory contract: Sensor time-series v1. Companies map time and value columns; this isn't automatic compatibility for arbitrary applications.</p><p class="err" id="err" role="alert"></p><div class="join-act"><button type="button" class="btn" data-back>Back</button><button type="submit" class="btn is-blue">Create network →</button></div>`);
  };
  async function onClick(e) {
    if (e.target.closest('[data-back]') && !saving) { step=0; render(); }
    if (e.target.closest('[data-copy]')) {
      try { await navigator.clipboard.writeText($('#invite-url').value); $('#copy-result').textContent='Copied. Send this privately to a company admin.'; }
      catch { $('#invite-url').focus(); $('#invite-url').select(); $('#copy-result').textContent='Select and copy the link above.'; }
    }
    if (e.target.closest('[data-demo]')) { e.preventDefault(); if(saving)return; saving=true; try{await api('auth/demo',{method:'POST'});location.href='/dashboard/';}catch(x){err(x.message);}finally{saving=false;} }
  }
  form.oninput = () => { if(F('name')){draft.name=F('name').value;draft.site=F('site').value;} if(F('sharing'))draft.sharing=F('sharing').value; draw(); };
  form.onsubmit = async e => {
    e.preventDefault(); if(!ME || saving)return;
    if(step===0){draft.name=F('name').value.trim();draft.site=F('site').value.trim();if(!draft.name)return err('Give it a name.');const existing=ORGS.find(o=>o.kind===kind&&o.name.trim().toLowerCase()===draft.name.toLowerCase());if(existing){err('You already have this workspace. Open it from Workspaces & setup options above.');return;}if(fund){step=1;render();form.querySelector('input')?.focus();return;}}
    saving=true; for(const button of form.querySelectorAll('button'))button.disabled=true;
    try {
      if(!created)created=(await api('orgs',{method:'POST',body:{kind,...draft}})).org;
      const {invite:link}=await api(`orgs/${created.id}/invites`,{method:'POST',body:{kind:fund?'company':'member'}});
      step=fund?2:1;
      form.innerHTML=progress()+`<p class="setup-kicker">${esc(created.name)} / READY TO INVITE</p><h1>${fund?'Your network starts with one introduction.':'Bring in your first engineer.'}</h1><p class="setup-intro">${fund?'Send this to a company lead. They register their own company, map a sample, then invite their engineers.':'Send this to a teammate. They join your company and install the extension. You control publishing rights in Team settings.'}</p><label class="fld"><span>${fund?'Company invitation — creates a separate company':'Engineer invitation — joins this company'}</span><input id="invite-url" readonly value="${esc(location.origin+'/join/?invite='+link.code)}"></label><button type="button" class="btn is-blue is-full" data-copy>Copy ${fund?'company':'engineer'} invitation</button><p id="copy-result" class="setup-note" role="status">Anyone with this link can join. It expires in 30 days; turn it off in Settings.</p><div class="next-owner"><b>Next: ${fund?'the company admin':'your teammate'}</b><p>${fund?'They own their company setup. You can track readiness from your fund workspace.':'They finish sign-in and open Common Ground in VS Code or Cursor.'}</p></div>${fund?`<div class="personal-company"><b>Building tools yourself, too?</b><p>Create or connect your company in this network using this same account.</p><a class="btn is-full" href="/join/?invite=${encodeURIComponent(link.code)}">Set up my own company →</a></div>`:''}<a class="btn is-full" href="${dash(created.id,'setup')}">${fund?'Open fund workspace':'Continue company setup'} →</a>`;
      draw();form.onsubmit=e=>e.preventDefault();
    } catch(x){err(x.message);}finally{saving=false;for(const button of form.querySelectorAll('button'))button.disabled=false;}
  };
  render();
}

async function ownFund(id) {
  if(!ME){form.innerHTML='<h1>Set up your company.</h1>'+google('/join/?fund='+encodeURIComponent(id));return;}
  form.innerHTML='<h1>Opening company setup…</h1>';
  try {
    const v=await api(`orgs/${encodeURIComponent(id)}`);
    if(v.org.kind!=='fund'||!['owner','admin'].includes(v.myRole))throw new Error('Ask a fund admin for a company invitation.');
    let link=(v.invites||[]).find(i=>i.kind==='company'&&!i.revoked&&Date.parse(i.expiresAt)>Date.now());
    if(!link)link=(await api(`orgs/${id}/invites`,{method:'POST',body:{kind:'company'}})).invite;
    history.replaceState(null,'','/join/?invite='+encodeURIComponent(link.code));
    await invite(link.code);
  }catch(x){form.innerHTML=`<h1>Company setup</h1><p class="err" role="alert">${esc(x.message)}</p><a class="btn" href="./">Back to workspaces</a>`;}
}
if(q.get('fund')) ownFund(q.get('fund')); else if (q.get('invite')) invite(q.get('invite').trim().split('/').filter(Boolean).pop()); else if(['fund','company'].includes(q.get('kind'))) start(); else choose();
