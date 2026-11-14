// Join, live. With ?invite=CODE: see who invited you, sign in with Google, join (a fund's company link asks which
// company you're bringing in). Without one: sign in, then start a circle, a company or a fund; you land in your
// dashboard with its invite link ready to send to everyone.
import { api, googleUrl, G } from '../api.js';
import { lilGuy } from '../film/lilguy.js';

const q = new URLSearchParams(location.search);
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const host = (s) => { try { return new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname; } catch { return ''; } };
const mono = (n) => `<span class="fav is-mono">${esc((n || '?')[0].toUpperCase())}</span>`;
const fav = (url, name) => url ? `<img class="fav" src="${esc(url)}" alt="" onerror="this.outerHTML='${mono(name).replace(/"/g, '&quot;')}'">` : mono(name);
const who = (u) => (u?.handle || (u?.email || u?.name || 'you').split('@')[0]).replace(/[^\w-]/g, '') || 'you';
const ic = { circle: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><circle cx="12" cy="16" r="3"/>', company: '<path d="M3 21h18M5 21V8l6-4v17M11 21V10h8v11"/>', fund: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>' };
const KIND = { circle: ['Individual', 'You and a circle of friends'], company: ['Portfolio company', 'Your team and your data'], fund: ['Fund', 'Your portfolio and the standard'] };
const dash = (orgId, kind) => `/dashboard/#${kind === 'circle' ? `i/org/${orgId}` : `e/${kind === 'fund' ? 'org' : 'team'}/org/${orgId}`}`;
const form = $('#form'), preview = $('#preview'), F = (n) => form.elements.namedItem(n);
$('.join-fine').textContent = 'Google sign-in · invite links work for anyone you send them to';

let ME = null, ORGS = [];
try { const r = await api('me'); ME = r.user; ORGS = r.orgs; } catch {}
const google = (next, label = 'Continue with Google') => `<a class="btn is-blue is-full" href="${esc(googleUrl(next))}">${G}${label}</a>`;
const err = (m) => { const e = $('#err'); if (e) e.textContent = m; };
const card = (icon, name, sub, people = []) => `<div class="pv-card"><div class="pv-co">${icon}<span><b>${esc(name)}</b><small>${esc(sub)}</small></span></div><div class="pv-team">${people.map((u) => `<span class="cg-lg" title="${esc(u.name)}">${lilGuy(who(u))}</span>`).join('')}</div></div>`;

