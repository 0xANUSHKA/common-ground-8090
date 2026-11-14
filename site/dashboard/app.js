// The Common Ground dashboard, as a VS Code workbench. Individual (you and your circles) or Enterprise (Me, Team, Org).
// Explorer on the left, editors in tabs, a command palette (⌘K) for every action, notifications bottom-right.
// Same store and permission rules as everything else: ../store.js, mirroring server/types.ts and server/policy.ts.
import { CHECKS, COLUMNS, DAY, load, save as saveState, reset as resetState, session, me as whoami } from '../store.js';
import { lilGuy, paint } from '../film/lilguy.js';

let S = load();
S.circles ||= [];
const ME = whoami(S);
if (!ME) location.replace(`../signin/?next=${encodeURIComponent('dashboard' + location.hash)}${location.search.includes('demo') ? '&demo' : ''}`);
const save = () => saveState(S);

// ── helpers ─────────────────────────────────────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CO = (id) => S.companies.find((c) => c.id === id);
const U = (id) => S.users.find((u) => u.id === id);
const A = (id) => S.artifacts.find((a) => a.id === id);
const CI = (id) => S.circles.find((c) => c.id === id);
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const log = (actor, action, subject = '', company = null, extra = {}) => S.audit.unshift({ at: new Date().toISOString(), actor, action, subject, company, ...extra });
const active = (g) => !g.revoked && Date.parse(g.expiresAt) > Date.now();
const when = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`; };
const until = (iso) => { const d = Math.round((Date.parse(iso) - Date.now()) / DAY); return d <= 0 ? 'expired' : `${d}d left`; };
const lg = (u, cls = '') => `<span class="cg-lg ${cls}" data-lilguy="${esc(u.handle)}"></span>`;
const lgH = (h, cls = '') => `<span class="cg-lg ${cls}" data-lilguy="${esc(h)}"></span>`;
const fav = (c, cls = '') => !c ? '' : c.icon ? `<img class="fav ${cls}" src="../film/favicons/${esc(c.icon)}" alt="">`
  : c.iconUrl ? `<img class="fav ${cls}" src="${esc(c.iconUrl)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'fav is-mono ${cls}',textContent:'${esc((c.name || '?')[0].toUpperCase())}'}))">`
  : `<span class="fav is-mono ${cls}">${esc((c.name || '?')[0].toUpperCase())}</span>`;
const ICONS = {
  files: '<path d="M14 3H7a1 1 0 0 0-1 1v13M10 7h8v14h-9a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/>',
  timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  circle: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><circle cx="12" cy="16" r="3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4a3 3 0 0 1 0 6M21 20c0-2.6-1.6-4.8-4-5.6"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  shield: '<path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6z"/>',
  standard: '<circle cx="12" cy="12" r="3"/><path d="M12 9V3M9.4 13.5 4 17M14.6 13.5 20 17"/><circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="17" r="1.5"/><circle cx="20" cy="17" r="1.5"/>',
  inbox: '<path d="M3 12h4l2 3h6l2-3h4M5 5h14l2 7v7H3v-7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  home: '<path d="M3 11 12 3l9 8M5 9.5V21h14V9.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>',
  building: '<path d="M3 21h18M5 21V8l6-4v17M11 21V10h8v11"/>',
};
const ico = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ''}</svg>`;

// ── who can see what ────────────────────────────────────────────────────
const atWork = () => !!(ME.company || ME.fund);
const canTeam = () => !!(ME.admin && ME.company && CO(ME.company));
const canOrg = () => !!ME.fund;
const levelOK = (lv) => (lv === 'me' && !!ME.company) || (lv === 'team' && canTeam()) || (lv === 'org' && canOrg());
const LEVELS = () => [['me', 'Me'], ['team', 'Team'], ['org', 'Org']].filter(([k]) => levelOK(k));
const defLevel = () => ME.company ? 'me' : 'org';
const myCircles = () => S.circles.filter((c) => c.members.includes(ME.id));
const myCo = () => ME.company && CO(ME.company);
const inStd = (c) => c && c.status !== 'none';
const pref = (u) => u.pref || (u.pref = { mode: 'portfolio', muted: [] });
// a work grant reaches a person only if their company is in and they can receive (policy.ts: canReceive)
const reaches = (uid) => { const u = U(uid), c = u && CO(u.company); return !!(u && c && c.participating && u.eligible && u.receiver); };
const workOffers = () => { const c = myCo(), p = pref(ME); return S.grants.filter((g) => g.scope !== 'circle' && active(g) && g.recipients.includes(ME.id) && reaches(ME.id)).map((g) => ({ g, a: A(g.artifactId) }))
  .filter(({ a }) => a && p.mode !== 'off' && !p.muted.includes(a.owner) && (a.company === ME.company || (p.mode === 'portfolio' && c?.receive === 'portfolio')) && !(ME.dismissed || []).includes(a.id)); };
const circleOffers = () => S.grants.filter((g) => g.scope === 'circle' && active(g) && g.recipients.includes(ME.id) && CI(g.circleId)?.members.includes(ME.id) && !(ME.dismissed || []).includes(g.artifactId)).map((g) => ({ g, a: A(g.artifactId) })).filter((x) => x.a);
const canSeeTool = (a) => a && (a.owner === ME.id || canOrg() || (canTeam() && a.company === ME.company) || S.grants.some((g) => g.artifactId === a.id && g.recipients.includes(ME.id)));
const canManageTool = (a) => a.owner === ME.id || canOrg() || (canTeam() && a.company === ME.company);

