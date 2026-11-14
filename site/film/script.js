/* The Common Ground film, on the tour engine (../tour/README.md). Every frame is a function of t.
   0–5 s  the title sequence (drawn by site.js from the same clock), then VS Code rises in.
   01  Two hours into an agent session, Fabio's personal tool is finished; Common Ground offers it to two teammates.
   02  Theo's Welcome page: a lil guy has arrived in Recent; a favicon marks one from another portfolio company.
   03  The fund's view: shared ontologies across the portfolio companies.
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
  still: 26,                // reduced motion: Theo's Recent, with Fabio's lil guy
  steps: [
    pause(INTRO),

    // ── 01 · the session finishes ─────────────────────────────────────────
    chapter('01 / 03', 'Two hours in, the agent <em>finishes</em>', 'Fabio’s personal tool is done. Common Ground asks who else needs it.'),
    tween('@timer', 'text', 8046, 8058, { dur: 5.4, fmt: (v) => `Working · ${clock(v)}`, ease: (t) => t }),
    tween('.ag-spin', '--a', 0, 6, { dur: 5.4, ease: (t) => t }),
    tween('@code', 'scrollTop', 0, 120, { dur: 4.6, ease: 'out' }),
    set('@edit-c', { class: '+is-edit' }, { wait: 1.9 }), set('@edit-a', { class: '+is-edit' }, { wait: 2.5 }), set('@edit-d', { class: '+is-edit' }, { wait: 3.6 }),
    pause(.5),
    stream('@tools > li:not(.is-in)', { every: .55, jitter: .2, dur: .15 }),
    stream('@ai-2', { dur: .2, wait: .15 }),
    type('@ai-2-text', 'Done. telemetry-inspector is finished: 1,440 observations, 55 missing wind values, no missing timestamps. All 7 checks pass.', { rhythm: 'stream', cps: 70, caret: .1 }),
    set('@timer', { text: 'Finished · 2h 14m' }), set('@ag-state', { class: '+is-done' }),
    set('@st-agent', { text: '✓ Agent finished', class: '+is-done' }),

    // the extension's notification, the moment the agent is done
    show('@pop', { dur: .3, ease: 'out', wait: .3 }),
    zoom('@pop', 'fit', { fill: [.56, .94], dur: 1, wait: .1 }),
    pause(1.1),
    click('@share', { dur: .8 }),
    hide('@pop', { dur: .2, wait: .1 }),
    show('@toast-done', { dur: .25, wait: .2 }),
    set('@status-text', { text: 'Shared with Theo and Ines' }, { wait: .2 }), set('@status-cg', { class: '+is-on' }, { wait: .2 }),
    pause(1.5),
    hide('@toast-done', { dur: .25 }),
    unzoom({ dur: .9 }),

    // ── 02 · Theo's editor ───────────────────────────────────────────────
    chapter('02 / 03', 'Only the people it was <em>shared</em> with', 'Permissions: named people, one exact version, revocable any time.'),
    hide('@ide', { dur: .45 }), set('@ide', { class: '+is-gone' }, { wait: .45 }),
    show('@welcome', { dur: .45, wait: .2 }),
    set('@title-text', { text: 'Welcome' }, { wait: .2 }), set('@status-text', { text: 'Common Ground' }, { wait: .2 }), set('@status-cg', { class: '-is-on' }, { wait: .2 }),
    set('@st-agent', { text: '', class: '-is-done' }, { wait: .2 }),
    zoom('@recent', 'fit', { fill: [.7, .96], dur: 1.1, wait: .3 }),
    stream('@row-new', { dur: .4 }),
    hover('@who-fabio', { dur: .9, hold: .1 }),
    show('@card-fabio', { dur: .25 }),
    pause(1.5),
    hide('@card-fabio', { dur: .2 }),
    hover('@who-maya', { dur: .8, hold: .1 }),
    show('@peek-maya', { dur: .4, ease: 'out' }), show('@card-maya', { dur: .25, wait: .15 }),
    pause(1.8),

    // ── 03 · the fund ────────────────────────────────────────────────────
    chapter('03 / 03', 'Shared <em>ontologies</em> across the portfolio', 'One company’s tool matches another portfolio company’s need.'),
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
    set('@cx-cc', { class: '+is-hot' }, { wait: .8 }),
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
