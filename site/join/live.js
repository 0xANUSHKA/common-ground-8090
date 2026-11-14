// Join. With ?invite=CODE: see who invited you, sign in with Google, join (a fund's company link asks which company
// you're bringing in). Without one: a fund sets itself up, then sends its company link to the portfolio.
import { api, googleUrl, G } from '../api.js';
import { lilGuy } from '../film/lilguy.js';

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
$('.join-fine').textContent = 'Google sign-in · invite links work for anyone you send them to';

let ME = null, ORGS = [];
try { const r = await api('me'); ME = r.user; ORGS = r.orgs; } catch {}
const google = (next, label = 'Continue with Google') => `<a class="btn is-blue is-full" href="${esc(googleUrl(next))}">${G}${label}</a>`;
const err = (m) => { const e = $('#err'); if (e) e.textContent = m; };
const card = (icon, name, sub, people = []) => `<div class="pv-card"><div class="pv-co">${icon}<span><b>${esc(name)}</b><small>${esc(sub)}</small></span></div><div class="pv-team">${people.map((u) => `<span class="cg-lg" title="${esc(u.name)}">${lilGuy(who(u))}</span>`).join('')}</div></div>`;

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
    form.onsubmit = async (e) => { e.preventDefault(); try { const r = await api(`invites/${encodeURIComponent(code)}/accept`, { method: 'POST' }); location.href = dash(r.orgId); } catch (x) { err(x.message); } };
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
  form.oninput = () => { const n = F('name')?.value || 'Your company', s = F('site')?.value || ''; draw(`<p class="pv-l">Joining</p>${card(fav(host(s) && `https://www.google.com/s2/favicons?domain=${host(s)}&sz=128`, n), n, host(s) || 'Map your data next', [ME])}`); };
  form.onsubmit = async (e) => { e.preventDefault();
    const body = pick ? { companyId: pick } : { companyName: F('name').value, site: F('site').value };
    try { const r = await api(`invites/${encodeURIComponent(code)}/accept`, { method: 'POST', body }); location.href = dash(r.orgId, 'data'); } catch (x) { err(x.message); } };
}

function start() {
  const kind = q.get('kind') === 'company' ? 'company' : 'fund', fund = kind === 'fund';
  const title = fund ? 'Set up your fund' : 'Set up your company';
  const render = () => {
    if (!ME) {
      form.innerHTML = `<h1>${title}</h1><p style="margin:-8px 0 20px;color:var(--mute)">${fund ? 'You’ll get one link to send every portfolio company.' : 'Usually your fund sends you a link. Without one, start here and join a fund later.'}</p>${google(`/join/?kind=${kind}`)}`
        + `<p class="auth-alt">${fund ? 'Running a portfolio company? Open the link your fund sent, or <a href="?kind=company">set up a company</a>.' : '<a href="./">Set up a fund instead</a>'}<br><a href="#" data-demo>Explore a demo fund</a></p>`;
      preview.innerHTML = `<p class="pv-l">How it spreads</p><div class="pv-card"><ol style="margin:0;padding-left:18px;color:var(--mute);font-size:14px;line-height:1.7"><li><b style="color:var(--fg)">The fund</b> sets up and sends one link to its companies.</li><li><b style="color:var(--fg)">Each company</b> maps its data and sends a link to its engineers.</li><li><b style="color:var(--fg)">Engineers</b> install the extension. What they build reaches the right people across the portfolio.</li></ol></div>`;
      return;
    }
    form.innerHTML = `<h1>${title}</h1>`
      + `<label class="fld"><span>${fund ? 'Fund name' : 'Company name'}</span><input name="name" required maxlength="60" autocomplete="organization"></label>`
      + `<label class="fld"><span>Website <small style="color:var(--faint)">for its favicon</small></span><input name="site" placeholder="example.com" inputmode="url"></label>`
      + `<label class="fld"><span>Your GitHub username <small style="color:var(--faint)">optional · draws your avatar</small></span><input name="handle" value="${esc(ME.handle)}" placeholder="octocat" autocapitalize="off" spellcheck="false"></label>`
      + `<p class="err" id="err" role="alert"></p><div class="join-act"><button type="submit" class="btn is-blue">Create ${fund ? 'fund' : 'company'}</button></div>`;
    draw();
  };
  const draw = () => { if (!ME) return; const nm = F('name')?.value || (fund ? 'Your fund' : 'Your company'), st = F('site')?.value || '', h = F('handle')?.value.trim().replace(/^@/, '');
    preview.innerHTML = `<p class="pv-l">You’re setting up</p>${card(fav(host(st) && `https://www.google.com/s2/favicons?domain=${host(st)}&sz=128`, nm), nm, fund ? 'Sensor time-series v1' : host(st) || '1 person', [{ ...ME, handle: h }])}<p class="pv-l">Next</p><div class="pv-card" style="background:none;box-shadow:inset 0 0 0 1px var(--line)"><p style="margin:0;color:var(--mute);font-size:14px">${fund ? 'Copy your company link from the dashboard and send it to every founder or engineering lead in the portfolio.' : 'Map a sample of your data, then send your team its link.'}</p></div>`; };
  render();
  form.oninput = draw;
  form.onclick = async (e) => { if (!e.target.closest('[data-demo]')) return; e.preventDefault(); await api('auth/demo', { method: 'POST' }); location.href = '/dashboard/'; };
  form.onsubmit = async (e) => { e.preventDefault(); if (!ME) return;
    const name = F('name').value.trim(); if (!name) return err('Give it a name.');
    try {
      const h = F('handle').value.trim().replace(/^@/, ''); if (h !== ME.handle) await api('me', { method: 'PATCH', body: { handle: h } });
      const { org } = await api('orgs', { method: 'POST', body: { kind, name, site: F('site').value } });
      await api(`orgs/${org.id}/invites`, { method: 'POST', body: { kind: fund ? 'company' : 'member' } });
      location.href = dash(org.id, fund ? 'overview' : 'data');
    } catch (x) { err(x.message); } };
}

if (q.get('invite')) invite(q.get('invite').trim().split('/').filter(Boolean).pop()); else start();