// ── routes: #i/<kind>/<ref> · #e/<level>/<kind>/<ref> ─────────────────
const KINDS = { i: ['welcome', 'circle', 'tool', 'activity'], me: ['welcome', 'tool', 'receiving', 'activity'], team: ['welcome', 'person', 'company', 'tool', 'policy', 'standard', 'activity'], org: ['welcome', 'company', 'standard', 'tool', 'activity'] };
function valid(r) {
  const k = r.kind, ref = r.ref;
  if (!KINDS[r.mode === 'i' ? 'i' : r.level].includes(k)) return false;
  if (k === 'tool') return canSeeTool(A(ref));
  if (k === 'circle') return !!CI(ref)?.members.includes(ME.id);
  if (k === 'person') return U(ref)?.company === ME.company;
  if (k === 'company') return r.level === 'org' ? !!CO(ref) : ref === ME.company;
  return true;
}
function parse() {
  const p = location.hash.replace(/^#\/?/, '').split('/').map((x) => decodeURIComponent(x));
  let r;
  if (p[0] === 'i') r = { mode: 'i', level: null, kind: p[1] || 'welcome', ref: p[2] || '' };
  else if (p[0] === 'e' && atWork()) r = { mode: 'e', level: levelOK(p[1]) ? p[1] : defLevel(), kind: p[2] || 'welcome', ref: p[3] || '' };
  else if (p[0] === 'e') r = { mode: 'e', level: 'none', kind: 'welcome', ref: '' };
  else r = atWork() ? { mode: 'e', level: defLevel(), kind: 'welcome', ref: '' } : { mode: 'i', level: null, kind: 'welcome', ref: '' };
  if (r.level !== 'none' && !valid(r)) { r.kind = 'welcome'; r.ref = ''; }
  return r;
}
const hashOf = (r) => r.mode === 'i' ? `#i/${r.kind}${r.ref ? '/' + encodeURIComponent(r.ref) : ''}` : `#e/${r.level}/${r.kind}${r.ref ? '/' + encodeURIComponent(r.ref) : ''}`;
const go = (r) => { const h = hashOf(r); if (location.hash === h) render(); else location.hash = h; };
const scopeName = (r) => r.mode === 'i' ? 'Individual' : r.level === 'none' ? 'Enterprise' : r.level === 'org' ? `${S.fund.name} · Org` : `${myCo()?.name || ''} · ${r.level === 'team' ? 'Team' : 'Me'}`;

// open editors, remembered per person for this browser tab
const TKEY = `cg-tabs-${ME?.id}`;
let tabs = []; try { tabs = JSON.parse(sessionStorage.getItem(TKEY) || '[]'); } catch {}
const keepTabs = () => { try { sessionStorage.setItem(TKEY, JSON.stringify(tabs)); } catch {} };
function meta(r) {
  const k = r.kind;
  if (k === 'welcome') return { label: r.mode === 'i' ? 'Welcome' : `Welcome · ${{ me: 'Me', team: 'Team', org: 'Org' }[r.level] || ''}`, icon: `<img class="ic" src="../logo.svg" alt="">` };
  if (k === 'tool') { const a = A(r.ref); return { label: a?.name || 'Tool', icon: ico('tool') }; }
  if (k === 'circle') { const c = CI(r.ref); return { label: c?.name || 'Circle', icon: ico('circle') }; }
  if (k === 'person') { const u = U(r.ref); return { label: u?.name || 'Person', icon: u ? lg(u) : '' }; }
  if (k === 'company') { const c = CO(r.ref); return { label: c?.name || 'Company', icon: fav(c) }; }
  if (k === 'standard') return { label: S.standard.name, icon: ico('standard') };
  if (k === 'policy') return { label: 'Sharing policy', icon: ico('shield') };
  if (k === 'receiving') return { label: 'Receiving', icon: ico('inbox') };
  return { label: 'Activity', icon: ico('timeline') };
}

// ── shell ──────────────────────────────────────────────────────────────
let side = 'explorer';
const collapsed = new Set();
function renderTitle(r) {
  $('#wb-scope').textContent = `${meta(r).label} — ${scopeName(r)}`;
  $('#wb-mode').innerHTML = [['i', 'Individual'], ['e', 'Enterprise']].map(([k, l]) => `<button type="button" role="tab" data-mode="${k}" aria-selected="${r.mode === k}">${l}</button>`).join('');
}
function renderAct(r) {
  const n = r.mode === 'i' ? circleOffers().length : r.level === 'me' ? workOffers().length : 0;
  const settings = r.mode === 'e' && r.level === 'me' ? 'receiving' : r.level === 'team' ? 'policy' : r.level === 'org' ? 'standard' : null;
  $('#wb-act').innerHTML = `<button type="button" data-side="explorer" aria-pressed="${side === 'explorer'}" title="Explorer">${ico('files', '')}${n ? `<span class="badge">${n}</span>` : ''}</button>`
    + `<button type="button" data-side="activity" aria-pressed="${side === 'activity'}" title="Activity">${ico('timeline', '')}</button>`
    + (settings ? `<button type="button" data-go="${hashOf({ ...r, kind: settings, ref: '' })}" title="Settings">${ico('gear', '')}</button>` : '')
    + `<button type="button" class="is-bottom" data-cmd="account" title="@${esc(ME.handle)}">${lg(ME)}</button>`;
}
function sec(id, title, items, n) {
  const open = !collapsed.has(id);
  return `<div class="sb-sec"><button type="button" data-sec="${id}" aria-expanded="${open}">${ico('chev', '')}${title}${n != null ? `<span class="n">${n}</span>` : ''}</button><ul ${open ? '' : 'hidden'}>${items.join('')}</ul></div>`;
}
const it = (r, inner, cur) => `<li><button type="button" class="sb-it" data-go="${hashOf(r)}" ${cur ? 'aria-current="true"' : ''}>${inner}</button></li>`;
const add = (cmd, label) => `<li><button type="button" class="sb-it is-add" data-cmd="${cmd}">${ico('plus')}<span>${label}</span></button></li>`;
const toolItem = (r, a, cur, by) => it({ ...r, kind: 'tool', ref: a.id }, `${by}<span>${esc(a.name)}</span>`, cur.kind === 'tool' && cur.ref === a.id);
function renderSide(r) {
  const el = $('#wb-side');
  if (side === 'activity') { el.innerHTML = `<div class="sb-h">Activity</div>${timeline(r, 40)}`; return; }
  let h = `<div class="sb-h">Explorer${r.mode === 'i' ? ' · Individual' : ''}</div>`;
  if (r.mode === 'e') {
    if (r.level === 'none') { el.innerHTML = h + `<p class="sb-empty">You’re not part of a company or fund yet.</p><p class="sb-empty"><a href="../join/">Join an org</a></p>`; return; }
    const lv = LEVELS();
    if (lv.length > 1) h += `<div class="sb-lv" role="tablist" aria-label="Level">${lv.map(([k, l]) => `<button type="button" role="tab" data-level="${k}" aria-selected="${r.level === k}">${l}</button>`).join('')}</div>`;
  }
  const welcome = it({ ...r, kind: 'welcome', ref: '' }, `<img class="ic" src="../logo.svg" alt=""><span>Welcome</span>`, r.kind === 'welcome');
  let body = '';
  if (r.mode === 'i') {
    const circles = myCircles(), offers = circleOffers(), mine = S.artifacts.filter((a) => a.owner === ME.id && !a.company);
    body = sec('i-home', 'Common Ground', [welcome])
      + sec('i-circles', 'Circles', circles.map((c) => it({ ...r, kind: 'circle', ref: c.id }, `${ico('circle')}<span>${esc(c.name)}</span><span class="faces">${c.members.slice(0, 4).map((m) => U(m)).filter(Boolean).map((u) => lg(u)).join('')}</span>`, r.kind === 'circle' && r.ref === c.id)).concat(add('newCircle', 'New circle…')), circles.length)
      + sec('i-shared', 'Shared with me', offers.length ? offers.map(({ a }) => toolItem(r, a, r, lg(U(a.owner)))) : ['<li class="sb-empty">Nothing yet</li>'], offers.length)
      + sec('i-mine', 'My tools', mine.length ? mine.map((a) => toolItem(r, a, r, ico('tool'))) : ['<li class="sb-empty">Finish one in VS Code</li>']);
  } else if (r.level === 'me') {
    const offers = workOffers(), mine = S.artifacts.filter((a) => a.owner === ME.id && a.company);
    body = sec('m-home', myCo().name, [welcome, it({ ...r, kind: 'receiving', ref: '' }, `${ico('inbox')}<span>Receiving</span><small>${pref(ME).mode === 'off' ? 'off' : pref(ME).mode === 'company' ? 'team' : 'all'}</small>`, r.kind === 'receiving')])
      + sec('m-shared', 'Shared with me', offers.length ? offers.map(({ a }) => toolItem(r, a, r, a.company === ME.company ? lg(U(a.owner)) : fav(CO(a.company)))) : ['<li class="sb-empty">Nothing yet</li>'], offers.length)
      + sec('m-mine', 'My tools', mine.length ? mine.map((a) => toolItem(r, a, r, ico('tool'))) : ['<li class="sb-empty">Finish one in VS Code</li>']);
  } else if (r.level === 'team') {
    const c = myCo(), people = S.users.filter((u) => u.company === c.id), tools = S.artifacts.filter((a) => a.company === c.id);
    const mapState = c.mapping?.state === 'verified' ? 'is-ok' : 'is-warn';
    body = sec('t-home', c.name, [welcome,
      it({ ...r, kind: 'company', ref: c.id }, `${ico('data')}<span>Data mapping</span><span class="dot ${mapState}"></span>`, r.kind === 'company'),
      it({ ...r, kind: 'policy', ref: '' }, `${ico('shield')}<span>Sharing policy</span>`, r.kind === 'policy'),
      it({ ...r, kind: 'standard', ref: '' }, `${ico('standard')}<span>${esc(S.standard.name)}</span>`, r.kind === 'standard')])
      + sec('t-people', 'Members', people.map((u) => it({ ...r, kind: 'person', ref: u.id }, `${lg(u)}<span>${esc(u.name)}</span><small>${[u.admin && 'admin', u.exporter ? 'export' : u.publisher && 'publish'].filter(Boolean).join(' · ')}</small>`, r.kind === 'person' && r.ref === u.id)).concat(add('inviteMember', 'Invite member…')), people.length)
      + sec('t-tools', 'Tools', tools.length ? tools.map((a) => toolItem(r, a, r, lg(U(a.owner)))) : ['<li class="sb-empty">None yet</li>'], tools.length);
  } else {
    const order = { joined: 0, invited: 1, none: 2 };
    const cos = [...S.companies].sort((a, b) => order[a.status] - order[b.status]);
    body = sec('o-home', S.fund.name, [welcome, it({ ...r, kind: 'standard', ref: '' }, `${ico('standard')}<span>${esc(S.standard.name)}</span>`, r.kind === 'standard')])
      + sec('o-cos', 'Portfolio', cos.map((c) => it({ ...r, kind: 'company', ref: c.id }, `${fav(c)}<span>${esc(c.name)}</span><span class="dot ${c.status === 'joined' ? 'is-ok' : c.status === 'invited' ? 'is-warn' : ''}"></span>`, r.kind === 'company' && r.ref === c.id)).concat(add('inviteCompany', 'Invite a company…')), cos.filter(inStd).length)
      + sec('o-tools', 'Shared tools', S.artifacts.filter((a) => a.company).map((a) => toolItem(r, a, r, fav(CO(a.company)))), S.artifacts.filter((a) => a.company).length);
  }
  el.innerHTML = h + body;
}
function renderTabs(r) {
  const cur = hashOf(r);
  if (!tabs.includes(cur)) { tabs.push(cur); if (tabs.length > 8) tabs.shift(); }
  // forget tabs that point at things that no longer exist or another person's scope
  const saved = location.hash; tabs = tabs.filter((h) => { const t = parseFrom(h); return t && (hashOf(t) === h); }); keepTabs();
  $('#wb-tabs').innerHTML = tabs.map((h) => { const t = parseFrom(h), m = meta(t), on = h === cur;
    return `<div class="tab" role="tab" tabindex="${on ? 0 : -1}" aria-selected="${on}" data-go="${h}" title="${esc(m.label)} — ${esc(scopeName(t))}">${m.icon}<span>${esc(m.label)}</span><button type="button" class="x" data-close="${h}" aria-label="Close ${esc(m.label)}">${ico('x', '')}</button></div>`; }).join('');
  void saved;
}
function parseFrom(h) { const keep = location.hash; try { history.replaceState(null, '', h); return parse(); } finally { history.replaceState(null, '', keep || location.pathname); } }
function renderStatus(r) {
  $('#wb-status').innerHTML = `<span class="rem"><img src="../logo.svg" alt="">Common Ground</span><span>${esc(scopeName(r))}</span>`
    + (r.mode === 'i' ? `<span class="hide-sm">${myCircles().length} circle${myCircles().length === 1 ? '' : 's'}</span>` : r.level !== 'none' ? `<span class="hide-sm">${esc(S.standard.name)}</span>` : '')
    + `<span class="r hide-sm">Prototype · stored in this browser</span><button type="button" data-cmd="account">@${esc(ME.handle)}</button>`;
}

// ── editors ─────────────────────────────────────────────────────────────
const head = (icon, title, sub, actions = '') => `<header class="ed-h">${icon}<span><h1>${title}</h1>${sub ? `<small>${sub}</small>` : ''}</span>${actions ? `<div class="ed-act">${actions}</div>` : ''}</header>`;
const walk = (title, sub, done, total, go) => { const p = Math.round(100 * Math.min(done, total) / total), ok = done >= total;
  return `<button type="button" class="walk ${ok ? 'is-done' : ''}" ${go}><b>${ok ? '<i>✓</i>' : ''}${title}</b><small>${sub} · ${Math.min(done, total)} of ${total}</small><em style="--p:${p}%"></em></button>`; };

function edWelcome(r) {
  const start = [], recent = [], walks = [];
  const row = (icon, label, sub, goR) => `<li>${icon}<button type="button" data-go="${hashOf(goR)}">${esc(label)}</button><small>${sub}</small></li>`;
  if (r.mode === 'i') {
    const circles = myCircles(), mine = S.artifacts.filter((a) => a.owner === ME.id && !a.company);
    start.push(['plus', 'New circle…', 'newCircle'], ['people', 'Invite a friend…', 'inviteFriend'], ['share', 'Share a tool…', 'shareTool']);
    circleOffers().forEach(({ g, a }) => recent.push(row(lg(U(a.owner)), a.name, `${esc(U(a.owner).name)} · ${esc(CI(g.circleId).name)}`, { ...r, kind: 'tool', ref: a.id })));
    circles.forEach((c) => recent.push(row(ico('circle'), c.name, `${c.members.length} people`, { ...r, kind: 'circle', ref: c.id })));
    const friends = new Set(circles.flatMap((c) => c.members)); friends.delete(ME.id);
    walks.push(walk('Start a circle', 'Friends you build with', circles.length, 1, 'data-cmd="newCircle"'),
      walk('Bring in friends', 'By GitHub username', friends.size, 2, 'data-cmd="inviteFriend"'),
      walk('Share a tool', 'Anything your agent finished', S.grants.filter((g) => g.scope === 'circle' && g.issuer === ME.id).length, 1, 'data-cmd="shareTool"'));
  } else if (r.level === 'me') {
    start.push(['inbox', 'Receiving settings…', null, { ...r, kind: 'receiving' }], ['share', 'Share a tool…', 'shareTool'], ['timeline', 'Activity…', null, { ...r, kind: 'activity' }]);
    workOffers().forEach(({ a }) => recent.push(row(a.company === ME.company ? lg(U(a.owner)) : fav(CO(a.company)), a.name, a.company === ME.company ? `${esc(U(a.owner).name)} · your team` : esc(CO(a.company).name), { ...r, kind: 'tool', ref: a.id })));
    S.artifacts.filter((a) => a.owner === ME.id && a.company).forEach((a) => recent.push(row(ico('tool'), a.name, 'yours', { ...r, kind: 'tool', ref: a.id })));
    walks.push(walk('Choose what you receive', 'Team, portfolio, or nothing', ME.prefSet ? 1 : 0, 1, `data-go="${hashOf({ ...r, kind: 'receiving' })}"`),
      walk('Receive a tool', 'From your team or the portfolio', workOffers().length, 1, `data-go="${hashOf({ ...r, kind: 'welcome' })}"`),
      walk('Share a tool', 'Finish one with your agent', S.grants.filter((g) => g.issuer === ME.id && g.scope !== 'circle').length, 1, 'data-cmd="shareTool"'));
  } else if (r.level === 'team') {
    const c = myCo(), people = S.users.filter((u) => u.company === c.id);
    start.push(['people', 'Invite a member…', 'inviteMember'], ['data', 'Check data mapping…', null, { ...r, kind: 'company', ref: c.id }], ['shield', 'Sharing policy…', null, { ...r, kind: 'policy' }]);
    people.forEach((u) => recent.push(row(lg(u), u.name, `@${esc(u.handle)}`, { ...r, kind: 'person', ref: u.id })));
    S.artifacts.filter((a) => a.company === c.id).forEach((a) => recent.push(row(ico('tool'), a.name, esc(U(a.owner).name), { ...r, kind: 'tool', ref: a.id })));
    walks.push(walk('Map your data', esc(c.source || 'Your source system'), c.mapping?.state === 'verified' ? 1 : 0, 1, `data-go="${hashOf({ ...r, kind: 'company', ref: c.id })}"`),
      walk('Invite your team', 'Engineers who build or use tools', people.length, 3, 'data-cmd="inviteMember"'),
      walk('Name an exporter', 'Who can share across the portfolio', people.filter((u) => u.exporter).length, 1, `data-go="${hashOf({ ...r, kind: 'person', ref: people[0]?.id || '' })}"`),
      walk('Reuse across the portfolio', 'A tool reaching another company', S.grants.filter((g) => g.scope === 'portfolio' && A(g.artifactId)?.company === c.id).length, 1, `data-go="${hashOf({ ...r, kind: 'welcome' })}"`));
  } else {
    const ins = S.companies.filter(inStd), joined = S.companies.filter((c) => c.status === 'joined');
    start.push(['building', 'Invite a company…', 'inviteCompany'], ['standard', 'Open the standard…', null, { ...r, kind: 'standard' }], ['timeline', 'Activity…', null, { ...r, kind: 'activity' }]);
    S.companies.filter(inStd).forEach((c) => recent.push(row(fav(c), c.name, c.status === 'joined' ? 'joined' : 'invited', { ...r, kind: 'company', ref: c.id })));
    walks.push(walk('Publish a standard', esc(S.standard.name), 1, 1, `data-go="${hashOf({ ...r, kind: 'standard' })}"`),
      walk('Invite companies', 'Into the standard', ins.length, S.companies.length, 'data-cmd="inviteCompany"'),
      walk('Companies mapped', 'Data verified against the standard', joined.length, Math.max(ins.length, 1), `data-go="${hashOf({ ...r, kind: 'welcome' })}"`),
      walk('Cross-company reuse', 'One company’s tool at another', S.grants.filter((g) => g.scope === 'portfolio' && active(g)).length, 1, `data-go="${hashOf({ ...r, kind: 'welcome' })}"`));
  }
  const startHtml = start.map(([icon, label, cmd, goR]) => `<li><button type="button" ${cmd ? `data-cmd="${cmd}"` : `data-go="${hashOf({ ...goR, ref: goR.ref || '' })}"`}>${ico(icon)}${label}</button></li>`).join('');
  return `<div class="wel"><div><h1>Common Ground</h1><p class="sub">${esc(scopeName(r))}</p><h2>Start</h2><ul class="start">${startHtml}</ul>`
    + `<h2>Recent</h2>${recent.length ? `<ul class="recent">${recent.slice(0, 8).join('')}</ul>` : '<p class="none" style="color:var(--vdim)">Nothing yet.</p>'}</div>`
    + `<div><h2>Walkthroughs</h2>${walks.join('')}</div></div>`;
}

// tool source shown in the editor: the reference implementations from the repo's demo
const SRC = {
  'telemetry-inspector': `import type { Binding, Report } from './binding';
import { grid, parseTime } from './grid';

// Completeness for one day of minute data. Missing values are not zeros.
export function inspect(rows: string[][], b: Binding): Report {
  const body = rows.slice(b.skipUnitsRow ? 2 : 1);
  const seen = new Map<string, number>();
  let missingValues = 0, duplicateRows = 0;
  for (const row of body) {
    const t = parseTime(row[b.timeIndex], b.timeBasis);
    if (seen.has(t)) duplicateRows++;
    seen.set(t, (seen.get(t) ?? 0) + 1);
    if (row[b.signalIndex] === '' || row[b.signalIndex] === 'NaN') missingValues++;
  }
  const missingTimestamps = grid(b).filter((t) => !seen.has(t));
  return { rows: body.length, missingTimestamps, duplicateRows, missingValues };
}`,
  'csv-sanity': `// Flags the rows a spreadsheet export usually gets wrong.
export function inspect(rows: string[][]): Report {
  const width = rows[0].length;
  const ragged = rows.filter((r) => r.length !== width).length;
  const blank = rows.filter((r) => r.every((v) => v.trim() === '')).length;
  const dupes = rows.length - new Set(rows.map((r) => r.join(','))).size;
  return { rows: rows.length - 1, ragged, blank, duplicates: dupes };
}`,
};
const escCode = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hl = (src) => src.split('\n').map((line) => `<span class="l">${escCode(line)
  .replace(/(\/\/.*)$/, '<span class="c">$1</span>')
  .replace(/('[^']*')/g, '<span class="s">$1</span>')
  .replace(/\b(import|type|from|export|function|const|let|for|of|if|return|new)\b/g, '<span class="k">$1</span>')
  .replace(/\b(Binding|Report|Map|Set|string|number)\b/g, '<span class="t">$1</span>')
  .replace(/(?<![\w&#])(\d+)(?![\w;])/g, '<span class="nm">$1</span>')}</span>`).join('');

function edTool(r) {
  const a = A(r.ref), o = U(a.owner), c = a.company && CO(a.company), grants = S.grants.filter((g) => g.artifactId === a.id);
  const manage = canManageTool(a), live = grants.some(active);
  const recip = (g) => g.recipients.map((id) => U(id)).filter(Boolean).map((u) => { const uc = CO(u.company); const off = g.scope === 'circle' ? !CI(g.circleId)?.members.includes(u.id) : !reaches(u.id);
    return `<span class="chip ${off ? 'is-off' : ''}" title="${off ? 'Blocked by current policy' : ''}">${lg(u)}${esc(u.name)}${uc && uc.id !== a.company ? fav(uc) : ''}</span>`; }).join('');
  const scope = (g) => g.scope === 'circle' ? `<span class="pill">${ico('circle')}${esc(CI(g.circleId)?.name || 'circle')}</span>` : g.scope === 'portfolio' ? '<span class="pill is-blue">Portfolio</span>' : '<span class="pill">Team</span>';
  const shared = grants.length ? `<ul class="rows">${grants.map((g) => `<li><span class="chips">${recip(g)}</span><span></span>${scope(g)}${g.revoked ? '<span class="pill is-bad">Revoked</span>' : active(g) ? `<span class="pill">${until(g.expiresAt)}</span>${manage ? `<button type="button" class="vbtn" data-act="revoke" data-id="${g.id}">Revoke</button>` : ''}` : '<span class="pill">Expired</span>'}</li>`).join('')}</ul>` : '<div class="blk-b" style="color:var(--vdim)">Not shared yet.</div>';
  return head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('tool', '')}</span>`, `<code>${esc(a.name)}</code>`, `${esc(o.name)}${c ? ` · ${esc(c.name)}` : ''} · ${when(a.createdAt)}`,
    `<span class="pill"><code>${esc(a.hash.slice(0, 7))}</code></span><span class="pill is-ok">${a.checks}/7 checks</span>`
    + `<a class="vbtn" href="vscode://commonground.common-ground/open?tool=${encodeURIComponent(a.id)}">${ico('code', '')}Open in VS Code</a>`
    + (a.owner === ME.id ? `<button type="button" class="vbtn is-primary" data-cmd="shareTool" data-tool="${a.id}">${ico('share', '')}Share…</button>` : '')
    + (manage && live ? `<button type="button" class="vbtn is-danger" data-act="revoke-all" data-id="${a.id}">Revoke all</button>` : ''))
    + `<div class="cols"><section class="blk"><h2>${ico('code', '')}${a.id === 'telemetry-inspector' ? 'src/inspector.ts' : 'src/index.ts'}</h2><pre class="code">${hl(SRC[a.id] || '// Source arrives with the tool package.')}</pre></section>`
    + `<div><section class="blk"><h2>Shared with<span class="n">${grants.filter(active).length} live</span></h2>${shared}</section>`
    + `<section class="blk"><h2>Checks<span class="n">${a.checks} of 7</span></h2><ul class="checks">${CHECKS.map((x) => `<li><i>✓</i>${esc(x)}</li>`).join('')}</ul></section></div></div>`;
}

function edCircle(r) {
  const c = CI(r.ref), owner = c.owner === ME.id;
  const tools = S.grants.filter((g) => g.scope === 'circle' && g.circleId === c.id && active(g)).map((g) => ({ g, a: A(g.artifactId) })).filter((x) => x.a);
  const people = c.members.map(U).filter(Boolean).map((u) => `<li>${lg(u)}<span><b>${esc(u.name)}</b><small>@${esc(u.handle)}</small></span>${u.id === c.owner ? '<span class="pill">started it</span>' : ''}</li>`).join('')
    + (c.invites || []).map((h) => `<li class="is-dim">${lgH(h)}<span><b>@${esc(h)}</b><small>invited</small></span>${owner ? `<button type="button" class="vbtn" data-act="uninvite" data-id="${c.id}" data-h="${esc(h)}">Cancel</button>` : ''}</li>`).join('');
  return head(`<span class="faces" style="display:flex">${c.members.slice(0, 5).map(U).filter(Boolean).map((u) => lg(u, 'big')).join('')}</span>`, esc(c.name), `${c.members.length} people${c.invites?.length ? ` · ${c.invites.length} invited` : ''}`,
    `<button type="button" class="vbtn is-primary" data-cmd="shareTool" data-circle="${c.id}">${ico('share', '')}Share a tool…</button><button type="button" class="vbtn is-danger" data-act="leave" data-id="${c.id}">Leave</button>`)
    + `<form class="inv" data-invite="${c.id}"><span class="cg-lg" id="inv-face"></span><input name="h" placeholder="Invite by GitHub username" autocapitalize="off" spellcheck="false" aria-label="Invite by GitHub username"><button class="vbtn is-primary">Invite</button></form>`
    + `<div class="cols"><section class="blk"><h2>People<span class="n">${c.members.length}</span></h2><ul class="rows">${people}</ul></section>`
    + `<section class="blk"><h2>Tools<span class="n">${tools.length}</span></h2>${tools.length ? `<ul class="rows">${tools.map(({ g, a }) => `<li class="is-click" data-go="${hashOf({ mode: 'i', kind: 'tool', ref: a.id })}">${lg(U(a.owner))}<span><b>${esc(a.name)}</b><small>${esc(U(a.owner).name)} · ${until(g.expiresAt)}</small></span><span class="pill is-ok">${a.checks}/7</span></li>`).join('')}</ul>` : '<div class="blk-b" style="color:var(--vdim)">Nothing shared yet.</div>'}</section></div>`;
}

let personErr = null;
function edPerson(r) {
  const u = U(r.ref), mine = canTeam();
  const row = (k, title, desc, dis) => `<label class="set ${dis ? 'is-off' : ''}"><b>${title}</b><input type="checkbox" data-role="${k}" data-id="${u.id}" ${u[k] ? 'checked' : ''} ${!mine || dis ? 'disabled' : ''}><p>${desc}</p></label>`;
  return head(lg(u, 'big'), esc(u.name), `@${esc(u.handle)} on GitHub${u.admin ? ' · admin' : ''}`)
    + `<div class="sets"><h2>Roles</h2>${row('publisher', 'Publisher', 'Can share tools with teammates.')}${row('exporter', 'Exporter', 'Can share with named people at other portfolio companies. Needs Publisher.')}${row('receiver', 'Receiver', 'Gets tools in their editor’s Recent.')}${row('eligible', 'Eligible', 'Counted as a recipient by the standard.')}`
    + (personErr?.id === u.id ? `<p class="err" role="alert">${esc(personErr.msg)}</p>` : '') + `</div>`
    + `<div class="sets"><h2>Works with</h2><div class="set is-wide"><p>${u.capabilities.length ? u.capabilities.map((x) => `<span class="pill">${esc(x)}</span>`).join(' ') : 'Nothing mapped yet'}</p></div></div>`;
}

let mapResult = {};
function edCompany(r) {
  const c = CO(r.ref), org = r.level === 'org', edit = !org && canTeam();
  const st = { joined: ['is-ok', 'Joined'], invited: ['is-warn', 'Invited'], none: ['', 'Not in the standard'] }[c.status];
  const actions = org ? (c.status === 'none' ? `<button type="button" class="vbtn is-primary" data-act="invite-co" data-id="${c.id}">Invite to standard</button>`
    : `${c.invite ? `<button type="button" class="vbtn" data-act="copy-invite" data-id="${c.id}">${ico('link', '')}Copy invite link</button>` : ''}<button type="button" class="vbtn is-danger" data-act="remove-co" data-id="${c.id}">Remove</button>`) : '';
  let h = head(fav(c, 'big'), esc(c.name), `${esc(c.sector || '')}${c.github ? ` · github.com/${esc(c.github)}` : ''}`, `<span class="pill ${st[0]}">${st[1]}</span>${actions}`);
  if (!inStd(c)) return h + `<div class="result"><p>${org ? 'Invite them and they join by mapping their data to the standard.' : 'Your fund hasn’t invited your company yet.'}</p></div>`;
  const b = c.binding || { timeColumn: '', signalColumn: '', unit: '', skipUnitsRow: false, timeBasis: 'utc', cadenceSeconds: 60 };
  const cols = COLUMNS[c.id] || c.columns;
  const pick = (k, val) => cols ? `<select class="vsel" data-b="${k}" ${edit ? '' : 'disabled'}>${(val && !cols.includes(val) ? [val] : []).concat(cols).map((x) => `<option ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : `<input class="vin" data-b="${k}" value="${esc(val)}" ${edit ? '' : 'disabled'} placeholder="column">`;
  const res = mapResult[c.id] || c.mapping || { state: 'unmapped', detail: 'Not mapped yet' };
  const rc = { verified: 'is-ok', failed: 'is-bad', draft: 'is-warn', unmapped: '' }[res.state];
  h += `<div class="cols"><div class="sets"><h2>Data mapping <span style="font-weight:400;color:var(--vdim)">→ ${esc(S.standard.name)}</span></h2>`
    + `<div class="set is-wide"><b>Source system</b><p>${esc(c.source || 'Not set')}</p></div>`
    + `<div class="set is-wide"><b>Time <span>→ time</span></b><div class="ctl">${pick('timeColumn', b.timeColumn)}<select class="vsel" data-b="timeBasis" ${edit ? '' : 'disabled'}><option value="utc" ${b.timeBasis === 'utc' ? 'selected' : ''}>UTC</option><option value="local-unspecified" ${b.timeBasis === 'local-unspecified' ? 'selected' : ''}>Local, no timezone</option></select></div></div>`
    + `<div class="set is-wide"><b>Value <span>→ value</span></b><div class="ctl">${pick('signalColumn', b.signalColumn)}<input class="vin" data-b="unit" value="${esc(b.unit || '')}" placeholder="unit" ${edit ? '' : 'disabled'} style="width:90px"></div></div>`
    + `<div class="set is-wide"><b>Cadence <span>seconds between rows</span></b><div class="ctl"><input class="vin is-num" type="number" min="1" data-b="cadenceSeconds" value="${esc(b.cadenceSeconds)}" ${edit ? '' : 'disabled'}></div></div>`
    + `<label class="set"><b>Units row</b><input type="checkbox" data-b="skipUnitsRow" ${b.skipUnitsRow ? 'checked' : ''} ${edit ? '' : 'disabled'}><p>The second row holds units, not readings.</p></label>`
    + (edit ? `<div class="set is-wide"><div class="ctl"><button type="button" class="vbtn is-primary" data-act="check-map" data-id="${c.id}">Check mapping</button></div></div>` : '')
    + `<div class="result ${rc}"><p>${res.state === 'verified' ? '✓ ' : res.state === 'failed' ? '✗ ' : ''}${esc(res.detail)}</p></div></div><div>`;
  const people = S.users.filter((u) => u.company === c.id);
  h += `<section class="blk"><h2>People<span class="n">${people.length}</span></h2>${people.length ? `<ul class="rows">${people.map((u) => `<li ${!org ? `class="is-click" data-go="${hashOf({ mode: 'e', level: 'team', kind: 'person', ref: u.id })}"` : ''}>${lg(u)}<span><b>${esc(u.name)}</b><small>@${esc(u.handle)}</small></span>${u.exporter ? '<span class="pill is-blue">exporter</span>' : u.publisher ? '<span class="pill">publisher</span>' : ''}</li>`).join('')}</ul>` : '<div class="blk-b" style="color:var(--vdim)">Nobody yet.</div>'}</section>`;
  if (org) {
    const others = S.companies.filter((x) => x.id !== c.id && inStd(x));
    h += `<section class="blk"><h2>Can share with</h2><div class="blk-b sets" style="margin:0">${others.map((p) => `<label class="set"><b>${fav(p)} ${esc(p.name)}</b><input type="checkbox" data-peer="${p.id}" data-id="${c.id}" ${c.fundPeers.includes(p.id) ? 'checked' : ''}><p>${p.status === 'joined' ? 'joined' : 'invited'}</p></label>`).join('') || '<p style="color:var(--vdim)">No other companies yet.</p>'}</div></section>`;
  }
  return h + `</div></div>`;
}

function edStandard(r) {
  const N = S.network, edit = r.level === 'org';
  const set = (k, title, desc, on, dis) => `<label class="set ${dis ? 'is-off' : ''}"><b>${title}</b><input type="checkbox" data-pol="${k}" ${on ? 'checked' : ''} ${!edit || dis ? 'disabled' : ''}><p>${desc}</p></label>`;
  const num = (k, title, desc, v, lo, hi, unit) => `<div class="set is-wide"><b>${title}</b><p>${desc}</p><div class="ctl"><input class="vin is-num" type="number" min="${lo}" max="${hi}" data-pol="${k}" value="${v}" ${edit ? '' : 'disabled'}>${unit || ''}</div></div>`;
  return head(`<span class="ic" style="width:32px;height:32px;color:var(--vlink)">${ico('standard', '')}</span>`, esc(S.standard.name), `Held by ${esc(S.fund.name)} · ${S.companies.filter(inStd).length} companies`, `<span class="pill is-ok">v${esc(S.standard.version)} published</span>`)
    + `<div class="cols"><div><section class="blk"><h2>Observation format</h2><ul class="rows">${[['time', 'UTC or local, never guessed'], ['value', 'one numeric signal per row'], ['unit', 'as printed by the source'], ['timeBasis', 'utc · local-unspecified'], ['cadence', 'seconds between rows'], ['source', 'the system it came from']].map(([k, v]) => `<li><code style="color:#9cdcfe;font:12.5px var(--mono);width:90px">${k}</code><span><small>${v}</small></span></li>`).join('')}</ul></section>`
    + `<section class="blk"><h2>Tool contract</h2><pre class="code">${hl(`export function inspect(rows: string[][], b: Binding): Report`)}</pre></section></div>`
    + `<section class="blk"><h2>Checks<span class="n">7 required</span></h2><ul class="checks">${CHECKS.map((x) => `<li><i>✓</i>${esc(x)}</li>`).join('')}</ul></section></div>`
    + `<div class="sets"><h2>Permission policy</h2>${set('enabled', 'Network on', 'Pause to stop all sharing in the standard.', N.enabled)}${set('crossCompany', 'Cross-company sharing', 'Tools can reach named people at other member companies.', N.crossCompany, !N.enabled)}`
    + num('maxOpenOffers', 'Open offers per person', 'The most unopened tools anyone sees at once.', N.maxOpenOffers, 1, 5) + num('expiryDays', 'Grant expiry', 'Days before a share needs renewing.', N.expiryDays, 1, 90, ' days')
    + `<div class="set is-wide"><b>Named recipients only <span class="lock">· always on</span></b><p>Every share names exact people.</p></div><div class="set is-wide"><b>Onward resharing <span class="lock">· always off</span></b><p>Only a tool’s author can share it.</p></div></div>`;
}

function edPolicy() {
  const c = myCo(), N = S.network, cross = N.enabled && N.crossCompany;
  const rad = (v, title, desc, dis) => `<label class="set ${dis ? 'is-off' : ''}"><b>${title}</b><input type="radio" name="co-receive" value="${v}" ${c.receive === v ? 'checked' : ''} ${dis ? 'disabled' : ''}><p>${desc}</p></label>`;
  return head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('shield', '')}</span>`, 'Sharing policy', `${esc(c.name)} · your fund sets the ceiling`)
    + `<div class="sets"><h2>Standard</h2><label class="set ${c.status !== 'joined' ? 'is-off' : ''}"><b>Take part in ${esc(S.standard.name)}</b><input type="checkbox" data-org="participating" ${c.participating ? 'checked' : ''} ${c.status !== 'joined' ? 'disabled' : ''}><p>Off stops all sharing in and out. Members and mappings stay.</p></label></div>`
    + `<div class="sets"><h2>Receive tools from</h2>${rad('off', 'Nobody', 'No tools come in.')}${rad('company', 'Your company', 'Reviewed tools from colleagues.')}${rad('portfolio', 'Approved portfolio companies', cross ? 'Named people at the peers below.' : 'Off fund-wide right now.', !cross)}</div>`
    + `<div class="sets"><h2>Peers</h2>${c.fundPeers.map(CO).filter(Boolean).map((p) => `<label class="set ${cross ? '' : 'is-off'}"><b>${fav(p)} ${esc(p.name)}</b><input type="checkbox" data-copeer="${p.id}" ${c.peers.includes(p.id) ? 'checked' : ''} ${cross ? '' : 'disabled'}><p>Share with named people there.</p></label>`).join('') || '<div class="set is-wide"><p>Your fund hasn’t allowed any peers yet.</p></div>'}</div>`
    + `<div class="sets"><h2>What can leave</h2>${N.classes.map((k) => `<label class="set"><b><code>${esc(k)}</code> tools</b><input type="checkbox" data-class="${k}" ${c.classes.includes(k) ? 'checked' : ''}><p>Reviewed tools of this kind can be shared out.</p></label>`).join('')}</div>`;
}

function edReceiving() {
  const p = pref(ME), c = myCo(), cap = c?.receive || 'off', order = { off: 0, company: 1, portfolio: 2 };
  const rad = (v, title) => { const dis = order[v] > order[cap]; return `<label class="set ${dis ? 'is-off' : ''}"><b>${title}</b><input type="radio" name="me-receive" value="${v}" ${p.mode === v ? 'checked' : ''} ${dis ? 'disabled' : ''}><p>${dis ? 'Off for your company.' : v === 'off' ? 'Nothing new appears in Recent.' : v === 'company' ? 'Tools from your team.' : 'Your team, plus named shares from portfolio companies.'}</p></label>`; };
  const senders = S.users.filter((u) => u.id !== ME.id && u.publisher && u.company);
  return head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('inbox', '')}</span>`, 'Receiving', 'What can show up in your editor')
    + `<div class="sets"><h2>Receive</h2>${rad('off', 'Nothing')}${rad('company', 'My team')}${rad('portfolio', 'My team and the portfolio')}</div>`
    + `<div class="sets"><h2>Mute</h2>${senders.map((u) => `<label class="set"><b>${lg(u)} ${esc(u.name)} ${u.company !== ME.company ? fav(CO(u.company)) : ''}</b><input type="checkbox" data-mute="${u.id}" ${p.muted.includes(u.id) ? 'checked' : ''}><p>${u.company === ME.company ? 'Your team' : esc(CO(u.company)?.name)}</p></label>`).join('')}</div>`;
}

function timeline(r, n = 200) {
  const mine = (e) => r.mode === 'i' ? (e.circle && myCircles().some((c) => c.id === e.circle)) || (!e.company && e.actor === ME.name)
    : r.level === 'org' ? true : e.company === ME.company || e.also === ME.company;
  const items = S.audit.filter(mine).slice(0, n);
  if (!items.length) return '<p class="sb-empty">Nothing yet.</p>';
  return `<ul class="tl">${items.map((e) => { const u = S.users.find((x) => x.name === e.actor), c = S.companies.find((x) => x.name === e.actor);
    return `<li>${u ? lg(u) : c ? fav(c) : ico('timeline')}<span><b>${esc(e.actor)}</b> ${esc(e.action.charAt(0).toLowerCase() + e.action.slice(1))}${e.subject ? ` <code>${esc(e.subject)}</code>` : ''}<time datetime="${esc(e.at)}">${when(e.at)}</time></span></li>`; }).join('')}</ul>`;
}
const edActivity = (r) => head(`<span class="ic" style="width:30px;height:30px;color:var(--vlink)">${ico('timeline', '')}</span>`, 'Activity', esc(scopeName(r))) + `<section class="blk">${timeline(r)}</section>`;
const edNone = () => `<div class="wel"><div><h1>Common Ground</h1><p class="sub">Enterprise</p><h2>Start</h2><ul class="start"><li><button type="button" data-href="../join/">${ico('building')}Join your company or fund…</button></li><li><button type="button" data-mode-go="i">${ico('circle')}Back to Individual…</button></li></ul></div><div></div></div>`;

// ── render ─────────────────────────────────────────────────────────────
function render() {
  if (!ME) return;
  const r = parse();
  if (hashOf(r) !== location.hash && r.level !== 'none') history.replaceState(null, '', hashOf(r));
  renderTitle(r); renderAct(r); renderSide(r);
  if (r.level === 'none') { $('#wb-tabs').innerHTML = ''; $('#wb-crumbs').innerHTML = ''; }
  else renderTabs(r);
  const m = meta(r);
  $('#wb-crumbs').innerHTML = r.level === 'none' ? '' : `${esc(scopeName(r))} › <b>${esc(m.label)}</b>`;
  const ed = r.level === 'none' ? edNone() : { welcome: edWelcome, tool: edTool, circle: edCircle, person: edPerson, company: edCompany, standard: edStandard, policy: edPolicy, receiving: edReceiving, activity: edActivity }[r.kind](r);
  $('#wb-view').innerHTML = ed;
  renderStatus(r);
  for (const el of [$('#wb-side'), $('#wb-tabs'), $('#wb-view'), $('#wb-act')]) paint(el);
  document.title = `${m.label} · ${scopeName(r)} · Common Ground`;
  document.body.classList.remove('is-gated');
}
function commit(msg, actions) { save(); render(); if (msg) toast(msg, actions); }

// ── notifications ──────────────────────────────────────────────────────
function toast(msg, actions = []) {
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="toast-m"><span class="toast-i">i</span><p>${msg}</p></div><div class="toast-f"><span>Common Ground</span>${actions.map((a, i) => `<button type="button" class="vbtn ${i === 0 ? 'is-primary' : ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>`;
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { actions[+b.dataset.i].run(); el.remove(); } });
  $('#wb-toasts').append(el); setTimeout(() => el.remove(), actions.length ? 9000 : 3600);
}

