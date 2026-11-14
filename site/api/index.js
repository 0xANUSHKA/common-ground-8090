// Common Ground API: one Vercel function, routed by path (vercel.json rewrites /api/* here).
// Orgs are funds and their portfolio companies. Every read re-checks permissions, so kicking someone,
// removing a company or revoking a tool takes effect immediately; files already downloaded stay with their owners.
import { randomBytes } from 'node:crypto';
import { cmd, pipeline, getJSON, setJSON, getMany, kvReady } from './_kv.js';
import { createHash } from 'node:crypto';
import { INSPECTOR } from './_demo-tool.js';
import { authReady, sessionUser, startSession, endSession, googleStart, googleFinish, safeNext, extensionToken } from './_auth.js';

const DAY = 86400000;
const now = () => new Date().toISOString();
const rid = (n = 10) => Array.from(randomBytes(n), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const fail = (status, message) => Object.assign(new Error(message), { status });
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const KINDS = ['fund', 'company'];
const clean = (s, n = 80) => String(s ?? '').trim().slice(0, n);
// a crisp, square company icon from its domain (Google's favicon service picks the best size the site offers)
const icon = (host) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
const STANDARD = { name: 'Sensor time-series v1', version: '1.0' };
const DEFAULTS = {
  fund: { enabled: true, crossCompany: true, maxOpenOffers: 2, expiryDays: 7 },
  company: { participating: true, receive: 'portfolio', peers: null, classes: ['data-quality'] },
};

// ── storage helpers ──
const K = {
  user: (id) => `user:${id}`, email: (e) => `email:${e}`, sub: (s) => `gsub:${s}`,
  org: (id) => `org:${id}`, mem: (id) => `mem:${id}`, uorgs: (u) => `uorgs:${u}`,
  fundcos: (f) => `fundcos:${f}`, inv: (c) => `inv:${c}`, oinv: (o) => `oinv:${o}`,
  tool: (id) => `tool:${id}`, utools: (u) => `utools:${u}`, otools: (o) => `otools:${o}`,
  grant: (id) => `grant:${id}`, tgrants: (t) => `tgrants:${t}`, ogrants: (o) => `ogrants:${o}`, ugrants: (u) => `ugrants:${u}`,
  audit: (o) => `audit:${o}`, reuse: (o) => `reuse:${o}`, pkg: (t) => `pkg:${t}`,
};
const pub = (u, withEmail) => u && ({ id: u.id, name: u.name, handle: u.handle || '', picture: u.picture || '', ...(withEmail ? { email: u.email } : {}) });
async function members(orgId) { const h = await cmd('HGETALL', K.mem(orgId)); const out = {}; for (let i = 0; i < (h || []).length; i += 2) out[h[i]] = JSON.parse(h[i + 1]); return out; }
const membership = async (orgId, uid) => { const v = await cmd('HGET', K.mem(orgId), uid); return v ? JSON.parse(v) : null; };
const isAdmin = (m) => m && (m.role === 'owner' || m.role === 'admin');
async function log(orgId, actor, action, subject = '') { if (!orgId) return; await pipeline([['LPUSH', K.audit(orgId), JSON.stringify({ at: now(), actor, action, subject })], ['LTRIM', K.audit(orgId), 0, 199]]); }
async function myOrgs(uid) { const ids = await cmd('SMEMBERS', K.uorgs(uid)); return (await getMany(ids.map(K.org))).filter(Boolean); }
async function addMember(org, uid, role, extra = {}) {
  const m = { role, publisher: role !== 'member' || org.kind !== 'company', exporter: role !== 'member' && org.kind === 'company', receiver: true, at: now(), ...extra };
  await pipeline([['HSET', K.mem(org.id), uid, JSON.stringify(m)], ['SADD', K.uorgs(uid), org.id]]);
  return m;
}

// ── who can see what (mirrors server/policy.ts) ──
async function canView(org, uid) {
  if (await membership(org.id, uid)) return 'member';
  if (org.kind === 'company' && org.fundId && isAdmin(await membership(org.fundId, uid))) return 'fund';
  return null;
}
// does a live grant still reach this user right now?
async function grantReaches(g, uid, cache = {}) {
  if (g.revoked || !Number.isFinite(Date.parse(g.expiresAt)) || Date.parse(g.expiresAt) <= Date.now()) return false;
  const tool = cache[g.toolId] ||= await getJSON(K.tool(g.toolId));
  if (!tool || tool.owner === uid || g.issuer !== tool.owner) return false;
  const [from, user] = await getMany([K.org(tool.orgId), K.user(uid)]);
  if (!from || !user) return false;
  const author = await membership(from.id, tool.owner), pref = user.pref || {};
  if (!author?.publisher || pref.mode === 'off' || (pref.muted || []).includes(tool.owner)) return false;
  const source = { ...DEFAULTS.company, ...from.settings };
  if (!source.participating || !source.classes.includes('data-quality')) return false;
  if (g.scope !== 'portfolio') {
    if (g.target.type === 'org' ? g.target.orgId !== from.id : g.target.userId !== uid) return false;
    const m = await membership(from.id, uid);
    return !!(m?.receiver && source.receive !== 'off');
  }
  if (g.target.type !== 'user' || g.target.userId !== uid || !author.exporter || pref.mode === 'company') return false;
  const to = await getJSON(K.org(g.target.companyId));
  if (!to || !from.fundId || from.fundId !== to.fundId || from.status !== 'joined' || to.status !== 'joined') return false;
  const fund = await getJSON(K.org(from.fundId));
  if (!fund) return false;
  const fs = { ...DEFAULTS.fund, ...fund.settings }, ts = { ...DEFAULTS.company, ...to.settings };
  if (!fs.enabled || !fs.crossCompany || ts.receive !== 'portfolio' || !ts.participating || !ts.classes.includes('data-quality')) return false;
  if (ts.peers && !ts.peers.includes(from.id)) return false;
  const m = await membership(to.id, uid);
  return !!m?.receiver;
}

// ── handlers ──
const routes = [];
const on = (method, pattern, fn, opts = {}) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn, ...opts });

on('GET', 'status', async () => ({ ok: true, database: kvReady(), signIn: authReady(), standard: STANDARD }), { open: true });

