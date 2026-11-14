/* The Common Ground film, on the tour engine (../tour/README.md). Every frame is a function of t.
   01  Fabio's agent at Saildrone finishes; the factory's seven checks run outside it (one fails, the agent repairs,
       all pass) and the exact version is sealed as c54c31b.
   02  The Common Ground tab opens: who should get it next, with each company's brief as evidence. Fabio shares it
       with Maya at Palmetto.
   03  Maya's editor: the share arrives, she runs it on her own solar data. 3 missing timestamps and 1 duplicate,
       same source c54c31b.
   No camera moves: the window is shown whole. Check any moment with ?t=12.5 in the address. */
import { click, type, show, hide, set, tween, stream, chapter, pause } from '../tour/tour.js';

const clock = (s) => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;
export const INTRO = .6;    // a beat before the first step; no title sequence, the window is there from the start

export default {
  size: [1200, 750],
  enter: [.62, .97],
  intro: 0,
  outro: 1,
  fit: [.95, .8, .6],
  still: 31,                // reduced motion: Maya's solar run, with the result
  steps: [
    pause(INTRO),

    // ── 01 · the agent builds, the factory checks ──────────────────────────
    chapter('01 / 03', 'The factory <em>builds and checks</em> it', 'Fabio’s agent finishes. Seven checks run outside it, in a sandbox.'),
    tween('@timer', 'text', 8046, 8058, { dur: 5.4, fmt: (v) => `Working · ${clock(v)}`, ease: (t) => t }),
    tween('.ag-spin', '--a', 0, 6, { dur: 5.4, ease: (t) => t }),
    tween('@code', 'scrollTop', 0, 120, { dur: 4.6, ease: 'out' }),
    set('@edit-c', { class: '+is-edit' }, { wait: 1.9 }), set('@edit-a', { class: '+is-edit' }, { wait: 2.5 }), set('@edit-d', { class: '+is-edit' }, { wait: 3.6 }),
    pause(.5),
    stream('@tools > li:not(.is-in)', { every: .4, jitter: .2, dur: .15 }),
    stream('@ai-2', { dur: .2, wait: .15 }),
    type('@ai-2-text', 'Done. telemetry-inspector is one function, inspect(rows, binding), written against Sensor time-series v1. Handing it to the factory.', { rhythm: 'stream', cps: 90, caret: .1 }),
    set('@timer', { text: 'Finished · 2h 14m' }), set('@ag-state', { class: '+is-done' }),
    set('@st-agent', { text: '✓ Agent finished', class: '+is-done' }),

    // the factory's own checks, in VS Code's Output panel: one fails, the agent repairs, all seven pass
    set('@status-text', { text: 'Factory checks running' }, { wait: .2 }),
    show('@factory', { dur: .35, ease: 'out', wait: .3 }),
    stream('@fx > li', { every: .26, jitter: 0, dur: .16, wait: .4 }),
    set('@status-text', { text: 'Factory checks · 6 of 7' }),
    pause(1),
    stream('@ai-3', { dur: .2, wait: .1 }),
    type('@ai-3-text', 'The units-row check failed: 1,439 rows. Fixed: the units row now comes from the binding, never from the code.', { rhythm: 'stream', cps: 95, caret: .1 }),
    stream('@tools-2 > li', { dur: .15, wait: .1 }),
    set('@fx-6', { text: '✓ Wrong units-row assumption is rejected · 1,440 rows kept', class: '-is-bad' }, { wait: .4 }),
    set('@fx-6', { class: '+is-ok' }),
    set('@fx-sum', { text: '7 of 7 passed. Sealed as c54c31b: this exact code, nothing else.', class: '+is-done' }, { wait: .4 }),
    set('@status-text', { text: 'Sealed · c54c31b' }),
    pause(1.4),

    // ── 02 · who should get it next ───────────────────────────────────────
    chapter('02 / 03', 'The factory finds <em>who needs it</em>', 'Other companies’ workflow briefs point to the same problem. Fabio approves one person.'),
    hide('@factory', { dur: .3 }),
    show('@cgv', { dur: .4, ease: 'out', wait: .1 }),
    stream('.cgv .cgv-p', { every: .35, jitter: 0, dur: .3, wait: .5 }),
    pause(1.6),
    click('@share', { dur: .8 }),
    set('@sug-1', { class: '+is-shared' }),
    show('@shared', { dur: .3, wait: .1 }),
    set('@status-text', { text: 'Shared with Maya · Palmetto' }, { wait: .2 }), set('@status-cg', { class: '+is-on' }, { wait: .2 }),
    pause(1.6),

    // ── 03 · Maya runs it on her own data ─────────────────────────────────
    chapter('03 / 03', 'It runs on <em>her</em> data', 'Maya at Palmetto gets c54c31b and runs it on solar readings. Same code, her mapping.'),
    hide('@ide', { dur: .8 }), set('@ide', { class: '+is-gone' }, { wait: .8 }),
    show('@maya', { dur: .9, wait: .45 }),
    set('@title-text', { text: 'palmetto-ops' }, { wait: .2 }), set('@status-text', { text: 'Common Ground · Palmetto' }, { wait: .2 }), set('@status-cg', { class: '-is-on' }, { wait: .2 }),
    set('@st-agent', { text: '', class: '-is-done' }, { wait: .2 }),
    show('@notify', { dur: .35, ease: 'out', wait: .7 }),
    pause(1.3),
    click('@open', { dur: .8 }),
    hide('@notify', { dur: .25 }),
    pause(.9),
    click('@run', { dur: .8 }),
    hide('@mx-start', { dur: .25 }),
    show('@mx-run', { dur: .35, wait: .2 }),
    stream('.mx-table tbody tr', { every: .3, jitter: 0, dur: .3, wait: .4 }),
    show('@verdict', { dur: .35, wait: .4 }),
    show('@hash', { dur: .35, wait: .3 }),
    pause(3.2),
  ],
};
