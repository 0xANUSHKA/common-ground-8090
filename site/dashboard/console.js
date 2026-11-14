// The Common Ground console: where a fund runs its portfolio's shared tooling, and each company runs its team.
// Fund: Overview · Portfolio · Tools · People · Standard · Settings. Company: Overview · Team · Tools · Data · Sharing · Settings.
// Everything comes from /api (api/index.js); every change goes back through it and the page reloads what it shows.
import { api, inviteUrl } from '../api.js';
import { sniff, inspect } from '../csvcheck.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (x) => Number(x || 0).toLocaleString();
const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); if (h < 24) return `${h}h ago`; const d = Math.round(h / 24); return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
const left = (iso) => { const d = Math.round((Date.parse(iso) - Date.now()) / 86400000); return d <= 0 ? 'expired' : `${d} days left`; };
const live = (g) => !g.revoked && Date.parse(g.expiresAt) > Date.now();
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
// people: their Google photo, or initials on a colour picked from their name
const initials = (name) => (String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || '?').toUpperCase();
const hue = (str) => [...String(str)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const av = (u, cls = '') => u?.picture ? `<img class="av ${cls}" src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer" title="${esc(u?.name || '')}">`
  : `<span class="av is-init ${cls}" style="--h:${hue(u?.id || u?.name || '')}" title="${esc(u?.name || '')}">${esc(initials(u?.name))}</span>`;
const mono = (name, cls = '') => `<span class="fav is-mono ${cls}">${esc((name || '?').trim()[0]?.toUpperCase() || '?')}</span>`;
const fav = (o, cls = '') => !o ? '' : o.iconUrl ? `<img class="fav ${cls}" src="${esc(o.iconUrl)}" alt="" loading="lazy" onerror="this.outerHTML='${mono(o.name, cls).replace(/"/g, '&quot;')}'">` : mono(o.name, cls);
// icons: Lucide (lucide.dev, ISC licence, see LUCIDE-LICENSE)
const I = {"home": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\" />","building": "<path d=\"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z\" /> <path d=\"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2\" /> <path d=\"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2\" /> <path d=\"M10 6h4\" /> <path d=\"M10 10h4\" /> <path d=\"M10 14h4\" /> <path d=\"M10 18h4\" />","tool": "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\" /> <path d=\"M12 22V12\" /> <path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\" /> <path d=\"m7.5 4.27 9 5.15\" />","people": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /> <circle cx=\"9\" cy=\"7\" r=\"4\" /> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /> <path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />","standard": "<rect x=\"16\" y=\"16\" width=\"6\" height=\"6\" rx=\"1\" /> <rect x=\"2\" y=\"16\" width=\"6\" height=\"6\" rx=\"1\" /> <rect x=\"9\" y=\"2\" width=\"6\" height=\"6\" rx=\"1\" /> <path d=\"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3\" /> <path d=\"M12 12V8\" />","gear": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />","data": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\" /> <path d=\"M3 5V19A9 3 0 0 0 21 19V5\" /> <path d=\"M3 12A9 3 0 0 0 21 12\" />","shield": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /> <path d=\"m9 12 2 2 4-4\" />","link": "<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\" /> <path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\" />","chev": "<path d=\"m7 15 5 5 5-5\" /> <path d=\"m7 9 5-5 5 5\" />","back": "<path d=\"m15 18-6-6 6-6\" />","arrow": "<path d=\"M5 12h14\" /> <path d=\"m12 5 7 7-7 7\" />","plus": "<path d=\"M5 12h14\" /> <path d=\"M12 5v14\" />","menu": "<line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" /> <line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" /> <line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />","download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <polyline points=\"7 10 12 15 17 10\" /> <line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\" />","copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />","check": "<path d=\"M20 6 9 17l-5-5\" />","upload": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <polyline points=\"17 8 12 3 7 8\" /> <line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\" />","user": "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /> <circle cx=\"12\" cy=\"7\" r=\"4\" />"};
const ic = (k, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k] || ''}</svg>`;
const CHECKS = ['NOAA ocean sample: 1,440 rows, 55 missing wind values', 'NREL solar sample: 1,440 rows, negative power kept', 'Finds three missing timestamps and one duplicate', 'Finds missing first and last observations', 'Zero is a reading; malformed is separate', 'Rejects a wrong units-row assumption', 'Unseen window with duplicates and off-grid rows'];
const VSIX = '/download/common-ground.vsix';
const LOGO = '<svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M16 5 5.5 23.5h21z" stroke-opacity=".35" stroke-width="1.6"/><path d="M16 16.5 16 5M16 16.5 5.5 23.5M16 16.5 26.5 23.5" stroke-opacity=".8" stroke-width="1.8"/></g><g fill="currentColor"><circle cx="16" cy="5" r="2.9"/><circle cx="5.5" cy="23.5" r="2.9"/><circle cx="26.5" cy="23.5" r="2.9"/></g><circle cx="16" cy="16.5" r="3.9" fill="#3794ff"/></svg>';

// ── state ──
let ME = null, ORGS = [], V = null, SHARED = [], CACHE = {};
const R = () => { const [orgId = '', page = 'overview', sub = ''] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent); return { orgId, page, sub }; };
const href = (orgId, page = 'overview', sub = '') => `#/${orgId}/${page}${sub ? '/' + encodeURIComponent(sub) : ''}`;
const isFund = () => V?.org.kind === 'fund';
const admin = () => ['owner', 'admin'].includes(V?.myRole);
const memberInv = () => (V?.invites || []).find((i) => i.kind === 'member' && !i.revoked && Date.parse(i.expiresAt) > Date.now());
const companyInv = () => (V?.invites || []).find((i) => i.kind === 'company' && !i.revoked && Date.parse(i.expiresAt) > Date.now());

async function load(orgId) {
  const me = await api('me'); ME = me.user; ORGS = me.orgs;
  if (!ORGS.length) { location.replace('/join/'); return false; }
  let remembered; try { remembered=localStorage.getItem('cg:workspace:'+ME.id); } catch {}
  const fallback = (ORGS.find(o=>o.id===remembered) || ORGS.find(o=>o.kind==='fund') || ORGS[0]).id;
  let target = { id: orgId || fallback };
  V = await api(`orgs/${target.id}`).catch(() => null);
  if (!V && target.id !== fallback) { target = { id: fallback }; V = await api(`orgs/${fallback}`).catch(() => null); }
  if (!V) throw new Error('Couldn’t open this workspace.');
  if(ORGS.some(o=>o.id===V.org.id))try{localStorage.setItem('cg:workspace:'+ME.id,V.org.id);}catch{}
  if (V.org.kind === 'fund') CACHE.fundCos = (V.companies || []).map((c) => c.id);
  SHARED = V.org.kind === 'company' ? (await api('shared')).shared : [];
  if (target.id !== R().orgId) history.replaceState(null, '', href(target.id, R().orgId === target.id ? R().page : 'overview'));
  return true;
}

