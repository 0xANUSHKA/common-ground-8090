// Shared by the overview films: play while on screen, pause when scrolled away; at the end hold the last frame for a
// beat, then play again from the start. ?t=12.5 or ?record freeze a moment; reduced motion never auto-plays.
const q = new URLSearchParams(location.search);
export const frozen = q.has('t') || q.has('record');
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function autoplay(tour, el, toggle) {
  let paused = false;
  if (toggle) {
    toggle.textContent = reduced || frozen ? 'Play walkthrough' : 'Pause walkthrough';
    toggle.addEventListener('click', () => {
      if (tour.playing) { paused = true; tour.pause(); toggle.textContent = 'Play walkthrough'; }
      else { paused = false; tour.play(); toggle.textContent = 'Pause walkthrough'; }
    });
  }
  if (frozen || reduced) return;
  let visible = false, ready = false, hold = 0;
  const go = () => { if (visible && ready && !tour.playing && !hold && !paused) tour.play(); };
  tour.api.ready.then(() => { ready = true; go(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) go(); else tour.pause(); }, { threshold: .35 }).observe(el);
  el.addEventListener('tour:end', () => {
    hold = setTimeout(() => { hold = 0; if (!paused) { tour.render(0, true); go(); } }, 2600);
  });
}
