// The live dashboard: the same VS Code workbench as the demo, on real accounts, orgs and invite links (/api).
// Individual: you and your circles. Enterprise: Me (what's shared with you), Team (your companies), Org (your funds).
import { api, googleUrl, inviteUrl } from '../api.js';
import { lilGuy, paint } from '../film/lilguy.js';
import { sniff, inspect } from '../csvcheck.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`; };
const until = (iso) => { const d = Math.round((Date.parse(iso) - Date.now()) / 86400000); return d <= 0 ? 'expired' : `${d}d left`; };
const live = (g) => !g.revoked && Date.parse(g.expiresAt) > Date.now();
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const who = (u) => (u?.handle || (u?.email || u?.name || 'someone').split('@')[0]).replace(/[^\w-]/g, '') || 'someone';
const face = (u, cls = '') => `<span class="cg-lg ${cls}" data-lilguy="${esc(who(u))}" title="${esc(u?.name || '')}${u?.handle ? ` · @${esc(u.handle)}` : ''}"></span>`;
const mono = (name, cls = '') => `<span class="fav is-mono ${cls}">${esc((name || '?')[0].toUpperCase())}</span>`;
const fav = (o, cls = '') => !o ? '' : o.iconUrl ? `<img class="fav ${cls}" src="${esc(o.iconUrl)}" alt="" onerror="this.outerHTML='${mono(o.name, cls).replace(/"/g, '&quot;')}'">` : mono(o.name, cls);
const ICONS = {
  files: '<path d="M14 3H7a1 1 0 0 0-1 1v13M10 7h8v14h-9a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/>', timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>', circle: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><circle cx="12" cy="16" r="3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4a3 3 0 0 1 0 6M21 20c0-2.6-1.6-4.8-4-5.6"/>', data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  shield: '<path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6z"/>', standard: '<circle cx="12" cy="12" r="3"/><path d="M12 9V3M9.4 13.5 4 17M14.6 13.5 20 17"/><circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="17" r="1.5"/><circle cx="20" cy="17" r="1.5"/>',
  inbox: '<path d="M3 12h4l2 3h6l2-3h4M5 5h14l2 7v7H3v-7z"/>', plus: '<path d="M12 5v14M5 12h14"/>', share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>', chev: '<path d="m6 9 6 6 6-6"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  building: '<path d="M3 21h18M5 21V8l6-4v17M11 21V10h8v11"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
};
const ico = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ''}</svg>`;
const CHECKS = ['NOAA: 1,440 rows, 55 missing wind values', 'PVDAQ: 1,440 rows, negative power preserved', 'Detect three missing timestamps and one duplicate', 'First and last missing observations are detected', 'Zero is not missing; malformed is separate', 'Wrong units-row assumption is rejected', 'Unseen synthetic window, duplicates and off-grid rows'];

// ── state, loaded from the server ──
let ME = null, ORGS = [], VIEW = {}, SHARED = [], MINE = { tools: [], grants: [] };
async function loadAll() {
  const me = await api('me'); ME = me.user; ORGS = me.orgs;
  const views = await Promise.all(ORGS.map((o) => api(`orgs/${o.id}`).catch(() => null)));
  VIEW = Object.fromEntries(ORGS.map((o, i) => [o.id, views[i]]).filter(([, v]) => v));
  // a fund admin can open each of its companies
  for (const o of ORGS.filter((x) => x.kind === 'fund')) for (const c of VIEW[o.id]?.companies || []) if (!VIEW[c.id]) VIEW[c.id] = await api(`orgs/${c.id}`).catch(() => null);
  [SHARED, MINE] = await Promise.all([api('shared').then((r) => r.shared), api('tools/mine')]);
}
const byKind = (k) => ORGS.filter((o) => o.kind === k);
const O = (id) => VIEW[id]?.org || ORGS.find((o) => o.id === id);
const isAdmin = (id) => ['owner', 'admin'].includes(VIEW[id]?.myRole);
const allTools = () => { const m = new Map(); for (const t of MINE.tools) m.set(t.id, t); for (const v of Object.values(VIEW)) for (const t of v?.tools || []) m.set(t.id, t); for (const s of SHARED) m.set(s.tool.id, s.tool); return m; };
const allGrants = () => { const m = new Map(); for (const g of MINE.grants) m.set(g.id, g); for (const v of Object.values(VIEW)) for (const g of v?.grants || []) m.set(g.id, g); return m; };
const people = () => { const m = new Map([[ME.id, ME]]); for (const v of Object.values(VIEW)) { for (const x of v?.members || []) m.set(x.user.id, x.user); for (const x of v?.peerPeople || []) m.set(x.user.id, x.user); } for (const s of SHARED) m.set(s.owner.id, s.owner); return m; };
const P = (id) => people().get(id);

// ── routes: #i/<kind>/<ref> · #e/<level>/<kind>/<ref> ──
function parse() {
  const p = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (p[0] === 'i') return { mode: 'i', level: null, kind: p[1] || 'welcome', ref: p[2] || '' };
  if (p[0] === 'e') return { mode: 'e', level: ['me', 'team', 'org'].includes(p[1]) ? p[1] : 'me', kind: p[2] || 'welcome', ref: p[3] || '' };
  return byKind('company').length ? { mode: 'e', level: 'me', kind: 'welcome', ref: '' } : byKind('fund').length ? { mode: 'e', level: 'org', kind: 'welcome', ref: '' } : { mode: 'i', level: null, kind: 'welcome', ref: '' };
}
const hashOf = (r) => r.mode === 'i' ? `#i/${r.kind}${r.ref ? '/' + encodeURIComponent(r.ref) : ''}` : `#e/${r.level}/${r.kind}${r.ref ? '/' + encodeURIComponent(r.ref) : ''}`;
const go = (r) => { const h = hashOf(r); if (location.hash === h) render(); else location.hash = h; };
const scopeName = (r) => r.mode === 'i' ? 'Individual' : { me: 'Me', team: 'Team', org: 'Org' }[r.level];
function meta(r) {
  const k = r.kind, o = O(r.ref), t = allTools().get(r.ref);
  return k === 'welcome' ? { label: r.mode === 'i' ? 'Welcome' : `Welcome · ${scopeName(r)}`, icon: `<img class="ic" src="../logo.svg" alt="">` }
    : k === 'org' ? { label: o?.name || 'Org', icon: o?.kind === 'circle' ? ico('circle') : fav(o) }
    : k === 'mapping' ? { label: `${o?.name || ''} · data`, icon: ico('data') } : k === 'policy' ? { label: `${o?.name || ''} · policy`, icon: ico('shield') }
    : k === 'portfolio' ? { label: `${o?.name || ''} · portfolio`, icon: ico('building') } : k === 'standard' ? { label: 'Sensor time-series v1', icon: ico('standard') }
    : k === 'tool' ? { label: t?.name || 'Tool', icon: ico('tool') } : k === 'receiving' ? { label: 'Receiving', icon: ico('inbox') }
    : k === 'profile' ? { label: 'Profile', icon: face(ME) } : { label: 'Activity', icon: ico('timeline') };
}
const TKEY = 'cg-live-tabs';
let tabs = []; try { tabs = JSON.parse(sessionStorage.getItem(TKEY) || '[]'); } catch {}
const keepTabs = () => { try { sessionStorage.setItem(TKEY, JSON.stringify(tabs)); } catch {} };
const fromHash = (h) => { const p = h.replace(/^#\/?/, '').split('/').map(decodeURIComponent); return p[0] === 'i' ? { mode: 'i', kind: p[1], ref: p[2] || '' } : { mode: 'e', level: p[1], kind: p[2], ref: p[3] || '' }; };
const validTab = (r) => !['org', 'mapping', 'policy', 'portfolio'].includes(r.kind) || !!O(r.ref);

// ── shell ──
let side = 'explorer'; const collapsed = new Set();
const sec = (id, title, items, n) => { const open = !collapsed.has(id); return `<div class="sb-sec"><button type="button" data-sec="${id}" aria-expanded="${open}">${ico('chev', '')}${esc(title)}${n != null ? `<span class="n">${n}</span>` : ''}</button><ul ${open ? '' : 'hidden'}>${items.join('')}</ul></div>`; };
const it = (r, inner, cur) => `<li><button type="button" class="sb-it" data-go="${hashOf(r)}" ${hashOf(r) === hashOf(cur) ? 'aria-current="true"' : ''}>${inner}</button></li>`;
const add = (cmd, label, data = '') => `<li><button type="button" class="sb-it is-add" data-cmd="${cmd}" ${data}>${ico('plus')}<span>${esc(label)}</span></button></li>`;
function renderSide(r) {
  const el = $('#wb-side');
  if (side === 'activity') { el.innerHTML = `<div class="sb-h">Activity</div>${timeline(r)}`; return; }
  let h = `<div class="sb-h">Explorer · ${scopeName(r)}</div>`;
  if (r.mode === 'e') h += `<div class="sb-lv" role="tablist" aria-label="Level">${[['me', 'Me'], ['team', 'Team'], ['org', 'Org']].map(([k, l]) => `<button type="button" role="tab" data-level="${k}" aria-selected="${r.level === k}">${l}</button>`).join('')}</div>`;
  const W = it({ ...r, kind: 'welcome', ref: '' }, `<img class="ic" src="../logo.svg" alt=""><span>Welcome</span>`, r);
  let b = '';
  if (r.mode === 'i') {
    const circles = byKind('circle'), personal = MINE.tools.filter((t) => !t.orgId), shared = SHARED.filter((s) => s.grant.scope === 'circle');
    b = sec('i-y', 'You', [W, it({ ...r, kind: 'profile', ref: '' }, `${face(ME)}<span>Profile</span>`, r)])
      + sec('i-c', 'Circles', circles.map((c) => it({ ...r, kind: 'org', ref: c.id }, `${ico('circle')}<span>${esc(c.name)}</span><span class="faces">${(VIEW[c.id]?.members || []).slice(0, 4).map((m) => face(m.user)).join('')}</span>`, r)).concat(add('newOrg', 'New circle…', 'data-kind="circle"')), circles.length)
      + sec('i-s', 'Shared with me', shared.length ? shared.map((s) => it({ ...r, kind: 'tool', ref: s.tool.id }, `${face(s.owner)}<span>${esc(s.tool.name)}</span>`, r)) : ['<li class="sb-empty">Nothing yet</li>'], shared.length)
      + sec('i-t', 'My tools', personal.map((t) => it({ ...r, kind: 'tool', ref: t.id }, `${ico('tool')}<span>${esc(t.name)}</span>`, r)).concat(add('addTool', 'Add a tool…')));
  } else if (r.level === 'me') {
    const shared = SHARED.filter((s) => s.grant.scope !== 'circle'), mine = MINE.tools.filter((t) => t.orgId);
    b = sec('m-y', 'Me', [W, it({ ...r, kind: 'receiving', ref: '' }, `${ico('inbox')}<span>Receiving</span><small>${ME.pref?.mode === 'off' ? 'off' : ME.pref?.mode === 'company' ? 'team' : 'all'}</small>`, r), it({ ...r, kind: 'profile', ref: '' }, `${face(ME)}<span>Profile</span>`, r)])
      + sec('m-s', 'Shared with me', shared.length ? shared.map((s) => it({ ...r, kind: 'tool', ref: s.tool.id }, `${s.from && s.grant.scope === 'portfolio' ? fav(s.from) : face(s.owner)}<span>${esc(s.tool.name)}</span>`, r)) : ['<li class="sb-empty">Nothing yet</li>'], shared.length)
      + sec('m-t', 'My work tools', mine.map((t) => it({ ...r, kind: 'tool', ref: t.id }, `${ico('tool')}<span>${esc(t.name)}</span>`, r)).concat(byKind('company').length ? add('addTool', 'Add a tool…') : ''));
  } else if (r.level === 'team') {
    const cos = byKind('company');
    b = sec('t-w', 'Team', [W]) + cos.map((c) => { const v = VIEW[c.id], st = v?.org?.mapping?.result?.state;
      return sec(`t-${c.id}`, c.name, [it({ ...r, kind: 'org', ref: c.id }, `${ico('people')}<span>Members & invite link</span><small>${v?.members?.length || 0}</small>`, r),
        it({ ...r, kind: 'mapping', ref: c.id }, `${ico('data')}<span>Data mapping</span><span class="dot ${st === 'verified' ? 'is-ok' : 'is-warn'}"></span>`, r),
        it({ ...r, kind: 'policy', ref: c.id }, `${ico('shield')}<span>Sharing policy</span>`, r),
        ...(v?.tools || []).map((t) => it({ ...r, kind: 'tool', ref: t.id }, `${face(P(t.owner))}<span>${esc(t.name)}</span>`, r))]); }).join('')
      + sec('t-new', 'Add', [add('newOrg', 'New company…', 'data-kind="company"')]);
  } else {
    const funds = byKind('fund');
    b = sec('o-w', 'Org', [W]) + funds.map((f) => { const v = VIEW[f.id];
      return sec(`o-${f.id}`, f.name, [it({ ...r, kind: 'org', ref: f.id }, `${ico('people')}<span>Members & invite links</span><small>${v?.members?.length || 0}</small>`, r),
        it({ ...r, kind: 'portfolio', ref: f.id }, `${ico('building')}<span>Portfolio</span><small>${v?.companies?.length || 0}</small>`, r),
        it({ ...r, kind: 'standard', ref: f.id }, `${ico('standard')}<span>Standard & policy</span>`, r),
        ...(v?.companies || []).map((c) => it({ ...r, kind: 'org', ref: c.id }, `${fav(c)}<span>${esc(c.name)}</span><span class="dot ${c.status === 'joined' ? 'is-ok' : 'is-warn'}"></span>`, r))]); }).join('')
      + sec('o-new', 'Add', [add('newOrg', 'New fund…', 'data-kind="fund"')]);
  }
  el.innerHTML = h + b;
}
function renderTabs(r) {
  const cur = hashOf(r);
  if (!tabs.includes(cur)) { tabs.push(cur); if (tabs.length > 8) tabs.shift(); }
  tabs = tabs.filter((h) => validTab(fromHash(h))); keepTabs();
  $('#wb-tabs').innerHTML = tabs.map((h) => { const t = fromHash(h), m = meta(t), on = h === cur;
    return `<div class="tab" role="tab" tabindex="${on ? 0 : -1}" aria-selected="${on}" data-go="${h}">${m.icon}<span>${esc(m.label)}</span><button type="button" class="x" data-close="${h}" aria-label="Close">${ico('x', '')}</button></div>`; }).join('');
}

// ── editors ──
const head = (icon, title, sub, actions = '') => `<header class="ed-h">${icon}<span><h1>${title}</h1>${sub ? `<small>${sub}</small>` : ''}</span>${actions ? `<div class="ed-act">${actions}</div>` : ''}</header>`;
const walk = (title, sub, done, total, attr) => { const ok = done >= total; return `<button type="button" class="walk ${ok ? 'is-done' : ''}" ${attr}><b>${ok ? '<i>✓</i>' : ''}${esc(title)}</b><small>${esc(sub)} · ${Math.min(done, total)} of ${total}</small><em style="--p:${Math.round(100 * Math.min(done, total) / total)}%"></em></button>`; };
function edWelcome(r) {
  const start = [], recent = [], walks = [];
  const row = (icon, label, sub, rr) => `<li>${icon}<button type="button" data-go="${hashOf(rr)}">${esc(label)}</button><small>${esc(sub)}</small></li>`;
  if (r.mode === 'i') {
    const circles = byKind('circle');
    start.push(['plus', 'New circle…', 'data-cmd="newOrg" data-kind="circle"'], ['link', 'Copy a circle’s invite link…', 'data-cmd="copyInvite"'], ['tool', 'Add a tool…', 'data-cmd="addTool"'], ['user', 'Set your GitHub username…', `data-go="${hashOf({ ...r, kind: 'profile' })}"`]);
    SHARED.filter((s) => s.grant.scope === 'circle').forEach((s) => recent.push(row(face(s.owner), s.tool.name, s.owner.name, { ...r, kind: 'tool', ref: s.tool.id })));
    circles.forEach((c) => recent.push(row(ico('circle'), c.name, `${VIEW[c.id]?.members?.length || 1} people`, { ...r, kind: 'org', ref: c.id })));
    walks.push(walk('Start a circle', 'Friends you build with', circles.length, 1, 'data-cmd="newOrg" data-kind="circle"'),
      walk('Send the invite link', 'Anyone with it can join', circles.reduce((n, c) => n + Math.max(0, (VIEW[c.id]?.members?.length || 1) - 1), 0), 2, 'data-cmd="copyInvite"'),
      walk('Share a tool', 'Something your agent finished', MINE.grants.filter((g) => g.scope === 'circle').length, 1, 'data-cmd="shareTool"'));
  } else if (r.level === 'me') {
    start.push(['inbox', 'Receiving settings…', `data-go="${hashOf({ ...r, kind: 'receiving' })}"`], ['share', 'Share a tool…', 'data-cmd="shareTool"'], ['user', 'Profile…', `data-go="${hashOf({ ...r, kind: 'profile' })}"`]);
    SHARED.filter((s) => s.grant.scope !== 'circle').forEach((s) => recent.push(row(s.grant.scope === 'portfolio' && s.from ? fav(s.from) : face(s.owner), s.tool.name, s.from ? s.from.name : s.owner.name, { ...r, kind: 'tool', ref: s.tool.id })));
    walks.push(walk('Join your company', 'Through its invite link', byKind('company').length, 1, 'data-cmd="newOrg" data-kind="company"'), walk('Receive a tool', 'From your team or the portfolio', SHARED.filter((s) => s.grant.scope !== 'circle').length, 1, ''), walk('Share a tool', 'With your team', MINE.grants.filter((g) => g.scope !== 'circle').length, 1, 'data-cmd="shareTool"'));
  } else if (r.level === 'team') {
    const cos = byKind('company');
    start.push(['building', 'New company…', 'data-cmd="newOrg" data-kind="company"'], ['link', 'Copy your team’s invite link…', 'data-cmd="copyInvite"'], ['tool', 'Add a tool…', 'data-cmd="addTool"']);
    cos.forEach((c) => (VIEW[c.id]?.members || []).forEach((m) => recent.push(row(face(m.user), m.user.name, `${c.name} · ${m.role}`, { ...r, kind: 'org', ref: c.id }))));
    const c = cos[0], v = c && VIEW[c.id];
    walks.push(walk('Create your company', 'Or join one from its invite link', cos.length, 1, 'data-cmd="newOrg" data-kind="company"'), walk('Bring your team', 'Send the invite link', v?.members?.length || 0, 3, 'data-cmd="copyInvite"'),
      walk('Map your data', 'To Sensor time-series v1', v?.org?.mapping?.result?.state === 'verified' ? 1 : 0, 1, c ? `data-go="${hashOf({ ...r, kind: 'mapping', ref: c.id })}"` : ''), walk('Join a fund', 'From your fund’s company link', v?.org?.fundId ? 1 : 0, 1, ''));
  } else {
    const funds = byKind('fund'), f = funds[0], v = f && VIEW[f.id];
    start.push(['building', 'New fund…', 'data-cmd="newOrg" data-kind="fund"'], ['link', 'Copy the link for portfolio companies…', 'data-cmd="copyCompanyInvite"'], ['people', 'Copy the link for your team…', 'data-cmd="copyInvite"']);
    (v?.companies || []).forEach((c) => recent.push(row(fav(c), c.name, `${c.status} · ${c.memberCount} people`, { ...r, kind: 'org', ref: c.id })));
    walks.push(walk('Create your fund', 'You hold the standard', funds.length, 1, 'data-cmd="newOrg" data-kind="fund"'), walk('Bring in companies', 'Send the company link', v?.companies?.length || 0, 3, 'data-cmd="copyCompanyInvite"'),
      walk('Companies mapped', 'Data verified against the standard', (v?.companies || []).filter((c) => c.status === 'joined').length, Math.max(1, v?.companies?.length || 1), f ? `data-go="${hashOf({ ...r, kind: 'portfolio', ref: f.id })}"` : ''));
  }
  return `<div class="wel"><div><h1>Common Ground</h1><p class="sub">${esc(scopeName(r))}</p><h2>Start</h2><ul class="start">${start.map(([i, l, a]) => `<li><button type="button" ${a}>${ico(i)}${esc(l)}</button></li>`).join('')}</ul>`
    + `<h2>Recent</h2>${recent.length ? `<ul class="recent">${recent.slice(0, 8).join('')}</ul>` : '<p style="color:var(--vdim)">Nothing yet.</p>'}</div><div><h2>Walkthroughs</h2>${walks.join('')}</div></div>`;
}
function inviteBlock(v, kind) {
  const inv = (v.invites || []).find((i) => i.kind === kind && !i.revoked && Date.parse(i.expiresAt) > Date.now());
  const title = kind === 'company' ? 'Invite link for portfolio companies' : `Invite link for ${v.org.kind === 'circle' ? 'friends' : 'your team'}`;
  if (!inv) return `<section class="blk"><h2>${ico('link', '')}${title}</h2><div class="blk-b"><button type="button" class="vbtn is-primary" data-act="mk-invite" data-id="${v.org.id}" data-kind="${kind}">Create invite link</button></div></section>`;
  return `<section class="blk"><h2>${ico('link', '')}${title}<span class="n">${inv.uses} joined · ${until(inv.expiresAt)}</span></h2><div class="blk-b"><div class="inv"><input readonly value="${esc(inviteUrl(inv.code))}" aria-label="Invite link"><button type="button" class="vbtn is-primary" data-act="copy" data-text="${esc(inviteUrl(inv.code))}">Copy</button></div>`
    + `<div class="ctl" style="display:flex;gap:8px;flex-wrap:wrap">${kind === 'member' ? `<span style="color:var(--vdim)">Joins as ${inv.role}</span>` : '<span style="color:var(--vdim)">Each company that opens it joins your fund</span>'}<button type="button" class="vbtn" data-act="mk-invite" data-id="${v.org.id}" data-kind="${kind}">New link</button><button type="button" class="vbtn is-danger" data-act="kill-invite" data-code="${inv.code}">Turn off</button></div></div></section>`;
}
function edOrg(r) {
  const v = VIEW[r.ref]; if (!v) return `<div class="result is-bad"><p>You don’t have access to this.</p></div>`;
  const o = v.org, admin = v.admin && v.myRole !== 'fund', company = o.kind === 'company';
  const roleSel = (m) => `<select class="vsel" data-role="${m.user.id}" ${admin && (v.myRole === 'owner' || m.role !== 'owner') ? '' : 'disabled'}>${['owner', 'admin', 'member'].map((x) => `<option ${m.role === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
  const flags = (m) => company ? ['publisher', 'exporter', 'receiver'].map((k) => `<label class="pill" style="cursor:pointer"><input type="checkbox" data-flag="${k}" data-uid="${m.user.id}" ${m[k] ? 'checked' : ''} ${admin ? '' : 'disabled'} style="margin:0;accent-color:var(--vblue)"> ${k}</label>`).join('') : '';
  const rows = v.members.map((m) => `<li>${face(m.user)}<span><b>${esc(m.user.name)}${m.user.id === ME.id ? ' <span class="pill">you</span>' : ''}</b><small>${m.user.handle ? `@${esc(m.user.handle)}` : ''}${m.user.email ? ` · ${esc(m.user.email)}` : ''}</small></span><span class="chips">${flags(m)}${roleSel(m)}</span>${m.user.id === ME.id ? `<button type="button" class="vbtn" data-act="leave" data-id="${o.id}">Leave</button>` : admin && (v.myRole === 'owner' || m.role !== 'owner') ? `<button type="button" class="vbtn is-danger" data-act="kick" data-id="${o.id}" data-uid="${m.user.id}" data-name="${esc(m.user.name)}">Remove</button>` : ''}</li>`).join('');
  const tools = (v.tools || []).concat(o.kind === 'circle' ? [...allTools().values()].filter((t) => (v.grants || []).some((g) => g.toolId === t.id && g.target?.orgId === o.id && live(g))) : []);
  return head(o.kind === 'circle' ? `<span class="faces" style="display:flex">${v.members.slice(0, 5).map((m) => face(m.user, 'big')).join('')}</span>` : fav(o, 'big'), esc(o.name),
    `${{ fund: 'Fund', company: 'Company', circle: 'Circle' }[o.kind]} · ${v.members.length} ${v.members.length === 1 ? 'person' : 'people'}${o.site ? ` · ${esc(o.site)}` : ''}${v.myRole === 'fund' ? ' · viewing as its fund' : ''}`,
    company && o.fundId ? `<span class="pill ${o.status === 'joined' ? 'is-ok' : 'is-warn'}">${o.status === 'joined' ? 'Joined' : 'Mapping needed'}</span>` : '')
    + `<div class="cols"><div>${admin ? inviteBlock(v, 'member') + (o.kind === 'fund' ? inviteBlock(v, 'company') : '') : ''}<section class="blk"><h2>${ico('people', '')}People<span class="n">${v.members.length}</span></h2><ul class="rows">${rows}</ul></section></div>`
    + `<div>${tools.length ? `<section class="blk"><h2>${ico('tool', '')}Tools<span class="n">${tools.length}</span></h2><ul class="rows">${tools.map((t) => `<li class="is-click" data-go="${hashOf({ ...r, kind: 'tool', ref: t.id })}">${face(P(t.owner))}<span><b>${esc(t.name)}</b><small>${esc(P(t.owner)?.name || '')} · ${when(t.createdAt)}</small></span><span class="pill is-ok">${t.checks}/7</span></li>`).join('')}</ul></section>` : ''}`
    + (admin ? `<div class="sets"><h2>Details</h2><div class="set is-wide"><b>Name</b><div class="ctl"><input class="vin" data-field="name" value="${esc(o.name)}" style="width:260px"></div></div>${o.kind !== 'circle' ? `<div class="set is-wide"><b>Website <span>favicon comes from here</span></b><div class="ctl"><input class="vin" data-field="site" value="${esc(o.site || '')}" placeholder="example.com" style="width:260px"></div></div><div class="set is-wide"><b>GitHub org</b><div class="ctl"><input class="vin" data-field="github" value="${esc(o.github || '')}" placeholder="your-org" style="width:260px"></div></div>` : ''}<div class="set is-wide"><div class="ctl"><button type="button" class="vbtn is-primary" data-act="save-org" data-id="${o.id}">Save</button></div></div></div>` : '')
    + (v.myRole === 'owner' ? `<div class="sets"><h2>Danger</h2><div class="set is-wide"><b>Delete ${esc(o.name)}</b><p>Removes everyone, turns off its invite links and revokes its shares. Files people already downloaded stay with them.</p><div class="ctl"><button type="button" class="vbtn is-danger" data-act="delete-org" data-id="${o.id}">Delete</button></div></div></div>` : '')
    + (o.kind === 'company' && o.fundId && v.fund ? `<section class="blk"><h2>${ico('building', '')}Fund</h2><ul class="rows"><li>${mono(v.fund.name)}<span><b>${esc(v.fund.name)}</b><small>${esc(v.fund.standard?.name || 'Sensor time-series v1')}</small></span></li></ul></section>` : '')
    + `<section class="blk"><h2>${ico('timeline', '')}Activity</h2>${tl(v.audit || [])}</section></div></div>`;
}
let MAP = {};
function edMapping(r) {
  const v = VIEW[r.ref]; if (!v) return '';
  const o = v.org, admin = v.admin, d = MAP[o.id] || {}, m = o.mapping;
  const b = d.b, res = d.res;
  const verified = res && res.ok && !res.missing && !res.duplicates && !res.offGrid;
  const opt = (sel) => (b?.columns || []).map((c) => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  return head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('data', '')}</span>`, 'Data mapping', `${esc(o.name)} → Sensor time-series v1`, m ? `<span class="pill ${m.result.state === 'verified' ? 'is-ok' : m.result.state === 'failed' ? 'is-bad' : 'is-warn'}">${m.result.state}</span>` : '')
    + (m ? `<div class="result ${m.result.state === 'verified' ? 'is-ok' : 'is-warn'}" style="margin-bottom:16px"><p><b>${esc(m.source || 'Source')}</b> · ${esc(m.binding?.timeColumn || '')} → time · ${esc(m.binding?.signalColumn || '')} → value · ${esc(m.result.detail)}</p></div>` : '')
    + (admin ? `<div class="sets"><h2>Check a sample</h2><div class="set is-wide"><b>Source system</b><div class="ctl"><input class="vin" data-map="source" value="${esc(d.source ?? m?.source ?? '')}" placeholder="e.g. SolarEdge export" style="width:280px"></div></div>`
      + `<div class="set is-wide"><b>Sample CSV <span>stays in your browser</span></b><div class="ctl"><button type="button" class="vbtn" data-act="sample" data-id="${o.id}" data-s="ocean">Ocean sample</button><button type="button" class="vbtn" data-act="sample" data-id="${o.id}" data-s="solar">Solar sample</button><label class="vbtn" style="cursor:pointer">Upload CSV<input type="file" accept=".csv,text/csv" data-upload="${o.id}" style="position:absolute;opacity:0;width:1px"></label>${d.file ? `<span style="color:var(--vdim)">${esc(d.file)}</span>` : ''}</div></div>`
      + (b ? `<div class="set is-wide"><b>Time <span>→ time</span></b><div class="ctl"><select class="vsel" data-b="timeColumn">${opt(b.timeColumn)}</select><select class="vsel" data-b="timeBasis"><option value="utc" ${b.timeBasis === 'utc' ? 'selected' : ''}>UTC</option><option value="local-unspecified" ${b.timeBasis !== 'utc' ? 'selected' : ''}>Local, no timezone</option></select></div></div>`
        + `<div class="set is-wide"><b>Value <span>→ value</span></b><div class="ctl"><select class="vsel" data-b="valueColumn">${opt(b.valueColumn)}</select></div></div>`
        + `<div class="set is-wide"><b>Cadence <span>seconds</span></b><div class="ctl"><input class="vin is-num" type="number" min="1" data-b="cadenceSeconds" value="${b.cadenceSeconds}"></div></div>`
        + `<label class="set"><b>Units row</b><input type="checkbox" data-b="unitsRow" ${b.unitsRow ? 'checked' : ''}><p>The second row holds units, not readings.</p></label>`
        + (res?.error ? `<div class="result is-bad"><p>✗ ${esc(res.error)}</p></div>` : `<div class="result ${verified ? 'is-ok' : 'is-bad'}"><p>${verified ? '✓' : '✗'} ${res.unique.toLocaleString()} observations · ${res.missing} missing timestamps · ${res.duplicates} duplicates · ${res.missingValues} missing values${res.badTimes ? ` · ${res.badTimes} unreadable times` : ''}</p></div>`)
        + `<div class="set is-wide"><div class="ctl"><button type="button" class="vbtn is-primary" data-act="save-map" data-id="${o.id}">Save mapping</button></div></div>` : '') + `</div>` : '<p style="color:var(--vdim)">Only admins can change the mapping.</p>');
}
function edPolicy(r) {
  const v = VIEW[r.ref]; if (!v) return ''; const o = v.org, s = o.settings || {}, admin = v.admin, fs = v.fund?.settings, cross = !fs || (fs.enabled && fs.crossCompany);
  const rad = (val, t, d, dis) => `<label class="set ${dis ? 'is-off' : ''}"><b>${t}</b><input type="radio" name="receive" value="${val}" ${s.receive === val ? 'checked' : ''} ${!admin || dis ? 'disabled' : ''}><p>${d}</p></label>`;
  return head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('shield', '')}</span>`, 'Sharing policy', `${esc(o.name)}${v.fund ? ` · ${esc(v.fund.name)} sets the ceiling` : ''}`)
    + `<div class="sets"><h2>Standard</h2><label class="set"><b>Take part</b><input type="checkbox" data-set="participating" ${s.participating !== false ? 'checked' : ''} ${admin ? '' : 'disabled'}><p>Off stops all sharing in and out. People and mappings stay.</p></label></div>`
    + `<div class="sets"><h2>Receive tools from</h2>${rad('off', 'Nobody', 'No tools come in.')}${rad('company', 'Your company', 'Tools from colleagues.')}${rad('portfolio', 'Your fund’s portfolio', cross ? 'Named shares from other companies in your fund.' : 'Off fund-wide right now.', !cross)}</div>`
    + (v.peers?.length ? `<div class="sets"><h2>Peers</h2>${v.peers.map((p) => `<label class="set"><b>${fav(p)} ${esc(p.name)}</b><input type="checkbox" data-peer="${p.id}" ${!s.peers || s.peers.includes(p.id) ? 'checked' : ''} ${admin ? '' : 'disabled'}><p>${esc(p.status)}</p></label>`).join('')}</div>` : '');
}
function edPortfolio(r) {
  const v = VIEW[r.ref]; if (!v) return ''; const admin = v.admin;
  return head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('building', '')}</span>`, 'Portfolio', `${esc(v.org.name)} · ${(v.companies || []).length} companies`)
    + (admin ? inviteBlock(v, 'company') : '')
    + `<section class="blk"><h2>Companies</h2>${(v.companies || []).length ? `<ul class="rows">${v.companies.map((c) => `<li>${fav(c)}<span><b>${esc(c.name)}</b><small>${c.memberCount} people${c.mapping ? ` · ${esc(c.mapping.source || '')} · ${esc(c.mapping.result?.state)}` : ' · not mapped yet'}</small></span><span class="pill ${c.status === 'joined' ? 'is-ok' : 'is-warn'}">${c.status === 'joined' ? 'joined' : 'mapping needed'}</span><button type="button" class="vbtn" data-go="${hashOf({ ...r, kind: 'org', ref: c.id })}">Open</button>${admin ? `<button type="button" class="vbtn is-danger" data-act="drop-co" data-id="${v.org.id}" data-cid="${c.id}" data-name="${esc(c.name)}">Remove</button>` : ''}</li>`).join('')}</ul>` : '<div class="blk-b" style="color:var(--vdim)">Send the company link to your portfolio companies. Each one appears here as it joins.</div>'}</section>`;
}
function edStandard(r) {
  const v = VIEW[r.ref]; if (!v) return ''; const s = v.org.settings || {}, admin = v.admin;
  const tog = (k, t, d, dis) => `<label class="set ${dis ? 'is-off' : ''}"><b>${t}</b><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''} ${!admin || dis ? 'disabled' : ''}><p>${d}</p></label>`;
  const num = (k, t, d, lo, hi) => `<div class="set is-wide"><b>${t}</b><p>${d}</p><div class="ctl"><input class="vin is-num" type="number" min="${lo}" max="${hi}" data-set="${k}" value="${s[k]}" ${admin ? '' : 'disabled'}></div></div>`;
  return head(`<span class="ic" style="width:32px;height:32px;color:var(--vlink)">${ico('standard', '')}</span>`, 'Sensor time-series v1', `Held by ${esc(v.org.name)}`, '<span class="pill is-ok">v1.0</span>')
    + `<div class="cols"><section class="blk"><h2>Checks<span class="n">7 required</span></h2><ul class="checks">${CHECKS.map((c) => `<li><i>✓</i>${esc(c)}</li>`).join('')}</ul></section>`
    + `<div class="sets"><h2>Policy</h2>${tog('enabled', 'Network on', 'Pause to stop all sharing in your portfolio.')}${tog('crossCompany', 'Cross-company sharing', 'Named people at one company can receive another’s tools.', !s.enabled)}${num('maxOpenOffers', 'Open offers per person', 'Most unopened tools anyone sees at once.', 1, 5)}${num('expiryDays', 'Share expiry (days)', 'Days before a cross-company share needs renewing.', 1, 90)}<div class="set is-wide"><b>Named recipients only <span class="lock">· always on</span></b></div><div class="set is-wide"><b>Onward resharing <span class="lock">· always off</span></b></div></div></div>`;
}
function edTool(r) {
  const t = allTools().get(r.ref); if (!t) return '<div class="result is-bad"><p>That tool isn’t shared with you anymore.</p></div>';
  const owner = P(t.owner), org = t.orgId && O(t.orgId), mine = t.owner === ME.id, manage = mine || (t.orgId && isAdmin(t.orgId));
  const gs = [...allGrants().values()].filter((g) => g.toolId === t.id);
  const target = (g) => g.target.type === 'org' ? `${O(g.target.orgId)?.kind === 'circle' ? ico('circle') : fav(O(g.target.orgId))} everyone in ${esc(O(g.target.orgId)?.name || 'a group')}` : `${face(P(g.target.userId))} ${esc(P(g.target.userId)?.name || 'someone')}${g.target.companyId ? ` ${fav(O(g.target.companyId) || VIEW[t.orgId]?.peers?.find((p) => p.id === g.target.companyId))}` : ''}`;
  return head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('tool', '')}</span>`, `<code>${esc(t.name)}</code>`, `${esc(owner?.name || '')}${org ? ` · ${esc(org.name)}` : ''} · ${when(t.createdAt)}`,
    `<span class="pill"><code>${esc(t.hash.slice(0, 7))}</code></span><span class="pill is-ok">${t.checks}/7 checks</span>${mine ? `<button type="button" class="vbtn is-primary" data-cmd="shareTool" data-tool="${t.id}">${ico('share', '')}Share…</button>` : ''}${manage ? `<button type="button" class="vbtn is-danger" data-act="rm-tool" data-id="${t.id}" data-name="${esc(t.name)}">Remove tool</button>` : ''}`)
    + (t.description ? `<p style="margin:0 0 16px;color:var(--vdim)">${esc(t.description)}</p>` : '')
    + `<div class="cols"><section class="blk"><h2>Shared with<span class="n">${gs.filter(live).length} live</span></h2>${gs.length ? `<ul class="rows">${gs.map((g) => `<li><span class="chips"><span class="chip">${target(g)}</span></span><span></span><span class="pill ${g.scope === 'portfolio' ? 'is-blue' : ''}">${g.scope}</span>${g.revoked ? '<span class="pill is-bad">revoked</span>' : live(g) ? `<span class="pill">${until(g.expiresAt)}</span>${manage || g.issuer === ME.id ? `<button type="button" class="vbtn" data-act="revoke" data-id="${g.id}">Revoke</button>` : ''}` : '<span class="pill">expired</span>'}</li>`).join('')}</ul>` : '<div class="blk-b" style="color:var(--vdim)">Not shared yet.</div>'}</section>`
    + `<section class="blk"><h2>Checks<span class="n">${t.checks} of 7</span></h2><ul class="checks">${CHECKS.map((c) => `<li><i>✓</i>${esc(c)}</li>`).join('')}</ul></section></div>`;
}
function edReceiving() {
  const p = ME.pref || { mode: 'portfolio', muted: [] }, senders = [...people().values()].filter((u) => u.id !== ME.id);
  const rad = (v, t) => `<label class="set"><b>${t}</b><input type="radio" name="me-receive" value="${v}" ${p.mode === v ? 'checked' : ''}><p>${v === 'off' ? 'Nothing new appears.' : v === 'company' ? 'Your team and your circles.' : 'Plus named shares from your fund’s portfolio.'}</p></label>`;
  return head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('inbox', '')}</span>`, 'Receiving', 'What can show up in your editor')
    + `<div class="sets"><h2>Receive</h2>${rad('off', 'Nothing')}${rad('company', 'My team')}${rad('portfolio', 'My team and the portfolio')}</div>`
    + (senders.length ? `<div class="sets"><h2>Mute</h2>${senders.map((u) => `<label class="set"><b>${face(u)} ${esc(u.name)}</b><input type="checkbox" data-mute="${u.id}" ${p.muted.includes(u.id) ? 'checked' : ''}><p>${u.handle ? `@${esc(u.handle)}` : ''}</p></label>`).join('')}</div>` : '');
}
function edProfile() {
  return head(face(ME, 'big'), esc(ME.name), esc(ME.email))
    + `<div class="sets"><h2>Profile</h2><div class="set is-wide"><b>Name</b><div class="ctl"><input class="vin" data-me="name" value="${esc(ME.name)}" style="width:260px"></div></div>`
    + `<div class="set is-wide"><b>GitHub username <span>your lil guy is drawn from it</span></b><div class="ctl"><span class="cg-lg" id="me-face" style="width:26px;height:26px" data-lilguy="${esc(who(ME))}"></span><input class="vin" data-me="handle" value="${esc(ME.handle || '')}" placeholder="octocat" autocapitalize="off" spellcheck="false" style="width:220px"></div></div>`
    + `<div class="set is-wide"><div class="ctl"><button type="button" class="vbtn is-primary" data-act="save-me">Save</button><button type="button" class="vbtn" data-act="signout">Sign out</button></div></div></div>`;
}
const tl = (items) => items.length ? `<ul class="tl">${items.slice(0, 40).map((e) => `<li>${ico('timeline')}<span><b>${esc(e.actor)}</b> ${esc(String(e.action).charAt(0).toLowerCase() + String(e.action).slice(1))}${e.subject ? ` <code>${esc(e.subject)}</code>` : ''}<time>${when(e.at)}</time></span></li>`).join('')}</ul>` : '<p class="sb-empty">Nothing yet.</p>';
function timeline(r) {
  const ids = r.mode === 'i' ? byKind('circle').map((o) => o.id) : r.level === 'team' ? byKind('company').map((o) => o.id) : r.level === 'org' ? byKind('fund').map((o) => o.id) : ORGS.filter((o) => o.kind !== 'circle').map((o) => o.id);
  return tl(ids.flatMap((id) => VIEW[id]?.audit || []).sort((a, b) => b.at.localeCompare(a.at)));
}

// ── render ──
function render() {
  const r = parse();
  $('#wb-scope').textContent = `${meta(r).label} — ${scopeName(r)}`;
  $('#wb-mode').innerHTML = [['i', 'Individual'], ['e', 'Enterprise']].map(([k, l]) => `<button type="button" role="tab" data-mode="${k}" aria-selected="${r.mode === k}">${l}</button>`).join('');
  const n = SHARED.length;
  $('#wb-act').innerHTML = `<button type="button" data-side="explorer" aria-pressed="${side === 'explorer'}" title="Explorer">${ico('files', '')}${n ? `<span class="badge">${n}</span>` : ''}</button><button type="button" data-side="activity" aria-pressed="${side === 'activity'}" title="Activity">${ico('timeline', '')}</button><button type="button" data-go="${hashOf({ ...r, kind: 'profile', ref: '' })}" title="Profile" class="is-bottom">${face(ME)}</button>`;
  renderSide(r); renderTabs(r);
  $('#wb-crumbs').innerHTML = `${esc(scopeName(r))} › <b>${esc(meta(r).label)}</b>`;
  $('#wb-view').innerHTML = ({ welcome: edWelcome, org: edOrg, mapping: edMapping, policy: edPolicy, portfolio: edPortfolio, standard: edStandard, tool: edTool, receiving: edReceiving, profile: edProfile }[r.kind] || edWelcome)(r);
  $('#wb-status').innerHTML = `<span class="rem"><img src="../logo.svg" alt="">Common Ground</span><span>${esc(scopeName(r))}</span><span class="hide-sm">${ORGS.length} ${ORGS.length === 1 ? 'org' : 'orgs'}</span><span class="r hide-sm">${esc(ME.email)}</span><button type="button" data-act="signout">Sign out</button>`;
  for (const el of [$('#wb-side'), $('#wb-tabs'), $('#wb-view'), $('#wb-act')]) paint(el);
  document.title = `${meta(r).label} · Common Ground`;
  document.body.classList.remove('is-gated');
}
async function refresh(msg, actions) { try { await loadAll(); } catch (e) { return toast(esc(e.message)); } render(); if (msg) toast(msg, actions); }

// ── notifications and quick input (same look as the demo) ──
function toast(msg, actions = []) {
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="toast-m"><span class="toast-i">i</span><p>${msg}</p></div><div class="toast-f"><span>Common Ground</span>${actions.map((a, i) => `<button type="button" class="vbtn ${i === 0 ? 'is-primary' : ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>`;
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { actions[+b.dataset.i].run(); el.remove(); } });
  $('#wb-toasts').append(el); setTimeout(() => el.remove(), actions.length ? 10000 : 4000);
}
let QI = null;
function quick(o) { QI = { sel: 0, ...o }; const inp = $('#qi-in'); inp.value = o.value || ''; inp.placeholder = o.placeholder || ''; $('#qi').hidden = false; drawQ(); inp.focus(); inp.select(); }
const qItems = () => { const q = $('#qi-in').value.trim().toLowerCase(); const items = typeof QI.items === 'function' ? QI.items(q) : (QI.items || []); return items.filter((x) => x.group || !q || `${x.label} ${x.detail || ''}`.toLowerCase().includes(q)); };
function drawQ() { const items = qItems(); let i = -1; const n = items.filter((x) => !x.group).length; QI.sel = Math.min(QI.sel, Math.max(0, n - 1));
  $('#qi-list').innerHTML = items.map((x) => x.group ? `<li class="grp">${esc(x.group)}</li>` : (i++, `<li role="option" data-n="${i}" aria-selected="${i === QI.sel}">${x.icon || ''}<span>${esc(x.label)}</span>${x.detail ? `<small>${esc(x.detail)}</small>` : ''}</li>`)).join('');
  const m = QI.message ? QI.message($('#qi-in').value) : ''; $('#qi-msg').innerHTML = m || ''; paint($('#qi')); }
