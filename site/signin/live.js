// Sign in, live: Google only. Signed-in people go straight on to where they were headed.
import { api, googleUrl, G } from '../api.js';

const q = new URLSearchParams(location.search);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const raw = q.get('next') || '';
const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : /^dashboard/.test(raw) ? `/${raw.replace(/^dashboard/, 'dashboard/')}` : '/dashboard/';

try { await api('me'); location.replace(next); } catch {}

document.querySelector('.auth-card').innerHTML = `<h1>Sign in</h1>`
  + `<a class="btn is-blue is-full" href="${esc(googleUrl(next))}">${G}Continue with Google</a>`
  + `<p class="err" role="alert">${esc(q.get('error') || '')}</p>`
  + `<p class="auth-alt">New here? <a href="../join/">Join</a> · <a href="./?demo">Try the demo</a></p>`;
document.querySelector('.auth-fine').textContent = 'Google sign-in · we see your name and email, nothing else';
