// The overview page. The film plays inside the hero: it starts by itself when it's on screen, runs start to finish with
// no controls, holds on the last frame, then plays again. The title sequence runs off the film's own clock, so every
// frame is still a function of t. ?t=12.5 freezes a moment for checking. Reduced motion shows one still frame.
import { film } from './film/section.js';
import { INTRO } from './film/script.js';
import { paint } from './film/lilguy.js';
import { gate } from './gate.js';

paint(document.querySelector('main'));

// below-the-fold backgrounds load only as they come near the viewport (site.css hides them until .is-near)
const lazy = document.querySelectorAll('[data-lazy-bg]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-near'); io.unobserve(e.target); } }), { rootMargin: '600px 0px' });
  lazy.forEach((el) => io.observe(el));
} else lazy.forEach((el) => el.classList.add('is-near'));
gate(document.querySelector('[data-gate]'));

const root = document.getElementById('film');
const q = new URLSearchParams(location.search);
const frozen = q.has('t') || q.has('record');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// title sequence: the logo and name, two lines, then the window rises in
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const span = (t, a, b, c, d) => ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c)));
const titles = (t) => {
  const s = root.style;
  s.setProperty('--fi-c', span(t, .1, .6, 1.55, 1.85).toFixed(3));
  s.setProperty('--fi-a', span(t, 1.9, 2.3, 3.05, 3.35).toFixed(3));
  s.setProperty('--fi-b', span(t, 3.4, 3.75, INTRO - .9, INTRO - .6).toFixed(3));
  s.setProperty('--win-in', ease((t - (INTRO - .55)) / .75).toFixed(3));
};

const tour = film(root);
tour.onFrame = titles;
titles(reduced && !frozen ? 99 : tour.t);

if (!frozen && !reduced) {
  let visible = false, ready = false, hold = 0;
  const go = () => { if (visible && ready && !tour.playing && !hold) tour.play(); };
  tour.api.ready.then(() => { ready = true; go(); });
  // play while on screen, pause when scrolled away
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) go(); else tour.pause(); }, { threshold: .35 }).observe(root);
  // at the end, hold the last frame for a beat, then play again from the logo
  root.addEventListener('tour:end', () => {
    hold = setTimeout(() => { hold = 0; tour.render(0, true); go(); }, 2600);
  });
}