on('GET', 'auth/google', async (req, res) => { if (!authReady()) throw fail(503, 'Google sign-in isn’t set up yet.'); googleStart(req, res, req.query.next); return null; }, { open: true });
on('GET', 'auth/callback', async (req, res) => {
  let g;
  try { g = await googleFinish(req); } catch (e) { res.statusCode = 302; res.setHeader('Location', `/signin/?error=${encodeURIComponent(e.message)}`); res.end(); return null; }
  let id = (await cmd('GET', K.sub(g.sub))) || (await cmd('GET', K.email(g.email)));
  let user = id && (await getJSON(K.user(id)));
  if (!user) { id = rid(12); user = { id, email: g.email, name: g.name, picture: g.picture, handle: '', createdAt: now(), pref: { mode: 'portfolio', muted: [] } }; }
  else { user.picture = g.picture || user.picture; if (!user.name) user.name = g.name; }
  await pipeline([['SET', K.user(id), JSON.stringify(user)], ['SET', K.email(g.email), id], ['SET', K.sub(g.sub), id]]);
  startSession(res, req, id);
  res.statusCode = 302; res.setHeader('Location', safeNext(g.next)); res.end(); return null;
}, { open: true });
// the editor extension signs in through the browser: Google (if needed), then back to the editor with a token
on('GET', 'auth/extension', async (req, res) => {
  const state = String(req.query.state || '').replace(/[^\w-]/g, '').slice(0, 64), scheme = ['vscode', 'vscode-insiders', 'cursor', 'windsurf'].includes(req.query.scheme) ? req.query.scheme : 'vscode';
  const uid = sessionUser(req);
  if (!uid || !(await getJSON(K.user(uid)))) { res.statusCode = 302; res.setHeader('Location', `/signin/?next=${encodeURIComponent(`/api/auth/extension?state=${state}&scheme=${scheme}`)}`); res.end(); return null; }
  res.statusCode = 302; res.setHeader('Location', `${scheme}://common-ground-demo.common-ground/auth?token=${encodeURIComponent(extensionToken(uid))}&state=${state}`); res.end(); return null;
}, { open: true });
on('POST', 'auth/signout', async (req, res) => { endSession(res, req); return { ok: true }; }, { open: true });

on('GET', 'me', async (req, res, me) => {
  const orgs = await myOrgs(me.id);
  const ms = await Promise.all(orgs.map((o) => membership(o.id, me.id)));
  return { user: { ...pub(me, true), pref: me.pref || { mode: 'portfolio', muted: [] } }, orgs: orgs.map((o, i) => ({ id: o.id, kind: o.kind, name: o.name, iconUrl: o.iconUrl || '', fundId: o.fundId || null, status: o.status || null, role: ms[i]?.role, membership: ms[i] })) };
});
on('PATCH', 'me', async (req, res, me) => {
  const b = req.body || {};
  if (b.name != null) me.name = clean(b.name, 60) || me.name;
  if (b.handle != null) { const h = clean(b.handle, 39).replace(/^@/, ''); if (h && !HANDLE.test(h)) throw fail(400, 'That isn’t a GitHub username.'); me.handle = h; }
  if (b.pref) me.pref = { mode: ['off', 'company', 'portfolio'].includes(b.pref.mode) ? b.pref.mode : (me.pref?.mode || 'portfolio'), muted: Array.isArray(b.pref.muted) ? b.pref.muted.slice(0, 100).map(String) : (me.pref?.muted || []) };
  await setJSON(K.user(me.id), me); return { user: pub(me, true) };
});

