// Join: a portfolio company registers itself and its team and maps its data to the standard, or a fund manager sets
// up the fund. The right side previews what you're making as you type. On finish everything is written to the same
// store the dashboard reads, you're signed in, and you land in your dashboard.
import { load, save, session, slug } from '../store.js';
import { lilGuy } from '../film/lilguy.js';
import { sniff, inspect } from '../csvcheck.js';

const S = load();
const q = new URLSearchParams(location.search);
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const taken = (h) => S.users.some((u) => u.handle.toLowerCase() === h.toLowerCase());
const host = (s) => { try { return new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname; } catch { return ''; } };
const SOURCES = ['ERDDAP / NetCDF', 'SolarEdge', 'Enphase', 'CURB', 'Sensor logger', 'Other CSV'];
const SAMPLES = { ocean: ['../samples/saildrone_1045_2021-09-30.csv', 'Ocean sample', 'ERDDAP / NetCDF'], solar: ['../samples/pvdaq_system10_sample.csv', 'Solar sample', 'SolarEdge'] };

const D = {
  kind: null, step: 0,
  co: { invite: q.get('invite') || '', name: '', site: '', gh: '' },
  me: { name: '', handle: q.get('handle') || '' },
  team: [],
  data: { src: null, text: null, file: '', b: null, res: null },
  fund: { name: S.fund.name === 'Your fund' ? '' : S.fund.name },
  circle: { name: '', friends: '' },
};
if (D.co.invite) D.kind = 'company';
const form = $('#form'), preview = $('#preview');

// ── helpers ──
const invited = () => { const code = D.co.invite.trim().split('/').filter(Boolean).pop(); return code ? S.companies.find((c) => c.invite?.url?.endsWith('/' + code)) : null; };
const icon = () => { const c = invited(); if (c?.icon) return `<img class="fav" src="../film/favicons/${esc(c.icon)}" alt="">`; const h = host(D.co.site); const name = D.co.name || c?.name || '';
  return h ? `<img class="fav" src="https://${esc(h)}/favicon.ico" alt="" onerror="this.outerHTML='<span class=&quot;fav is-mono&quot;>${esc((name || '?')[0].toUpperCase())}</span>'">` : `<span class="fav is-mono">${esc((name || '?')[0].toUpperCase())}</span>`; };
