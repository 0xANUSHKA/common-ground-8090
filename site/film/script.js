/* The Common Ground film, on the tour engine (../tour/README.md). Every frame is a function of t.
   0–5 s  the title sequence (drawn by site.js from the same clock), then VS Code rises in.
   01  Fabio's agent at Saildrone finishes; the factory's seven checks run outside it (one fails, the agent repairs,
       all pass) and the exact version is sealed as c54c31b. Common Ground offers it to Maya at Palmetto, by name.
   02  Maya's Welcome page: the tool arrives in Recent with Saildrone's favicon and the sealed version.
   03  The fund's view: every company mapped to Sensor time-series v1; the tool rebinds to Palmetto's columns.
   Check any moment with ?t=12.5 in the address. */
import { click, type, zoom, unzoom, show, hide, set, tween, stream, hover, chapter, pause } from '../tour/tour.js';

const clock = (s) => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;
export const INTRO = 5.4;   // seconds of title sequence before the first step

export default {
  size: [1200, 750],
  enter: [.62, .97],
  intro: 0,
  outro: 1,
  fit: [.88, .8, .53],
  still: 26,                // reduced motion: Maya's Recent, with Fabio's card
  steps: [
    pause(INTRO),

    // ── 01 · the agent builds, the factory checks ──────────────────────────
    chapter('01 / 03', 'The factory <em>builds and checks</em> it', 'Fabio’s agent finishes. Seven checks run outside it, in a sandbox.'),
    tween('@timer', 'text', 8046, 8058, { dur: 5.4, fmt: (v) => `Working · ${clock(v)}`, ease: (t) => t }),
    tween('.ag-spin', '--a', 0, 6, { dur: 5.4, ease: (t) => t }),
    tween('@code', 'scrollTop', 0, 120, { dur: 4.6, ease: 'out' }),
    set('@edit-c', { class: '+is-edit' }, { wait: 1.9 }), set('@edit-a', { class: '+is-edit' }, { wait: 2.5 }), set('@edit-d', { class: '+is-edit' }, { wait: 3.6 }),
    pause(.5),
    stream('@tools > li:not(.is-in)', { every: .55, jitter: .2, dur: .15 }),
    stream('@ai-2', { dur: .2, wait: .15 }),
    type('@ai-2-text', 'Done. telemetry-inspector is one function, inspect(rows, binding), written against Sensor time-series v1. Handing it to the factory.', { rhythm: 'stream', cps: 70, caret: .1 }),
    set('@timer', { text: 'Finished · 2h 14m' }), set('@ag-state', { class: '+is-done' }),
    set('@st-agent', { text: '✓ Agent finished', class: '+is-done' }),

    // the factory's own checks, in VS Code's Output panel: one fails, the agent repairs, all seven pass
    set('@status-text', { text: 'Factory checks running' }, { wait: .2 }),
    show('@factory', { dur: .35, ease: 'out', wait: .3 }),
    zoom('@factory', 'fit', { fill: [.66, .94], dur: 1, wait: .1 }),
    stream('@fx > li', { every: .32, jitter: 0, dur: .18, wait: .5 }),
    set('@status-text', { text: 'Factory checks · 6 of 7' }),
    pause(1.6),
    unzoom({ dur: .8 }),
    stream('@ai-3', { dur: .2, wait: .3 }),
    type('@ai-3-text', 'The units-row check failed: 1,439 rows. Fixed: the units row now comes from the binding, never from the code.', { rhythm: 'stream', cps: 75, caret: .1 }),
    stream('@tools-2 > li', { dur: .15, wait: .1 }),
    zoom('@factory', 'fit', { fill: [.66, .94], dur: .9, wait: .3 }),
    set('@fx-6', { text: '✓ Wrong units-row assumption is rejected · 1,440 rows kept', class: '-is-bad' }, { wait: .5 }),
    set('@fx-6', { class: '+is-ok' }),
    set('@fx-sum', { text: '7 of 7 passed. Sealed as c54c31b: this exact code, nothing else.', class: '+is-done' }, { wait: .5 }),
    set('@status-text', { text: 'Sealed · c54c31b' }),
    pause(1.8),
    unzoom({ dur: .8 }),
    hide('@factory', { dur: .3 }),

    // the extension's notification: share this sealed version with one named person at another company
    show('@pop', { dur: .3, ease: 'out', wait: .2 }),
    zoom('@pop', 'fit', { fill: [.56, .94], dur: 1, wait: .1 }),
    pause(1.4),
    click('@share', { dur: .8 }),
    hide('@pop', { dur: .2, wait: .1 }),
    show('@toast-done', { dur: .25, wait: .2 }),
    set('@status-text', { text: 'Shared with Maya · Palmetto' }, { wait: .2 }), set('@status-cg', { class: '+is-on' }, { wait: .2 }),
    pause(1.5),
    hide('@toast-done', { dur: .25 }),
    unzoom({ dur: .9 }),

    // ── 02 · Maya's editor, at Palmetto ──────────────────────────────────
    chapter('02 / 03', 'Shared by name, <em>one exact version</em>', 'Maya at Palmetto gets c54c31b. No one else does.'),
    hide('@ide', { dur: .45 }), set('@ide', { class: '+is-gone' }, { wait: .45 }),
    show('@welcome', { dur: .45, wait: .2 }),
    set('@title-text', { text: 'Welcome' }, { wait: .2 }), set('@status-text', { text: 'Common Ground' }, { wait: .2 }), set('@status-cg', { class: '-is-on' }, { wait: .2 }),
    set('@st-agent', { text: '', class: '-is-done' }, { wait: .2 }),
    zoom('@recent', 'fit', { fill: [.7, .96], dur: 1.1, wait: .3 }),
    stream('@row-new', { dur: .4 }),
    hover('@who-fabio', { dur: .9, hold: .1 }),
    show('@peek-fabio', { dur: .4, ease: 'out' }), show('@card-fabio', { dur: .25, wait: .15 }),
    pause(3),

    // ── 03 · the fund ────────────────────────────────────────────────────
    chapter('03 / 03', 'It runs wherever the data is <em>mapped</em>', 'Palmetto’s columns map to the same fields, so the same hash runs on solar data.'),
    unzoom({ dur: .9 }),
    hide('@vs', { dur: .5 }),
    show('@fund', { dur: .5, wait: .15 }),
    stream('.fd-co', { every: .07, jitter: 0, dur: .35, wait: .35 }),
    stream('.fd-cx', { every: .07, jitter: 0, dur: .3 }),
    stream('.fd-edges.is-wide .fd-e', { every: .03, jitter: 0, dur: .45, parallel: true }),
    stream('.fd-edges.is-tall .fd-e', { every: .03, jitter: 0, dur: .45 }),
    pause(.3),
    set('@co-saildrone', { class: '+is-built' }), show('@tag-saildrone', { dur: .3 }),
    show('.fd-hl.is-1', { dur: .7, wait: .2 }),
    ...['time', 'value', 'unit', 'basis', 'cadence'].map((f, i) => set(`@cx-${f}`, { class: '+is-hot' }, { wait: .5 + i * .12 })),
    show('@packet', { dur: .25, wait: .2 }),
    show('.fd-hl.is-2', { dur: .8, wait: 1.1 }),
    tween('@packet', '--p', 0, 1, { dur: 2.1, wait: .2, block: true }),
    hide('@packet', { dur: .25 }),
    set('@co-palmetto', { class: '+is-need' }), show('@tag-palmetto', { dur: .3 }),
    show('.fd-hl.is-3', { dur: .6, wait: .3 }),
    set('@co-mast', { class: '+is-need' }, { wait: .8 }), show('@tag-mast', { dur: .3, wait: .8 }),
    show('@panel', { dur: .45, wait: 1 }),
    stream('.fd-row', { every: .3, jitter: 0, dur: .3, wait: 1.3 }),
    pause(2.6),
  ],
};
