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
  draw();
  const head = `<h1>${forCompany ? `Bring your company into ${esc(o.name)}` : `Join ${esc(o.name)}`}</h1>`;
  if (!ME) { form.innerHTML = head + google(`/join/?invite=${encodeURIComponent(code)}`) + '<p class="err" id="err"></p>'; return; }
  if (!forCompany) {
    form.innerHTML = head + `<p style="margin:0 0 18px;color:var(--mute)">Signed in as ${esc(ME.email)}</p><p class="err" id="err" role="alert"></p><div class="join-act"><button type="submit" class="btn is-blue">Join</button></div>`;
    form.onsubmit = async (e) => { e.preventDefault(); try { const r = await api(`invites/${encodeURIComponent(code)}/accept`, { method: 'POST' }); location.href = dash(r.orgId, 'setup'); } catch (x) { err(x.message); } };
    return;
  }
  const mine = ORGS.filter((x) => x.kind === 'company' && ['owner', 'admin'].includes(x.role) && !x.fundId);
  let pick = mine[0]?.id || '';
  const render = () => {
    form.innerHTML = head
      + (mine.length ? `<div class="kind" style="margin-bottom:14px">${mine.map((c) => `<button type="button" data-co="${c.id}" aria-pressed="${pick === c.id}" >${fav(c.iconUrl, c.name)}<span><b>${esc(c.name)}</b><small>Your company</small></span></button>`).join('')}<button type="button" data-co="" aria-pressed="${!pick}" ><svg viewBox="0 0 24 24">${ic.company}</svg><span><b>A new company</b><small>Register it now</small></span></button></div>` : '')
      + (!pick ? `<label class="fld"><span>Company</span><input name="name" required autocomplete="organization"></label><label class="fld"><span>Website <small style="color:var(--faint)">for its favicon</small></span><input name="site" placeholder="example.com" inputmode="url"></label>` : '')
      + `<p class="err" id="err" role="alert"></p><div class="join-act"><button type="submit" class="btn is-blue">Join ${esc(o.name)}</button></div>`;
  };
  render();
  form.onclick = (e) => { const b = e.target.closest('[data-co]'); if (b) { pick = b.dataset.co; render(); } };
  form.oninput = () => { const n = F('name')?.value || 'Your company', s = F('site')?.value || ''; draw(`<p class="pv-l">Joining</p>${card(fav(host(s) && `https://www.google.com/s2/favicons?domain=${host(s)}&sz=128`, n), n, host(s) || 'Map your data next', [ME])}`); };
  form.onsubmit = async (e) => { e.preventDefault();
    const body = pick ? { companyId: pick } : { companyName: F('name').value, site: F('site').value };
    try { const r = await api(`invites/${encodeURIComponent(code)}/accept`, { method: 'POST', body }); location.href = dash(r.orgId, 'setup'); } catch (x) { err(x.message); } };
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
    form.innerHTML = progress() + (step === 0
      ? `<p class="setup-kicker">${fund?'FOR FUND OPERATING TEAMS':'FOR COMPANY ADMINS'}</p><h1>${fund?'Name your network.':'Name your company.'}</h1><p class="setup-intro">${fund?'Start with the identity your portfolio companies will recognize. No code or employee directory is imported.':'Your company keeps control of its code and its team.'}</p><label class="fld"><span>${fund?'Fund name':'Company name'}</span><input name="name" maxlength="60" required autocomplete="organization" value="${esc(draft.name)}" placeholder="e.g. Northstar Ventures"></label><label class="fld"><span>Website <small>optional · used for the company icon</small></span><input name="site" inputmode="url" placeholder="example.com" value="${esc(draft.site)}"></label><p class="err" id="err" role="alert"></p><div class="join-act"><button type="submit" class="btn is-blue">${fund?'Continue →':'Create company →'}</button></div>`
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
    if(step===0){draft.name=F('name').value.trim();draft.site=F('site').value.trim();if(!draft.name)return err('Give your network a name.');if(fund){step=1;render();form.querySelector('input')?.focus();return;}}
    saving=true; for(const button of form.querySelectorAll('button'))button.disabled=true;
    try {
      if(!created)created=(await api('orgs',{method:'POST',body:{kind,...draft}})).org;
      const {invite:link}=await api(`orgs/${created.id}/invites`,{method:'POST',body:{kind:fund?'company':'member'}});
      step=fund?2:1;
      form.innerHTML=progress()+`<p class="setup-kicker">${esc(created.name)} / READY TO INVITE</p><h1>${fund?'Your network starts with one introduction.':'Bring in your first engineer.'}</h1><p class="setup-intro">${fund?'Send this to a company lead. They register their own company, map a sample, then invite their engineers.':'Send this to a teammate. They join your company and install the extension. You control publishing rights in Team settings.'}</p><label class="fld"><span>${fund?'Company admin invitation':'Engineer invitation'}</span><input id="invite-url" readonly value="${esc(location.origin+'/join/?invite='+link.code)}"></label><button type="button" class="btn is-blue is-full" data-copy>Copy invitation</button><p id="copy-result" class="setup-note" role="status">Anyone with this link can join. It expires in 30 days; turn it off in Settings.</p><div class="next-owner"><b>Next: ${fund?'the company admin':'your teammate'}</b><p>${fund?'They own their company setup. You can track readiness without pretending to be them.':'They finish sign-in and open Common Ground in VS Code or Cursor.'}</p></div><a class="btn is-full" href="${dash(created.id,'setup')}">Open setup checklist →</a>`;
      draw();form.onsubmit=e=>e.preventDefault();
    } catch(x){err(x.message);}finally{saving=false;for(const button of form.querySelectorAll('button'))button.disabled=false;}
  };
  render();
}

if (q.get('invite')) invite(q.get('invite').trim().split('/').filter(Boolean).pop()); else start();