// ── quick input (VS Code's command palette) ────────────────────────────
let QI = null;
function quick(o) {
  QI = { sel: 0, ...o };
  const wrap = $('#qi'), inp = $('#qi-in');
  inp.value = o.value || ''; inp.placeholder = o.placeholder || '';
  wrap.hidden = false; drawQuick(); inp.focus(); inp.select();
}
function quickItems() { const q = $('#qi-in').value.trim().toLowerCase(); const items = typeof QI.items === 'function' ? QI.items(q) : (QI.items || []);
  return QI.filter === false ? items : items.filter((x) => x.group || !q || `${x.label} ${x.detail || ''}`.toLowerCase().includes(q)); }
function drawQuick() {
  const items = quickItems().filter((x) => !x.group || true), pickable = items.filter((x) => !x.group);
  QI.sel = Math.min(QI.sel, Math.max(0, pickable.length - 1));
  let i = -1;
  $('#qi-list').innerHTML = items.map((x) => x.group ? `<li class="grp">${esc(x.group)}</li>` : (i++, `<li role="option" data-n="${i}" aria-selected="${i === QI.sel}">${x.icon || ''}<span>${esc(x.label)}</span>${x.detail ? `<small>${esc(x.detail)}</small>` : ''}</li>`)).join('');
  const msg = $('#qi-msg'); const m = QI.message ? QI.message($('#qi-in').value) : ''; msg.className = 'qi-msg' + (m && m.bad ? ' is-bad' : ''); msg.innerHTML = m ? (m.html || esc(m)) : '';
  paint($('#qi'));
}
const closeQuick = () => { $('#qi').hidden = true; QI = null; };
function acceptQuick(n) {
  if (!QI) return;
  const pickable = quickItems().filter((x) => !x.group), item = n != null ? pickable[n] : pickable[QI.sel];
  const val = $('#qi-in').value.trim(), o = QI;
  if (o.items && o.requirePick !== false && !item) return;
  const res = o.accept(item ? item.value : null, val);
  if (res === false) return drawQuick();
  if (QI === o) closeQuick();
}
$('#qi-in').addEventListener('input', () => { if (QI) { QI.sel = 0; drawQuick(); } });
$('#qi-in').addEventListener('keydown', (e) => {
  if (!QI) return;
  const n = quickItems().filter((x) => !x.group).length;
  if (e.key === 'ArrowDown') { e.preventDefault(); QI.sel = (QI.sel + 1) % Math.max(n, 1); drawQuick(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); QI.sel = (QI.sel - 1 + Math.max(n, 1)) % Math.max(n, 1); drawQuick(); }
  else if (e.key === 'Enter') { e.preventDefault(); acceptQuick(); }
  else if (e.key === 'Escape') { e.preventDefault(); closeQuick(); }
});
$('#qi-list').addEventListener('mousedown', (e) => { const li = e.target.closest('[data-n]'); if (li) { e.preventDefault(); acceptQuick(+li.dataset.n); } });
$('#qi').addEventListener('mousedown', (e) => { if (e.target.id === 'qi') closeQuick(); });