// orgs
on('POST', 'orgs', async (req, res, me) => {
  const b = req.body || {}, kind = b.kind, name = clean(b.name, 60);
  if (!KINDS.includes(kind)) throw fail(400, 'Pick a fund or a company.');
  if (!name) throw fail(400, 'Give it a name.');
  const org = { id: rid(10), kind, name, site: clean(b.site, 120), github: clean(b.github, 39), iconUrl: '', createdAt: now(), owner: me.id, settings: { ...DEFAULTS[kind] } };
  if (org.site) { try { const h = new URL(/^https?:/.test(org.site) ? org.site : `https://${org.site}`).hostname; org.iconUrl = icon(h); } catch {} }
  if (kind === 'fund') { org.standard = STANDARD; if (b.sharing === 'company') org.settings.crossCompany = false; }
  if (kind === 'company') org.status = 'unaffiliated';
  await setJSON(K.org(org.id), org); await addMember(org, me.id, 'owner');
  await log(org.id, me.name, `Created the ${kind}`, name);
  return { org };
});
async function orgView(org, me, access) {
  const ms = await members(org.id), my = ms[me.id], admin = isAdmin(my) || access === 'fund';
  const users = await getMany(Object.keys(ms).map(K.user));
  const out = { org, myRole: my?.role || (access === 'fund' ? 'fund' : null), admin,
    members: users.filter(Boolean).map((u) => ({ user: pub(u, admin), ...ms[u.id] })),
    audit: (await cmd('LRANGE', K.audit(org.id), 0, 49)).map((x) => JSON.parse(x)) };
  if (isAdmin(my)) { const codes = await cmd('SMEMBERS', K.oinv(org.id)); out.invites = (await getMany(codes.map(K.inv))).filter((i) => i && !i.revoked); }
  const toolIds = await cmd('SMEMBERS', K.otools(org.id)); out.tools = (await getMany(toolIds.map(K.tool))).filter(Boolean);
  const gIds = new Set([...(await cmd('SMEMBERS', K.ogrants(org.id)))]);
  for (const t of out.tools) for (const g of await cmd('SMEMBERS', K.tgrants(t.id))) gIds.add(g);
  out.grants = (await getMany([...gIds].map(K.grant))).filter(Boolean);
  out.reuse = (await cmd('LRANGE', K.reuse(org.id), 0, 49)).map((x) => JSON.parse(x));
  const tally = (tools) => ({ tools: tools.length, reuses: tools.reduce((n, t) => n + (t.uses || []).length, 0), hours: tools.reduce((n, t) => n + (t.uses || []).length * (t.hours || 0), 0) });
  if (org.kind === 'fund') {
    const cos = (await getMany((await cmd('SMEMBERS', K.fundcos(org.id))).map(K.org))).filter(Boolean);
    const toolsBy = await Promise.all(cos.map(async (c) => (await getMany((await cmd('SMEMBERS', K.otools(c.id))).map(K.tool))).filter(Boolean)));
    const counts = await Promise.all(cos.map((c) => cmd('HLEN', K.mem(c.id))));
    out.companies = cos.map((c, i) => ({ id: c.id, name: c.name, iconUrl: c.iconUrl, status: c.status, site: c.site, mapping: c.mapping || null, memberCount: counts[i], settings: c.settings, ...tally(toolsBy[i]) }));
    const authors = await getMany([...new Set(toolsBy.flat().map((t) => t.owner))].map(K.user)), byId = Object.fromEntries(authors.filter(Boolean).map((u) => [u.id, pub(u)]));
    out.portfolioTools = toolsBy.flatMap((ts, i) => ts.map((t) => ({ ...t, company: { id: cos[i].id, name: cos[i].name, iconUrl: cos[i].iconUrl }, author: byId[t.owner] || null })));
    out.stats = { companies: cos.length, joined: cos.filter((c) => c.status === 'joined').length, people: counts.reduce((a, b) => a + b, 0) + out.members.length, ...tally(toolsBy.flat()) };
  } else out.stats = { people: out.members.length, ...tally(out.tools) };
  if (org.kind === 'company' && org.fundId) {
    const fund = await getJSON(K.org(org.fundId));
    const peers = (await getMany((await cmd('SMEMBERS', K.fundcos(org.fundId))).map(K.org))).filter((c) => c && c.id !== org.id);
    out.fund = fund && { id: fund.id, name: fund.name, settings: { ...DEFAULTS.fund, ...fund.settings }, standard: fund.standard || STANDARD };
    out.peers = peers.map((c) => ({ id: c.id, name: c.name, iconUrl: c.iconUrl, status: c.status }));
    // people at peer companies you could share with across the portfolio
    const peerMembers = await Promise.all(peers.map(async (c) => { const pm = await members(c.id); const us = await getMany(Object.keys(pm).map(K.user)); return us.filter(Boolean).filter((u) => pm[u.id].receiver).map((u) => ({ user: pub(u), companyId: c.id })); }));
    out.peerPeople = peerMembers.flat();
  }
  return out;
}
on('GET', 'orgs/:id', async (req, res, me, p) => {
  const org = await getJSON(K.org(p.id)); if (!org) throw fail(404, 'Not found.');
  const access = await canView(org, me.id); if (!access) throw fail(404, 'Not found.');
  return orgView(org, me, access);
});
on('PATCH', 'orgs/:id', async (req, res, me, p) => {
  const org = await getJSON(K.org(p.id)); if (!org || !isAdmin(await membership(org.id, me.id))) throw fail(404, 'Not found.');
  const b = req.body || {};
  if (b.needs != null && org.kind === 'company') org.needs = clean(b.needs, 500);
  if (b.name != null) org.name = clean(b.name, 60) || org.name;
  if (b.site != null) { org.site = clean(b.site, 120); try { org.iconUrl = org.site ? icon(new URL(/^https?:/.test(org.site) ? org.site : `https://${org.site}`).hostname) : ''; } catch {} }
  if (b.github != null) org.github = clean(b.github, 39);
  if (b.settings) {
    const s = { ...DEFAULTS[org.kind], ...org.settings };
    for (const [k, v] of Object.entries(b.settings)) {
      if (!(k in DEFAULTS[org.kind])) continue;
      if (typeof DEFAULTS[org.kind][k] === 'boolean') s[k] = !!v;
      else if (k === 'maxOpenOffers') s[k] = Math.min(5, Math.max(1, Math.round(+v) || 1));
      else if (k === 'expiryDays') s[k] = Math.min(90, Math.max(1, Math.round(+v) || 1));
      else if (k === 'receive' && ['off', 'company', 'portfolio'].includes(v)) s[k] = v;
      else if (k === 'peers') s[k] = v === null ? null : Array.isArray(v) ? v.slice(0, 200).map(String) : s[k];
      else if (k === 'classes' && Array.isArray(v)) s[k] = v.filter((x) => x === 'data-quality');
    }
    org.settings = s;
  }
  if (b.mapping && org.kind === 'company') {
    const m = b.mapping, r = m.result || {};
    org.mapping = { source: clean(m.source, 120), binding: m.binding && typeof m.binding === 'object' ? { timeColumn: clean(m.binding.timeColumn, 80), signalColumn: clean(m.binding.signalColumn, 80), unit: clean(m.binding.unit, 30), skipUnitsRow: !!m.binding.skipUnitsRow, timeBasis: m.binding.timeBasis === 'utc' ? 'utc' : 'local-unspecified', cadenceSeconds: Math.max(1, Math.round(+m.binding.cadenceSeconds) || 60) } : null,
      columns: Array.isArray(m.columns) ? m.columns.slice(0, 200).map((c) => clean(c, 80)) : [], result: { state: ['verified', 'failed', 'draft'].includes(r.state) ? r.state : 'draft', detail: clean(r.detail, 200) }, at: now() };
    if (org.fundId) org.status = org.mapping.result.state === 'verified' ? 'joined' : 'invited';
  }
  await setJSON(K.org(org.id), org); await log(org.id, me.name, b.mapping ? `Mapping ${org.mapping.result.state}` : b.settings ? 'Changed settings' : 'Edited details', org.name);
  return { org };
});
on('DELETE', 'orgs/:id', async (req, res, me, p) => {
  const org = await getJSON(K.org(p.id)); if (!org) throw fail(404, 'Not found.');
  if ((await membership(org.id, me.id))?.role !== 'owner') throw fail(403, 'Only the owner can delete this.');
  const ms = Object.keys(await members(org.id));
  const cmds = ms.map((u) => ['SREM', K.uorgs(u), org.id]);
  if (org.fundId) cmds.push(['SREM', K.fundcos(org.fundId), org.id]);
  if (org.kind === 'fund') for (const c of await cmd('SMEMBERS', K.fundcos(org.id))) { const co = await getJSON(K.org(c)); if (co) { co.fundId = null; co.status = 'unaffiliated'; cmds.push(['SET', K.org(c), JSON.stringify(co)]); } }
  for (const code of await cmd('SMEMBERS', K.oinv(org.id))) cmds.push(['DEL', K.inv(code)]);
  for (const g of await cmd('SMEMBERS', K.ogrants(org.id))) { const gr = await getJSON(K.grant(g)); if (gr) { gr.revoked = true; cmds.push(['SET', K.grant(g), JSON.stringify(gr)]); } }
  cmds.push(['DEL', K.org(org.id), K.mem(org.id), K.oinv(org.id), K.fundcos(org.id), K.audit(org.id), K.ogrants(org.id)]);
  await pipeline(cmds); return { ok: true };
});

// members: roles, kick, leave
on('PATCH', 'orgs/:id/members/:uid', async (req, res, me, p) => {
  const org = await getJSON(K.org(p.id)), mine = org && await membership(org.id, me.id); if (!isAdmin(mine)) throw fail(404, 'Not found.');
  const m = await membership(org.id, p.uid); if (!m) throw fail(404, 'Not a member.');
  const b = req.body || {};
  if (b.role) {
    if (!['owner', 'admin', 'member'].includes(b.role)) throw fail(400, 'Unknown role.');
    if ((b.role === 'owner' || m.role === 'owner') && mine.role !== 'owner') throw fail(403, 'Only an owner can change owners.');
    if (m.role === 'owner' && b.role !== 'owner') { const owners = Object.values(await members(org.id)).filter((x) => x.role === 'owner').length; if (owners < 2) throw fail(400, 'Make someone else an owner first.'); }
    m.role = b.role;
  }
  for (const k of ['publisher', 'exporter', 'receiver']) if (k in b) m[k] = !!b[k];
  if (m.exporter && !m.publisher) throw fail(400, 'Exporter needs Publisher first.');
  await cmd('HSET', K.mem(org.id), p.uid, JSON.stringify(m));
  const u = await getJSON(K.user(p.uid)); await log(org.id, me.name, 'Changed roles', u?.name || p.uid);
  return { membership: m };
});
on('DELETE', 'orgs/:id/members/:uid', async (req, res, me, p) => {
  const org = await getJSON(K.org(p.id)); if (!org) throw fail(404, 'Not found.');
  const mine = await membership(org.id, me.id), self = p.uid === me.id;
  if (!self && !isAdmin(mine)) throw fail(404, 'Not found.');
  const m = await membership(org.id, p.uid); if (!m) throw fail(404, 'Not a member.');
  if (m.role === 'owner' && !self && mine.role !== 'owner') throw fail(403, 'Only an owner can remove an owner.');
  if (m.role === 'owner') { const owners = Object.values(await members(org.id)).filter((x) => x.role === 'owner').length; if (owners < 2 && Object.keys(await members(org.id)).length > 1) throw fail(400, 'Make someone else an owner first.'); }
  await pipeline([['HDEL', K.mem(org.id), p.uid], ['SREM', K.uorgs(p.uid), org.id]]);
  // direct shares to them from this org's tools stop now; org-wide shares stop because they're no longer a member
  for (const t of await cmd('SMEMBERS', K.otools(org.id))) for (const gid of await cmd('SMEMBERS', K.tgrants(t))) { const g = await getJSON(K.grant(gid)); if (g && !g.revoked && g.target.type === 'user' && g.target.userId === p.uid) { g.revoked = true; await setJSON(K.grant(gid), g); } }
  const u = await getJSON(K.user(p.uid)); await log(org.id, me.name, self ? 'Left' : 'Removed', u?.name || p.uid);
  if (!Object.keys(await members(org.id)).length) await cmd('DEL', K.org(org.id), K.mem(org.id));
  return { ok: true };
});

