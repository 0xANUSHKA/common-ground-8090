// Browser client for /api. live() says whether the server is ready (database + Google sign-in);
// until it is, the site runs on the seeded demo in the browser.
let statusP;
export const status = () => statusP ||= fetch('/api/status', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
export const live = async () => { if (new URLSearchParams(location.search).has('demo')) return false; const s = await status(); return !!(s && s.database && s.signIn); };

export async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch(`/api/${path}`, { method, headers: body !== undefined || method !== 'GET' ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : method !== 'GET' ? '{}' : undefined, credentials: 'same-origin' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `Request failed (${r.status})`), { status: r.status });
  return data;
}
export const googleUrl = (next) => `/api/auth/google?next=${encodeURIComponent(next || '/dashboard/')}`;
export const inviteUrl = (code) => `${location.origin}/join/?invite=${code}`;
// the Google "G", for sign-in buttons
export const G = '<svg viewBox="0 0 18 18" aria-hidden="true" style="width:18px;height:18px"><path fill="#4285F4" stroke="none" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" stroke="none" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.7H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" stroke="none" d="M3.9 10.8a5.4 5.4 0 0 1 0-3.6V4.9H.9a9 9 0 0 0 0 8.2z"/><path fill="#EA4335" stroke="none" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 .9 4.9l3 2.3C4.6 5.1 6.6 3.6 9 3.6z"/></svg>';
