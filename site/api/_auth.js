// Sessions and Google sign-in. A session is an HMAC-signed cookie (SESSION_SECRET) holding the user id and expiry.
// Google: the standard authorization-code flow; the ID token comes straight from Google's token endpoint over TLS.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || '';
const b64 = (s) => Buffer.from(s).toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url').toString();
const sign = (body) => createHmac('sha256', SECRET).update(body).digest('base64url');

export const authReady = () => !!(SECRET && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function seal(obj) { const body = b64(JSON.stringify(obj)); return `${body}.${sign(body)}`; }
export function unseal(token) {
  if (!SECRET || !token || !token.includes('.')) return null;
  const [body, mac] = token.split('.'), want = sign(body);
  if (mac.length !== want.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  const v = JSON.parse(unb64(body));
  return v.exp && v.exp < Date.now() ? null : v;
}
export function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map((c) => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; })); }
const secure = (req) => (req.headers['x-forwarded-proto'] || 'https') === 'https';
export function setCookie(res, req, name, value, maxAgeSec) {
  const prev = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [...[].concat(prev), `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure(req) ? '; Secure' : ''}`]);
}
export const sessionUser = (req) => unseal(cookies(req).cg_session)?.uid || null;
export const startSession = (res, req, uid) => setCookie(res, req, 'cg_session', seal({ uid, exp: Date.now() + 30 * 86400000 }), 30 * 86400);
export const endSession = (res, req) => setCookie(res, req, 'cg_session', '', 0);

const origin = (req) => `${secure(req) ? 'https' : 'http'}://${req.headers.host}`;
export const redirectUri = (req) => `${origin(req)}/api/auth/callback`;
// only same-site paths may be returned to after sign-in
export const safeNext = (n) => (typeof n === 'string' && /^\/(?!\/)[\w\-./?#=&%]*$/.test(n) ? n : '/dashboard/');

export function googleStart(req, res, next) {
  const nonce = randomBytes(16).toString('base64url');
  setCookie(res, req, 'cg_oauth', nonce, 600);
  const state = seal({ next: safeNext(next), nonce, exp: Date.now() + 600000 });
  const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(req), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
  res.statusCode = 302; res.setHeader('Location', `https://accounts.google.com/o/oauth2/v2/auth?${q}`); res.end();
}
export async function googleFinish(req) {
  const st = unseal(req.query.state);
  if (!st || st.nonce !== cookies(req).cg_oauth) throw Object.assign(new Error('Sign-in expired. Try again.'), { status: 400 });
  if (req.query.error) throw Object.assign(new Error('Google sign-in was cancelled.'), { status: 400 });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: String(req.query.code || ''), client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri(req), grant_type: 'authorization_code' }) });
  const tok = await r.json();
  if (!r.ok || !tok.id_token) throw Object.assign(new Error('Google didn’t accept the sign-in.'), { status: 400 });
  const claims = JSON.parse(unb64(tok.id_token.split('.')[1]));
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.exp * 1000 < Date.now() || !claims.email_verified)
    throw Object.assign(new Error('That Google account couldn’t be verified.'), { status: 400 });
  return { next: st.next, sub: claims.sub, email: String(claims.email).toLowerCase(), name: claims.name || claims.email.split('@')[0], picture: claims.picture || '' };
}
