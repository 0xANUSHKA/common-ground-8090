// The right side of the top bar on the public pages: "Sign in" and "Get started" when signed out, you when signed in.
// Usage: <div class="nav-user" data-nav-user data-root="../"></div> (data-root: the path back to site/).
import { lilGuy } from './film/lilguy.js';
import { api } from './api.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const seed = (u) => (u.handle || (u.email || u.name || 'you').split('@')[0]).replace(/[^\w-]/g, '') || 'you';

export async function navUser() {
  const el = document.querySelector('[data-nav-user]');
  if (!el) return null;
  const root = el.dataset.root || './';
  // Signing in from an invitation must return to that invitation, not an old workspace.
  const next = /^\/join\/?$/.test(location.pathname) ? location.pathname + location.search + location.hash : '/dashboard/';
  const signIn = `${root}signin/?next=${encodeURIComponent(next)}`;
  let u = null; try { u = (await api('me')).user; } catch {}
  el.innerHTML = u
    ? `<a class="nav-me" href="${root}dashboard/" title="Your dashboard"><span class="cg-lg">${lilGuy(seed(u))}</span><span>${esc(u.name)}</span></a>`
    : `<a class="nav-link" href="${esc(signIn)}">Sign in</a><a class="btn is-primary" href="${root}join/">Get started</a>`;
  if (!u) document.querySelectorAll('[data-dash-tab]').forEach((a) => { a.href = `${root}signin/`; });
  return u;
}
navUser();