// invite links: one reusable link per org that anyone in it can be sent; funds also have a link for companies
on('POST', 'orgs/:id/invites', async (req, res, me, p) => {
  const org = await getJSON(K.org(p.id)); if (!org || !isAdmin(await membership(org.id, me.id))) throw fail(404, 'Not found.');
  const b = req.body || {}, kind = b.kind === 'company' && org.kind === 'fund' ? 'company' : 'member';
  const inv = { code: rid(10), orgId: org.id, kind, role: b.role === 'admin' ? 'admin' : 'member', createdBy: me.id, at: now(), expiresAt: new Date(Date.now() + Math.min(90, Math.max(1, +b.expiresDays || 30)) * DAY).toISOString(), uses: 0, revoked: false };
  await pipeline([['SET', K.inv(inv.code), JSON.stringify(inv)], ['SADD', K.oinv(org.id), inv.code]]);
  await log(org.id, me.name, kind === 'company' ? 'Made a company invite link' : `Made a ${inv.role} invite link`);
  return { invite: inv };
});
on('DELETE', 'invites/:code', async (req, res, me, p) => {
  const inv = await getJSON(K.inv(p.code)); if (!inv || !isAdmin(await membership(inv.orgId, me.id))) throw fail(404, 'Not found.');
  inv.revoked = true; await pipeline([['SET', K.inv(inv.code), JSON.stringify(inv)], ['SREM', K.oinv(inv.orgId), inv.code]]);
  await log(inv.orgId, me.name, 'Turned off an invite link'); return { ok: true };
});
const liveInvite = async (code) => { const inv = await getJSON(K.inv(code)); if (!inv || inv.revoked || Date.parse(inv.expiresAt) < Date.now()) throw fail(404, 'This invite link isn’t active.'); const org = await getJSON(K.org(inv.orgId)); if (!org) throw fail(404, 'This invite link isn’t active.'); return { inv, org }; };
on('GET', 'invites/:code', async (req, res, me, p) => {
  const { inv, org } = await liveInvite(p.code), by = await getJSON(K.user(inv.createdBy));
  return { kind: inv.kind, role: inv.role, org: { id: org.id, kind: org.kind, name: org.name, iconUrl: org.iconUrl || '' }, invitedBy: pub(by), memberCount: await cmd('HLEN', K.mem(org.id)) };
}, { open: true });
on('POST', 'invites/:code/accept', async (req, res, me, p) => {
  const { inv, org } = await liveInvite(p.code), b = req.body || {};
  if (inv.kind === 'member') {
    if (await membership(org.id, me.id)) return { orgId: org.id, already: true };
    await addMember(org, me.id, inv.role);
    inv.uses++; await setJSON(K.inv(inv.code), inv); await log(org.id, me.name, 'Joined with the invite link');
    return { orgId: org.id };
  }
  // A repeated invitation must not silently create a second company for the same owner.
  let co;
  if (b.companyId) { co = await getJSON(K.org(b.companyId)); if (!co || co.kind !== 'company' || !isAdmin(await membership(co.id, me.id))) throw fail(403, 'You need to be an admin of that company.'); }
  else { const name = clean(b.companyName, 60); if (!name) throw fail(400, 'Name your company.');
    const owned=(await getMany((await cmd('SMEMBERS',K.uorgs(me.id))).map(K.org))).filter(x=>x?.kind==='company' && x.owner===me.id && x.name.trim().toLowerCase()===name.toLowerCase());
    const existing=owned.find(x=>x.fundId===org.id);
    if(existing)return {orgId:existing.id,already:true};
    if(owned.length)throw fail(409,'You already own a company with this name. Select your existing company instead of creating another.');
    co = { id: rid(10), kind: 'company', name, site: clean(b.site, 120), github: clean(b.github, 39), iconUrl: '', createdAt: now(), owner: me.id, settings: { ...DEFAULTS.company } }; if (co.site) { try { co.iconUrl = icon(new URL(/^https?:/.test(co.site) ? co.site : `https://${co.site}`).hostname); } catch {} } await setJSON(K.org(co.id), co); await addMember(co, me.id, 'owner'); }
  if (co.fundId && co.fundId !== org.id) throw fail(400, 'That company is already in another fund.');
  if(co.fundId===org.id)return {orgId:co.id,already:true};
  co.fundId = org.id; co.status = co.mapping?.result?.state === 'verified' ? 'joined' : 'invited';
  await pipeline([['SET', K.org(co.id), JSON.stringify(co)], ['SADD', K.fundcos(org.id), co.id]]);
  inv.uses++; await setJSON(K.inv(inv.code), inv);
  await log(org.id, me.name, 'Brought a company in', co.name); await log(co.id, me.name, 'Joined the fund', org.name);
  return { orgId: co.id };
});
on('DELETE', 'orgs/:id/companies/:cid', async (req, res, me, p) => {
  const fund = await getJSON(K.org(p.id)); if (!fund || fund.kind !== 'fund' || !isAdmin(await membership(fund.id, me.id))) throw fail(404, 'Not found.');
  const co = await getJSON(K.org(p.cid)); if (!co || co.fundId !== fund.id) throw fail(404, 'Not in this fund.');
  co.fundId = null; co.status = 'unaffiliated';
  await pipeline([['SET', K.org(co.id), JSON.stringify(co)], ['SREM', K.fundcos(fund.id), co.id]]);
  await log(fund.id, me.name, 'Removed a company', co.name); await log(co.id, me.name, 'Removed from the fund', fund.name);
  return { ok: true };
});

