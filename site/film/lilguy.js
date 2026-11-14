// A "lil guy": a tiny person drawn from a GitHub handle. The same handle always gets the same person.
// lilGuy('fabio-at-sea') returns an SVG string; paint(root) fills every [data-lilguy="handle"] inside root.

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (r, a) => a[Math.floor(r() * a.length)];

const SKIN = ['#f6d2b8', '#eebf9c', '#d9a07a', '#bf8460', '#9a6444', '#6f4630'];
const HAIR = ['#2a211c', '#3d2a1f', '#5b3a24', '#8a5a33', '#c08a4a', '#d9b26a', '#9a9a9a', '#1f2a3a'];
const SHIRT = ['#3f6fd8', '#2e8b6a', '#d4583b', '#7a5bd0', '#e0a43a', '#3a3f4a', '#c4466e', '#2f97a8'];
const BG = ['#dfe9f7', '#e3f1e6', '#f6e3d6', '#ece3f6', '#f5ecd2', '#dcefee', '#f3dde4'];
const INK = '#221b17';
let uid = 0;

export function lilGuy(handle) {
  const r = rng(hash(handle));
  const bg = pick(r, BG), skin = pick(r, SKIN), hair = pick(r, HAIR), shirt = pick(r, SHIRT);
  const style = pick(r, ['short', 'short', 'long', 'bun', 'curly', 'buzz', 'side', 'bald']);
  const glasses = r() > .7, beard = style !== 'long' && r() > .78;
  const collar = pick(r, ['crew', 'vee', 'hood']);
  const cx = 20, cy = 17, R = 8.4;

  // shoulders and shirt
  let s = `<rect width="40" height="40" fill="${bg}"/>`;
  s += `<path d="M6 40c0-7.4 6-12 14-12s14 4.6 14 12z" fill="${shirt}"/>`;
  if (collar === 'hood') s += `<path d="M12.5 30.2c2.2 2.6 4.6 3.6 7.5 3.6s5.3-1 7.5-3.6" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1.6"/>`;
  s += `<rect x="17.4" y="23" width="5.2" height="6.4" rx="2" fill="${skin}"/>`;
  s += collar === 'vee' ? `<path d="M16.6 28.6 20 32.6l3.4-4z" fill="${skin}"/>` : `<path d="M16.4 28.8q3.6 2.4 7.2 0" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="1.2"/>`;

  // hair behind the head
  if (style === 'long') s += `<path d="M${cx - R - 1.2} ${cy}c0-6 4-9.6 ${R + 1.2}-9.6s${R + 1.2} 3.6 ${R + 1.2} 9.6v10.4h-${2 * R + 2.4}z" fill="${hair}"/>`;
  if (style === 'bun') s += `<circle cx="${cx}" cy="${cy - R - 1.6}" r="3.6" fill="${hair}"/>`;

  // ears and head
  s += `<circle cx="${cx - R}" cy="${cy + 1}" r="1.8" fill="${skin}"/><circle cx="${cx + R}" cy="${cy + 1}" r="1.8" fill="${skin}"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R + .6}" fill="${skin}"/>`;

  // hair on top
  const top = {
    short: `<path d="M${cx - R - .3} ${cy - .4}c-.4-6 3.6-9.6 ${R + .3}-9.6s${R + .9} 3.4 ${R + .4} 9.2c-2.6-1.6-4.6-4.6-5.2-6.4c-2.6 2.6-7 4.6-11.2 6.8z" fill="${hair}"/>`,
    long: `<path d="M${cx - R - .4} ${cy + 1}c-.6-6.6 3.4-10.4 ${R + .4}-10.4s${R + 1} 3.8 ${R + .4} 10.4c-3.2-2-5.4-5-6-7.4c-2.4 3.4-6.4 5.6-11.2 7.4z" fill="${hair}"/>`,
    bun: `<path d="M${cx - R - .2} ${cy - .6}c0-5.8 3.6-9 ${R + .2}-9s${R + .2} 3.2 ${R + .2} 9c-5-1.2-11-1.8-16.4 0z" fill="${hair}"/>`,
    curly: [-6.4, -3.2, 0, 3.2, 6.4, -7.6, 7.6].map((dx, i) => `<circle cx="${cx + dx}" cy="${cy - R + (i > 4 ? 3.4 : (Math.abs(dx) > 5 ? 1.2 : -.6))}" r="${i > 4 ? 2.6 : 3.2}" fill="${hair}"/>`).join(''),
    buzz: `<path d="M${cx - R + .2} ${cy - 1.6}c.4-5 3.6-7.6 ${R - .2}-7.6s${R - .6} 2.6 ${R - .2} 7.6c-5-1.6-11.2-1.6-16.4 0z" fill="${hair}" opacity=".85"/>`,
    side: `<path d="M${cx - R - .3} ${cy}c-.4-6.4 3.8-9.8 ${R + .3}-9.8s${R + .6} 3.4 ${R + .3} 8.8c-4.6-.4-9.8-2.2-12.6-5.6c-.6 2.4-2 4.6-4 6.6z" fill="${hair}"/>`,
    bald: `<path d="M${cx - R + .2} ${cy + 1.6}c-.2-1.8.2-3.2 1-4.2M${cx + R - .2} ${cy + 1.6}c.2-1.8-.2-3.2-1-4.2" fill="none" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>`,
  }[style];
  s += top;

  // face
  const ey = cy + 1.2, gap = 3.2;
  s += `<circle cx="${cx - gap}" cy="${ey}" r="1.05" fill="${INK}"/><circle cx="${cx + gap}" cy="${ey}" r="1.05" fill="${INK}"/>`;
  if (beard) s += `<path d="M${cx - R + .8} ${cy + 2.4}c.6 5 3.6 7.6 ${R - .8} 7.6s${R - 1.4} -2.6 ${R - .8} -7.6c-1.6 1.8-3.8 2.6-${R - .8} 2.6s-6.4-.8-${R - .8}-2.6z" fill="${hair}"/>`;
  s += `<path d="M${cx - 1.8} ${ey + 3.2}q1.8 1.5 3.6 0" fill="none" stroke="${beard ? '#f3e9df' : INK}" stroke-width="1" stroke-linecap="round"/>`;
  s += `<circle cx="${cx - gap - 2}" cy="${ey + 2.2}" r="1.3" fill="#e2735f" opacity=".22"/><circle cx="${cx + gap + 2}" cy="${ey + 2.2}" r="1.3" fill="#e2735f" opacity=".22"/>`;
  if (glasses) s += `<g fill="none" stroke="${INK}" stroke-width=".8"><circle cx="${cx - gap}" cy="${ey}" r="2.4"/><circle cx="${cx + gap}" cy="${ey}" r="2.4"/><path d="M${cx - .8} ${ey}h1.6"/></g>`;

  const id = `lgc${++uid}`;
  return `<svg viewBox="0 0 40 40" aria-hidden="true" class="lg"><defs><clipPath id="${id}"><circle cx="20" cy="20" r="20"/></clipPath></defs>`
    + `<g clip-path="url(#${id})">${s}</g></svg>`;
}

export function paint(root) {
  for (const el of root.querySelectorAll('[data-lilguy]')) el.innerHTML = lilGuy(el.dataset.lilguy);
}