const handlesIn = (text) => [...new Set(text.split(/[\s,]+/).map((x) => x.trim().replace(/^@/, '')).filter((h) => HANDLE.test(h)))];
const facesMsg = (text) => { const hs = handlesIn(text); return hs.length ? { html: hs.map((h) => `${lgH(h)}@${esc(h)}`).join('&nbsp;&nbsp;') } : ''; };

// ── commands ───────────────────────────────────────────────────────────
const cur = () => parse();
const CMD = {
  newCircle() {
    quick({ placeholder: 'Name your circle (Enter)', accept: (_, name) => { if (!name) return false;
      quick({ placeholder: 'Friends’ GitHub usernames, comma separated (Enter, or leave empty)', message: facesMsg, accept: (_, text) => {
        let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'circle', n = 2; while (CI(id)) id = `${id}-${n++}`;
        const c = { id, name, owner: ME.id, members: [ME.id], invites: [], createdAt: new Date().toISOString() };
        S.circles.push(c); log(ME.name, 'Started a circle', name, null, { circle: id }); const k = addInvites(c, text);
        save(); go({ mode: 'i', kind: 'circle', ref: id }); toast(`Started <b>${esc(name)}</b>${k ? `, invited ${k}` : ''}.`);
      } }); } });
  },
  inviteFriend(circleId) {
    const circles = myCircles(); if (!circles.length) return CMD.newCircle();
    const ask = (c) => quick({ placeholder: `Invite to ${c.name}: GitHub usernames (Enter)`, message: facesMsg, accept: (_, text) => { const k = addInvites(c, text); if (!k) return false; commit(`Invited ${k} to <b>${esc(c.name)}</b>.`); } });
    if (circleId || circles.length === 1) return ask(CI(circleId) || circles[0]);
    quick({ placeholder: 'Which circle?', items: circles.map((c) => ({ label: c.name, detail: `${c.members.length} people`, icon: ico('circle'), value: c.id })), accept: (id) => ask(CI(id)) });
  },
  shareTool(toolId, circleId) {
    const r = cur(), ind = r.mode === 'i';
    const mine = S.artifacts.filter((a) => a.owner === ME.id && (ind ? true : !!a.company));
    if (!mine.length) return toast('You haven’t finished a tool yet. When your agent does, VS Code offers to share it.');
    const pickTarget = (a) => {
      if (ind) {
        const circles = myCircles(); if (!circles.length) return toast('Start a circle first.', [{ label: 'New circle', run: CMD.newCircle }]);
        const done = (cid) => { const c = CI(cid); S.grants.push({ id: rid(), artifactId: a.id, issuer: ME.id, scope: 'circle', circleId: c.id, recipients: c.members.filter((m) => m !== ME.id), expiresAt: new Date(Date.now() + 30 * DAY).toISOString(), revoked: false, reshare: false, at: new Date().toISOString() });
          log(ME.name, `Shared with ${c.name}`, a.name, null, { circle: c.id }); commit(`Shared <b>${esc(a.name)}</b> with ${esc(c.name)}.`); };
        if (circleId) return done(circleId);
        return quick({ placeholder: `Share ${a.name} with…`, items: circles.map((c) => ({ label: c.name, detail: `${c.members.length - 1} friends`, icon: ico('circle'), value: c.id })), accept: done });
      }
      // at work: named people your policy lets this tool reach
      const c = myCo(), N = S.network;
      const people = S.users.filter((u) => u.id !== ME.id && u.receiver && u.eligible && u.company && (u.company === c.id || (N.enabled && N.crossCompany && ME.exporter && c.peers.includes(u.company) && CO(u.company)?.peers.includes(c.id) && CO(u.company)?.participating)));
      quick({ placeholder: `Share ${a.name} with…`, items: people.map((u) => ({ label: u.name, detail: u.company === c.id ? 'your team' : CO(u.company).name, icon: lg(u), value: u.id })), accept: (uid) => {
        const u = U(uid), scope = u.company === c.id ? 'company' : 'portfolio';
        S.grants.push({ id: rid(), artifactId: a.id, issuer: ME.id, scope, recipients: [uid], expiresAt: new Date(Date.now() + N.expiryDays * DAY).toISOString(), revoked: false, reshare: false, at: new Date().toISOString() });
        log(ME.name, `Shared with ${u.name} (${scope === 'company' ? 'team' : 'portfolio'})`, a.name, c.id, scope === 'portfolio' ? { also: u.company } : {}); commit(`Shared <b>${esc(a.name)}</b> with ${esc(u.name)}. Only they can open this version.`); } });
    };
    if (toolId) return pickTarget(A(toolId));
    if (mine.length === 1) return pickTarget(mine[0]);
    quick({ placeholder: 'Which tool?', items: mine.map((a) => ({ label: a.name, detail: `${a.checks}/7 checks`, icon: ico('tool'), value: a.id })), accept: (id) => pickTarget(A(id)) });
  },
  inviteMember() {
    const c = myCo();
    quick({ placeholder: `Invite to ${c.name}: GitHub username (Enter)`, message: (v) => HANDLE.test(v.trim().replace(/^@/, '')) ? { html: `${lgH(v.trim().replace(/^@/, ''))}@${esc(v.trim().replace(/^@/, ''))}` } : '', accept: (_, v) => {
      const h = v.replace(/^@/, ''); if (!HANDLE.test(h)) return false;
      if (S.users.some((u) => u.handle.toLowerCase() === h.toLowerCase())) { toast(`@${esc(h)} already has an account.`); return; }
      quick({ placeholder: `Name for @${h} (Enter)`, value: h, accept: (_, name) => {
        let id = h.toLowerCase(), n = 2; while (U(id)) id = `${h.toLowerCase()}-${n++}`;
        S.users.push({ id, name: name || h, company: c.id, handle: h, publisher: false, exporter: false, receiver: true, eligible: true, capabilities: c.mapping?.state === 'verified' ? ['time-series', 'csv', 'completeness'] : [] });
        c.receivers = S.users.filter((u) => u.company === c.id && u.receiver).map((u) => u.id);
        log(c.name, 'Added member', `${name || h} (@${h})`, c.id); save(); go({ mode: 'e', level: 'team', kind: 'person', ref: id }); toast(`<b>${esc(name || h)}</b> joined ${esc(c.name)}.`); } }); } });
  },
  inviteCompany() {
    const out = S.companies.filter((c) => c.status === 'none');
    if (!out.length) return toast('Every portfolio company is already in the standard.');
    quick({ placeholder: 'Invite which company to the standard?', items: out.map((c) => ({ label: c.name, detail: c.sector, icon: fav(c), value: c.id })), accept: (id) => inviteCo(CO(id)) });
  },
  account() {
    quick({ placeholder: `@${ME.handle}`, items: [{ label: 'Sign out', icon: ico('x'), value: 'out' }, { label: 'Reset demo data', detail: 'everyone, this browser', icon: ico('timeline'), value: 'reset' }], accept: (v) => {
      if (v === 'out') { session.clear(); location.href = '../'; }
      if (v === 'reset') { S = resetState(); save(); if (!whoami(S)) { session.clear(); location.href = '../signin/'; } else location.reload(); } } });
  },
  palette() {
    const r = cur();
    quick({ placeholder: 'Go to a circle, tool, person or company, or run a command', items: (q) => {
      const go = (x) => hashOf(x), items = [{ group: 'Commands' }];
      const cmd = (label, value) => items.push({ label, icon: ico('plus'), value: `cmd:${value}` });
      if (r.mode === 'i') { cmd('New circle…', 'newCircle'); cmd('Invite a friend…', 'inviteFriend'); cmd('Share a tool…', 'shareTool'); }
      if (r.level === 'me') { cmd('Share a tool…', 'shareTool'); }
      if (r.level === 'team') { cmd('Invite a member…', 'inviteMember'); }
      if (r.level === 'org') { cmd('Invite a company…', 'inviteCompany'); }
      items.push({ label: r.mode === 'i' ? 'Switch to Enterprise' : 'Switch to Individual', icon: ico('share'), value: `mode:${r.mode === 'i' ? 'e' : 'i'}` });
      items.push({ group: 'Go to' });
      myCircles().forEach((c) => items.push({ label: c.name, detail: 'circle', icon: ico('circle'), value: go({ mode: 'i', kind: 'circle', ref: c.id }) }));
      S.artifacts.filter(canSeeTool).forEach((a) => items.push({ label: a.name, detail: 'tool', icon: ico('tool'), value: go(r.mode === 'i' || !a.company ? { mode: 'i', kind: 'tool', ref: a.id } : { mode: 'e', level: r.level === 'none' ? defLevel() : r.level, kind: 'tool', ref: a.id }) }));
      if (canTeam()) S.users.filter((u) => u.company === ME.company).forEach((u) => items.push({ label: u.name, detail: `@${u.handle}`, icon: lg(u), value: go({ mode: 'e', level: 'team', kind: 'person', ref: u.id }) }));
      if (canOrg()) S.companies.forEach((c) => items.push({ label: c.name, detail: c.status === 'none' ? 'not in standard' : c.status, icon: fav(c), value: go({ mode: 'e', level: 'org', kind: 'company', ref: c.id }) }));
      return items;
    }, accept: (v) => { if (!v) return; if (v.startsWith('cmd:')) return void setTimeout(() => CMD[v.slice(4)]()); if (v.startsWith('mode:')) return void switchMode(v.slice(5)); location.hash = v; } });
  },
};
function addInvites(c, text) {
  let n = 0;
  for (const h of handlesIn(text)) {
    const u = S.users.find((x) => x.handle.toLowerCase() === h.toLowerCase());
    if (u) { if (!c.members.includes(u.id)) { c.members.push(u.id); n++; } }
    else if (!(c.invites ||= []).some((x) => x.toLowerCase() === h.toLowerCase())) { c.invites.push(h); n++; }
  }
  if (n) log(ME.name, `Invited ${n} to the circle`, c.name, null, { circle: c.id });
  return n;
}
function inviteCo(c) {
  c.status = 'invited'; c.invite = { url: `https://commonground.dev/join/${rid()}`, at: new Date().toISOString() };
  c.fundPeers = S.companies.filter((x) => x.id !== c.id && inStd(x)).map((x) => x.id); c.peers = [...c.fundPeers];
  S.companies.forEach((x) => { if (c.fundPeers.includes(x.id)) { x.fundPeers = [...new Set([...x.fundPeers, c.id])]; x.peers = [...new Set([...x.peers, c.id])]; } });
  log('Fund', 'Invited to the standard', c.name, c.id); save(); go({ mode: 'e', level: 'org', kind: 'company', ref: c.id });
  toast(`Invite link for <b>${esc(c.name)}</b> is ready.`, [{ label: 'Copy link', run: () => copy(c.invite.url) }]);
}
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied.'); } catch { quick({ placeholder: 'Copy this link', value: text, accept: () => {} }); } }
function switchMode(m) { const r = cur(); go(m === 'i' ? { mode: 'i', kind: 'welcome', ref: '' } : atWork() ? { mode: 'e', level: defLevel(), kind: 'welcome', ref: '' } : { mode: 'e', level: 'none', kind: 'welcome', ref: '' }); void r; }