// ── shell ──
function navItems() {
  const id = V.org.id;
  return isFund()
    ? [['setup', 'Get started', 'check'], ['overview', 'Overview', 'home'], ['portfolio', 'Portfolio', 'building', V.companies?.length], ['tools', 'Tools', 'tool', V.portfolioTools?.length], ['people', 'People', 'people'], ['standard', 'Standard', 'standard'], ['settings', 'Settings', 'gear']]
    : [['setup', 'Get started', 'check'], ['overview', 'Overview', 'home'], ['team', 'Team', 'people', V.members.length], ['tools', 'Tools', 'tool', V.tools.length + SHARED.length], ['data', 'Data', 'data'], ['sharing', 'Sharing', 'shield'], ['settings', 'Settings', 'gear']].filter(([k]) => V.myRole !== 'fund' || ['overview', 'team', 'tools', 'data'].includes(k))
    ;
}
function side() {
  const r = R(), o = V.org;
  const inv = isFund() ? companyInv() : memberInv();
  const kindLabel = o.kind === 'fund' ? 'Fund network · ' + V.myRole : V.myRole === 'fund' ? 'Company · fund view' : V.fund ? `Company · ${V.fund.name}` : 'Company';
  return `<a class="brand" href="/">${LOGO}Common Ground</a>`
    + `<button type="button" class="org-btn" data-act="orgs" aria-haspopup="menu" aria-expanded="false">${fav(o)}<span><b>${esc(o.name)}</b><small>${kindLabel}</small></span>${ic('chev', 'i chev')}</button>`
    + `<ul class="nav-l">${navItems().map(([k, l, i, c]) => `<li><a href="${href(o.id, k)}" ${r.page === k ? 'aria-current="page"' : ''}>${ic(i)}${l}${c != null ? `<span class="n num">${c}</span>` : ''}</a></li>`).join('')}</ul>`
    + `<div class="side-foot">`
    + (admin() ? `<div class="invite-card"><b>${isFund() ? 'Invite another company' : 'Invite engineers to '+esc(V.org.name)}</b><p>${isFund() ? 'Recipients create their own company in this fund.' : 'Recipients become teammates inside this company. To add another company, use the fund workspace.'}</p>${inv ? `<button type="button" class="b is-full" data-act="copy" data-text="${esc(inviteUrl(inv.code))}">${ic('copy')}Copy ${isFund()?'company':'engineer'} invitation</button>` : `<button type="button" class="b is-full" data-act="mk-inv" data-kind="${isFund() ? 'company' : 'member'}">${ic('link')}Create invite link</button>`}</div>` : '')
    + `<a class="b is-full" href="${VSIX}" download>${ic('download')}VS Code extension</a>`
    + `<button type="button" class="me-btn" data-act="me">${av(ME)}<span><b>${esc(ME.name)}</b><small>${esc(ME.email)}</small></span></button></div>`;
}
const header = (title, sub = '', actions = '', crumb = '') => `${crumb}<div class="ph"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="ph-act">${actions}</div>` : ''}</div>`;
const dl = (rows) => `<dl class="dl">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : '';
const toolIc = () => `<span class="tool-ic">${ic('tool')}</span>`;
const crumb = (to, label) => `<a class="crumb" href="${to}">${ic('back')}${esc(label)}</a>`;
const lede = (html) => `<p class="lede">${html}</p>`, em = (x) => `<b>${x}</b>`;
const plural = (k, one, many = one + 's') => `${n(k)} ${k === 1 ? one : many}`;
const card = (title, body, action = '', sub = '') => `<section class="card"><div class="card-h"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ''}${action}</div>${body}</section>`;
const empty = (title, text = '', action = '') => `<div class="empty"><b>${title}</b>${text.replace(/^<br>/, '')}${action ? `<div style="margin-top:14px">${action}</div>` : ''}</div>`;
const statusPill = (s) => s === 'joined' ? '<span class="pill is-ok">Live</span>' : s === 'invited' ? '<span class="pill is-warn">Setting up</span>' : '<span class="pill">Not in a fund</span>';
const mapPill = (m) => !m ? '<span class="pill">Not started</span>' : m.result?.state === 'verified' ? '<span class="pill is-ok">Mapped</span>' : m.result?.state === 'failed' ? '<span class="pill is-bad">Failing</span>' : '<span class="pill is-warn">In progress</span>';
const reuseList = (evs, limit = 8, byPerson = false) => evs.length ? `<ul class="list">${evs.slice(0, limit).map((e) => `<li>${byPerson ? av({ name: e.by, id: e.by }) : toolIc()}<span class="grow">${byPerson ? `<b>${esc(e.by)}</b><small>${esc(e.to?.name || '')} · ${e.kind === 'adapt' ? 'adapted it to their data' : 'downloaded it'}</small>` : `<b><span class="tool-n">${esc(e.tool)}</span></b><small>${esc(e.by)} at ${esc(e.to?.name || '')} ${e.kind === 'adapt' ? 'adapted it to their data' : 'downloaded it'}</small>`}</span><span class="flow">${fav(e.from, 'is-sm')}${ic('arrow')}${fav(e.to, 'is-sm')}</span><time>${ago(e.at)}</time></li>`).join('')}</ul>` : empty('No reuse yet', 'When someone downloads or adapts a shared tool, it shows up here.');

// ── fund pages ──
const site = (s) => s ? `<a href="https://${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>` : '<span class="pill">None</span>';
const coRow = (c) => `<li data-go="${href(V.org.id, 'portfolio', c.id)}">${fav(c)}<span class="grow"><b>${esc(c.name)}</b><small>${plural(c.memberCount, 'person', 'people')} · ${plural(c.tools, 'tool')}</small></span>${statusPill(c.status)}</li>`;
function workspaceNext() {
  const o=V.org;
  if(isFund()) {
    const own=ORGS.filter(c=>c.kind==='company'&&c.fundId===o.id);
    return `<section class="workspace-next"><div><span class="context-label">FUND WORKSPACE · ${esc(V.myRole)}</span><h2>${own.length?'Your company workspace is one click away.':'Also building tools yourself?'}</h2><p>${own.length?'Manage the portfolio here. Switch to your company to configure your data and use the editor.':'Fund membership manages the network. Add your company to build, share, and receive tools with the same account.'}</p></div><div class="next-actions">${own.map(c=>`<a class="b" href="${href(c.id,'setup')}">${esc(c.name)} ${ic('arrow')}</a>`).join('')}${admin()?`<a class="b ${own.length?'':'is-primary'}" href="/join/?fund=${o.id}">${own.length?'Add another company':'Set up my company'} ${ic('arrow')}</a>`:''}</div></section>`;
  }
  if(V.myRole==='fund')return '';
  const mapped=o.mapping?.result?.state==='verified', brief=!!o.needs?.trim(), ready=mapped&&brief;
  const paused=o.settings?.participating===false || o.settings?.receive==='off';
  const cross=V.fund?.settings?.crossCompany;
  return `<section class="workspace-next ${ready?'is-ready':''}"><div><span class="context-label">COMPANY WORKSPACE · ${esc(V.myRole)} · ${Number(mapped)+Number(brief)} OF 2 SETUP STEPS</span><h2>${!mapped?'First, connect your data.':!brief?'Next, tell the network what you need.':paused?'Your setup is saved. Receiving is paused.':'Company setup complete. Open your editor.'}</h2><p>${!mapped?'Save a verified mapping so shared tools can use your company’s columns.':!brief?'A shared workflow brief gives recommendations evidence of a real need.':'Sign in to Common Ground in VS Code or Cursor with '+esc(ME.email)+'.'}${V.fund&&!cross?' Cross-company sharing is paused by your fund.':''}</p></div><div class="next-actions">${!ready?`<a class="b is-primary" href="${href(o.id,admin()&&!mapped?'data':'setup',admin()&&mapped?'brief':'')}">${admin()?(!mapped?'Map a sample':'Add workflow brief'):'View setup'} ${ic('arrow')}</a>`:`<a class="b is-primary" href="${VSIX}" download>${ic('download')}Get editor extension</a><a class="b" href="${href(o.id,'sharing')}">Sharing settings</a>`}</div></section>`;
}
function setupPage() {
  const o=V.org, fund=isFund(), isLead=admin(), inv=fund?companyInv():memberInv();
  const row=(done,title,description,action)=>`<li class="${done?'is-done':''}"><span class="t"><b>${title.replace(/^\d+\. /,'')}</b><small>${description}</small></span>${action||''}</li>`;
  const link=inv?`<button class="b is-accent" data-act="copy" data-text="${esc(inviteUrl(inv.code))}">${ic('copy')}Copy ${fund?'company':'engineer'} invitation</button>`:`<button class="b is-accent" data-act="mk-inv" data-kind="${fund?'company':'member'}">Create invitation</button>`;
  if(fund){
    const cos=V.companies||[], mapped=cos.filter(c=>c.status==='joined'), receiving=cos.filter(c=>c.settings?.participating!==false), policy=o.settings?.crossCompany;
    return header('Give good work a way to travel.', 'You set up the network. Company admins set up their teams. Engineers stay in the IDE.')
      + `<div class="setup-summary"><span><b>${cos.length}</b> companies registered</span><span><b>${mapped.length}</b> mapped to the standard</span><span><b>${V.stats.reuses}</b> recorded reuses</span></div>`
      + card('Your next steps',`<ol class="steps">${row(true,'1. Network created',esc(o.name)+' · your fund does not acquire blanket download access to company code.')}${row(true,'2. Choose the sharing boundary',policy?'Named cross-company shares are allowed, subject to both companies and the recipient.':'Cross-company sharing is paused. Companies can set up and share within their own teams.',`<a class="b" href="${href(o.id,'standard')}">Review policy</a>`)}${row(cos.length>0,'3. Invite a company admin','Send the link privately. They create their company, map data, and invite engineers.',isLead?link:'Ask a fund admin for an invitation.')}${row(mapped.length>0,'4. See companies become ready',`${mapped.length} of ${cos.length} companies mapped; ${receiving.length} participating. Compatibility is limited to the supported time-series contract.`,`<a class="b" href="${href(o.id,'portfolio')}">View readiness</a>`)}</ol>`)
      + `<div class="setup-principle"><b>The engineer sees one useful introduction.</b><p>After a checked tool is built, the factory suggests eligible people using shared workflow briefs and recorded reuse. Its author decides whether to share. The tool then appears in the recipient's editor.</p><a href="${href(o.id,'tools')}">Inspect shared work →</a></div>`;
  }
  const mapped=o.mapping?.result?.state==='verified';
  const membership=ORGS.find(x=>x.id===o.id)?.membership;
  return header(isLead?'Set your engineers up once.':'Your next stop is the editor.', `${esc(o.name)}${V.fund?' · '+esc(V.fund.name):' · not linked to a fund'}`)
    + `<div class="role-strip"><span><b>${isLead?'Company admin':'Engineer'}</b> · ${esc(ME.name)}</span><span>Receive ${membership?.receiver?'on':'off'}</span><span>Publish ${membership?.publisher?'allowed':'not granted'}</span><span>Export ${membership?.exporter?'role granted':'not granted'}</span><a href="${href(o.id,'team')}">View roles →</a></div>`
    + (isLead?card('Company setup',`<ol class="steps">${row(mapped,'1. Map a sample','Only time/value mappings and check results are saved. Raw CSV data stays in your browser.',`<a class="b" href="${href(o.id,'data')}">${mapped?'Review':'Map'} data</a>`)}${row(!!o.needs,'2. Describe what your team needs','This shared brief is evidence for recommendations. Do not put confidential customer information here.')}</ol><div class="workflow-brief"><label for="workflow-brief">What should another engineer know your team is trying to solve?</label><textarea id="workflow-brief" maxlength="500" rows="3" placeholder="e.g. Find gaps and duplicate timestamps in our inverter telemetry before daily reporting.">${esc(o.needs||'')}</textarea><button class="b is-primary" data-act="save-needs">Save shared workflow brief</button></div><ol class="steps" style="counter-reset:s 2">${row(V.members.length>1,'3. Invite engineers and grant roles','New members can receive. Enable Publisher or Exporter only for the people you authorize.',link)}${row(false,'4. Review receiving and publishing rules','The company and each engineer can narrow access at any time.',`<a class="b" href="${href(o.id,'team')}">Team roles</a><a class="b" href="${href(o.id,'sharing')}">Sharing</a>`)}</ol>`):'')
    + card('Open Common Ground in your editor',`<ol class="steps">${row(false,'1. Install the extension','VS Code or Cursor → Extensions → Install from VSIX.',`<a class="b is-accent" href="${VSIX}" download>${ic('download')}Download extension</a>`)}${row(false,'2. Sign in from Common Ground: Open Start','Use the same account you joined with. Browser sign-in returns you to the editor.')}${row(false,'3. Receive a checked version','Receiving needs no local builder. Building requires Node 26 and the local factory; see the repository setup.',`<a class="b" href="https://github.com/0xANUSHKA/common-ground-8090#run-it" target="_blank" rel="noopener">Builder setup</a>`)}</ol>`);
}