// tools and shares
on('POST', 'tools', async (req, res, me) => {
  const b = req.body || {}, name = clean(b.name, 60).replace(/[^\w.\-]/g, '-'); if (!name) throw fail(400, 'Name the tool.');
  const org = await getJSON(K.org(String(b.orgId || ''))); if (!org || org.kind !== 'company' || !(await membership(org.id, me.id))) throw fail(403, 'Pick your company.');
  const orgId = org.id;
  const tool = { id: rid(10), name, description: clean(b.description, 280), owner: me.id, orgId, createdAt: now(), hash: '', checks: 0, hours: Math.min(400, Math.max(1, Math.round(+b.hours) || 8)), uses: [] };
  let pkg = null;
  if (b.files) { // published from the editor: the exact files that passed the checks, verified by hash
    const files = b.files, names = Object.keys(files || {});
    if (!names.length || names.length > 12 || names.some((f) => !PKG_FILES.test(f) || typeof files[f] !== 'string')) throw fail(400, 'Unexpected files in the package.');
    if (names.reduce((n, f) => n + files[f].length, 0) > 600000) throw fail(413, 'Package is too large.');
    const main = files['inspector.js']; if (!main || createHash('sha256').update(main).digest('hex') !== b.hash) throw fail(400, 'Package hash doesn’t match its code.');
    if (!Array.isArray(b.checks) || b.checks.length !== 7 || !b.checks.every((c) => c.passed)) throw fail(400, 'Only tools that pass all seven factory checks can be published.');
    tool.hash = b.hash; tool.checks = 7; tool.fromEditor = true; tool.provenance = ['agent-generated', 'eve-generated', 'reference-template'].includes(b.provenance) ? b.provenance : 'reference-template'; if (b.requirementId) tool.requirementId = clean(b.requirementId, 80);
    pkg = { name, hash: b.hash, files };
  }
  await pipeline([['SET', K.tool(tool.id), JSON.stringify(tool)], ...(pkg ? [['SET', K.pkg(tool.id), JSON.stringify(pkg)]] : []), ['SADD', K.utools(me.id), tool.id], ...(orgId ? [['SADD', K.otools(orgId), tool.id]] : [])]);
  await log(orgId, me.name, 'Added a tool', name); return { tool };
});
on('GET', 'tools/mine', async (req, res, me) => {
  const tools = (await getMany((await cmd('SMEMBERS', K.utools(me.id))).map(K.tool))).filter(Boolean);
  const grants = []; for (const t of tools) grants.push(...(await getMany((await cmd('SMEMBERS', K.tgrants(t.id))).map(K.grant))).filter(Boolean));
  return { tools, grants };
});
const PKG_FILES = /^[A-Za-z0-9_.-]{1,80}\.(js|json|md|csv|txt)$/;
// can this person open the tool's files: its author, their company, or someone a live share reaches
async function canOpenTool(t, uid) {
  if (t.owner === uid) return !!(await membership(t.orgId, uid));
  const gs = (await getMany((await cmd('SMEMBERS', K.tgrants(t.id))).map(K.grant))).filter(Boolean), cache = { [t.id]: t };
  for (const g of gs) if (await grantReaches(g, uid, cache)) return true;
  return false;
}
on('GET', 'tools/:id/package', async (req, res, me, p) => {
  const t = await getJSON(K.tool(p.id)); if (!t || !(await canOpenTool(t, me.id))) throw fail(404, 'This tool isn’t shared with you.');
  const pkg = await getJSON(K.pkg(t.id)); if (!pkg) throw fail(404, 'This tool was registered by hand and has no files to download.');
  // bind it to the recipient's own mapping of the standard: the checked code stays byte-identical, only binding.json changes
  if (!(await membership(t.orgId, me.id))) {
    const grants = (await getMany((await cmd('SMEMBERS', K.tgrants(t.id))).map(K.grant))).filter(Boolean);
    let mine = null;
    for (const grant of grants) if (grant.target.companyId && await grantReaches(grant, me.id, { [t.id]: t })) { mine = await getJSON(K.org(grant.target.companyId)); break; }
    if (mine) {
      const m = mine.mapping, std = STANDARD.name;
      pkg.files['binding.json'] = JSON.stringify({ standard: std, company: mine.name, source: m.source, time: m.binding.timeColumn, value: m.binding.signalColumn, unit: m.binding.unit || '', timeBasis: m.binding.timeBasis, cadenceSeconds: m.binding.cadenceSeconds, skipUnitsRow: m.binding.skipUnitsRow }, null, 2);
      pkg.files['README.md'] = (pkg.files['README.md'] || `# ${t.name}\n`) + `\nRebound to ${mine.name}'s mapping of ${std}. Core hash unchanged: ${pkg.hash}.\n`;
      pkg.reboundTo = mine.name;
    }
  }
  return pkg;
});
const canManageTool = async (t, uid) => t.owner === uid || (t.orgId && isAdmin(await membership(t.orgId, uid)));
on('DELETE', 'tools/:id', async (req, res, me, p) => {
  const t = await getJSON(K.tool(p.id)); if (!t || !(await canManageTool(t, me.id))) throw fail(404, 'Not found.');
  const gids = await cmd('SMEMBERS', K.tgrants(t.id)), gs = (await getMany(gids.map(K.grant))).filter(Boolean);
  const cmds = [['DEL', K.tool(t.id), K.tgrants(t.id), K.pkg(t.id)], ['SREM', K.utools(t.owner), t.id], ...(t.orgId ? [['SREM', K.otools(t.orgId), t.id]] : [])];
  for (const g of gs) { cmds.push(['DEL', K.grant(g.id)]); if (g.target.type === 'org') cmds.push(['SREM', K.ogrants(g.target.orgId), g.id]); else cmds.push(['SREM', K.ugrants(g.target.userId), g.id]); }
  await pipeline(cmds); await log(t.orgId, me.name, 'Removed a tool', t.name); return { ok: true };
});
on('POST', 'tools/:id/grants', async (req, res, me, p) => {
  const t = await getJSON(K.tool(p.id)); if (!t || t.owner !== me.id) throw fail(404, 'Only a tool’s author can share it.');
  if (t.checks !== 7) throw fail(400, 'This tool hasn’t been through the factory’s seven checks yet. Publish it from the editor to share it.');
  const b = req.body || {}; let g;
  const base = { id: rid(10), toolId: t.id, issuer: me.id, revoked: false, at: now() };
  if (b.orgId) {
    const org = await getJSON(K.org(b.orgId)), m = org && await membership(org.id, me.id); if (!m) throw fail(403, 'You’re not in that group.');
    if (org.kind === 'company' && (!m.publisher || t.orgId !== org.id)) throw fail(403, 'You need Publisher, and the tool must belong to this company.');
    if (org.kind !== 'company') throw fail(400, 'Share with your company or with named people at another company.');
    const days = org.kind === 'company' && org.fundId ? ({ ...DEFAULTS.fund, ...(await getJSON(K.org(org.fundId)))?.settings }).expiryDays : 30;
    g = { ...base, scope: 'team', target: { type: 'org', orgId: org.id }, expiresAt: new Date(Date.now() + days * DAY).toISOString() };
  } else if (b.userId) {
    const u = await getJSON(K.user(b.userId)); if (!u || u.id === me.id) throw fail(404, 'No such person.');
    const from = await getJSON(K.org(t.orgId)), mf = await membership(from.id, me.id);
    if (await membership(from.id, u.id)) { if (!mf?.publisher) throw fail(403, 'You need Publisher.'); g = { ...base, scope: 'team', target: { type: 'user', userId: u.id }, expiresAt: new Date(Date.now() + 7 * DAY).toISOString() }; }
    else {
      if (!mf?.exporter) throw fail(403, 'You need Exporter to share outside your company.');
      const toId = String(b.companyId || ''); const to = await getJSON(K.org(toId)); if (!to || !(await membership(to.id, u.id))) throw fail(400, 'Pick their company.');
      g = { ...base, scope: 'portfolio', target: { type: 'user', userId: u.id, companyId: to.id }, expiresAt: new Date(Date.now() + ({ ...DEFAULTS.fund, ...(await getJSON(K.org(from.fundId || '')))?.settings }).expiryDays * DAY).toISOString() };
      if (!(await grantReaches(g, u.id, { [t.id]: t }))) throw fail(403, 'Your fund or their company doesn’t allow this share.');
    }
  } else throw fail(400, 'Share with a group or a person.');
  await pipeline([['SET', K.grant(g.id), JSON.stringify(g)], ['SADD', K.tgrants(t.id), g.id], g.target.type === 'org' ? ['SADD', K.ogrants(g.target.orgId), g.id] : ['SADD', K.ugrants(g.target.userId), g.id]]);
  await log(t.orgId || (g.target.type === 'org' ? g.target.orgId : null), me.name, `Shared (${g.scope})`, t.name);
  return { grant: g };
});
on('DELETE', 'grants/:id', async (req, res, me, p) => {
  const g = await getJSON(K.grant(p.id)); if (!g) throw fail(404, 'Not found.');
  const t = await getJSON(K.tool(g.toolId));
  const ok = g.issuer === me.id || (t && await canManageTool(t, me.id)) || (g.target.type === 'org' && isAdmin(await membership(g.target.orgId, me.id)));
  if (!ok) throw fail(404, 'Not found.');
  g.revoked = true; await setJSON(K.grant(g.id), g); await log(t?.orgId || (g.target.type === 'org' ? g.target.orgId : null), me.name, 'Revoked a share', t?.name || '');
  return { ok: true };
});
on('GET', 'shared', async (req, res, me) => {
  const orgIds = await cmd('SMEMBERS', K.uorgs(me.id));
  const gids = new Set(await cmd('SMEMBERS', K.ugrants(me.id))); for (const o of orgIds) for (const g of await cmd('SMEMBERS', K.ogrants(o))) gids.add(g);
  const gs = (await getMany([...gids].map(K.grant))).filter(Boolean), cache = {}, out = [];
  const pref = me.pref || { mode: 'portfolio', muted: [] };
  for (const g of gs) {
    if (!(await grantReaches(g, me.id, cache))) continue;
    const t = cache[g.toolId]; if (pref.muted.includes(t.owner) || pref.mode === 'off' || (pref.mode === 'company' && g.scope === 'portfolio')) continue;
    const owner = await getJSON(K.user(t.owner)), from = t.orgId && await getJSON(K.org(t.orgId));
    out.push({ grant: g, tool: t, owner: pub(owner), from: from && { id: from.id, name: from.name, iconUrl: from.iconUrl } });
  }
  return { shared: out };
});