async function invite(code) {
  let inv;
  try { inv = await api(`invites/${encodeURIComponent(code)}`); } catch (e) { form.innerHTML = `<h1>Invite link</h1><p class="err">${esc(e.message)}</p><div class="join-act"><a class="btn" href="./">Start your own</a></div>`; return; }
  const o = inv.org, forCompany = inv.kind === 'company', icon = o.kind === 'circle' ? `<span class="fav is-mono">${esc(o.name[0].toUpperCase())}</span>` : fav(o.iconUrl, o.name);
  const draw = (extra = '') => { preview.innerHTML = `<p class="pv-l">${forCompany ? 'Your fund' : o.kind === 'circle' ? 'The circle' : 'Your team'}</p>${card(icon, o.name, `${inv.memberCount} ${inv.memberCount === 1 ? 'person' : 'people'}${inv.invitedBy ? ` · ${inv.invitedBy.name} invited you` : ''}`, [inv.invitedBy, ME].filter(Boolean))}${extra}`; };
  draw();
  const head = `<h1>${forCompany ? `Bring your company into ${esc(o.name)}` : `Join ${esc(o.name)}`}</h1>`;
  if (!ME) { form.innerHTML = head + google(`/join/?invite=${encodeURIComponent(code)}`) + '<p class="err" id="err"></p>'; return; }
  if (!forCompany) {
    form.innerHTML = head + `<p style="margin:0 0 18px;color:var(--mute)">Signed in as ${esc(ME.email)}</p><p class="err" id="err" role="alert"></p><div class="join-act"><button type="submit" class="btn is-blue">Join</button></div>`;
    form.onsubmit = async (e) => { e.preventDefault(); try { const r = await api(`invites/${encodeURIComponent(code)}/accept`, { method: 'POST' }); location.href = dash(r.orgId, o.kind); } catch (x) { err(x.message); } };
    return;
  }
  const mine = ORGS.filter((x) => x.kind === 'company' && ['owner', 'admin'].includes(x.role) && !x.fundId);
  let pick = mine[0]?.id || '';
  const render = () => {
    form.innerHTML = head
      + (mine.length ? `<div class="kind" style="margin-bottom:14px">${mine.map((c) => `<button type="button" data-co="${c.id}" aria-pressed="${pick === c.id}" style="${pick === c.id ? 'box-shadow:inset 0 0 0 1px var(--accent)' : ''}">${fav(c.iconUrl, c.name)}<span><b>${esc(c.name)}</b><small>Your company</small></span></button>`).join('')}<button type="button" data-co="" aria-pressed="${!pick}" style="${!pick ? 'box-shadow:inset 0 0 0 1px var(--accent)' : ''}"><svg viewBox="0 0 24 24">${ic.company}</svg><span><b>A new company</b><small>Register it now</small></span></button></div>` : '')
      + (!pick ? `<label class="fld"><span>Company</span><input name="name" required autocomplete="organization"></label><label class="fld"><span>Website <small style="color:var(--faint)">for its favicon</small></span><input name="site" placeholder="example.com" inputmode="url"></label>` : '')
      + `<p class="err" id="err" role="alert"></p><div class="join-act"><button type="submit" class="btn is-blue">Join ${esc(o.name)}</button></div>`;
  };
  render();
  form.onclick = (e) => { const b = e.target.closest('[data-co]'); if (b) { pick = b.dataset.co; render(); } };
  form.oninput = () => { const n = F('name')?.value || 'Your company', s = F('site')?.value || ''; draw(`<p class="pv-l">Joining</p>${card(fav(host(s) && `https://${host(s)}/favicon.ico`, n), n, host(s) || 'Map your data next', [ME])}`); };
  form.onsubmit = async (e) => { e.preventDefault();
    const body = pick ? { companyId: pick } : { companyName: F('name').value, site: F('site').value };
    try { const r = await api(`invites/${encodeURIComponent(code)}/accept`, { method: 'POST', body }); location.href = `/dashboard/#e/team/mapping/${r.orgId}`; } catch (x) { err(x.message); } };
}

function start() {
  let kind = ['circle', 'company', 'fund'].includes(q.get('kind')) ? q.get('kind') : null;
  const render = () => {
    if (!kind) {
      form.innerHTML = `<h1>Join Common Ground</h1><div class="kind">${Object.entries(KIND).map(([k, [t, d]]) => `<button type="button" data-kind="${k}"><svg viewBox="0 0 24 24">${ic[k]}</svg><span><b>${t}</b><small>${d}</small></span></button>`).join('')}</div>`
        + `<p class="auth-alt" style="margin-top:18px">Got an invite link? Just open it.${ME ? '' : ' · <a href="../signin/">Sign in</a>'}</p>`;
      preview.innerHTML = ME ? `<p class="pv-l">Signed in</p>${card(`<span class="cg-lg" style="width:40px;height:40px">${lilGuy(who(ME))}</span>`, ME.name, ME.email)}` : '';
      return;
    }
    const [t] = KIND[kind];
    if (!ME) { form.innerHTML = `<h1>${t}</h1>${google(`/join/?kind=${kind}`)}<p class="auth-alt"><button type="button" class="chip-btn" data-back>Back</button></p>`; preview.innerHTML = ''; return; }
    form.innerHTML = `<h1>${kind === 'circle' ? 'Start a circle' : kind === 'fund' ? 'Your fund' : 'Your company'}</h1>`
      + `<label class="fld"><span>${kind === 'circle' ? 'Circle name' : 'Name'}</span><input name="name" required maxlength="60" placeholder="${kind === 'circle' ? 'Weekend hackers' : ''}" ${kind === 'circle' ? '' : 'autocomplete="organization"'}></label>`
      + (kind !== 'circle' ? `<label class="fld"><span>Website <small style="color:var(--faint)">for its favicon</small></span><input name="site" placeholder="example.com" inputmode="url"></label>` : '')
      + `<label class="fld"><span>Your GitHub username <small style="color:var(--faint)">draws your lil guy</small></span><input name="handle" value="${esc(ME.handle)}" placeholder="octocat" autocapitalize="off" spellcheck="false"></label>`
      + `<p class="err" id="err" role="alert"></p><div class="join-act"><button type="button" class="btn" data-back>Back</button><button type="submit" class="btn is-blue">Create</button></div>`;
    draw();
  };
  const draw = () => { if (!kind || !ME) return; const n = F('name')?.value || (kind === 'circle' ? 'Your circle' : kind === 'fund' ? 'Your fund' : 'Your company'), s = F('site')?.value || '', h = F('handle')?.value.trim().replace(/^@/, '');
    preview.innerHTML = `<p class="pv-l">You’re making</p>${card(kind === 'circle' ? `<span class="fav is-mono">${esc(n[0].toUpperCase())}</span>` : fav(host(s) && `https://${host(s)}/favicon.ico`, n), n, kind === 'fund' ? 'Sensor time-series v1' : host(s) || '1 person', [{ ...ME, handle: h }])}<p class="pv-l">Next</p><div class="pv-card" style="background:none;box-shadow:inset 0 0 0 1px var(--line)"><p style="margin:0;color:var(--mute);font-size:14px">${kind === 'fund' ? 'Two invite links: one for your team, one for your portfolio companies.' : 'One invite link. Send it to everyone; they sign in with Google and they’re in.'}</p></div>`; };
  render();
  form.onclick = (e) => { const b = e.target.closest('[data-kind],[data-back]'); if (!b) return; kind = b.dataset.kind || null; history.replaceState(null, '', kind ? `?kind=${kind}` : './'); render(); };
  form.oninput = draw;
  form.onsubmit = async (e) => { e.preventDefault(); if (!kind || !ME) return;
    const name = F('name').value.trim(); if (!name) return err('Give it a name.');
    try {
      const h = F('handle').value.trim().replace(/^@/, ''); if (h !== ME.handle) await api('me', { method: 'PATCH', body: { handle: h } });
      const { org } = await api('orgs', { method: 'POST', body: { kind, name, site: F('site')?.value || '' } });
      await api(`orgs/${org.id}/invites`, { method: 'POST', body: { kind: 'member' } });
      if (kind === 'fund') await api(`orgs/${org.id}/invites`, { method: 'POST', body: { kind: 'company' } });
      location.href = dash(org.id, kind);
    } catch (x) { err(x.message); } };
}

if (q.get('invite')) invite(q.get('invite').trim().split('/').filter(Boolean).pop()); else start();