function fundOverview() {
  const s = V.stats, cos = V.companies || [], inv = companyInv(), std = esc(V.org.standard?.name || 'Sensor time-series v1');
  if (!cos.length) return header('Welcome to Common Ground')
    + lede(`Every company in ${esc(V.org.name)}’s portfolio maps its data to ${em(std)} once. After that, a tool built at one company runs at the others.`)
    + card('Set up your portfolio', `<ol class="steps"><li class="is-done"><span class="t"><b>Create your fund</b><small>You hold the shared standard every company maps to.</small></span></li>`
      + `<li><span class="t"><b>Send one link to your portfolio companies</b><small>Each company signs in with Google, names itself and maps its data.</small></span>${inv ? `<button type="button" class="b is-accent" data-act="copy" data-text="${esc(inviteUrl(inv.code))}">${ic('copy')}Copy company link</button>` : `<button type="button" class="b is-accent" data-act="mk-inv" data-kind="company">Create company link</button>`}</li>`
      + `<li><span class="t"><b>Companies invite their engineers</b><small>Engineers install the extension. Tools they finish can go to named people across the portfolio.</small></span><a class="b" href="${VSIX}" download>${ic('download')}Extension</a></li>`
      + `<li><span class="t"><b>Watch reuse add up</b><small>Downloads and adaptations are counted. Hours are author estimates, not measured savings.</small></span></li></ol>`);
  const top = [...(V.portfolioTools || [])].sort((a, b) => (b.uses?.length || 0) - (a.uses?.length || 0)).slice(0, 5);
  return header('Overview', '', admin() ? `<button type="button" class="b" data-act="invite-dlg">${ic('link')}Invite companies</button>` : '')
    + lede(s.reuses ? `${em(plural(s.tools, 'tool'))} shared across the portfolio have been reused ${em(plural(s.reuses, 'time'))}, representing an author-estimated ${em(plural(s.hours, 'engineering hour'))}. ${em(n(s.joined))} of ${n(s.companies)} companies are live on ${std}.`
      : `${em(n(s.joined))} of ${n(s.companies)} companies are live on ${std}, with ${em(plural(s.tools, 'tool'))} shared so far. Reuse shows up here as engineers pick them up.`)
    + `<div class="grid2">${card('Recent reuse', reuseList(V.reuse || []), `<a class="b is-ghost" href="${href(V.org.id, 'tools')}">All tools</a>`)}`
    + `<div class="stack">${card('Most reused', top.length ? `<ul class="list">${top.map((t) => `<li data-go="${href(V.org.id, 'tools', t.id)}">${fav(t.company, 'is-sm')}<span class="grow"><b class="tool-n">${esc(t.name)}</b><small>${esc(t.company.name)}</small></span><span class="meta">${plural(t.uses?.length || 0, 'reuse')}</span></li>`).join('')}</ul>` : empty('No tools yet'))}`
    + card('Companies', `<ul class="list">${cos.slice(0, 6).map(coRow).join('')}</ul>`, `<a class="b is-ghost" href="${href(V.org.id, 'portfolio')}">View all</a>`) + `</div></div>`;
}
function fundPortfolio(sub) {
  if (sub) return fundCompany(sub);
  const cos = V.companies || [], a = admin(), across = Math.max(0, V.stats.people - V.members.length);
  return header('Portfolio', '', a ? `<button type="button" class="b is-primary" data-act="invite-dlg">${ic('plus')}Invite companies</button>` : '')
    + lede(cos.length ? `${em(plural(cos.length, 'company', 'companies'))} in ${esc(V.org.name)}’s portfolio, ${em(n(V.stats.joined))} live on the standard, with ${em(plural(across, 'person', 'people'))} between them.` : 'Companies appear here as they join from your company link.')
    + (cos.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th class="r c-n">People</th><th class="c-s">Data</th><th class="r c-n">Tools</th><th class="r c-n">Reuses</th><th class="c-s">Status</th>${a ? '<th class="c-x"></th>' : ''}</tr></thead><tbody>${cos.map((c) => `<tr data-href="${href(V.org.id, 'portfolio', c.id)}" tabindex="0"><td><div class="who">${fav(c)}<span><b>${esc(c.name)}</b><small>${esc(c.site || '')}</small></span></div></td><td class="r num" data-l="People">${n(c.memberCount)}</td><td data-l="Data">${mapPill(c.mapping)}</td><td class="r num" data-l="Tools">${n(c.tools)}</td><td class="r num" data-l="Reuses">${n(c.reuses)}</td><td data-l="Status">${statusPill(c.status)}</td>${a ? `<td class="r is-act"><button type="button" class="b is-ghost is-danger row-act" data-act="drop-co" data-cid="${c.id}" data-name="${esc(c.name)}">Remove</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`
      : empty('No companies yet', 'Send your company link. Each company appears here as it joins.', `<button type="button" class="b is-accent" data-act="invite-dlg">Invite companies</button>`));
}
function fundCompany(cid) {
  const c = (V.companies || []).find((x) => x.id === cid); if (!c) return crumb(href(V.org.id, 'portfolio'), 'Portfolio') + empty('Company not found', 'It may have left the portfolio.');
  const cv = CACHE[`co:${cid}`];
  const tools = (V.portfolioTools || []).filter((t) => t.company.id === cid);
  return header(`<span class="ph-title">${fav(c, 'is-lg')}${esc(c.name)}</span>`, '', `<a class="b" href="${href(c.id)}">Open workspace${ic('arrow')}</a>`, crumb(href(V.org.id, 'portfolio'), 'Portfolio'))
    + lede(`${em(plural(c.memberCount, 'person', 'people'))} at ${esc(c.name)} ${c.tools ? `have shared ${em(plural(c.tools, 'tool'))}` : 'haven’t shared a tool yet'}${c.reuses ? `, reused ${em(plural(c.reuses, 'time'))} for an estimated ${em(plural(c.hours, 'hour'))} saved` : ''}.`)
    + `<div class="grid2"><div class="stack">${card('Tools', tools.length ? `<ul class="list">${tools.map((t) => `<li data-go="${href(V.org.id, 'tools', t.id)}">${toolIc()}<span class="grow"><b class="tool-n">${esc(t.name)}</b><small>${esc(t.description || '')}</small></span><span class="meta">${plural(t.uses?.length || 0, 'reuse')}</span></li>`).join('')}</ul>` : empty('No tools shared yet', 'Tools appear here when an engineer shares one from the extension.'))}`
    + card('People', cv ? (cv.members.length ? `<ul class="list">${cv.members.map((m) => `<li>${av(m.user)}<span class="grow"><b>${esc(m.user.name)}</b><small>${esc(m.user.email || (m.user.handle ? '@' + m.user.handle : ''))}</small></span><span class="meta">${cap(m.role)}</span></li>`).join('')}</ul>` : empty('Nobody yet')) : `<div class="empty">Loading…</div>`, '', cv ? plural(cv.members.length, 'person', 'people') : '') + `</div>`
    + card('Details', dl([['Status', statusPill(c.status)], ['Website', site(c.site)], ['Data', mapPill(c.mapping)], c.mapping && ['Source', esc(c.mapping.source || 'Not named')], ['Standard', esc(V.org.standard?.name || 'Sensor time-series v1')]])
      + `<p class="note" style="margin:14px 0 0">${c.mapping ? esc(c.mapping.result?.detail || '') : 'The company maps a sample of its data to the standard before it can trade tools with the portfolio.'}</p>`) + `</div>`;
}
function toolsTable(tools, orgId, withCompany = true) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tool</th>${withCompany ? '<th class="c-w">Company</th>' : ''}<th class="c-w">Author</th><th class="r c-n">Reuses</th><th class="r c-t">Hours saved</th><th class="r c-t">Added</th></tr></thead><tbody>${tools.map((t) => `<tr data-href="${href(orgId, 'tools', t.id)}" tabindex="0"><td><div class="who">${toolIc()}<span><b class="tool-n">${esc(t.name)}</b><small>${esc(t.description || '')}</small></span></div></td>${withCompany ? `<td data-l="Company"><div class="who is-sm">${fav(t.company, 'is-sm')}<span>${esc(t.company?.name || '')}</span></div></td>` : ''}<td data-l="Author"><div class="who is-sm">${av(t.author, 'is-xs')}<span>${esc(t.author?.name || '')}</span></div></td><td class="r num" data-l="Reuses">${n(t.uses?.length)}</td><td class="r num" data-l="Hours saved">${n((t.uses?.length || 0) * (t.hours || 0))}</td><td class="r faint" data-l="Added">${ago(t.createdAt)}</td></tr>`).join('')}</tbody></table></div>`;
}
function fundTools(sub) {
  if (sub) return toolPage(sub);
  const tools = [...(V.portfolioTools || [])].sort((a, b) => (b.uses?.length || 0) - (a.uses?.length || 0));
  const by = new Set(tools.map((t) => t.company?.id)).size;
  return header('Tools')
    + lede(tools.length ? `${em(plural(tools.length, 'tool'))} shared by ${em(plural(by, 'company', 'companies'))}, reused ${em(plural(V.stats.reuses || 0, 'time'))}. Each passed all seven checks before it could be shared.` : 'Nothing shared yet. Engineers share tools from the VS Code extension when an agent finishes one.')
    + (tools.length ? toolsTable(tools, V.org.id) : '');
}
function fundPeople() {
  const cos = V.companies || [], across = Math.max(0, V.stats.people - V.members.length);
  return header('People', '', admin() ? `<button type="button" class="b is-primary" data-act="team-dlg">${ic('plus')}Invite fund team</button>` : '')
    + lede(`${em(plural(V.members.length, 'person', 'people'))} on the fund team and ${em(plural(across, 'person', 'people'))} across the portfolio. Each company manages its own team.`)
    + card('Fund team', membersTable(V), '', plural(V.members.length, 'person', 'people'))
    + `<div class="gap"></div>` + card('Across the portfolio', cos.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Person</th><th class="c-w">Company</th><th class="c-t">Role</th></tr></thead><tbody>${cos.flatMap((c) => (CACHE[`co:${c.id}`]?.members || []).map((m) => `<tr><td><div class="who">${av(m.user)}<span><b>${esc(m.user.name)}</b><small>${esc(m.user.email || '')}</small></span></div></td><td data-l="Company"><div class="who is-sm">${fav(c, 'is-sm')}<span>${esc(c.name)}</span></div></td><td class="faint" data-l="Role">${cap(m.role)}</td></tr>`)).join('') || '<tr><td colspan="3" class="faint">Loading…</td></tr>'}</tbody></table></div>` : empty('No companies yet'), '', 'Read only');
}
function fundStandard() {
  const s = V.org.settings || {}, a = admin(), cos = V.companies || [];
  const tog = (k, t, d, dis) => `<div><span class="t"><b>${t}</b><small>${d}</small></span><label class="sw"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''} ${!a || dis ? 'disabled' : ''} aria-label="${esc(t)}"><i></i></label></div>`;
  const num = (k, t, d, lo, hi) => `<div><span class="t"><b>${t}</b><small>${d}</small></span><input class="in is-num num" type="number" min="${lo}" max="${hi}" data-set="${k}" value="${s[k]}" ${a ? '' : 'disabled'} aria-label="${esc(t)}"></div>`;
  const fixed = (t, d, v) => `<div><span class="t"><b>${t}</b><small>${d}</small></span><span class="pill">${v}</span></div>`;
  const mapped = cos.filter((c) => c.mapping?.result?.state === 'verified').length;
  return header(esc(V.org.standard?.name || 'Sensor time-series v1'))
    + lede(`One shape for the data, so a tool built at one company runs at another. ${cos.length ? `${em(n(mapped))} of ${plural(cos.length, 'company', 'companies')} ${mapped === 1 ? 'has' : 'have'} mapped to it.` : ''}`)
    + `<div class="grid2"><div class="stack">${card('What every company maps to', `<div class="card-b"><p style="margin:0 0 18px;color:var(--c-ink);max-width:60ch">A reading is a <code>time</code>, a <code>value</code> and its <code>unit</code>, at a known cadence. Each company maps its own columns once, and time-series tools read that shape. Prepared decision-tool examples use their packaged JSON inputs instead. A tool can only be shared after it passes all seven checks.</p>${checkList()}</div>`, '', '7 checks')}`
    + card('Companies on the standard', cos.length ? `<ul class="list">${cos.map((c) => `<li data-go="${href(V.org.id, 'portfolio', c.id)}">${fav(c)}<span class="grow"><b>${esc(c.name)}</b><small>${esc(c.mapping?.source || 'No source yet')}</small></span>${mapPill(c.mapping)}</li>`).join('')}</ul>` : empty('No companies yet')) + `</div>`
    + card('Sharing policy', `<div class="rows">${tog('enabled', 'Network on', 'Pause to stop all sharing across the portfolio at once.')}${tog('crossCompany', 'Cross-company sharing', 'Named people at one company can receive another company’s tools.', !s.enabled)}${num('maxOpenOffers', 'Open offers per person', 'Most unopened tools anyone sees at once.', 1, 5)}${num('expiryDays', 'Share expiry in days', 'A cross-company share lapses unless renewed.', 1, 90)}${fixed('Named recipients only', 'Tools go to people, never to a whole company outside the author’s own.', 'Always on')}${fixed('Onward resharing', 'Only the author shares a tool.', 'Always off')}</div>`, '', a ? 'Applies to every company' : 'Read only') + `</div>`;
}
const checkList = (names=CHECKS) => `<ul class="checks">${names.map((c) => `<li>${ic('check')}<span>${esc(c)}</span></li>`).join('')}</ul>`;
function inviteCard(kind) {
  const inv = (V.invites || []).find((i) => i.kind === kind && !i.revoked && Date.parse(i.expiresAt) > Date.now());
  const what = kind === 'company' ? 'Portfolio companies' : isFund() ? 'Your fund team' : 'Your team';
  return `<div><span class="t"><b>${what}</b><small>${inv ? `${plural(inv.uses, 'person', 'people')} joined · ${left(inv.expiresAt)}` : 'No active link'}</small></span><span class="acts">${inv ? `<button type="button" class="b" data-act="copy" data-text="${esc(inviteUrl(inv.code))}">${ic('copy')}Copy</button><button type="button" class="b is-ghost" data-act="mk-inv" data-kind="${kind}">New link</button><button type="button" class="b is-ghost is-danger" data-act="kill-inv" data-code="${inv.code}">Turn off</button>` : `<button type="button" class="b" data-act="mk-inv" data-kind="${kind}">${ic('link')}Create link</button>`}</span></div>`;
}
function settingsPage() {
  const o = V.org, a = admin();
  return header('Settings')
    + lede(a ? `How ${esc(o.name)} appears to everyone, and who can join it.` : `Only ${esc(o.name)}’s admins can change these.`)
    + `<div class="stack">${card('Details', `<div class="rows"><div><span class="t"><b>Name</b></span><input class="in" data-field="name" value="${esc(o.name)}" ${a ? '' : 'disabled'} aria-label="Name"></div><div><span class="t"><b>Website</b><small>The icon comes from here.</small></span><input class="in" data-field="site" value="${esc(o.site || '')}" placeholder="example.com" ${a ? '' : 'disabled'} aria-label="Website"></div>${a ? `<div><span class="t"></span><button type="button" class="b is-primary" data-act="save-org">Save changes</button></div>` : ''}</div>`)}`
    + (a ? card('Invite links', `<div class="rows">${inviteCard('member')}${isFund() ? inviteCard('company') : ''}</div>`, '', 'Anyone with a link can join') : '')
    + (V.myRole === 'owner' ? card('Delete', `<div class="rows"><div><span class="t"><b>Delete ${esc(o.name)}</b><small>${isFund() ? 'Companies stay, but leave the fund and stop sharing across the portfolio.' : 'Removes everyone, turns off its links and revokes its shares. Files already downloaded stay with the people who have them.'}</small></span><button type="button" class="b is-danger" data-act="delete-org">Delete ${isFund() ? 'fund' : 'company'}</button></div></div>`) : '')
    + (V.myRole !== 'owner' && V.myRole !== 'fund' ? card('Leave', `<div class="rows"><div><span class="t"><b>Leave ${esc(o.name)}</b><small>You’ll need a new invite link to come back.</small></span><button type="button" class="b is-danger" data-act="leave">Leave</button></div></div>`) : '') + `</div>`;
}

// ── company pages ──
function membersTable(v) {
  const a = ['owner', 'admin'].includes(v.myRole), company = v.org.kind === 'company';
  const flag = (m, k, label, short) => `<td class="c-sw" data-l="${short}"><label class="sw" title="${label}"><input type="checkbox" data-flag="${k}" data-uid="${m.user.id}" ${m[k] ? 'checked' : ''} ${a ? '' : 'disabled'} aria-label="${label} for ${esc(m.user.name)}"><i></i></label></td>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Person</th><th class="c-w">Role</th>${company ? '<th class="c-sw">Shares with team</th><th class="c-sw">Shares across portfolio</th><th class="c-sw">Receives tools</th>' : ''}<th class="c-x"></th></tr></thead><tbody>${v.members.map((m) => {
    const self = m.user.id === ME.id, canEdit = a && (v.myRole === 'owner' || m.role !== 'owner');
    return `<tr><td><div class="who">${av(m.user)}<span><b>${esc(m.user.name)}${self && m.user.name !== 'You' ? ' <span class="you">· you</span>' : ''}</b><small>${esc(m.user.email || (m.user.handle ? '@' + m.user.handle : ''))}</small></span></div></td>`
      + `<td data-l="Role">${canEdit ? `<select class="sel is-sm" data-role="${m.user.id}" aria-label="Role for ${esc(m.user.name)}">${['owner', 'admin', 'member'].map((x) => `<option value="${x}" ${m.role === x ? 'selected' : ''}>${cap(x)}</option>`).join('')}</select>` : `<span class="faint">${cap(m.role)}</span>`}</td>`
      + (company ? flag(m, 'publisher', 'Can share with the team', 'Team') + flag(m, 'exporter', 'Can share with other portfolio companies', 'Portfolio') + flag(m, 'receiver', 'Receives shared tools', 'Receives') : '')
      + `<td class="r is-act">${self ? '' : canEdit ? `<button type="button" class="b is-ghost is-danger row-act" data-act="kick" data-uid="${m.user.id}" data-name="${esc(m.user.name)}">Remove</button>` : ''}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function companyOverview() {
  const s = V.stats, fundView = V.myRole === 'fund';
  return header('Overview', '', !fundView ? `<a class="b is-accent" href="${href(V.org.id,'setup')}">Get started →</a>` : '')
    + lede(`Your engineers have shared ${em(plural(s.tools, 'tool'))}${s.reuses ? `, reused ${em(plural(s.reuses, 'time'))}: an estimated ${em(plural(s.hours, 'hour'))} of potential rebuild effort` : ''}. ${SHARED.length ? `${em(plural(SHARED.length, 'tool'))} from ${V.fund ? `${esc(V.fund.name)}’s portfolio` : 'others'} ${SHARED.length === 1 ? 'is' : 'are'} shared with you.` : 'Nothing is shared with you yet.'}`)
    + `<div class="grid2">${card('Recent reuse', reuseList(V.reuse || []))}<div class="stack">`
    + card('Shared with you', SHARED.length ? `<ul class="list">${SHARED.map((x) => `<li data-go="${href(V.org.id, 'tools', x.tool.id)}">${x.grant.scope === 'portfolio' ? fav(x.from, 'is-sm') : av(x.owner)}<span class="grow"><b class="tool-n">${esc(x.tool.name)}</b><small>${esc(x.owner.name)}${x.from ? ` · ${esc(x.from.name)}` : ''}</small></span><time>${ago(x.grant.at)}</time></li>`).join('')}</ul>` : empty('Nothing yet', 'Tools shared with you appear here and in your editor.'))
    + card('Team', `<ul class="list">${V.members.slice(0, 6).map((x) => `<li>${av(x.user)}<span class="grow"><b>${esc(x.user.name)}</b><small>${esc(x.user.email || '')}</small></span><span class="meta">${cap(x.role)}</span></li>`).join('')}</ul>`, `<a class="b is-ghost" href="${href(V.org.id, 'team')}">${fundView ? 'View all' : 'Manage'}</a>`) + `</div></div>`;
}
function companyTeam() {
  const a = admin(), ms = V.members;
  const cnt = (k) => ms.filter((m) => m[k]).length;
  return header('Team', '', a ? `<button type="button" class="b is-primary" data-act="team-dlg">${ic('plus')}Invite people</button>` : '')
    + lede(`${em(plural(ms.length, 'person', 'people'))} at ${esc(V.org.name)}. ${em(n(cnt('publisher')))} can share tools with the team, ${em(n(cnt('exporter')))} across the portfolio${a ? '. Changes take effect immediately.' : '.'}`)
    + membersTable(V);
}
function companyTools(sub) {
  if (sub) return toolPage(sub);
  const ours = V.tools.map((t) => ({ ...t, author: V.members.find((m) => m.user.id === t.owner)?.user }));
  return header('Tools', '', V.myRole !== 'fund' ? `<button type="button" class="b" data-act="add-tool">${ic('plus')}Add a tool</button>` : '')
    + lede(`${em(plural(ours.length, 'tool'))} built at ${esc(V.org.name)}${V.myRole === 'fund' ? '.' : `, and ${em(n(SHARED.length))} shared with you from the portfolio.`}`)
    + card(`Built at ${esc(V.org.name)}`, ours.length ? toolsTable(ours, V.org.id, false) : empty('No tools yet', 'Engineers share tools from the VS Code extension when an agent finishes one.', `<a class="b" href="${VSIX}" download>${ic('download')}Get the extension</a>`), '', `${n(ours.length)}`)
    + (V.myRole === 'fund' ? '' : `<div class="gap"></div>` + card('Shared with you', SHARED.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tool</th><th class="c-w">From</th><th class="c-t">Scope</th><th class="r c-t">Shared</th></tr></thead><tbody>${SHARED.map((x) => `<tr data-href="${href(V.org.id, 'tools', x.tool.id)}" tabindex="0"><td><div class="who">${toolIc()}<span><b class="tool-n">${esc(x.tool.name)}</b><small>${esc(x.tool.description || '')}</small></span></div></td><td data-l="From"><div class="who is-sm">${x.grant.scope === 'portfolio' ? fav(x.from, 'is-sm') : av(x.owner)}<span>${esc(x.owner.name)}${x.from ? ` · ${esc(x.from.name)}` : ''}</span></div></td><td data-l="Scope"><span class="pill ${x.grant.scope === 'portfolio' ? 'is-blue' : ''}">${x.grant.scope === 'portfolio' ? 'Portfolio' : 'Team'}</span></td><td class="r faint" data-l="Shared">${ago(x.grant.at)}</td></tr>`).join('')}</tbody></table></div>` : empty('Nothing shared with you yet', 'When someone names you on a tool, it appears here and in your editor.'), '', `${n(SHARED.length)}`));
}
function toolPage(id) {
  const t = (V.portfolioTools || V.tools || []).find((x) => x.id === id) || SHARED.find((x) => x.tool.id === id)?.tool;
  if (!t) return crumb(href(V.org.id, 'tools'), 'Tools') + empty('This tool isn’t available', 'It may have been removed, or its share revoked.');
  const shared = SHARED.find((x) => x.tool.id === id), author = t.author || V.members.find((m) => m.user.id === t.owner)?.user || shared?.owner;
  const company = t.company || (t.orgId === V.org.id ? V.org : shared?.from);
  const mine = t.owner === ME.id, manage = mine || (t.orgId === V.org.id && admin());
  const grants = (V.grants || []).filter((g) => g.toolId === t.id);
  const people = Object.fromEntries([...V.members.map((m) => [m.user.id, m.user]), ...(V.peerPeople || []).map((p) => [p.user.id, p.user])]);
  const peer = (cid) => (V.peers || []).find((p) => p.id === cid);
  const evs = (V.reuse || []).filter((e) => e.toolId === t.id);
  const uses = t.uses?.length || 0;
  return crumb(href(V.org.id, 'tools'), 'Tools')
    + header(esc(t.name), '', `${manage ? `<button type="button" class="b is-ghost is-danger" data-act="rm-tool" data-id="${t.id}" data-name="${esc(t.name)}">Remove</button>` : ''}${mine ? `<button type="button" class="b is-primary" data-act="share" data-id="${t.id}">Share</button>` : ''}`)
    + (t.description ? `<p class="ph-desc">${esc(t.description)}</p>` : '')
    + lede(uses ? `Reused ${em(plural(uses, 'time'))} at ${em(plural(new Set(t.uses.map((u) => u.companyId)).size, 'company', 'companies'))}, about ${em(plural(uses * (t.hours || 0), 'hour'))} not spent rebuilding it.` : 'Not reused yet. Reuse shows up here as people download or adapt it.')
    + `<div class="grid2"><div class="stack">${mine && t.checks === 7 && V.org.kind === 'company' ? card('Who should get it next', suggestList(t), '', 'Suggested by the factory') : ''}${card('Who reused it', reuseList(evs, 20, true), '', uses ? plural(uses, 'reuse') : '')}`
    + (grants.length || manage ? card('Shared with', grants.length ? `<ul class="list">${grants.map((g) => { const p = g.target.type === 'user' ? people[g.target.userId] : null, o = g.target.type === 'org' ? (g.target.orgId === V.org.id ? V.org : null) : peer(g.target.companyId);
      return `<li>${p ? av(p) : fav(o, 'is-sm')}<span class="grow"><b>${p ? esc(p.name) : `Everyone at ${esc(o?.name || 'the company')}`}</b><small>${g.scope === 'portfolio' ? `Portfolio · ${esc(o?.name || '')}` : 'Team'}${live(g) ? ` · ${left(g.expiresAt)}` : ''}</small></span>${g.revoked ? '<span class="pill is-bad">Revoked</span>' : live(g) ? (manage || g.issuer === ME.id ? `<button type="button" class="b is-ghost" data-act="revoke" data-id="${g.id}">Revoke</button>` : '') : '<span class="pill">Expired</span>'}</li>`; }).join('')}</ul>` : empty('Not shared yet', mine ? 'Share it with your team, or with named people at other portfolio companies.' : ''), '', grants.length ? 'Revoking stops future access' : '') : '')
    + `</div><div class="stack">${card('Details', dl([author && ['Author', `${av(author)}${esc(author.name)}`], company && ['Company', `${fav(company, 'is-sm')}${esc(company.name)}`], ['Added', ago(t.createdAt)], ['Built by', t.provenance === 'agent-generated' || t.provenance === 'eve-generated' ? 'Coding agent, from a brief' : t.provenance === 'reference-template' ? 'Reference build' : t.checks === 7 ? 'The factory' : 'Registered by hand'], ...(t.requirementId ? [['Requirement', `8090 · ${esc(String(t.requirementId).slice(0, 12))}`]] : []), ['Time to build', t.example?'Not measured — prepared example':plural(t.hours || 0, 'hour')], ['Version', t.hash ? esc(String(t.hash).slice(0, 7)) : 'Not sealed']]))}`
    + (t.checks === 7 ? card('Checks', `<div class="card-b">${checkList(t.checkResults?.map(c=>c.name)||CHECKS)}<p class="note" style="margin:14px 0 0">Version ${esc(String(t.hash || '').slice(0, 7))} is the exact code that passed. Any change runs the checks again.</p></div>`, '', '7 of 7 passed') : card('Checks', `<div class="card-b"><p class="note" style="margin:0">Not through the factory yet. Publish it from the editor to run the seven checks; until then it can’t be shared.</p></div>`, '', 'Not checked')) + `</div></div>`;
}
const oNeedsText=()=>V.org.needs?'Your next stop is the editor.':'Next, add your team’s workflow brief.';
let MAP = null;
function companyData() {
  const m = V.org.mapping, a = admin() && V.myRole !== 'fund', d = MAP?.id === V.org.id ? MAP : null, b = d?.b, res = d?.res;
  const ok = res && res.ok && !res.missing && !res.duplicates && !res.offGrid;
  const opt = (sel) => (b?.columns || []).map((c) => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  const std = esc(V.fund?.standard?.name || 'Sensor time-series v1');
  return header('Data', '', mapPill(m))
    + (a && m?.result?.state==='verified' ? `<div class="banner">${ic('check')}<span>Mapping saved for ${esc(V.org.name)}. ${oNeedsText()}</span><a class="b" href="${href(V.org.id,'setup')}">Continue setup ${ic('arrow')}</a></div>` : '')
    + lede(m ? `${esc(m.source || 'Your source')} is mapped to ${em(std)}: <code>${esc(m.binding?.timeColumn || '')}</code> is the time and <code>${esc(m.binding?.signalColumn || '')}</code> the value. ${esc(m.result?.detail || '')}` : `Map ${esc(V.org.name)}’s readings to ${em(std)} so portfolio tools run on them. It takes one sample file.`)
    + (a ? card('Check a sample', `<div class="rows"><div><span class="t"><b>Source system</b><small>Where these readings come from.</small></span><input class="in" data-map="source" value="${esc(d?.source ?? m?.source ?? '')}" placeholder="e.g. SolarEdge export" aria-label="Source system"></div>`
      + `<div><span class="t"><b>Sample CSV</b><small>Checked in your browser. Nothing is uploaded.</small></span><span class="acts"><button type="button" class="b" data-act="sample" data-s="ocean">Ocean sample</button><button type="button" class="b" data-act="sample" data-s="solar">Solar sample</button><label class="b" style="position:relative">${ic('upload')}Upload CSV<input type="file" accept=".csv,text/csv" data-upload style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="Upload CSV"></label></span></div>`
      + (b ? `<div><span class="t"><b>Time column</b></span><select class="sel" style="width:200px" data-b="timeColumn" aria-label="Time column">${opt(b.timeColumn)}</select><select class="sel" style="width:180px" data-b="timeBasis" aria-label="Time basis"><option value="utc" ${b.timeBasis === 'utc' ? 'selected' : ''}>UTC</option><option value="local-unspecified" ${b.timeBasis !== 'utc' ? 'selected' : ''}>Local, no timezone</option></select></div>`
        + `<div><span class="t"><b>Value column</b></span><select class="sel" style="width:200px" data-b="valueColumn" aria-label="Value column">${opt(b.valueColumn)}</select></div>`
        + `<div><span class="t"><b>Cadence</b><small>Seconds between readings.</small></span><input class="in is-num" type="number" min="1" data-b="cadenceSeconds" value="${b.cadenceSeconds}" aria-label="Cadence in seconds"></div>`
        + `<div><span class="t"><b>Units row</b><small>The second row holds units, not readings.</small></span><label class="sw"><input type="checkbox" data-b="unitsRow" ${b.unitsRow ? 'checked' : ''} aria-label="Units row"><i></i></label></div>`
        + `<div><span class="t">${res?.error ? `<b style="color:var(--c-bad)">${esc(res.error)}</b>` : `<b style="color:${ok ? 'var(--c-ok)' : 'var(--c-bad)'}">${ok ? 'Passes' : 'Doesn’t pass yet'}</b><small>${n(res.unique)} readings · ${n(res.missing)} missing timestamps · ${n(res.duplicates)} duplicates · ${n(res.missingValues)} missing values</small>`}</span><button type="button" class="b is-primary" data-act="save-map">Save mapping</button></div>` : '') + `</div>`, '', d?.file ? esc(d.file) : '')
      : card('Mapping', `<div class="empty" style="padding-top:18px">${m ? 'Only the company’s admins can change the mapping.' : 'Not mapped yet.'}</div>`));
}
function companySharing() {
  const s = V.org.settings || {}, a = admin(), fs = V.fund?.settings, cross = !fs || (fs.enabled && fs.crossCompany);
  const rad = (v, t, d, dis) => `<div><span class="t"><b>${t}</b><small>${d}</small></span><input type="radio" name="receive" value="${v}" ${s.receive === v ? 'checked' : ''} ${!a || dis ? 'disabled' : ''} aria-label="${esc(t)}" style="width:16px;height:16px;margin:0;accent-color:var(--c-fg)"></div>`;
  return header('Sharing')
    + lede(V.fund ? `${esc(V.fund.name)} sets the outer limits. Within them, you choose what ${esc(V.org.name)} takes part in.` : 'Join a fund to share across a portfolio.')
    + `<div class="stack">${card('Take part', `<div class="rows"><div><span class="t"><b>Share and receive tools</b><small>Off pauses everything in and out. People and mappings stay.</small></span><label class="sw"><input type="checkbox" data-set="participating" ${s.participating !== false ? 'checked' : ''} ${a ? '' : 'disabled'} aria-label="Take part"><i></i></label></div></div>`)}`
    + card('Receive tools from', `<div class="rows">${rad('off', 'Nobody', 'No tools come in.')}${rad('company', 'Your company only', 'Tools from your own engineers.')}${rad('portfolio', 'Your company and the portfolio', cross ? 'Plus tools named for your people by other portfolio companies.' : 'Your fund has cross-company sharing off right now.', !cross)}</div>`)
    + ((V.peers || []).length ? card('Portfolio companies', `<div class="rows">${V.peers.map((p) => `<div><span class="t" style="display:flex;align-items:center;gap:12px">${fav(p, 'is-sm')}<b>${esc(p.name)}</b></span><label class="sw"><input type="checkbox" data-peer="${p.id}" ${!s.peers || s.peers.includes(p.id) ? 'checked' : ''} ${a ? '' : 'disabled'} aria-label="Receive from ${esc(p.name)}"><i></i></label></div>`).join('')}</div>`, '', 'Who your people can receive from') : '') + `</div>`;
}

// ── render ──
const PAGES = { fund: { setup: setupPage, overview: fundOverview, portfolio: fundPortfolio, tools: fundTools, people: fundPeople, standard: fundStandard, settings: settingsPage }, company: { setup: setupPage, overview: companyOverview, team: companyTeam, tools: companyTools, data: companyData, sharing: companySharing, settings: settingsPage } };
function render() {
  const r = R(), fn = PAGES[V.org.kind][r.page] || PAGES[V.org.kind].overview;
  $('#side').innerHTML = side();
  const fundBanner = V.myRole === 'fund' ? `<div class="banner">${ic('building')}<span>You’re viewing ${esc(V.org.name)} as its fund. Only its own admins can change it.</span><a class="b" href="${href(V.fund?.id || ORGS.find((o) => o.kind === 'fund')?.id, 'portfolio')}">Back to portfolio</a></div>` : '';
  const demo = V.org.demo ? `<div class="banner">${ic('data')}<span>Illustrative network: company names are public references; people, needs, tools and reuse are seeded examples, not customer activity.</span><a class="b" href="/join/">Set up your real fund${ic('arrow')}</a></div>` : '';
  $('#page').innerHTML = demo + fundBanner + (['setup','overview'].includes(r.page)?workspaceNext():'') + fn(r.sub);
  if(r.page==='setup'&&r.sub==='brief')$('#workflow-brief')?.focus();
  $('#top-title').textContent = V.org.name;
  document.title = `${({ setup: 'Get started', overview: 'Overview', portfolio: 'Portfolio', tools: 'Tools', people: 'People', standard: 'Standard', settings: 'Settings', team: 'Team', data: 'Data', sharing: 'Sharing' })[r.page] || 'Overview'} · ${V.org.name} · Common Ground`;
  document.body.classList.remove('is-loading');
  lazy(r);
}
// the factory's last step: who else should get this tool, read from the portfolio's ontology (POST /api/suggest)
function suggestList(t) {
  const s = CACHE[`sug:${t.id}`];
  if (!s) return `<p class="note" style="padding:12px 0">Reading the portfolio’s ontology…</p>`;
  if (!s.suggestions.length) return `<p class="note" style="padding:12px 0">${esc(s.note || 'No eligible person has enough evidence of need yet.')}</p>`;
  return `<ul class="list">${s.suggestions.map((x, i) => `<li>${x.user ? av(x.user) : fav(x.company, 'is-sm')}<span class="grow"><b>${esc(x.user?.name || x.label)}${x.portfolio ? `<span style="color:var(--c-faint);font-weight:400"> · ${esc(x.company.name)}</span>` : ''}</b><small style="white-space:normal">${x.reasons.map(esc).join(' ')}</small></span><button type="button" class="b" data-act="share-to" data-i="${i}" data-tool="${t.id}">Share</button></li>`).join('')}</ul>${s.note ? `<p class="note" style="margin-top:10px">${esc(s.note)}</p>` : ''}`;
}
async function lazy(r) { // company detail pages for a fund: load each company's people
  if (V.org.kind === 'company' && r.page === 'tools' && r.sub) {
    const t = V.tools.find((x) => x.id === r.sub);
    if (t && t.owner === ME.id && t.checks === 7 && !CACHE[`sug:${t.id}`]) {
      CACHE[`sug:${t.id}`] = await api('suggest', { method: 'POST', body: { orgId: V.org.id, toolId: t.id } }).catch(() => ({ suggestions: [], note: 'Couldn’t read suggestions.' }));
      if (R().sub === r.sub) render();
    }
    return;
  }
  if (!isFund() || !['people', 'portfolio'].includes(r.page)) return;
  const ids = r.page === 'people' ? (V.companies || []).map((c) => c.id) : r.sub ? [r.sub] : [];
  const need = ids.filter((id) => !CACHE[`co:${id}`]); if (!need.length) return;
  await Promise.all(need.map(async (id) => { CACHE[`co:${id}`] = await api(`orgs/${id}`).catch(() => ({ members: [] })); }));
  if (R().page === r.page) render();
}
async function go() { const ok = await load(R().orgId).catch((e) => { if (e.status === 401) location.replace(`/signin/?next=${encodeURIComponent('/dashboard/' + location.hash)}`); else fatal(e); return false; }); if (ok) render(); }
async function refresh(msg) { try { const keep = R(); await load(keep.orgId); render(); if (msg) toast(msg); } catch (e) { toast(e.message); } }
const fatal = (e) => { document.body.classList.remove('is-loading'); $('#page').innerHTML = empty('Something went wrong', `<br>${esc(e.message)}`, '<a class="b" href="/dashboard/">Reload</a>'); };

// ── toasts, menus, dialogs ──
function toast(msg) { const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg; $('#toasts').append(el); setTimeout(() => el.remove(), 3200); }
async function copy(text, what = 'Invite link copied') { try { await navigator.clipboard.writeText(text); toast(what); } catch { dialog('Copy this link', `<input class="in" readonly value="${esc(text)}" onfocus="this.select()">`, [{ label: 'Done' }]); } }
let menuEl = null;
function menu(anchor, items) {
  closeMenu(); const rc = anchor.getBoundingClientRect();
  menuEl = document.createElement('div'); menuEl.className = 'menu'; menuEl.setAttribute('role', 'menu');
  menuEl.innerHTML = items.map((x, i) => x === '-' ? '<hr>' : x.href ? `<a role="menuitem" href="${x.href}">${x.icon || ''}<span>${esc(x.label)}</span>${x.small ? `<small>${esc(x.small)}</small>` : ''}</a>` : `<button type="button" role="menuitem" data-i="${i}">${x.icon || ''}<span>${esc(x.label)}</span>${x.small ? `<small>${esc(x.small)}</small>` : ''}</button>`).join('');
  document.body.append(menuEl);
  const up = rc.top > innerHeight / 2; menuEl.style.left = `${Math.max(8, rc.left)}px`; menuEl.style.width = `${Math.max(240, rc.width)}px`;
  if (up) menuEl.style.bottom = `${innerHeight - rc.top + 6}px`; else menuEl.style.top = `${rc.bottom + 6}px`;
  menuEl.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { const it = items[+b.dataset.i]; closeMenu(); it.run(); } if (e.target.closest('a')) closeMenu(); });
  anchor.setAttribute('aria-expanded', 'true'); menuEl._anchor = anchor; menuEl.querySelector('a,button')?.focus();
}
function closeMenu() { if (menuEl) { menuEl._anchor?.setAttribute('aria-expanded', 'false'); menuEl.remove(); menuEl = null; } }
addEventListener('mousedown', (e) => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest('[aria-haspopup]')) closeMenu(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
// dialog(title, bodyHtml, buttons[{label, primary, danger, run(dlg) → false keeps it open}], sub)
function dialog(title, body, buttons, sub = '') {
  const d = document.createElement('dialog'); d.className = 'dlg';
  d.innerHTML = `<form method="dialog"><div class="dlg-h"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="dlg-b">${body}<p class="err" data-err></p></div><div class="dlg-f">${buttons.map((b, i) => `<button type="${b.primary ? 'submit' : 'button'}" class="b ${b.primary ? (b.danger ? 'is-danger is-solid' : 'is-primary') : ''}" data-bi="${i}">${esc(b.label)}</button>`).join('')}</div></form>`;
  document.body.append(d);
  const run = async (b) => { if (!b.run) return d.close(); const btns = d.querySelectorAll('.dlg-f .b'); btns.forEach((x) => (x.disabled = true)); try { const r = await b.run(d); if (r !== false) d.close(); } catch (e) { d.querySelector('[data-err]').textContent = e.message; } btns.forEach((x) => (x.disabled = false)); };
  d.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); run(buttons.find((b) => b.primary) || {}); });
  d.querySelectorAll('[data-bi]').forEach((el) => el.type === 'button' && el.addEventListener('click', () => run(buttons[+el.dataset.bi])));
  d.addEventListener('close', () => d.remove());
  d.showModal(); d.querySelector('input,select,textarea')?.focus();
  return d;
}
const confirmDo = (title, sub, label, fn, ok) => dialog(title, '', [{ label: 'Cancel' }, { label, primary: true, danger: true, run: async () => { await fn(); await refresh(ok); } }], sub);
const doing = async (fn, msg) => { try { await fn(); await refresh(msg); } catch (e) { toast(e.message); } };
async function ensureInv(kind) { const have = kind === 'company' ? companyInv() : memberInv(); if (have) return have; const { invite } = await api(`orgs/${V.org.id}/invites`, { method: 'POST', body: { kind } }); await refresh(); return invite; }
async function inviteDialog(kind) {
  const inv = await ensureInv(kind).catch((e) => toast(e.message)); if (!inv) return;
  const url = inviteUrl(inv.code), company = kind === 'company';
  dialog(company ? 'Invite your portfolio companies' : isFund() ? 'Invite your fund team' : `Invite engineers to ${esc(V.org.name)}`,
    `<div class="link-row"><input class="in" readonly value="${esc(url)}" onfocus="this.select()" aria-label="Invite link"><button type="button" class="b is-primary" data-copy>${ic('copy')}Copy</button></div>`
    + `<p class="note" style="margin:16px 0 0">${company ? 'Send this one link to every founder or engineering lead. Each signs in with Google, names their company and lands in its own workspace with a link for their team.' : `This link adds people to ${esc(V.org.name)}. It does not create a separate company. For another portfolio company, send the fund’s company invitation instead.`}</p>`,
    [{ label: 'Done' }], `${plural(inv.uses, 'person', 'people')} joined so far · ${left(inv.expiresAt)}`)
    .querySelector('[data-copy]').addEventListener('click', () => copy(url));
}
function shareDialog(t) {
  const opts = [];
  if (V.org.kind === 'company' && t.orgId === V.org.id) {
    opts.push({ label: `Everyone at ${V.org.name}`, small: 'Your team', icon: fav(V.org, 'is-sm'), body: { orgId: V.org.id } });
    V.members.filter((m) => m.user.id !== ME.id && m.receiver).forEach((m) => opts.push({ label: m.user.name, small: 'Teammate', icon: av(m.user), body: { userId: m.user.id } }));
    (V.peerPeople || []).forEach((p) => { const c = (V.peers || []).find((x) => x.id === p.companyId); opts.push({ label: p.user.name, small: c?.name || 'Portfolio', icon: av(p.user), body: { userId: p.user.id, companyId: p.companyId }, portfolio: true }); });
  }
  if (!opts.length) return toast('Nobody to share with yet. Invite your team first.');
  let pick = 0;
  const d = dialog(`Share ${esc(t.name)}`, `<div class="picks">${opts.map((o, i) => `<button type="button" class="choice" data-pick="${i}" aria-pressed="${i === 0}">${o.icon}<span><b>${esc(o.label)}</b><small>${esc(o.small)}${o.portfolio ? ' · across the portfolio' : ''}</small></span>${ic('check', 'i tick')}</button>`).join('')}</div><p class="note" style="margin:14px 0 0">Only this checked version is shared. Cross-company shares go to named people and lapse after ${V.fund?.settings?.expiryDays || 7} days.</p>`,
    [{ label: 'Cancel' }, { label: 'Share', primary: true, run: async () => { await api(`tools/${t.id}/grants`, { method: 'POST', body: opts[pick].body }); await refresh(`Shared with ${opts[pick].label}`); } }]);
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; pick = +b.dataset.pick; d.querySelectorAll('[data-pick]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
}
function profileDialog() {
  dialog('Your profile', `<label class="lbl"><span>Name</span><input class="in" name="name" value="${esc(ME.name)}"></label><label class="lbl"><span>GitHub username <small>· shown to your team</small></span><input class="in" name="handle" value="${esc(ME.handle || '')}" placeholder="octocat" autocapitalize="off" spellcheck="false"></label>`,
    [{ label: 'Cancel' }, { label: 'Save', primary: true, run: async (d) => { const f = d.querySelector('form').elements; const h = f.namedItem('handle').value.trim().replace(/^@/, ''); if (h && !HANDLE.test(h)) throw new Error('That isn’t a GitHub username.'); await api('me', { method: 'PATCH', body: { name: f.namedItem('name').value, handle: h } }); await refresh('Profile saved'); } }], esc(ME.email));
}
function addToolDialog() {
  dialog('Add a tool', `<label class="lbl"><span>Name</span><input class="in" name="tname" required placeholder="telemetry-inspector"></label><label class="lbl"><span>What it does</span><textarea class="in" name="desc" maxlength="280" placeholder="One sentence a teammate would understand."></textarea></label><label class="lbl"><span>Hours it took to build <small>· used to estimate time saved</small></span><input class="in num" name="hours" type="number" min="1" max="400" value="8" style="width:100px"></label><p class="note" style="margin:0">Usually engineers share straight from the VS Code extension when an agent finishes. Use this to register a tool by hand.</p>`,
    [{ label: 'Cancel' }, { label: 'Add tool', primary: true, run: async (d) => { const f = d.querySelector('form'); if (!f.tname.value.trim()) throw new Error('Name the tool.'); const { tool } = await api('tools', { method: 'POST', body: { name: f.tname.value, description: f.desc.value, hours: f.hours.value, orgId: V.org.id } }); await refresh('Tool added'); location.hash = href(V.org.id, 'tools', tool.id); } }]);
}

// ── events ──
document.addEventListener('click', async (e) => {
  const go = e.target.closest('[data-go]'); if (go) { location.hash = go.dataset.go; return; }
  const row = e.target.closest('tr[data-href]'); if (row && !e.target.closest('button,select,input,label,a')) { location.hash = row.dataset.href; return; }
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act;
  if (a === 'orgs') return menu(t, [...ORGS.map((o) => ({ label: o.name, small: (o.kind === 'fund' ? 'Fund network' : 'Company') + ' · ' + o.role, icon: fav(o, 'is-sm'), href: href(o.id) })), '-', { label: 'Add or switch workspace', icon: ic('plus'), href: '/join/' }]);
  if (a === 'me') return menu(t, [{ label: 'Profile', icon: ic('people'), run: profileDialog }, { label: 'Get the VS Code extension', icon: ic('download'), href: VSIX }, '-', { label: 'Sign out', run: async () => { await api('auth/signout', { method: 'POST' }).catch(() => {}); location.href = '/'; } }]);
  if (a === 'copy') return copy(t.dataset.text);
  if (a === 'mk-inv') return doing(() => api(`orgs/${V.org.id}/invites`, { method: 'POST', body: { kind: t.dataset.kind } }), 'Invite link ready');
  if (a === 'kill-inv') return confirmDo('Turn off this invite link?', 'People who already joined stay. Anyone who opens the old link is told it’s inactive.', 'Turn off', () => api(`invites/${t.dataset.code}`, { method: 'DELETE' }), 'Invite link turned off');
  if (a === 'invite-dlg') return inviteDialog('company');
  if (a === 'team-dlg') return inviteDialog('member');
  if (a === 'kick') return confirmDo(`Remove ${esc(t.dataset.name)}?`, 'Their access to shared tools stops now. Files they already downloaded stay with them.', 'Remove', () => api(`orgs/${V.org.id}/members/${t.dataset.uid}`, { method: 'DELETE' }), `${t.dataset.name} removed`);
  if (a === 'leave') return confirmDo(`Leave ${esc(V.org.name)}?`, 'You’ll need a new invite link to come back.', 'Leave', async () => { await api(`orgs/${V.org.id}/members/${ME.id}`, { method: 'DELETE' }); history.replaceState(null, '', '/dashboard/'); }, 'You left');
  if (a === 'delete-org') return confirmDo(`Delete ${esc(V.org.name)}?`, 'This can’t be undone.', 'Delete', async () => { await api(`orgs/${V.org.id}`, { method: 'DELETE' }); history.replaceState(null, '', '/dashboard/'); }, 'Deleted');
  if (a === 'drop-co') return confirmDo(`Remove ${esc(t.dataset.name)} from the portfolio?`, 'Cross-company shares to and from it stop now. The company keeps its own workspace and team.', 'Remove', () => api(`orgs/${V.org.id}/companies/${t.dataset.cid}`, { method: 'DELETE' }), `${t.dataset.name} removed`);
  if (a === 'save-needs') return doing(async () => { await api(`orgs/${V.org.id}`, { method: 'PATCH', body: { needs: $('#workflow-brief').value } }); CACHE = {}; }, 'Workflow brief saved');
  if (a === 'save-org') { const v = (k) => $(`[data-field="${k}"]`).value; return doing(() => api(`orgs/${V.org.id}`, { method: 'PATCH', body: { name: v('name'), site: v('site') } }), 'Saved'); }
  if (a === 'rm-tool') return confirmDo(`Remove ${esc(t.dataset.name)}?`, 'Every share of it stops. Files people already downloaded stay with them.', 'Remove tool', async () => { await api(`tools/${t.dataset.id}`, { method: 'DELETE' }); history.replaceState(null, '', href(V.org.id, 'tools')); }, 'Tool removed');
  if (a === 'share-to') { const s = CACHE[`sug:${t.dataset.tool}`], x = s?.suggestions[+t.dataset.i]; if (!x) return; delete CACHE[`sug:${t.dataset.tool}`]; return doing(() => api(`tools/${t.dataset.tool}/grants`, { method: 'POST', body: x.target }), `Shared with ${x.user?.name || x.label}. They get it bound to their own company’s mapping.`); }
  if (a === 'revoke') return doing(() => api(`grants/${t.dataset.id}`, { method: 'DELETE' }), 'Revoked. They can’t open it again.');
  if (a === 'share') return shareDialog(V.tools.find((x) => x.id === t.dataset.id));
  if (a === 'add-tool') return addToolDialog();
  if (a === 'sample') { try { const r = await fetch(t.dataset.s === 'ocean' ? '/samples/saildrone_1045_2021-09-30.csv' : '/samples/pvdaq_system10_sample.csv'); loadCsv(await r.text(), t.dataset.s === 'ocean' ? 'Ocean sample' : 'Solar sample'); } catch { toast('Couldn’t load the sample'); } return; }
  if (a === 'save-map') { const d = MAP, res = d.res, ok = res && res.ok && !res.missing && !res.duplicates && !res.offGrid;
    return doing(() => api(`orgs/${V.org.id}`, { method: 'PATCH', body: { mapping: { source: $('[data-map="source"]').value || d.file, binding: { timeColumn: d.b.timeColumn, signalColumn: d.b.valueColumn, unit: d.b.unit, skipUnitsRow: d.b.unitsRow, timeBasis: d.b.timeBasis, cadenceSeconds: d.b.cadenceSeconds }, columns: d.b.columns, result: { state: ok ? 'verified' : 'failed', detail: res.error || `${n(res.unique)} readings · ${n(res.missing)} missing timestamps · ${n(res.missingValues)} missing values` } } } }), ok ? 'Mapping verified' : 'Saved, but it doesn’t pass yet'); }
});
document.addEventListener('keydown', (e) => { const row = e.target.closest?.('tr[data-href]'); if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = row.dataset.href; } });
function loadCsv(text, file) { try { const b = sniff(text); MAP = { id: V.org.id, text, file, b, res: inspect(text, b), source: $('[data-map="source"]')?.value }; } catch (e) { MAP = { id: V.org.id, file, res: { error: e.message } }; } render(); }
document.addEventListener('change', async (e) => {
  const t = e.target, id = V.org.id;
  if (t.matches('[data-upload]')) { const f = t.files[0]; if (!f) return; if (f.size > 5e6) return toast('Under 5 MB, please'); return loadCsv(await f.text(), f.name); }
  if (t.dataset.b) { MAP.b[t.dataset.b] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Math.max(1, Math.round(+t.value) || 1) : t.value; MAP.res = inspect(MAP.text, MAP.b); return render(); }
  if (t.dataset.role) return doing(() => api(`orgs/${id}/members/${t.dataset.role}`, { method: 'PATCH', body: { role: t.value } }), 'Role changed');
  if (t.dataset.flag) return doing(() => api(`orgs/${id}/members/${t.dataset.uid}`, { method: 'PATCH', body: { [t.dataset.flag]: t.checked, ...(t.dataset.flag === 'exporter' && t.checked ? { publisher: true } : {}), ...(t.dataset.flag === 'publisher' && !t.checked ? { exporter: false } : {}) } }), 'Saved');
  if (t.dataset.set) return doing(() => api(`orgs/${id}`, { method: 'PATCH', body: { settings: { [t.dataset.set]: t.type === 'checkbox' ? t.checked : +t.value } } }), 'Saved');
  if (t.name === 'receive') return doing(() => api(`orgs/${id}`, { method: 'PATCH', body: { settings: { receive: t.value } } }), 'Saved');
  if (t.dataset.peer) { const all = (V.peers || []).map((p) => p.id), cur = V.org.settings?.peers || all; const next = t.checked ? [...new Set([...cur, t.dataset.peer])] : cur.filter((x) => x !== t.dataset.peer); return doing(() => api(`orgs/${id}`, { method: 'PATCH', body: { settings: { peers: next.length === all.length ? null : next } } }), 'Saved'); }
});
$('#nav-open').addEventListener('click', () => $('.app').classList.toggle('is-nav'));
addEventListener('hashchange', () => { $('.app').classList.remove('is-nav'); closeMenu(); document.querySelectorAll('dialog[open]').forEach((d) => d.close()); const r = R(); if (r.orgId && r.orgId !== V?.org.id) go(); else { render(); scrollTo(0, 0); } });
go();
