// The right side of the top bar on every page: "Sign in" and "Join" when signed out, your lil guy when signed in.
// Usage: <div class="nav-user" data-nav-user data-root="../"></div> (data-root: the path back to site/).
import { load, me } from './store.js';
import { lilGuy } from './film/lilguy.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function navUser() {
  const el = document.querySelector('[data-nav-user]');
  if (!el) return null;
  const root = el.dataset.root || './', u = me(load());
  el.innerHTML = u
    ? `<a class="nav-me" href="${root}dashboard/" title="Your dashboard"><span class="cg-lg">${lilGuy(u.handle)}</span><span>${esc(u.name)}</span></a>`
    : `<a class="nav-link" href="${root}signin/">Sign in</a><a class="btn is-primary" href="${root}join/">Join</a>`;
  // the Dashboard tab goes through sign-in when nobody is signed in
  if (!u) document.querySelectorAll('[data-dash-tab]').forEach((a) => { a.href = `${root}signin/?next=dashboard`; });
  return u;
}
navUser();