// deterministic: the outcomes the real checks give on each company's sample export (server/runner.ts, factory.ts)
function checkMapping(c) {
  const f = (k) => $(`[data-b="${k}"]`, $('#wb-view'));
  const b = { timeColumn: f('timeColumn').value.trim(), signalColumn: f('signalColumn').value.trim(), unit: f('unit').value.trim(), timeBasis: f('timeBasis').value, cadenceSeconds: Math.round(+f('cadenceSeconds').value) || 0, skipUnitsRow: f('skipUnitsRow').checked };
  c.binding = b;
  const cols = COLUMNS[c.id] || c.columns;
  let r;
  if (c.columns && !COLUMNS[c.id]) r = !cols.includes(b.timeColumn) || !cols.includes(b.signalColumn) ? { state: 'failed', detail: 'Pick columns from your sample.' } : (c.sample || { state: 'draft', detail: 'Mapping saved.' });
  else if (!cols) r = b.timeColumn && b.signalColumn ? { state: 'draft', detail: 'Mapping saved. Upload a sample export to run the checks.' } : { state: 'unmapped', detail: 'Not mapped yet' };
  else if (b.cadenceSeconds !== 60) r = { state: 'failed', detail: `Rows every ${b.cadenceSeconds}s: your export has one a minute, so 1,440 rows read as off-grid.` };
  else if (c.id === 'saildrone') r = b.timeColumn !== 'time' ? { state: 'failed', detail: `“${b.timeColumn}” is not a timestamp.` } : !b.skipUnitsRow ? { state: 'failed', detail: '1,441 rows: the units row was read as a reading.' } : b.timeBasis !== 'utc' ? { state: 'failed', detail: 'Timestamps end in Z: they’re UTC.' } : { state: 'verified', detail: b.signalColumn === 'WIND_SPEED_MEAN' ? '1,440 observations · 55 missing wind values · 0 missing timestamps' : `1,440 observations · ${b.signalColumn} → value` };
  else if (c.id === 'palmetto') r = b.timeColumn !== 'measured_on' ? { state: 'failed', detail: `“${b.timeColumn}” is not a timestamp.` } : b.skipUnitsRow ? { state: 'failed', detail: '1,439 rows, midnight observation lost. This export has no units row.' } : b.timeBasis !== 'local-unspecified' ? { state: 'failed', detail: 'These timestamps have no timezone. Reading them as UTC would guess one.' } : { state: 'verified', detail: '1,440 observations · local time preserved · negative power kept' };
  mapResult[c.id] = r; c.mapping = r;
  if (r.state === 'verified' && c.status === 'invited') { c.status = 'joined'; c.participating = true; log(c.name, 'Mapping verified, joined', S.standard.name, c.id); }
  else log(c.name, r.state === 'verified' ? 'Mapping re-checked' : r.state === 'draft' ? 'Saved mapping draft' : 'Mapping check failed', r.detail, c.id);
  commit(r.state === 'verified' ? 'Mapping verified against the standard.' : r.state === 'failed' ? 'Mapping check failed.' : 'Mapping saved.');
}