const verified = () => { const r = D.data.res; return !!(r && r.ok && !r.missing && !r.duplicates && !r.offGrid); };
const people = () => [D.me, ...D.team].filter((p) => HANDLE.test(p.handle));
const dots = (n, of) => `<p class="dots" aria-label="Step ${n} of ${of}">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'is-on' : ''}"></i>`).join('')}</p>`;
const ic = { me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>', co: '<path d="M3 21h18M5 21V8l6-4v17M11 21V10h8v11"/>', fund: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>' };

// ── steps ──
function step() {
  const company = D.kind === 'company', of = company ? 4 : 2;
  if (D.step === 0) return `${dots(1, 4)}<h1>Join Common Ground</h1><div class="kind">`
    + `<button type="button" data-kind="individual"><svg viewBox="0 0 24 24">${ic.me}</svg><span><b>Individual</b><small>You and a circle of friends</small></span></button>`
    + `<button type="button" data-kind="company"><svg viewBox="0 0 24 24">${ic.co}</svg><span><b>Portfolio company</b><small>Your team and your data</small></span></button>`
    + `<button type="button" data-kind="fund"><svg viewBox="0 0 24 24">${ic.fund}</svg><span><b>Fund</b><small>Your portfolio and the standard</small></span></button></div>`;
  if (D.kind === 'individual') return `${dots(2, 2)}<h1>You</h1>${you()}`
    + `<label class="fld"><span>Start a circle</span><input data-k="circle.name" value="${esc(D.circle.name)}" placeholder="Weekend hackers" maxlength="40"></label>`
    + `<label class="fld"><span>Friends’ GitHub usernames</span><input data-k="circle.friends" value="${esc(D.circle.friends)}" placeholder="kai-dev, noa-codes" autocapitalize="off" spellcheck="false"></label>` + act('Join');
  if (!company) return `${dots(2, of)}<h1>Your fund</h1>`
    + `<label class="fld"><span>Fund name</span><input data-k="fund.name" value="${esc(D.fund.name)}" required autocomplete="organization"></label>`
    + you() + act('Create fund');
  if (D.step === 1) { const c = invited();
    return `${dots(2, of)}<h1>Your company</h1>`
      + `<label class="fld"><span>Invite link ${c ? `<b class="ok">✓ ${esc(c.name)}</b>` : `<button type="button" class="chip-btn" data-demo-invite>Use demo invite</button>`}</span><input data-k="co.invite" value="${esc(D.co.invite)}" placeholder="commonground.dev/join/…"></label>`
      + `<label class="fld"><span>Company</span><input data-k="co.name" value="${esc(D.co.name || c?.name || '')}" required autocomplete="organization"></label>`
      + `<div class="row2"><label class="fld"><span>Website</span><input data-k="co.site" value="${esc(D.co.site)}" placeholder="example.com" inputmode="url"></label>`
      + `<label class="fld"><span>GitHub org</span><input data-k="co.gh" value="${esc(D.co.gh)}" placeholder="your-org" autocapitalize="off" spellcheck="false"></label></div>` + act('Next'); }
  if (D.step === 2) return `${dots(3, of)}<h1>Your team</h1>${you()}`
    + `<div class="team" id="team">${D.team.map(mate).join('')}</div><button type="button" class="btn" data-add>+ Add teammate</button>` + act('Next');
  return `${dots(4, of)}<h1>Your data</h1>`
    + `<div class="srcs" role="group" aria-label="Source system">${SOURCES.map((s) => `<button type="button" data-src="${esc(s)}" aria-pressed="${D.data.src === s}">${esc(s)}</button>`).join('')}</div>`
    + `<div class="drop"><button type="button" class="btn" data-sample="ocean">Ocean sample</button><button type="button" class="btn" data-sample="solar">Solar sample</button><label class="btn">Upload CSV<input type="file" accept=".csv,text/csv" data-upload></label>${D.data.file ? `<small>${esc(D.data.file)}</small>` : ''}</div>`
    + (D.data.b ? mapping() : '') + act(verified() ? 'Join' : 'Join, map later');
}
const you = () => `<div class="row2"><label class="fld"><span>Your name</span><input data-k="me.name" value="${esc(D.me.name)}" required autocomplete="name"></label>`
  + `<label class="fld"><span>GitHub username</span><span class="gh-in"><span class="cg-lg ${D.me.handle ? 'is-on' : ''}" data-face="me">${D.me.handle ? lilGuy(D.me.handle) : ''}</span><span class="at">@</span><input data-k="me.handle" value="${esc(D.me.handle)}" required autocapitalize="off" spellcheck="false" autocomplete="username"></span></label></div>`;
const mate = (m, i) => `<div class="mate" data-i="${i}"><span class="cg-lg" data-face="${i}">${m.handle ? lilGuy(m.handle) : ''}</span>`
  + `<input class="in" data-m="name" value="${esc(m.name)}" placeholder="Name" aria-label="Teammate name"><input class="in" data-m="handle" value="${esc(m.handle)}" placeholder="GitHub username" aria-label="Teammate GitHub username" autocapitalize="off" spellcheck="false">`
  + `<button type="button" class="x" data-del="${i}" aria-label="Remove">×</button>`
  + `<div class="roles">${[['publisher', 'Publish'], ['exporter', 'Export'], ['receiver', 'Receive']].map(([k, l]) => `<label><input type="checkbox" data-r="${k}" ${m[k] ? 'checked' : ''}>${l}</label>`).join('')}</div></div>`;
function mapping() {
  const b = D.data.b, cols = b.columns, opt = (sel) => cols.map((c) => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  return `<div class="row2"><label class="fld"><span>Time column</span><select data-b="timeColumn">${opt(b.timeColumn)}</select></label><label class="fld"><span>Value column</span><select data-b="valueColumn">${opt(b.valueColumn)}</select></label></div>`
    + `<div class="row2"><label class="fld"><span>Time</span><select data-b="timeBasis"><option value="utc" ${b.timeBasis === 'utc' ? 'selected' : ''}>UTC</option><option value="local-unspecified" ${b.timeBasis === 'local-unspecified' ? 'selected' : ''}>Local, no timezone</option></select></label><label class="fld"><span>Every (seconds)</span><input type="number" min="1" data-b="cadenceSeconds" value="${b.cadenceSeconds}"></label></div>`
    + `<label class="tog"><input type="checkbox" data-b="unitsRow" ${b.unitsRow ? 'checked' : ''}>Second row is units</label><div id="res">${result()}</div>`;
}
function result() {
  const r = D.data.res; if (!r) return '';
  if (r.error) return `<p class="verdict is-bad">✗ ${esc(r.error)}</p>`;
  const cell = (n, l, bad) => `<div class="${bad ? 'is-bad' : ''}"><b>${Number(n).toLocaleString()}</b><span>${l}</span></div>`;
  const why = r.badTimes ? `${r.badTimes} unreadable time${r.badTimes > 1 ? 's' : ''}` : r.missing ? `${r.missing} missing timestamp${r.missing > 1 ? 's' : ''}` : r.duplicates ? `${r.duplicates} duplicate${r.duplicates > 1 ? 's' : ''}` : `${r.offGrid} off-grid`;
  return `<div class="res">${cell(r.unique, 'observations')}${cell(r.missing, 'missing times', r.missing)}${cell(r.duplicates, 'duplicates', r.duplicates)}${cell(r.missingValues, 'missing values')}${cell(r.offGrid, 'off-grid', r.offGrid)}${cell(r.badTimes, 'unreadable', r.badTimes)}</div>`
    + (verified() ? `<p class="verdict is-ok">✓ Maps to ${esc(S.standard.name)}</p>` : `<p class="verdict is-bad">✗ ${why}</p>`);
}
const act = (label) => `<p class="err" id="err" role="alert"></p><div class="join-act">${D.step > 0 ? '<button type="button" class="btn" data-back>Back</button>' : ''}<button type="submit" class="btn is-blue">${label}</button></div>`;

// ── preview ──
const friends = () => D.circle.friends.split(/[\s,]+/).map((x) => x.trim().replace(/^@/, '')).filter((h) => HANDLE.test(h));
function renderPreview() {
  if (D.kind === 'individual' || !D.kind) {
    if (!D.kind) { preview.innerHTML = ''; return; }
    const ppl = [D.me.handle, ...friends()].filter((h) => HANDLE.test(h));
    preview.innerHTML = `<p class="pv-l">Your circle</p><div class="pv-card"><div class="pv-co"><span><b>${esc(D.circle.name || 'Just you')}</b><small>${ppl.length} ${ppl.length === 1 ? 'person' : 'people'}</small></span></div>`
      + `<div class="pv-team">${ppl.map((h) => `<span class="cg-lg" title="@${esc(h)}">${lilGuy(h)}</span>`).join('')}</div></div>`
      + `<p class="pv-l pv-vs-l">Friends see your tools in VS Code</p><div class="pv-vs"><p>Recent</p><div class="pv-row">${HANDLE.test(D.me.handle) ? `<span class="cg-lg">${lilGuy(D.me.handle)}</span>` : ''}<a>your-first-tool</a><small>${esc(D.me.name || 'you')}</small></div><div class="pv-row is-dim"><a>side-project</a><small>~/code</small></div></div>`;
    return;
  }
  if (D.kind === 'fund') {
    const members = S.companies.filter((c) => c.status !== 'none');
    preview.innerHTML = `<p class="pv-l">Your fund</p><div class="pv-card"><div class="pv-co"><span class="fav is-mono">${esc((D.fund.name || 'F')[0].toUpperCase())}</span><span><b>${esc(D.fund.name || 'Your fund')}</b><small>${esc(S.standard.name)}</small></span></div>`
      + `<div class="pv-team">${members.map((c) => c.icon ? `<img class="fav" style="width:34px;height:34px;border-radius:9px" src="../film/favicons/${esc(c.icon)}" alt="">` : '').join('')}</div>`
      + `<div class="pv-team">${HANDLE.test(D.me.handle) ? `<span class="cg-lg">${lilGuy(D.me.handle)}</span>` : ''}</div></div>`;
    return;
  }
  const c = invited(), name = D.co.name || c?.name || 'Your company', ok = verified();
  preview.innerHTML = `<p class="pv-l">Your org</p><div class="pv-card"><div class="pv-co">${icon()}<span><b>${esc(name)}</b><small>${esc(D.co.gh ? `github.com/${D.co.gh}` : host(D.co.site) || (c ? 'Invited by your fund' : '—'))}</small></span><em class="${ok ? 'is-ok' : ''}">${ok ? 'Joined' : 'Invited'}</em></div>`
    + `<div class="pv-team">${people().map((p) => `<span class="cg-lg" title="@${esc(p.handle)}">${lilGuy(p.handle)}</span>`).join('')}</div>`
    + `<div class="pv-map">${D.data.src ? `<b>${esc(D.data.src)}</b> → ${esc(S.standard.name)} ${ok ? '✓' : D.data.b ? '✗' : '…'}` : `→ ${esc(S.standard.name)}`}</div></div>`
    + `<p class="pv-l pv-vs-l">Others see you in VS Code</p><div class="pv-vs"><p>Recent</p><div class="pv-row">${icon()}<a>your-first-tool</a><small>${esc(name)}</small></div><div class="pv-row is-dim"><a>glider-dashboard</a><small>~/code</small></div></div>`;
}
function render(focus) { form.innerHTML = step(); renderPreview(); (focus ? $(focus, form) : form.querySelector('input:not([type=file]):not([type=checkbox]), button[data-kind]'))?.focus(); }

// ── data ──
function loadCsv(text, file, src) {
  try { const b = sniff(text); D.data = { ...D.data, text, file, b, src: D.data.src || src }; check(); } catch (e) { D.data = { ...D.data, text: null, file, b: null, res: { error: e.message } }; }
  render();
}
function check() { const d = D.data; d.res = d.b ? inspect(d.text, d.b) : null; }

// ── events ──
form.addEventListener('click', async (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.kind) { D.kind = t.dataset.kind; D.step = 1; render(); }
  if (t.hasAttribute('data-back')) { D.step = D.kind === 'fund' || D.kind === 'individual' ? 0 : D.step - 1; if (D.step === 0) D.kind = null; render(); }
  if (t.hasAttribute('data-demo-invite')) { const m = S.companies.find((c) => c.status === 'invited' && c.invite); if (m) { D.co.invite = m.invite.url.replace(/^https:\/\//, ''); if (!D.co.name) D.co.name = m.name; render('[data-k="co.site"]'); } }
  if (t.hasAttribute('data-add')) { D.team.push({ name: '', handle: '', publisher: true, exporter: false, receiver: true }); render(`.mate[data-i="${D.team.length - 1}"] .in`); }
  if (t.dataset.del) { D.team.splice(+t.dataset.del, 1); render(); }
  if (t.dataset.src) { D.data.src = t.dataset.src; render(); }
  if (t.dataset.sample) {
    const [url, label, src] = SAMPLES[t.dataset.sample];
    try { const r = await fetch(url); if (!r.ok) throw new Error(); loadCsv(await r.text(), label, src); } catch { D.data.res = { error: 'Couldn’t load the sample.' }; render(); }
  }
});
form.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.k) {
    const [o, k] = t.dataset.k.split('.'); D[o][k] = t.value;
    if (t.dataset.k === 'me.handle') { const f = $('[data-face="me"]', form); const h = t.value.trim().replace(/^@/, ''); f.innerHTML = h ? lilGuy(h) : ''; f.classList.toggle('is-on', !!h); }
    if (t.dataset.k === 'co.invite') { const lbl = t.closest('.fld').firstElementChild, c = invited(); lbl.innerHTML = `Invite link ${c ? `<b class="ok">✓ ${esc(c.name)}</b>` : ''}`; if (c && !D.co.name) { D.co.name = c.name; $('[data-k="co.name"]', form).value = c.name; } }
    renderPreview();
  }
  if (t.dataset.m) { const row = t.closest('.mate'), m = D.team[+row.dataset.i]; m[t.dataset.m] = t.value.trim().replace(/^@/, ''); if (t.dataset.m === 'handle') row.querySelector('[data-face]').innerHTML = m.handle ? lilGuy(m.handle) : ''; renderPreview(); }
  if (t.dataset.b && t.type === 'number') { D.data.b[t.dataset.b] = Math.max(1, Math.round(+t.value) || 1); check(); $('#res', form).innerHTML = result(); renderPreview(); }
});
form.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.r) { const m = D.team[+t.closest('.mate').dataset.i]; m[t.dataset.r] = t.checked; if (t.dataset.r === 'exporter' && t.checked) m.publisher = true; if (t.dataset.r === 'publisher' && !t.checked) m.exporter = false; render(); }
  if (t.dataset.b && t.type !== 'number') { D.data.b[t.dataset.b] = t.type === 'checkbox' ? t.checked : t.value; check(); render(`[data-b="${t.dataset.b}"]`); }
  if (t.hasAttribute('data-upload') && t.files[0]) {
    const f = t.files[0];
    if (f.size > 5e6) { D.data.res = { error: 'Under 5 MB, please.' }; render(); return; }
    loadCsv(await f.text(), f.name, 'Other CSV');
  }
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const err = (m, sel) => { $('#err', form).textContent = m; if (sel) $(sel, form)?.focus(); };
  const meOk = () => {
    if (!D.me.name.trim()) return err('Add your name.', '[data-k="me.name"]'), false;
    const h = D.me.handle.trim().replace(/^@/, ''); D.me.handle = h;
    if (!HANDLE.test(h)) return err('That isn’t a GitHub username.', '[data-k="me.handle"]'), false;
    if (taken(h)) return (($('#err', form).innerHTML = `@${esc(h)} already has an account. <a href="../signin/?handle=${encodeURIComponent(h)}">Sign in</a>`), false);
    return true;
  };
  if (D.kind === 'individual') { if (!meOk()) return; return finishIndividual(); }
  if (D.kind === 'fund') { if (!D.fund.name.trim()) return err('Name your fund.', '[data-k="fund.name"]'); if (!meOk()) return; return finishFund(); }
  if (D.step === 1) { if (!(D.co.name || invited()?.name || '').trim()) return err('Name your company.', '[data-k="co.name"]'); D.step = 2; return render(); }
  if (D.step === 2) {
    if (!meOk()) return;
    const bad = D.team.findIndex((m) => m.handle && (!HANDLE.test(m.handle) || taken(m.handle) || m.handle.toLowerCase() === D.me.handle.toLowerCase()));
    if (bad >= 0) return err(`Check @${D.team[bad].handle}.`, `.mate[data-i="${bad}"] [data-m="handle"]`);
    D.team = D.team.filter((m) => m.handle); D.step = 3; return render();
  }
  if (D.step === 3) return finishCompany();
});

// ── write it ──
const uid = (h) => { let id = h.toLowerCase(), n = 2; while (S.users.some((u) => u.id === id)) id = `${h.toLowerCase()}-${n++}`; return id; };
const log = (actor, action, subject, company = null) => S.audit.unshift({ at: new Date().toISOString(), actor, action, subject, company });
function claimInvites(u) {
  for (const ci of S.circles || []) {
    const i = (ci.invites || []).findIndex((h) => h.toLowerCase() === u.handle.toLowerCase());
    if (i >= 0) { ci.invites.splice(i, 1); ci.members.push(u.id); log(u.name, 'Joined the circle', ci.name); }
  }
}
function finishIndividual() {
  const you = { id: uid(D.me.handle), name: D.me.name.trim(), company: null, handle: D.me.handle, publisher: true, exporter: false, receiver: true, eligible: true, capabilities: [] };
  S.users.push(you); claimInvites(you); log(you.name, 'Joined as an individual', '');
  let to = '#i/home';
  if (D.circle.name.trim()) {
    const name = D.circle.name.trim(); let id = slug(name), n = 2; while ((S.circles ||= []).some((c) => c.id === id)) id = `${slug(name)}-${n++}`;
    const ci = { id, name, owner: you.id, members: [you.id], invites: [], createdAt: new Date().toISOString() };
    for (const h of friends()) { const f = S.users.find((u) => u.handle.toLowerCase() === h.toLowerCase()); if (f) { if (!ci.members.includes(f.id)) ci.members.push(f.id); } else if (!ci.invites.includes(h) && h.toLowerCase() !== you.handle.toLowerCase()) ci.invites.push(h); }
    S.circles.push(ci); log(you.name, 'Started a circle', name); to = `#i/circle/${id}`;
  }
  save(S); session.set(you.id);
  location.href = `../dashboard/${to}`;
}
function finishCompany() {
  const inv = invited(), ok = verified(), d = D.data, b = d.b;
  let c = inv;
  if (!c) {
    let id = slug(D.co.name), n = 2; while (S.companies.some((x) => x.id === id)) id = `${slug(D.co.name)}-${n++}`;
    const others = S.companies.filter((x) => x.status !== 'none').map((x) => x.id);
    c = { id, name: D.co.name.trim(), sector: '', icon: null, status: 'invited', source: '', binding: null, participating: false, fundPeers: others, peers: [...others], classes: ['data-quality'], receive: 'portfolio', dismissed: [], invite: null, mapping: { state: 'unmapped', detail: 'Not mapped yet' } };
    S.companies.push(c);
    S.companies.forEach((x) => { if (others.includes(x.id)) { x.fundPeers = [...new Set([...x.fundPeers, id])]; x.peers = [...new Set([...x.peers, id])]; } });
    log(c.name, 'Requested to join', S.standard.name, c.id);
  }
  if (D.co.name.trim()) c.name = D.co.name.trim();
  if (!c.icon && host(D.co.site)) c.iconUrl = `https://${host(D.co.site)}/favicon.ico`;
  if (D.co.gh) c.github = D.co.gh.trim();
  if (d.src) c.source = d.file && d.src !== 'Other CSV' ? `${d.src} export` : d.src;
  if (b) {
    c.binding = { timeColumn: b.timeColumn, signalColumn: b.valueColumn, unit: b.unit || '', skipUnitsRow: b.unitsRow, timeBasis: b.timeBasis, cadenceSeconds: b.cadenceSeconds };
    c.columns = b.columns;
    const r = d.res;
    c.sample = ok ? { state: 'verified', detail: `${r.unique.toLocaleString()} observations · ${r.missingValues} missing values · 0 missing timestamps` } : { state: 'failed', detail: r?.error || `${r.missing} missing timestamps · ${r.duplicates} duplicates` };
    c.mapping = c.sample;
  }
  if (ok) { c.status = 'joined'; c.participating = true; log(c.name, 'Mapping verified, joined', S.standard.name, c.id); }
  const cap = ok ? ['time-series', 'csv', 'completeness'] : [];
  const you = { id: uid(D.me.handle), name: D.me.name.trim(), company: c.id, handle: D.me.handle, admin: true, publisher: true, exporter: true, receiver: true, eligible: true, capabilities: cap };
  const mates = D.team.map((m) => ({ id: uid(m.handle), name: m.name.trim() || m.handle, company: c.id, handle: m.handle, publisher: !!m.publisher, exporter: !!m.exporter, receiver: !!m.receiver, eligible: true, capabilities: cap }));
  for (const u of [you, ...mates]) { S.users.push(u); claimInvites(u); }
  for (const [k, list] of [['publisher', 'publishers'], ['exporter', 'exporters'], ['receiver', 'receivers']]) c[list] = S.users.filter((u) => u.company === c.id && u[k]).map((u) => u.id);
  log(you.name, `Registered ${mates.length + 1} ${mates.length ? 'people' : 'person'}`, c.name, c.id);
  save(S); session.set(you.id);
  location.href = `../dashboard/#org/${c.id}/members`;
}
function finishFund() {
  S.fund.name = D.fund.name.trim();
  const you = { id: uid(D.me.handle), name: D.me.name.trim(), company: null, handle: D.me.handle, fund: true, publisher: false, exporter: false, receiver: false, eligible: false, capabilities: [] };
  S.users.push(you); claimInvites(you); log(you.name, 'Set up the fund', S.fund.name);
  save(S); session.set(you.id);
  location.href = '../dashboard/#fund/overview';
}

if (D.kind === 'company') D.step = 1;
render();
