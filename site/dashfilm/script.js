/* The dashboard film, on the tour engine (../tour/README.md). The fund's console, the same seeded story as the editor
   film. No camera moves: the whole window stays in view and the console itself does the moving.
   01  Overview: three reuses land in Recent reuse; the portfolio's counts tick up with them.
   02  The tool: the sealed version and its seven checks, ticking through.
   03  Portfolio: Groq finishes its mapping and goes live; Netskope starts.
   Check any moment with ?t=6 in the address. */
import { click, scroll, show, hide, set, tween, stream, chapter, pause } from '../tour/tour.js';

const times = (v) => `${Math.round(v)} times`;
const hours = (v) => `${Math.round(v)} engineering hours`;
const reuses = (v) => { const n = Math.round(v); return `${n} reuse${n === 1 ? '' : 's'}`; };

export default {
  size: [1200, 750],
  enter: [.62, .97],
  intro: 0,
  outro: .6,
  fit: [.92, .84, .56],
  still: 6,                 // reduced motion: the tool page with its checks
  steps: [
    pause(.4),

    // ── 01 · reuses land ──────────────────────────────────────────────
    chapter('01 / 03', 'Watch work <em>travel</em>', 'Every reuse across the portfolio, as it happens.'),
    stream('@new-1', { dur: .45, wait: .3 }), set('@new-1', { class: '+is-fresh' }),
    tween('@ov-times', 'text', 4, 5, { dur: .4, fmt: times }), tween('@ov-hours', 'text', 68, 78, { dur: .4, fmt: hours }),
    tween('@mr-canopy', 'text', 0, 1, { dur: .3, fmt: reuses }),
    stream('@new-2', { dur: .45, wait: .55 }), set('@new-2', { class: '+is-fresh' }),
    tween('@ov-times', 'text', 5, 6, { dur: .4, fmt: times }), tween('@ov-hours', 'text', 78, 90, { dur: .4, fmt: hours }),
    tween('@mr-pv', 'text', 1, 2, { dur: .3, fmt: reuses }),
    stream('@new-3', { dur: .45, wait: .55 }), set('@new-3', { class: '+is-fresh' }),
    tween('@ov-times', 'text', 6, 7, { dur: .4, fmt: times }), tween('@ov-hours', 'text', 90, 106, { dur: .4, fmt: hours }),
    tween('@mr-tele', 'text', 2, 3, { dur: .3, fmt: reuses }),
    pause(.7),

    // ── 02 · the tool's proof ─────────────────────────────────────────
    chapter('02 / 03', 'Every tool carries its <em>proof</em>', 'The exact version, and the seven checks it passed.'),
    click('@new-3', { dur: .6 }),
    set('@pg-overview', { class: '-is-on' }), set('@pg-tool', { class: '+is-on' }), show('@pg-tool', { dur: .2 }),
    set('@nav-overview', { class: '-is-cur' }), set('@nav-tools', { class: '+is-cur' }),
    scroll('@main', '@checks', { dur: .7, offset: 24, wait: .25 }),
    stream('@check-list > li', { every: .13, jitter: 0, dur: .12 }),
    pause(1),

    // ── 03 · a company goes live ──────────────────────────────────────
    chapter('03 / 03', 'One standard, <em>every company</em>', 'Map your data once. Every shared tool can run there.'),
    click('@nav-portfolio', { dur: .6 }),
    set('@pg-tool', { class: '-is-on' }), set('@pg-portfolio', { class: '+is-on' }), show('@pg-portfolio', { dur: .2 }),
    set('@nav-tools', { class: '-is-cur' }), set('@nav-portfolio', { class: '+is-cur' }),
    scroll('@main', 0, { dur: .01 }),
    pause(.5),
    set('@groq-data', { text: 'Mapped', class: '-is-warn' }), set('@groq-data', { class: '+is-ok' }), set('@groq-row', { class: '+is-live' }),
    pause(.35),
    set('@groq-status', { text: 'Live', class: '-is-warn' }), set('@groq-status', { class: '+is-ok' }),
    set('@pf-live', { text: '4', class: '+is-bump' }),
    show('@toast', { dur: .25 }),
    pause(.5),
    set('@net-data', { text: 'In progress', class: '+is-warn' }),
    pause(1.3),
    hide('@toast', { dur: .25 }),
    pause(.6),
  ],
};