const closeQ = () => { $('#qi').hidden = true; QI = null; };
function acceptQ(n) { if (!QI) return; const items = qItems().filter((x) => !x.group), item = n != null ? items[n] : items[QI.sel], val = $('#qi-in').value.trim(), o = QI; if (o.items && !item) return; const res = o.accept(item ? item.value : null, val); if (res === false) return drawQ(); if (QI === o) closeQ(); }
$('#qi-in').addEventListener('input', () => { if (QI) { QI.sel = 0; drawQ(); } });
$('#qi-in').addEventListener('keydown', (e) => { if (!QI) return; const n = qItems().filter((x) => !x.group).length || 1;
  if (e.key === 'ArrowDown') { e.preventDefault(); QI.sel = (QI.sel + 1) % n; drawQ(); } else if (e.key === 'ArrowUp') { e.preventDefault(); QI.sel = (QI.sel - 1 + n) % n; drawQ(); } else if (e.key === 'Enter') { e.preventDefault(); acceptQ(); } else if (e.key === 'Escape') { e.preventDefault(); closeQ(); } });
$('#qi-list').addEventListener('mousedown', (e) => { const li = e.target.closest('[data-n]'); if (li) { e.preventDefault(); acceptQ(+li.dataset.n); } });
$('#qi').addEventListener('mousedown', (e) => { if (e.target.id === 'qi') closeQ(); });
const confirm = (q, yes, run) => quick({ placeholder: q, items: [{ label: yes, icon: ico('x'), value: 'y' }, { label: 'Cancel', value: 'n' }], accept: (v) => { if (v === 'y') run(); } });
async function copy(text, what = 'Link') { try { await navigator.clipboard.writeText(text); toast(`${what} copied.`); } catch { quick({ placeholder: 'Copy this', value: text, accept: () => {} }); } }
const doing = async (fn, msg, actions) => { try { const out = await fn(); await refresh(typeof msg === 'function' ? msg(out) : msg, actions); return out; } catch (e) { toast(esc(e.message)); } };