// the factory's last step: who should get this, other than its maker. Candidates come from the fund's ontology:
// people at companies mapped to the same standard whose policies let them receive, plus the maker's own team;
// ranked by fit (their mapping is verified), by what they've reused before, and by how close those tools are to this one.
const words = (t) => new Set((String(t || '').toLowerCase().match(/[a-z]{4,}/g) || []).filter(w => !['with','from','that','this','tool','tools','data','their','your','have','build','built','company','check','checks'].includes(w)));
on('POST', 'suggest', async (req, res, me) => {
  const b = req.body || {}, org = await getJSON(K.org(String(b.orgId || '')));
  const mine = org && await membership(org.id, me.id);
  if (!org || org.kind !== 'company' || !mine) throw fail(404, 'Pick your company.');
  const tool = b.toolId ? await getJSON(K.tool(String(b.toolId))) : null;
  if (b.toolId && (!tool || tool.orgId !== org.id || tool.owner !== me.id)) throw fail(404, 'Not found.');
  if (!mine.publisher || (tool && tool.checks !== 7)) return { standard: STANDARD.name, suggestions: [], note: 'A checked tool and Publisher permission are required before sharing.' };
  const about = words(`${b.name || tool?.name || ''} ${b.text || tool?.description || ''}`);
  const candidate = tool || { id: 'preview', orgId: org.id, owner: me.id };
  const already = new Set((tool?.uses || []).map(x => x.uid));
  if (tool) for (const g of (await getMany((await cmd('SMEMBERS', K.tgrants(tool.id))).map(K.grant))).filter(Boolean)) {
    if (g.revoked || Date.parse(g.expiresAt) <= Date.now()) continue;
    if (g.target.userId) already.add(g.target.userId);
    else for (const id of Object.keys(await members(g.target.orgId))) if (await grantReaches(g, id)) already.add(id);
  }
  const fund = org.fundId && await getJSON(K.org(org.fundId));
  const history = (await cmd('LRANGE', K.reuse(fund?.id || org.id), 0, 199)).map(x => JSON.parse(x));
  const peers = fund ? (await getMany((await cmd('SMEMBERS', K.fundcos(fund.id))).map(K.org))).filter(c => c && c.id !== org.id) : [];
  const out = [];
  for (const company of [org, ...peers]) {
    const portfolio = company.id !== org.id;
    const users = (await getMany(Object.keys(await members(company.id)).map(K.user))).filter(Boolean);
    for (const u of users) {
      if (u.id === me.id || already.has(u.id)) continue;
      const target = { userId: u.id, ...(portfolio ? { companyId: company.id } : {}) };
      const grant = { toolId: candidate.id, issuer: me.id, scope: portfolio ? 'portfolio' : 'team', target: { type: 'user', ...target }, expiresAt: new Date(Date.now() + DAY).toISOString() };
      // Eligibility is checked before returning names, workflow evidence, or ranking.
      if (!(await grantReaches(grant, u.id, { [candidate.id]: candidate }))) continue;
      const overlap = [...words(company.needs)].filter(w => about.has(w));
      const prior = history.filter(e => e.uid === u.id).map(e => ({ e, count: [...words(e.tool)].filter(w => about.has(w)).length })).sort((a,b) => b.count-a.count)[0];
      if (!overlap.length && !prior?.count) continue; // a compatible schema alone is not evidence of need
      const evidence = [];
      if (overlap.length) evidence.push({ kind: 'company-brief', source: `${company.name} · shared workflow brief`, text: company.needs, matched: overlap });
      if (prior?.count) evidence.push({ kind: 'reuse', source: 'Recorded adoption', text: `Previously ${prior.e.kind === 'adapt' ? 'adapted' : 'downloaded'} ${prior.e.tool}.`, at: prior.e.at });
      const map = company.mapping?.binding;
      const reasons = [...evidence.map(e => `${e.source}: ${e.text}`), portfolio && map ? `Compatible mapping: ${map.timeColumn} → time; ${map.signalColumn} → value.` : 'Same company; receiving is enabled.'];
      out.push({ kind: 'person', target, user: pub(u), company: { id: company.id, name: company.name, iconUrl: company.iconUrl }, portfolio, score: overlap.length + (prior?.count || 0) * 2, reasons, evidence, basis: 'workflow-and-reuse' });
    }
  }
  out.sort((a,b) => b.score-a.score || a.user.id.localeCompare(b.user.id));
  const limit = Math.min(3, Math.max(1, Number(fund?.settings?.maxOpenOffers) || 2));
  return { standard: STANDARD.name, suggestions: out.slice(0,limit), method: 'Permission-filtered workflow keywords and recorded reuse; no model inference.', note: out.length ? 'Suggestions are optional. Review the evidence before sharing this version.' : 'No evidenced match among eligible people. A company admin can add a shared workflow brief in Get started. A matching schema alone is not enough.' };
});

