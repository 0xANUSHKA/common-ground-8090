// "Who gets it?": the permission check from server/policy.ts (canReceive + fit), run on the repo's seed people.
// Pick a person; the checks run in order and stop at the first that fails, the way the server does. Each row ends in a
// plain status word, and the outcome is one sentence.
const PEOPLE = {
  theo: { name: 'Theo', company: 'saildrone', named: true, receiver: true, fit: true },
  maya: { name: 'Maya', company: 'palmetto', named: true, receiver: true, fit: true },
  elli: { name: 'Elli', company: 'palmetto', named: true, receiver: false, fit: true },
  leo: { name: 'Leo', company: 'palmetto', named: true, receiver: true, fit: false },
};
const WORD = { pass: 'passes', fail: 'fails', skip: 'not checked' };
const CHECKS = [
  ['In the standard', () => true],
  ['Exact version, 7 of 7 checks', () => true],
  ['Not revoked', (p, f) => !f.revoke],
  ['Named in the grant', (p) => p.named],
  ['Company lets them receive', (p) => p.receiver],
  ['Their setting allows it', (p, f) => !(f.off && p.name === 'Maya')],
  ['Same kind of data', (p) => p.fit],
];

export function gate(el) {
  if (!el) return;
  const list = el.querySelector('[data-checks]'), out = el.querySelector('[data-out]');
  const people = [...el.querySelectorAll('[data-who]')], flips = [...el.querySelectorAll('[data-flip]')];
  let who = 'theo';

  const run = () => {
    const p = PEOPLE[who], f = Object.fromEntries(flips.map((x) => [x.dataset.flip, x.checked]));
    let failed = -1;
    list.innerHTML = CHECKS.map(([label, test], i) => {
      const state = failed >= 0 ? 'skip' : test(p, f) ? 'pass' : (failed = i, 'fail');
      return `<li class="is-${state}" style="--i:${i}"><span>${label}</span><em>${WORD[state]}</em></li>`;
    }).join('');
    const ok = failed < 0;
    out.className = 'gate-out ' + (ok ? 'is-delivered' : 'is-blocked');
    out.innerHTML = ok
      ? `<p class="go-h"><span class="is-ok">Delivered.</span> ${p.name} sees it.</p><p class="go-sub">telemetry-inspector appears in ${p.name}’s Recent list in VS Code, this exact version only.</p>`
      : `<p class="go-h"><span class="is-bad">Not delivered.</span> ${p.name} sees nothing.</p><p class="go-sub">It stopped at “${CHECKS[failed][0]}”, so nothing is sent.</p>`;
    list.classList.remove('is-run'); out.classList.remove('is-run'); void list.offsetWidth; list.classList.add('is-run'); out.classList.add('is-run');
  };

  const pick = (b) => { who = b.dataset.who; people.forEach((x) => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; }); run(); };
  people.forEach((b) => b.addEventListener('click', () => pick(b)));
  el.querySelector('[role=radiogroup]').addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const i = people.findIndex((x) => x.dataset.who === who), n = people[(i + d + people.length) % people.length];
    n.focus(); pick(n);
  });
  people.forEach((x) => { x.tabIndex = x.dataset.who === who ? 0 : -1; });
  flips.forEach((x) => x.addEventListener('change', run));
  run();
}
