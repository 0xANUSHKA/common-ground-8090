// Local dev server for the live site: the static pages plus /api/* through the real handler (api/index.js), on an
// in-memory stand-in for Upstash's REST API. No Google or database keys needed.
//   npm run dev          → http://localhost:3000 (fresh, empty database every start)
// "Continue with Google" opens a local sign-in instead: type any name and you're that person, so you can play several
// people in different browsers or private windows. /dashboard/?demo still gives the seeded in-browser demo.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.csv': 'text/csv', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

// the Redis commands api/ uses, over Upstash's REST shape (POST [cmd, ...args] → {result}; /pipeline → [{result}])
function fakeRedis() {
  const db = new Map();
  const run = ([c, k, ...r]) => { switch (String(c).toUpperCase()) {
    case 'GET': return typeof db.get(k) === 'string' ? db.get(k) : null;
    case 'SET': db.set(k, String(r[0])); return 'OK';
    case 'MGET': return [k, ...r].map((x) => typeof db.get(x) === 'string' ? db.get(x) : null);
    case 'DEL': return [k, ...r].filter((x) => db.delete(x)).length;
    case 'HSET': { const h = db.get(k) || new Map(); db.set(k, h); for (let i = 0; i < r.length; i += 2) h.set(String(r[i]), String(r[i + 1])); return 1; }
    case 'HGET': return db.get(k)?.get(String(r[0])) ?? null;
    case 'HGETALL': return [...(db.get(k) || new Map())].flat();
    case 'HDEL': return db.get(k)?.delete(String(r[0])) ? 1 : 0;
    case 'HLEN': return db.get(k)?.size || 0;
    case 'SADD': { const s = db.get(k) || new Set(); db.set(k, s); r.forEach((x) => s.add(String(x))); return 1; }
    case 'SREM': { r.forEach((x) => db.get(k)?.delete(String(x))); return 1; }
    case 'SMEMBERS': return [...(db.get(k) || [])];
    case 'LPUSH': { const l = db.get(k) || []; db.set(k, l); l.unshift(...r.map(String).reverse()); return l.length; }
    case 'LTRIM': db.set(k, (db.get(k) || []).slice(+r[0], +r[1] + 1)); return 'OK';
    case 'LRANGE': return (db.get(k) || []).slice(+r[0], +r[1] + 1);
    default: throw new Error(`fake redis: ${c} isn't implemented (add it in site/dev/serve.mjs)`);
  } };
  return http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    const body = JSON.parse(b || 'null'), one = (a) => { try { return { result: run(a) }; } catch (e) { return { error: e.message }; } };
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(req.url === '/pipeline' ? body.map(one) : one(body)));
  }); });
}
const listen = (server, port) => new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server.address().port)));

export async function start({ port = +process.env.PORT || 3000, quiet = false } = {}) {
  const kvPort = await listen(fakeRedis(), 0);
  Object.assign(process.env, { KV_REST_API_URL: `http://127.0.0.1:${kvPort}`, KV_REST_API_TOKEN: 'local', SESSION_SECRET: 'local-dev-only', GOOGLE_CLIENT_ID: 'local', GOOGLE_CLIENT_SECRET: 'local' });
  const { default: handler } = await import(path.join(SITE, 'api/index.js'));
  const { startSession, safeNext } = await import(path.join(SITE, 'api/_auth.js'));
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    req.headers['x-forwarded-proto'] = 'http';
    if (u.pathname === '/api/auth/google') { // local stand-in for Google
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<!doctype html><meta name="viewport" content="width=device-width"><title>Local sign-in</title><body style="font:16px system-ui;background:#0b0b0d;color:#eee;display:grid;place-items:center;height:90vh"><form action="/dev-login" style="display:grid;gap:10px;width:300px"><b>Local sign-in (stands in for Google)</b><input name="as" placeholder="Name, e.g. nush" required autofocus style="padding:10px"><input name="gh" placeholder="GitHub username (optional)" style="padding:10px"><input type="hidden" name="next" value="${safeNext(u.searchParams.get('next')).replace(/"/g, '&quot;')}"><button style="padding:10px">Sign in</button></form>`);
    }
    if (u.pathname === '/dev-login') { // ?as=<name>[&gh=<github>][&next=/path]: become that person
      const name = (u.searchParams.get('as') || 'you').trim().slice(0, 40), id = 'local_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const r = await fetch(`${process.env.KV_REST_API_URL}/pipeline`, { method: 'POST', body: JSON.stringify([['GET', `user:${id}`]]) }).then((x) => x.json());
      if (!r[0].result) await fetch(process.env.KV_REST_API_URL, { method: 'POST', body: JSON.stringify(['SET', `user:${id}`, JSON.stringify({ id, email: `${id.slice(6)}@local.test`, name, handle: u.searchParams.get('gh') || '', picture: '', createdAt: new Date().toISOString(), pref: { mode: 'portfolio', muted: [] } })]) });
      startSession(res, req, id); res.statusCode = 302; res.setHeader('Location', safeNext(u.searchParams.get('next'))); return res.end();
    }
    if (u.pathname.startsWith('/api/')) { // what vercel.json's rewrite + Vercel's Node runtime do
      req.query = { ...Object.fromEntries(u.searchParams), p: u.pathname.slice(5) };
      let b = ''; for await (const d of req) b += d;
      try { req.body = b && req.headers['content-type']?.includes('json') ? JSON.parse(b) : {}; } catch { req.body = {}; }
      return handler(req, res);
    }
    let f = path.join(SITE, decodeURIComponent(u.pathname));
    if (!f.startsWith(SITE)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end('Not found'); } res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); res.end(d); });
  });
  const p = await listen(server, port);
  if (!quiet) console.log(`Common Ground (local, empty database): http://localhost:${p}`);
  return { url: `http://127.0.0.1:${p}`, close: () => server.close() };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) start();