// someone downloaded or adapted a tool they can see: counts toward reuse, for the tool's company, theirs and the fund
on('POST', 'tools/:id/uses', async (req, res, me, p) => {
  const t = await getJSON(K.tool(p.id)); if (!t) throw fail(404, 'Not found.');
  const kind = req.body?.kind === 'adapt' ? 'adapt' : 'download';
  let toCo = (await membership(t.orgId, me.id)) ? t.orgId : null;
  if (!toCo) { const gs = (await getMany((await cmd('SMEMBERS', K.tgrants(t.id))).map(K.grant))).filter(Boolean), cache = { [t.id]: t };
    for (const g of gs) if (await grantReaches(g, me.id, cache)) { toCo = g.target.companyId || g.target.orgId || t.orgId; break; } }
  if (!toCo || t.owner === me.id || !(await canOpenTool(t, me.id))) throw fail(404, 'Not found.');
  t.uses ||= []; if (t.uses.some((u) => u.uid === me.id && u.kind === kind)) return { ok: true, already: true };
  const [from, to] = await getMany([K.org(t.orgId), K.org(toCo)]);
  const ev = { at: now(), toolId: t.id, tool: t.name, kind, hours: t.hours || 0, uid: me.id, by: me.name, from: from && { id: from.id, name: from.name, iconUrl: from.iconUrl }, to: to && { id: to.id, name: to.name, iconUrl: to.iconUrl } };
  t.uses.push({ at: ev.at, uid: me.id, companyId: toCo, kind }); t.uses = t.uses.slice(-200);
  const lists = [...new Set([t.orgId, toCo, from?.fundId].filter(Boolean))];
  await pipeline([['SET', K.tool(t.id), JSON.stringify(t)], ...lists.flatMap((o) => [['LPUSH', K.reuse(o), JSON.stringify(ev)], ['LTRIM', K.reuse(o), 0, 199]])]);
  return { ok: true };
});