// ── commands ──
const CMD = {
  newOrg(kind) {
    const label = { circle: 'circle', company: 'company', fund: 'fund' }[kind];
    quick({ placeholder: `Name your ${label} (Enter)`, accept: (_, name) => { if (!name) return false;
      const ask = (site) => doing(async () => { const { org } = await api('orgs', { method: 'POST', body: { kind, name, site } }); await api(`orgs/${org.id}/invites`, { method: 'POST', body: { kind: 'member' } }); if (kind === 'fund') await api(`orgs/${org.id}/invites`, { method: 'POST', body: { kind: 'company' } }); return org; },
        (org) => `Created <b>${esc(org.name)}</b>. Its invite link is ready to send.`).then((org) => { if (org) go(kind === 'circle' ? { mode: 'i', kind: 'org', ref: org.id } : { mode: 'e', level: kind === 'fund' ? 'org' : 'team', kind: 'org', ref: org.id }); });
      if (kind === 'circle') return ask('');
      quick({ placeholder: `${name}’s website, for its favicon (Enter, or leave empty)`, accept: (_, site) => ask(site) }); } });
  },
  addTool() {
    quick({ placeholder: 'Tool name, e.g. telemetry-inspector (Enter)', accept: (_, name) => { if (!name) return false;
      const cos = byKind('company'), mk = (orgId) => doing(() => api('tools', { method: 'POST', body: { name, orgId } }), `Added <b>${esc(name)}</b>.`);
      if (!cos.length) return mk(null);
      quick({ placeholder: 'Whose tool is it?', items: [{ label: 'Mine (share with circles)', icon: face(ME), value: '' }, ...cos.map((c) => ({ label: c.name, detail: 'company', icon: fav(c), value: c.id }))], accept: (v) => mk(v || null) }); } });
  },
  shareTool(toolId) {
    const pick = (t) => {
      const opts = [];
      byKind('circle').forEach((c) => opts.push({ label: `Everyone in ${c.name}`, detail: 'circle', icon: ico('circle'), value: { orgId: c.id } }));
      if (t.orgId) {
        const v = VIEW[t.orgId];
        if (v) { opts.push({ label: `Everyone at ${v.org.name}`, detail: 'team', icon: fav(v.org), value: { orgId: v.org.id } });
          v.members.filter((m) => m.user.id !== ME.id && m.receiver).forEach((m) => opts.push({ label: m.user.name, detail: 'teammate', icon: face(m.user), value: { userId: m.user.id } }));
          (v.peerPeople || []).forEach((p) => opts.push({ label: p.user.name, detail: (v.peers || []).find((x) => x.id === p.companyId)?.name || 'portfolio', icon: face(p.user), value: { userId: p.user.id, companyId: p.companyId } })); }
      }
      if (!opts.length) return toast(t.orgId ? 'Nobody to share with yet. Send your team the invite link.' : 'Start a circle first.');
      quick({ placeholder: `Share ${t.name} with…`, items: opts, accept: (v) => doing(() => api(`tools/${t.id}/grants`, { method: 'POST', body: v }), `Shared <b>${esc(t.name)}</b>. Only they can open this version.`) });
    };
    const mine = MINE.tools; if (!mine.length) return toast('Add a tool first.', [{ label: 'Add a tool', run: CMD.addTool }]);
    const t = toolId && allTools().get(toolId); if (t) return pick(t);
    if (mine.length === 1) return pick(mine[0]);
    quick({ placeholder: 'Which tool?', items: mine.map((x) => ({ label: x.name, icon: ico('tool'), value: x.id })), accept: (id) => pick(allTools().get(id)) });
  },
  copyInvite() { const r = parse(), kinds = r.mode === 'i' ? ['circle'] : r.level === 'team' ? ['company'] : r.level === 'org' ? ['fund'] : ['company', 'fund'];
    const orgs = ORGS.filter((o) => kinds.includes(o.kind) && isAdmin(o.id)); if (!orgs.length) return toast('Create one first.');
    const run = (id) => { const inv = (VIEW[id]?.invites || []).find((i) => i.kind === 'member' && !i.revoked); if (inv) copy(inviteUrl(inv.code), 'Invite link'); else doing(() => api(`orgs/${id}/invites`, { method: 'POST', body: { kind: 'member' } }), 'Invite link created.').then((o) => o && copy(inviteUrl(o.invite.code), 'Invite link')); };
    if (orgs.length === 1) return run(orgs[0].id);
    quick({ placeholder: 'Invite link for…', items: orgs.map((o) => ({ label: o.name, detail: o.kind, icon: o.kind === 'circle' ? ico('circle') : fav(o), value: o.id })), accept: run }); },
  copyCompanyInvite() { const f = byKind('fund').find((o) => isAdmin(o.id)); if (!f) return toast('Create a fund first.', [{ label: 'New fund', run: () => CMD.newOrg('fund') }]);
    const inv = (VIEW[f.id]?.invites || []).find((i) => i.kind === 'company' && !i.revoked);
    if (inv) return copy(inviteUrl(inv.code), 'Company invite link');
    doing(() => api(`orgs/${f.id}/invites`, { method: 'POST', body: { kind: 'company' } }), 'Company invite link created.').then((o) => o && copy(inviteUrl(o.invite.code), 'Company invite link')); },
  palette() {
    quick({ placeholder: 'Go to anything, or run a command', items: () => {
      const items = [{ group: 'Commands' }], c = (label, cmd, arg) => items.push({ label, icon: ico('plus'), value: { cmd, arg } });
      c('New circle…', 'newOrg', 'circle'); c('New company…', 'newOrg', 'company'); c('New fund…', 'newOrg', 'fund'); c('Add a tool…', 'addTool'); c('Share a tool…', 'shareTool'); c('Copy an invite link…', 'copyInvite');
      items.push({ group: 'Go to' });
      ORGS.forEach((o) => items.push({ label: o.name, detail: o.kind, icon: o.kind === 'circle' ? ico('circle') : fav(o), value: { hash: hashOf(o.kind === 'circle' ? { mode: 'i', kind: 'org', ref: o.id } : { mode: 'e', level: o.kind === 'fund' ? 'org' : 'team', kind: 'org', ref: o.id }) } }));
      for (const t of allTools().values()) items.push({ label: t.name, detail: 'tool', icon: ico('tool'), value: { hash: hashOf({ ...parse(), kind: 'tool', ref: t.id }) } });
      return items; }, accept: (v) => { if (v.cmd) setTimeout(() => CMD[v.cmd](v.arg)); else location.hash = v.hash; } });
  },
};

