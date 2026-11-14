// Sign in: find your account by GitHub username (prototype: no passwords, nothing leaves the browser), or pick a demo
// account at each level. Then back to where you were headed (?next=dashboard#...), the dashboard by default.
import { load, save, session, me } from '../store.js';
import { lilGuy } from '../film/lilguy.js';

const S = load(); save(S);
const q = new URLSearchParams(location.search);
const next = /^dashboard(#[\w/-]*)?$/.test(q.get('next') || '') ? `../${q.get('next').replace(/^dashboard/, 'dashboard/')}` : '../dashboard/';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const go = (u) => { session.set(u.id); location.href = next; };

if (me(S)) location.replace(next);

const input = document.getElementById('handle'), face = document.getElementById('gh-lg'), err = document.getElementById('err');
const draw = () => { const h = input.value.trim().replace(/^@/, ''); face.innerHTML = h ? lilGuy(h) : ''; face.classList.toggle('is-on', !!h); };
input.addEventListener('input', () => { err.innerHTML = ''; draw(); });
if (q.get('handle')) { input.value = q.get('handle'); draw(); }

document.getElementById('gh').addEventListener('submit', (e) => {
  e.preventDefault();
  const h = input.value.trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(h)) { err.textContent = 'That isn’t a GitHub username.'; input.focus(); return; }
  const u = S.users.find((x) => x.handle.toLowerCase() === h.toLowerCase());
  if (u) return go(u);
  err.innerHTML = `No account for @${esc(h)}. <a href="../join/?handle=${encodeURIComponent(h)}">Join with @${esc(h)}</a>`;
});

// one of each level
const DEMO = [['sam', 'Individual'], ['fabio', 'Saildrone · admin'], ['theo', 'Saildrone'], ['maya', 'Palmetto · admin'], ['pat', 'Fund'], ['kai', 'Individual']];
const demo = document.getElementById('demo');
demo.innerHTML = DEMO.map(([id, role]) => { const u = S.users.find((x) => x.id === id); return u ? `<button type="button" data-id="${id}"><span class="cg-lg">${lilGuy(u.handle)}</span><b>${esc(u.name)}</b><small>${role}</small></button>` : ''; }).join('');
demo.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) go(S.users.find((x) => x.id === b.dataset.id)); });
