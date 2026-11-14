// Common Ground API: one Vercel function, routed by path (vercel.json rewrites /api/* here).
// Orgs are funds and their portfolio companies. Every read re-checks permissions, so kicking someone,
// removing a company or revoking a tool takes effect immediately; files already downloaded stay with their owners.
import { randomBytes } from 'node:crypto';
import { cmd, pipeline, getJSON, setJSON, getMany, kvReady } from './_kv.js';
import { authReady, sessionUser, startSession, endSession, googleStart, googleFinish, safeNext } from './_auth.js';

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
  audit: (o) => `audit:${o}`, reuse: (o) => `reuse:${o}`,
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
  if (g.revoked || Date.parse(g.expiresAt) <= Date.now()) return false;
  const tool = cache[g.toolId] ||= await getJSON(K.tool(g.toolId));
  if (!tool || tool.owner === uid) return false;
  if (g.target.type === 'org') {
    const m = await membership(g.target.orgId, uid); if (!m || !m.receiver) return false;
    return true;
  }
  if (g.target.userId !== uid) return false;
  if (g.scope !== 'portfolio') return true;
  // portfolio: both companies still in the same fund, fund allows it, recipient's company receives from the portfolio
  const [from, to] = await getMany([K.org(tool.orgId), K.org(g.target.companyId)]);
  if (!from || !to || !from.fundId || from.fundId !== to.fundId) return false;
  if (from.status !== 'joined' || to.status !== 'joined') return false; // both mapped to the standard
  const fund = await getJSON(K.org(from.fundId));
  const s = { ...DEFAULTS.fund, ...fund?.settings }, ts = { ...DEFAULTS.company, ...to.settings }, fs = { ...DEFAULTS.company, ...from.settings };
  if (!s.enabled || !s.crossCompany || ts.receive !== 'portfolio' || !ts.participating || !fs.participating) return false;
  if (ts.peers && !ts.peers.includes(from.id)) return false;
  const m = await membership(to.id, uid); return !!(m && m.receiver);
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
  if (kind === 'fund') org.standard = STANDARD;
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
  // a company joining a fund: link a company you own, or create one
  let co;
  if (b.companyId) { co = await getJSON(K.org(b.companyId)); if (!co || co.kind !== 'company' || !isAdmin(await membership(co.id, me.id))) throw fail(403, 'You need to be an admin of that company.'); }
  else { const name = clean(b.companyName, 60); if (!name) throw fail(400, 'Name your company.'); co = { id: rid(10), kind: 'company', name, site: clean(b.site, 120), github: clean(b.github, 39), iconUrl: '', createdAt: now(), owner: me.id, settings: { ...DEFAULTS.company } }; if (co.site) { try { co.iconUrl = icon(new URL(/^https?:/.test(co.site) ? co.site : `https://${co.site}`).hostname); } catch {} } await setJSON(K.org(co.id), co); await addMember(co, me.id, 'owner'); }
  if (co.fundId && co.fundId !== org.id) throw fail(400, 'That company is already in another fund.');
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
  const tool = { id: rid(10), name, description: clean(b.description, 280), owner: me.id, orgId, createdAt: now(), hash: randomBytes(8).toString('hex'), checks: 7, hours: Math.min(400, Math.max(1, Math.round(+b.hours) || 8)), uses: [] };
  await pipeline([['SET', K.tool(tool.id), JSON.stringify(tool)], ['SADD', K.utools(me.id), tool.id], ...(orgId ? [['SADD', K.otools(orgId), tool.id]] : [])]);
  await log(orgId, me.name, 'Added a tool', name); return { tool };
});
on('GET', 'tools/mine', async (req, res, me) => {
  const tools = (await getMany((await cmd('SMEMBERS', K.utools(me.id))).map(K.tool))).filter(Boolean);
  const grants = []; for (const t of tools) grants.push(...(await getMany((await cmd('SMEMBERS', K.tgrants(t.id))).map(K.grant))).filter(Boolean));
  return { tools, grants };
});
const canManageTool = async (t, uid) => t.owner === uid || (t.orgId && isAdmin(await membership(t.orgId, uid)));
on('DELETE', 'tools/:id', async (req, res, me, p) => {
  const t = await getJSON(K.tool(p.id)); if (!t || !(await canManageTool(t, me.id))) throw fail(404, 'Not found.');
  const gids = await cmd('SMEMBERS', K.tgrants(t.id)), gs = (await getMany(gids.map(K.grant))).filter(Boolean);
  const cmds = [['DEL', K.tool(t.id), K.tgrants(t.id)], ['SREM', K.utools(t.owner), t.id], ...(t.orgId ? [['SREM', K.otools(t.orgId), t.id]] : [])];
  for (const g of gs) { cmds.push(['DEL', K.grant(g.id)]); if (g.target.type === 'org') cmds.push(['SREM', K.ogrants(g.target.orgId), g.id]); else cmds.push(['SREM', K.ugrants(g.target.userId), g.id]); }
  await pipeline(cmds); await log(t.orgId, me.name, 'Removed a tool', t.name); return { ok: true };
});
on('POST', 'tools/:id/grants', async (req, res, me, p) => {
  const t = await getJSON(K.tool(p.id)); if (!t || t.owner !== me.id) throw fail(404, 'Only a tool’s author can share it.');
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

// someone downloaded or adapted a tool they can see: counts toward reuse, for the tool's company, theirs and the fund
on('POST', 'tools/:id/uses', async (req, res, me, p) => {
  const t = await getJSON(K.tool(p.id)); if (!t) throw fail(404, 'Not found.');
  const kind = req.body?.kind === 'adapt' ? 'adapt' : 'download';
  let toCo = (await membership(t.orgId, me.id)) ? t.orgId : null;
  if (!toCo) { const gs = (await getMany((await cmd('SMEMBERS', K.tgrants(t.id))).map(K.grant))).filter(Boolean), cache = { [t.id]: t };
    for (const g of gs) if (await grantReaches(g, me.id, cache)) { toCo = g.target.companyId || g.target.orgId || t.orgId; break; } }
  if (!toCo || t.owner === me.id) throw fail(404, 'Not found.');
  t.uses ||= []; if (t.uses.some((u) => u.uid === me.id && u.kind === kind)) return { ok: true, already: true };
  const [from, to] = await getMany([K.org(t.orgId), K.org(toCo)]);
  const ev = { at: now(), toolId: t.id, tool: t.name, kind, hours: t.hours || 0, by: me.name, from: from && { id: from.id, name: from.name, iconUrl: from.iconUrl }, to: to && { id: to.id, name: to.name, iconUrl: to.iconUrl } };
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
  const map = (src, ok) => ({ source: src, binding: { timeColumn: 'time', signalColumn: 'value', unit: '', skipUnitsRow: false, timeBasis: 'utc', cadenceSeconds: 60 }, columns: [], result: { state: ok ? 'verified' : 'draft', detail: ok ? '1,440 observations · 0 missing timestamps' : 'Waiting for a sample' }, at: at(20) });
  const COS = [
    ['saildrone', 'Saildrone', 'saildrone.com', 'saildrone.png', 'ERDDAP / NetCDF', true, [['Fabio Rossi', 'fabio-sd', 'owner'], ['Theo Park', 'theo-sd', 'member'], ['Ines Duarte', 'ines-sd', 'member'], ['Sam Okafor', 'sam-sd', 'member']]],
    ['palmetto', 'Palmetto', 'palmetto.com', 'palmetto.png', 'SolarEdge', true, [['Maya Chen', 'maya-pm', 'owner'], ['Leo Grant', 'leo-pm', 'member'], ['Elli Novak', 'elli-pm', 'member']]],
    ['mast', 'Mast Reforestation', 'mast.eco', 'mast.png', 'Sensor logger', true, [['Rhea Malik', 'rhea-ml', 'owner'], ['Jon Bell', 'jon-ms', 'member']]],
    ['groq', 'Groq', 'groq.com', 'groq.svg', 'Other CSV', false, [['Kai Moreno', 'kai-gq', 'owner']]],
    ['netskope', 'Netskope', 'netskope.com', 'netskope.webp', '', false, []],
  ];
  const co = {}, ppl = {};
  for (const [key, name, site, , src, ok, people] of COS) {
    const c = { id: `c${sx}${key.slice(0, 3)}`, kind: 'company', name, site, iconUrl: icon(site), createdAt: at(25), owner: null, demo: true, fundId: fund.id, status: ok ? 'joined' : 'invited', settings: { ...DEFAULTS.company }, ...(src ? { mapping: map(src, ok) } : {}) };
    co[key] = c;
    for (const [pname, gh, role] of people) { const u = { id: `u${sx}${gh}`, email: `${gh}@example.com`, name: pname, handle: gh, picture: '', createdAt: at(25), demo: true }; ppl[gh] = u; cmds.push(['SET', K.user(u.id), JSON.stringify(u)]); mem(c, u.id, role); if (role === 'owner') c.owner = u.id; }
    cmds.push(['SADD', K.fundcos(fund.id), c.id]);
  }
  mem(co.saildrone, me.id, 'admin'); // so the demo can show a company's side too
  const TOOLS = [
    ['telemetry-inspector', 'saildrone', 'fabio-sd', 'Finds missing, duplicate and off-grid readings in any sensor time series before they reach a model.', 16, [['palmetto', 'maya-pm', 'adapt', 6], ['mast', 'rhea-ml', 'download', 3], ['saildrone', 'theo-sd', 'download', 9]]],
    ['glider-dashboard', 'saildrone', 'theo-sd', 'Live map of every vehicle with battery, heading and last fix.', 24, [['saildrone', 'ines-sd', 'download', 12]]],
    ['pv-gap-finder', 'palmetto', 'maya-pm', 'Flags dropped inverter intervals and fills short gaps without inventing peaks.', 12, [['saildrone', 'fabio-sd', 'adapt', 4], ['mast', 'jon-ms', 'download', 2]]],
    ['inverter-alarm-digest', 'palmetto', 'leo-pm', 'One morning summary of overnight inverter alarms, grouped by site.', 6, []],
    ['canopy-sensor-qa', 'mast', 'rhea-ml', 'Checks soil-moisture loggers for drift and stuck values across a planting.', 10, [['palmetto', 'elli-pm', 'download', 1]]],
  ];
  const reuse = { [fund.id]: [] };
  for (const [name, ck, gh, desc, hours, uses] of TOOLS) {
    const c = co[ck], author = ppl[gh], t = { id: `t${sx}${name.slice(0, 6)}`, name, description: desc, owner: author.id, orgId: c.id, createdAt: at(15), hash: randomBytes(8).toString('hex'), checks: 7, hours, uses: [], demo: true };
    const grant = (target, scope, d) => { const g = { id: rid(10), toolId: t.id, issuer: author.id, revoked: false, at: at(d + 0.5), scope, target, expiresAt: new Date(Date.now() + (scope === 'portfolio' ? 7 : 30) * DAY).toISOString() }; cmds.push(['SET', K.grant(g.id), JSON.stringify(g)], ['SADD', K.tgrants(t.id), g.id], target.type === 'org' ? ['SADD', K.ogrants(target.orgId), g.id] : ['SADD', K.ugrants(target.userId), g.id]); };
    grant({ type: 'org', orgId: c.id }, 'team', 14);
    for (const [tk, ugh, kind, d] of uses) {
      const to = co[tk], u = ppl[ugh];
      if (tk !== ck) grant({ type: 'user', userId: u.id, companyId: to.id }, 'portfolio', d);
      t.uses.push({ at: at(d), uid: u.id, companyId: to.id, kind });
      const ev = { at: at(d), toolId: t.id, tool: name, kind, hours, by: u.name, from: { id: c.id, name: c.name, iconUrl: c.iconUrl }, to: { id: to.id, name: to.name, iconUrl: to.iconUrl } };
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