// ── events ──
const wb = $('#wb');
wb.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-close],[data-go],[data-cmd],[data-act],[data-mode],[data-level],[data-side],[data-sec]'); if (!t) return;
  if (t.dataset.close) { e.stopPropagation(); const i = tabs.indexOf(t.dataset.close); tabs.splice(i, 1); keepTabs(); if (t.dataset.close === hashOf(parse())) location.hash = tabs[Math.max(0, i - 1)] || hashOf({ ...parse(), kind: 'welcome', ref: '' }); else render(); return; }
  if (t.dataset.go) { location.hash = t.dataset.go; wb.classList.remove('is-drawer'); return; }
  if (t.dataset.cmd) { wb.classList.remove('is-drawer'); return CMD[t.dataset.cmd](t.dataset.kind || t.dataset.tool); }
  if (t.dataset.mode) return go(t.dataset.mode === 'i' ? { mode: 'i', kind: 'welcome', ref: '' } : { mode: 'e', level: byKind('company').length || !byKind('fund').length ? 'me' : 'org', kind: 'welcome', ref: '' });
  if (t.dataset.level) return go({ mode: 'e', level: t.dataset.level, kind: 'welcome', ref: '' });
  if (t.dataset.side) { side = t.dataset.side; wb.classList.add('is-drawer'); return render(); }
  if (t.dataset.sec) { collapsed.has(t.dataset.sec) ? collapsed.delete(t.dataset.sec) : collapsed.add(t.dataset.sec); return renderSide(parse()), paint($('#wb-side')); }
  const a = t.dataset.act, id = t.dataset.id;
  if (a === 'copy') copy(t.dataset.text, 'Invite link');
  if (a === 'mk-invite') doing(() => api(`orgs/${id}/invites`, { method: 'POST', body: { kind: t.dataset.kind } }), 'New invite link ready. The old one still works until you turn it off.');
  if (a === 'kill-invite') confirm('Turn off this invite link? People who already joined stay.', 'Turn it off', () => doing(() => api(`invites/${t.dataset.code}`, { method: 'DELETE' }), 'Invite link turned off.'));
  if (a === 'kick') confirm(`Remove ${t.dataset.name}? Their access to shared tools stops now.`, `Remove ${t.dataset.name}`, () => doing(() => api(`orgs/${id}/members/${t.dataset.uid}`, { method: 'DELETE' }), `${esc(t.dataset.name)} removed.`));
  if (a === 'leave') confirm(`Leave ${O(id)?.name}?`, 'Leave', () => doing(() => api(`orgs/${id}/members/${ME.id}`, { method: 'DELETE' }), 'You left.').then(() => go({ ...parse(), kind: 'welcome', ref: '' })));
  if (a === 'delete-org') confirm(`Delete ${O(id)?.name} for everyone?`, 'Delete', () => doing(() => api(`orgs/${id}`, { method: 'DELETE' }), 'Deleted.').then(() => go({ ...parse(), kind: 'welcome', ref: '' })));
  if (a === 'drop-co') confirm(`Remove ${t.dataset.name} from the fund? Cross-company shares to and from it stop now.`, 'Remove', () => doing(() => api(`orgs/${id}/companies/${t.dataset.cid}`, { method: 'DELETE' }), `${esc(t.dataset.name)} removed from the fund.`));
  if (a === 'save-org') { const v = (k) => $(`[data-field="${k}"]`, $('#wb-view'))?.value; doing(() => api(`orgs/${id}`, { method: 'PATCH', body: { name: v('name'), ...(v('site') != null ? { site: v('site') } : {}), ...(v('github') != null ? { github: v('github') } : {}) } }), 'Saved.'); }
  if (a === 'rm-tool') confirm(`Remove ${t.dataset.name}? Every share of it stops.`, 'Remove tool', () => doing(() => api(`tools/${id}`, { method: 'DELETE' }), 'Tool removed. Files people already downloaded stay with them.').then(() => go({ ...parse(), kind: 'welcome', ref: '' })));
  if (a === 'revoke') doing(() => api(`grants/${id}`, { method: 'DELETE' }), 'Revoked. They can’t open it again; files already downloaded stay with them.');
  if (a === 'signout') { await api('auth/signout', { method: 'POST' }).catch(() => {}); location.href = '../'; }
  if (a === 'save-me') { const v = (k) => $(`[data-me="${k}"]`, $('#wb-view')).value; doing(() => api('me', { method: 'PATCH', body: { name: v('name'), handle: v('handle') } }), 'Profile saved.'); }
  if (a === 'sample') { try { const r = await fetch(t.dataset.s === 'ocean' ? '../samples/saildrone_1045_2021-09-30.csv' : '../samples/pvdaq_system10_sample.csv'); loadCsv(id, await r.text(), t.dataset.s === 'ocean' ? 'Ocean sample' : 'Solar sample'); } catch { toast('Couldn’t load the sample.'); } }
  if (a === 'save-map') { const d = MAP[id], res = d.res, ok = res && res.ok && !res.missing && !res.duplicates && !res.offGrid;
    doing(() => api(`orgs/${id}`, { method: 'PATCH', body: { mapping: { source: $('[data-map="source"]', $('#wb-view')).value || d.file, binding: { timeColumn: d.b.timeColumn, signalColumn: d.b.valueColumn, unit: d.b.unit, skipUnitsRow: d.b.unitsRow, timeBasis: d.b.timeBasis, cadenceSeconds: d.b.cadenceSeconds }, columns: d.b.columns, result: { state: ok ? 'verified' : 'failed', detail: res.error || `${res.unique} observations · ${res.missing} missing timestamps · ${res.missingValues} missing values` } } } }), ok ? 'Mapping verified against the standard.' : 'Mapping saved, but it doesn’t pass yet.'); }
});
function loadCsv(id, text, file) { try { const b = sniff(text); MAP[id] = { text, file, b, res: inspect(text, b), source: $('[data-map="source"]', $('#wb-view'))?.value }; } catch (e) { MAP[id] = { file, res: { error: e.message } }; } render(); }
wb.addEventListener('change', async (e) => {
  const t = e.target, r = parse();
  if (t.dataset.upload) { const f = t.files[0]; if (!f) return; if (f.size > 5e6) return toast('Under 5 MB, please.'); loadCsv(t.dataset.upload, await f.text(), f.name); }
  if (t.dataset.b) { const d = MAP[r.ref]; d.b[t.dataset.b] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Math.max(1, Math.round(+t.value) || 1) : t.value; d.res = inspect(d.text, d.b); render(); }
  if (t.dataset.role) doing(() => api(`orgs/${r.ref}/members/${t.dataset.role}`, { method: 'PATCH', body: { role: t.value } }), 'Role changed.');
  if (t.dataset.flag) doing(() => api(`orgs/${r.ref}/members/${t.dataset.uid}`, { method: 'PATCH', body: { [t.dataset.flag]: t.checked, ...(t.dataset.flag === 'exporter' && t.checked ? { publisher: true } : {}) } }), 'Saved.');
  if (t.dataset.set) doing(() => api(`orgs/${r.ref}`, { method: 'PATCH', body: { settings: { [t.dataset.set]: t.type === 'checkbox' ? t.checked : +t.value } } }), 'Saved.');
  if (t.name === 'receive') doing(() => api(`orgs/${r.ref}`, { method: 'PATCH', body: { settings: { receive: t.value } } }), 'Saved.');
  if (t.dataset.peer) { const v = VIEW[r.ref], all = (v.peers || []).map((p) => p.id), cur = v.org.settings?.peers || all; const next = t.checked ? [...new Set([...cur, t.dataset.peer])] : cur.filter((x) => x !== t.dataset.peer); doing(() => api(`orgs/${r.ref}`, { method: 'PATCH', body: { settings: { peers: next.length === all.length ? null : next } } }), 'Saved.'); }
  if (t.name === 'me-receive') doing(() => api('me', { method: 'PATCH', body: { pref: { ...(ME.pref || {}), mode: t.value } } }), 'Saved.');
  if (t.dataset.mute) { const p = ME.pref || { mode: 'portfolio', muted: [] }; const muted = t.checked ? [...new Set([...p.muted, t.dataset.mute])] : p.muted.filter((x) => x !== t.dataset.mute); doing(() => api('me', { method: 'PATCH', body: { pref: { ...p, muted } } }), 'Saved.'); }
});
wb.addEventListener('input', (e) => { if (e.target.dataset.me === 'handle') { const h = e.target.value.trim().replace(/^@/, ''); $('#me-face').innerHTML = lilGuy(HANDLE.test(h) ? h : who({ ...ME, handle: '' })); } });
$('#wb-burger').addEventListener('click', () => { side = 'explorer'; wb.classList.toggle('is-drawer'); renderSide(parse()); paint($('#wb-side')); });
$('#wb-search').addEventListener('click', () => CMD.palette());
addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); CMD.palette(); } });
addEventListener('hashchange', () => { render(); $('#wb-view').scrollTop = 0; });

export async function start() {
  try { await loadAll(); } catch (e) { if (e.status === 401) { location.replace(`../signin/?next=${encodeURIComponent('/dashboard/' + location.hash)}`); return; } document.body.classList.remove('is-gated'); $('#wb-view').innerHTML = `<div class="result is-bad"><p>${esc(e.message)}</p></div>`; return; }
  render();
}