// ── events ─────────────────────────────────────────────────────────────
const wb = $('#wb');
wb.addEventListener('click', (e) => {
  const t = e.target.closest('[data-close],[data-go],[data-cmd],[data-act],[data-mode],[data-level],[data-side],[data-sec],[data-href],[data-mode-go]');
  if (!t) return;
  if (t.dataset.close) { e.stopPropagation(); const i = tabs.indexOf(t.dataset.close); tabs.splice(i, 1); keepTabs(); if (t.dataset.close === hashOf(cur())) location.hash = tabs[Math.max(0, i - 1)] || hashOf({ ...cur(), kind: 'welcome', ref: '' }); else render(); return; }
  if (t.dataset.go) { location.hash = t.dataset.go; wb.classList.remove('is-drawer'); return; }
  if (t.dataset.href) { location.href = t.dataset.href; return; }
  if (t.dataset.modeGo) return switchMode(t.dataset.modeGo);
  if (t.dataset.cmd) { wb.classList.remove('is-drawer'); return t.dataset.cmd === 'shareTool' ? CMD.shareTool(t.dataset.tool, t.dataset.circle) : CMD[t.dataset.cmd](t.dataset.circle); }
  if (t.dataset.mode) return switchMode(t.dataset.mode);
  if (t.dataset.level) return go({ mode: 'e', level: t.dataset.level, kind: 'welcome', ref: '' });
  if (t.dataset.side) { side = t.dataset.side; wb.classList.add('is-drawer'); return render(); }
  if (t.dataset.sec) { collapsed.has(t.dataset.sec) ? collapsed.delete(t.dataset.sec) : collapsed.add(t.dataset.sec); return renderSide(cur()); }
  const act = t.dataset.act, id = t.dataset.id;
  if (act === 'revoke') { const g = S.grants.find((x) => x.id === id); g.revoked = true; log(ME.name, `Revoked access for ${g.recipients.map((x) => U(x)?.name).join(', ')}`, A(g.artifactId).name, A(g.artifactId).company); commit('Access revoked. Files already downloaded stay with their owners.'); }
  if (act === 'revoke-all') { const a = A(id); quick({ placeholder: `Revoke all future access to ${a.name}?`, items: [{ label: 'Revoke', icon: ico('x'), value: 'y' }, { label: 'Cancel', value: 'n' }], accept: (v) => { if (v !== 'y') return; S.grants.forEach((g) => { if (g.artifactId === a.id) g.revoked = true; }); log(ME.name, 'Revoked all access', a.name, a.company); commit('Future access revoked. Files already downloaded stay with their owners.'); } }); }
  if (act === 'uninvite') { const c = CI(id); c.invites = c.invites.filter((h) => h !== t.dataset.h); commit('Invite cancelled.'); }
  if (act === 'leave') { const c = CI(id); quick({ placeholder: `Leave ${c.name}?`, items: [{ label: 'Leave circle', icon: ico('x'), value: 'y' }, { label: 'Cancel', value: 'n' }], accept: (v) => { if (v !== 'y') return;
    c.members = c.members.filter((m) => m !== ME.id);
    S.grants.forEach((g) => { if (g.scope === 'circle' && g.circleId === c.id) { g.recipients = g.recipients.filter((x) => x !== ME.id); if (A(g.artifactId)?.owner === ME.id) g.revoked = true; } });
    if (!c.members.length) S.circles = S.circles.filter((x) => x.id !== c.id); else if (c.owner === ME.id) c.owner = c.members[0];
    tabs = tabs.filter((h) => !h.includes(`/circle/${c.id}`)); keepTabs();
    log(ME.name, 'Left the circle', c.name, null, { circle: c.id }); save(); go({ mode: 'i', kind: 'welcome', ref: '' }); toast(`Left ${esc(c.name)}.`); } }); }
  if (act === 'invite-co') inviteCo(CO(id));
  if (act === 'copy-invite') copy(CO(id).invite.url);
  if (act === 'remove-co') { const c = CO(id); quick({ placeholder: `Remove ${c.name} from the standard?`, items: [{ label: 'Remove, and revoke its live grants', icon: ico('x'), value: 'y' }, { label: 'Cancel', value: 'n' }], accept: (v) => { if (v !== 'y') return;
    c.status = 'none'; c.participating = false; c.invite = null;
    const ids = new Set(S.users.filter((u) => u.company === c.id).map((u) => u.id));
    S.grants.forEach((g) => { if (g.scope !== 'circle' && !g.revoked && (g.recipients.some((x) => ids.has(x)) || A(g.artifactId)?.company === c.id)) g.revoked = true; });
    S.companies.forEach((x) => { x.fundPeers = x.fundPeers.filter((p) => p !== c.id); x.peers = x.peers.filter((p) => p !== c.id); });
    log('Fund', 'Removed from the standard', c.name, c.id); commit(`${esc(c.name)} removed. Files already downloaded stay with their owners.`); } }); }
  if (act === 'check-map') checkMapping(CO(id));
});
wb.addEventListener('submit', (e) => { const f = e.target.closest('[data-invite]'); if (!f) return; e.preventDefault(); const c = CI(f.dataset.invite), k = addInvites(c, f.h.value); if (!k) { toast('Add a GitHub username.'); return; } commit(`Invited ${k} to <b>${esc(c.name)}</b>.`); });
wb.addEventListener('input', (e) => { if (e.target.closest('[data-invite]')) { const h = handlesIn(e.target.value)[0]; const f = $('#inv-face'); f.innerHTML = h ? lilGuy(h) : ''; } });
wb.addEventListener('change', (e) => {
  const t = e.target, r = cur();
  if (t.dataset.role) {
    const u = U(t.dataset.id), k = t.dataset.role, c = CO(u.company);
    if (k === 'exporter' && t.checked && !u.publisher) { personErr = { id: u.id, msg: 'Exporter needs Publisher first.' }; return render(); }
    if (k === 'publisher' && !t.checked && u.exporter) { personErr = { id: u.id, msg: 'Turn off Exporter before removing Publisher.' }; return render(); }
    personErr = null; u[k] = t.checked;
    const list = { publisher: 'publishers', exporter: 'exporters', receiver: 'receivers' }[k]; if (list) c[list] = S.users.filter((x) => x.company === c.id && x[k]).map((x) => x.id);
    log(c.name, `${t.checked ? 'Gave' : 'Removed'} ${k}`, u.name, c.id); return commit(`${esc(u.name)}: ${k} ${t.checked ? 'on' : 'off'}.`);
  }
  if (t.dataset.pol) {
    const k = t.dataset.pol, N = S.network;
    if (t.type === 'checkbox') N[k] = t.checked; else { const v = Math.round(+t.value); const [lo, hi] = k === 'maxOpenOffers' ? [1, 5] : [1, 90]; N[k] = Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo)); }
    if (k === 'crossCompany' && !N.crossCompany) S.companies.forEach((c) => { if (c.receive === 'portfolio') c.receive = 'company'; });
    log('Fund', `Set ${k === 'enabled' ? 'network' : k === 'crossCompany' ? 'cross-company sharing' : k === 'maxOpenOffers' ? 'open offers per person' : 'grant expiry'} to ${t.type === 'checkbox' ? (t.checked ? 'on' : 'off') : N[k]}`, S.standard.name); return commit('Policy saved.');
  }
  if (t.dataset.peer) { const c = CO(t.dataset.id), p = t.dataset.peer; c.fundPeers = t.checked ? [...new Set([...c.fundPeers, p])] : c.fundPeers.filter((x) => x !== p); c.peers = c.peers.filter((x) => c.fundPeers.includes(x)); if (t.checked) c.peers.push(p); log('Fund', `${t.checked ? 'Allowed' : 'Stopped'} ${c.name} sharing with ${CO(p).name}`, '', c.id); return commit('Saved.'); }
  if (t.name === 'co-receive') { const c = myCo(); c.receive = t.value; log(c.name, `Receive from ${t.value === 'off' ? 'nobody' : t.value === 'company' ? 'company only' : 'portfolio'}`, '', c.id); return commit('Saved.'); }
  if (t.dataset.copeer) { const c = myCo(), p = t.dataset.copeer; c.peers = t.checked ? [...new Set([...c.peers, p])] : c.peers.filter((x) => x !== p); log(c.name, `${t.checked ? 'Allowed' : 'Stopped'} sharing with ${CO(p).name}`, '', c.id); return commit('Saved.'); }
  if (t.dataset.class) { const c = myCo(), k = t.dataset.class; c.classes = t.checked ? [...new Set([...c.classes, k])] : c.classes.filter((x) => x !== k); log(c.name, `${t.checked ? 'Allowed' : 'Blocked'} ${k} tools leaving`, '', c.id); return commit('Saved.'); }
  if (t.dataset.org === 'participating') { const c = myCo(); c.participating = t.checked; log(c.name, t.checked ? 'Resumed' : 'Paused', S.standard.name, c.id); return commit(t.checked ? 'Taking part again.' : 'Paused.'); }
  if (t.name === 'me-receive') { pref(ME).mode = t.value; ME.prefSet = true; log(ME.name, `Receive ${t.value === 'off' ? 'nothing' : t.value === 'company' ? 'from team' : 'from team and portfolio'}`, '', ME.company); return commit('Saved.'); }
  if (t.dataset.mute) { const p = pref(ME), id = t.dataset.mute; p.muted = t.checked ? [...new Set([...p.muted, id])] : p.muted.filter((x) => x !== id); log(ME.name, `${t.checked ? 'Muted' : 'Unmuted'} ${U(id).name}`, '', ME.company); return commit('Saved.'); }
  void r;
});
$('#wb-burger').addEventListener('click', () => { side = 'explorer'; wb.classList.toggle('is-drawer'); $('#wb-burger').setAttribute('aria-expanded', wb.classList.contains('is-drawer')); renderSide(cur()); paint($('#wb-side')); });
$('#wb-search').addEventListener('click', () => CMD.palette());
addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); CMD.palette(); } });
$('#wb-tabs').addEventListener('keydown', (e) => { const tabsEls = [...$('#wb-tabs').children]; const i = tabsEls.indexOf(document.activeElement); if (i < 0) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = tabsEls[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabsEls.length) % tabsEls.length]; n.focus(); }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = document.activeElement.dataset.go; } });
addEventListener('hashchange', () => { render(); $('#wb-view').scrollTop = 0; });
if (ME) render();