// "Try the demo": a private sandbox fund with five portfolio companies, their people, tools and reuse, signed in as its owner
on('POST', 'auth/demo', async (req, res) => {
  const sx = rid(6), at = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString(), cmds = [];
  const me = { id: `demo-${sx}`, email: 'Demo account', name: 'You', handle: 'you-demo', picture: '', createdAt: now(), demo: true, pref: { mode: 'portfolio', muted: [] } };
  cmds.push(['SET', K.user(me.id), JSON.stringify(me)]);
  const fund = { id: `f${sx}`, kind: 'fund', name: 'Social Capital', site: 'socialcapital.com', iconUrl: icon('socialcapital.com'), createdAt: at(30), owner: me.id, demo: true, settings: { ...DEFAULTS.fund }, standard: STANDARD };
  const mem = (org, uid, role, extra = {}) => cmds.push(['HSET', K.mem(org.id), uid, JSON.stringify({ role, publisher: true, exporter: role !== 'member', receiver: true, at: org.createdAt, ...extra })], ['SADD', K.uorgs(uid), org.id]);
  cmds.push(['SET', K.org(fund.id), JSON.stringify(fund)]); mem(fund, me.id, 'owner');
  // each company's own columns, mapped once to the standard (Saildrone and Palmetto match the real NOAA and NREL samples)
  const BIND = { saildrone: { timeColumn: 'time', signalColumn: 'WIND_SPEED_MEAN', unit: 'm s-1', skipUnitsRow: true, timeBasis: 'utc', cadenceSeconds: 60 },
    palmetto: { timeColumn: 'measured_on', signalColumn: 'ac_power__423', unit: 'W', skipUnitsRow: false, timeBasis: 'local-unspecified', cadenceSeconds: 60 },
    mast: { timeColumn: 'logged_at', signalColumn: 'soil_vwc', unit: 'm3/m3', skipUnitsRow: false, timeBasis: 'utc', cadenceSeconds: 900 },
    groq: { timeColumn: 'ts', signalColumn: 'rack_inlet_c', unit: 'C', skipUnitsRow: false, timeBasis: 'utc', cadenceSeconds: 10 } };
  const map = (src, ok, key) => ({ source: src, binding: BIND[key], columns: [], result: { state: ok ? 'verified' : 'draft', detail: ok ? '1,440 observations · 0 missing timestamps' : 'Waiting for a sample' }, at: at(20) });
  const COS = [
    ['saildrone', 'Saildrone', 'saildrone.com', 'saildrone.png', 'ERDDAP / NetCDF', true, [['Fabio Rossi', 'fabio-sd', 'owner'], ['Theo Park', 'theo-sd', 'member'], ['Ines Duarte', 'ines-sd', 'member'], ['Sam Okafor', 'sam-sd', 'member']]],
    ['palmetto', 'Palmetto', 'palmetto.com', 'palmetto.png', 'SolarEdge', true, [['Maya Chen', 'maya-pm', 'owner'], ['Leo Grant', 'leo-pm', 'member'], ['Elli Novak', 'elli-pm', 'member']]],
    ['mast', 'Mast Reforestation', 'mast.eco', 'mast.png', 'Sensor logger', true, [['Rhea Malik', 'rhea-ml', 'owner'], ['Jon Bell', 'jon-ms', 'member']]],
    ['groq', 'Groq', 'groq.com', 'groq.svg', 'Other CSV', false, [['Kai Moreno', 'kai-gq', 'owner']]],
    ['netskope', 'Netskope', 'netskope.com', 'netskope.webp', '', false, []],
  ];
  const co = {}, ppl = {};
  for (const [key, name, site, , src, ok, people] of COS) {
    const c = { id: `c${sx}${key.slice(0, 3)}`, kind: 'company', name, site, iconUrl: icon(site), createdAt: at(25), owner: null, demo: true, fundId: fund.id, status: ok ? 'joined' : 'invited', needs: ({ saildrone: 'Find missing sensor readings and duplicate timestamps in telemetry exports.', palmetto: 'Find missing timestamps and gaps in solar telemetry before daily reporting.', mast: 'Validate sensor readings and missing timestamps from field telemetry.' })[key] || '', settings: { ...DEFAULTS.company }, ...(src ? { mapping: map(src, ok, key) } : {}) };
    co[key] = c;
    for (const [pname, gh, role] of people) { const u = { id: `u${sx}${gh}`, email: `${gh}@example.com`, name: pname, handle: gh, picture: '', createdAt: at(25), demo: true }; ppl[gh] = u; cmds.push(['SET', K.user(u.id), JSON.stringify(u)]); mem(c, u.id, role); if (role === 'owner') c.owner = u.id; }
    cmds.push(['SADD', K.fundcos(fund.id), c.id]);
  }
  mem(co.saildrone, me.id, 'admin'); ppl.you = me; // so the demo can show a company's side too, and one tool of your own
  const TOOLS = [
    ['telemetry-inspector', 'saildrone', 'fabio-sd', 'Finds missing, duplicate and off-grid readings in any sensor time series before they reach a model.', 16, [['palmetto', 'maya-pm', 'adapt', 6], ['mast', 'rhea-ml', 'download', 3], ['saildrone', 'theo-sd', 'download', 9]]],
    ['glider-feed-qc', 'saildrone', 'you', 'Checks every vehicle’s minute-by-minute position feed for gaps, repeats and late fixes.', 24, [['saildrone', 'ines-sd', 'download', 12]]],
    ['pv-gap-finder', 'palmetto', 'maya-pm', 'Flags dropped inverter intervals and fills short gaps without inventing peaks.', 12, [['saildrone', 'fabio-sd', 'adapt', 4], ['mast', 'jon-ms', 'download', 2]]],
    ['inverter-gap-report', 'palmetto', 'leo-pm', 'A morning report of missing inverter readings overnight, by site.', 6, []],
    ['canopy-sensor-qa', 'mast', 'rhea-ml', 'Checks soil-moisture loggers for drift and stuck values across a planting.', 10, [['palmetto', 'elli-pm', 'download', 1]]],
  ];
  const reuse = { [fund.id]: [] };
  for (const [name, ck, gh, desc, hours, uses] of TOOLS) {
    const code = `// ${name}: ${desc}\n${INSPECTOR}`, hash = createHash('sha256').update(code).digest('hex');
    const c = co[ck], author = ppl[gh], t = { id: `t${sx}${name.slice(0, 6)}`, name, description: desc, owner: author.id, orgId: c.id, createdAt: at(15), hash, checks: 7, hours, uses: [], demo: true, fromEditor: true, provenance: 'reference-template' };
    cmds.push(['SET', K.pkg(t.id), JSON.stringify({ name, hash, files: { 'inspector.js': code, 'README.md': `# ${name}\n\n${desc}\n\nBuilt at ${c.name} by ${author.name}. Shared through Common Ground: this is the exact version that passed all seven checks.\n\nSample data from the Common Ground demo fund.\n` } })]);
    const grant = (target, scope, d) => { const g = { id: rid(10), toolId: t.id, issuer: author.id, revoked: false, at: at(d + 0.5), scope, target, expiresAt: new Date(Date.now() + (scope === 'portfolio' ? 7 : 30) * DAY).toISOString() }; cmds.push(['SET', K.grant(g.id), JSON.stringify(g)], ['SADD', K.tgrants(t.id), g.id], target.type === 'org' ? ['SADD', K.ogrants(target.orgId), g.id] : ['SADD', K.ugrants(target.userId), g.id]); };
    grant({ type: 'org', orgId: c.id }, 'team', 14);
    for (const [tk, ugh, kind, d] of uses) {
      const to = co[tk], u = ppl[ugh];
      if (tk !== ck) grant({ type: 'user', userId: u.id, companyId: to.id }, 'portfolio', d);
      t.uses.push({ at: at(d), uid: u.id, companyId: to.id, kind });
      const ev = { at: at(d), toolId: t.id, tool: name, kind, hours, uid: u.id, by: u.name, from: { id: c.id, name: c.name, iconUrl: c.iconUrl }, to: { id: to.id, name: to.name, iconUrl: to.iconUrl } };
      for (const o of new Set([fund.id, c.id, to.id])) (reuse[o] ||= []).push(ev);
    }
    cmds.push(['SET', K.tool(t.id), JSON.stringify(t)], ['SADD', K.utools(author.id), t.id], ['SADD', K.otools(c.id), t.id]);
  }
  for (const [o, evs] of Object.entries(reuse)) for (const ev of evs.sort((a, b) => a.at.localeCompare(b.at))) cmds.push(['LPUSH', K.reuse(o), JSON.stringify(ev)]);
  const audit = [[30, 'You', 'Created the fund', 'Social Capital'], [25, 'You', 'Made a company invite link'], [24, 'Fabio Rossi', 'Brought a company in', 'Saildrone'], [23, 'Maya Chen', 'Brought a company in', 'Palmetto'], [21, 'Rhea Malik', 'Brought a company in', 'Mast Reforestation'], [8, 'Kai Moreno', 'Brought a company in', 'Groq']];
  for (const [d, actor, action, subject = ''] of audit) cmds.push(['LPUSH', K.audit(fund.id), JSON.stringify({ at: at(d), actor, action, subject })]);
  for (const c of Object.values(co)) cmds.push(['SET', K.org(c.id), JSON.stringify(c)]);
  const inv = { code: rid(10), orgId: fund.id, kind: 'company', role: 'member', createdBy: me.id, at: at(25), expiresAt: new Date(Date.now() + 30 * DAY).toISOString(), uses: 4, revoked: false };
  const tinv = { ...inv, code: rid(10), kind: 'member', uses: 0 };
  cmds.push(['SET', K.inv(inv.code), JSON.stringify(inv)], ['SADD', K.oinv(fund.id), inv.code], ['SET', K.inv(tinv.code), JSON.stringify(tinv)], ['SADD', K.oinv(fund.id), tinv.code]);
  for (let i = 0; i < cmds.length; i += 200) await pipeline(cmds.slice(i, i + 200));
  startSession(res, req, me.id);
  return { ok: true, fundId: fund.id };
}, { open: true });

// ── entry ──
export default async function handler(req, res) {
  const path = String(req.query.p || '').replace(/^\/+|\/+$/g, '');
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'GET' && req.headers['content-type']?.includes('application/json') === false && req.method !== 'DELETE') throw fail(415, 'JSON only.');
    if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw fail(403, 'Cross-site requests aren’t allowed.');
    const r = routes.find((x) => x.method === req.method && x.re.test(path)); if (!r) throw fail(404, 'Not found.');
    let me = null;
    if (!r.open) { const uid = sessionUser(req); me = uid && await getJSON(K.user(uid)); if (!me) throw fail(401, 'Sign in first.'); }
    const out = await r.fn(req, res, me, path.match(r.re).groups || {});
    if (out !== null && !res.writableEnded) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(out)); }
  } catch (e) {
    if (res.writableEnded) return;
    res.statusCode = e.status || 500; res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e.status ? e.message : 'Something went wrong.' }));
    if (!e.status) console.error(e);
  }
}
