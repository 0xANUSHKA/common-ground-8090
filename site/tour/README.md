# tour.js: the demo-film engine

One engine for every StyleFeatures demo film. A template supplies a window with a product inside it
and a script; the engine plays it with a fake cursor, a camera, chapter cards and captions, and drives
it from a scroll, a clock, a screen recorder or a frozen `?t=`.

Files:

| file | what it is | edit it? |
|---|---|---|
| `tour.js` | the engine: step builders, `Tour`, `include()` | no, it's shared by every format |
| `tour.css` | the engine's look: chromes, cursor, card, caption, keys, controls, record stage | no; restyle through its tokens |
| `script.js` | this film's script | yes |
| `section.html` / `section.css` | this film's band, closing frame and product | yes |
| `snapshot.py` | harvests a live screen into a static fragment | no |
| `export.py` | copies the whole format out as a standalone folder | no |
| `AGENT.md` | the brief for the coding agent that fills it in | read it |

Everything on screen is a pure function of one number, `t`, in seconds. Each frame the engine works out
the product's state at `t` (classes, attributes, text, CSS variables, scroll positions), the camera, the
cursor and the overlays, then writes only what changed. Nothing depends on what happened in earlier
frames, so any moment renders on its own, the same way every time.

## Markup

```html
<section data-tour-root data-driver="scroll">            <!-- any element; the engine adds the attribute itself too -->
  <div data-tour-stage>                                  <!-- the frame everything happens in -->
    <div class="tour-rig">                               <!-- the camera's clip box -->
      <div data-tour-window data-chrome="browser" data-size="1200x750" data-url="yourproduct.com/app">
        … your product, built at 1200 × 750 design pixels …
      </div>
    </div>
    <header data-tour-band> … <button data-tour-gate><span data-tour-gate-label>Click to play</span></button></header>  <!-- optional -->
    <footer data-tour-end> … </footer>                    <!-- optional -->
  </div>
</section>
<script type="module">
  import { Tour } from './tour.js'; import script from './script.js';
  new Tour(document.querySelector('[data-tour-root]'), script);
</script>
```

The engine adds the chrome, the cursor, ripples, the chapter card, the caption line, key caps, and the
driver's controls. The opening band (`data-tour-band`) slides away in the first `intro` seconds; the
closing frame (`data-tour-end`) gets `--in` 0→1 at the end and its own CSS decides what that looks like.

The root also carries `--tour-band` (1 → 0 over the intro), `--tour-out` (0 → 1 over the outro) and `--tour-p`
(0 → 1 over the whole film) for a format's own CSS. `data-tour-band="css"` stops the engine sliding the band
away; the format fades or moves it from `--tour-band` instead.

**A frame the format draws: `data-tour-frame`.** Put an element with `data-tour-frame` in the stage and lay it
out in CSS (a phone's glass, a mat around a screenshot, a different box per ratio). The engine fits the window
to it exactly, clips the camera to it (with its `border-radius`), and every zoom stays inside it: the window
always covers the frame, so a push-in never shows what's around it. The outro then leaves the window where it
is (use `--tour-out` to do something else). Give the frame the window's aspect ratio. `demo/phone` (the glass,
beside the text or under it) and `demo/launch-note` (a mat on the page, a different box per recording ratio)
use it.

### Window chromes: `data-chrome`

| value | looks like | typical `data-size` |
|---|---|---|
| `browser` | traffic lights, back/forward, an address pill (`data-url`), share/new icons | `1200x750` |
| `app` | a macOS title bar with traffic lights and a centred `data-title` | `1200x760` |
| `phone` | a dark bezel, a status bar with the time and a notch | `390x844` |
| `none` | just rounded corners | anything |
| `terminal` | a warm charcoal window, traffic lights, a centred `data-title`; tokens `--tour-term-bg/-bar/-ink/-dim` | `780x548` |

**Windows inside the window.** Any element inside the window with a `data-chrome` gets that chrome too, and a
frame (`display:flex`, rounded, clipped). With `data-chrome="none"` on the outer window (made transparent in your
CSS) it becomes a desk holding, say, a terminal and a browser; the camera pans between them with `zoom()`
(`demo/terminal` does this).

**A second design size for tall stages.** `data-size-tall="440x820"` on the window (or `sizeTall: [440, 820]` in
the script) is used whenever the stage is taller than wide (W/H < .8: phones, 9:16 recordings). The root gets
`.is-tall` before anything is measured, so your CSS can re-lay the product for it (stack two panes, say) and the
script's targets follow. `demo/split` stacks its panes this way.

**A third for squarish stages.** `data-size-square="760x760"` (or `sizeSquare: [760, 760]`) is used when
.8 ≤ W/H < 1.15 (1:1 recordings, square-ish windows), and the root gets `.is-square` the same way. Without it those
stages use the wide size, as before. `demo/agentic` has all three: a tiled desk (wide), and one live window beside
(square) or above (tall) its run sheet.

**A height that follows the frame: `auto`.** `data-size="580xauto"` (or `size: [580, 'auto']`, and the same for
`sizeTall`) fixes the window's width and takes its height from the `data-tour-frame` at every layout, so the window
always has the frame's shape: a full-height column on a wide page, the whole screen on a phone, any recording
ratio. For products that read top to bottom (a chat, a feed, a transcript). `demo/chat` and `demo/mcp` use it.

Build the product at the design size in plain CSS pixels. The engine scales the whole window, so text
stays real text and stays sharp at any zoom.

### Hooks

`'@name'` anywhere in a selector means `[data-tour="name"]`. Put `data-tour="…"` on the things the
script points at. Pointer targets also choose the cursor: links, buttons, `role=button|tab|switch`
get the hand, inputs and `data-tour-cursor="text"` get the I-beam, the rest the arrow
(`data-tour-cursor="arrow|pointer|text"` overrides it). While the cursor rests on a target, that target
has `.is-hover`; while it's pressed, `.is-press`. Style both so clicks read.

## The script

```js
import { click, type, show, hide, set, tween, zoom, unzoom, chapter, caption, pause } from './tour.js';
export default {
  size: [1200, 750],   // window design size (or data-size on the window)
  enter: [.84, .97],   // where the cursor comes in from, as fractions of the window
  intro: 1.3,          // seconds for the opening band to clear (0: no band)
  outro: 4.5,          // seconds held on the closing frame
  settle: .6,          // pause between the last step and the outro
  still: 17.4,         // the moment reduced motion shows
  fit: [.92, .88, .5], // optional: see below
  steps: [ … ],
};
```

`fit: [w, h, y]` is for a stage that holds nothing but the window (a panel beside text, with no card or band
over it): the window may take `w` of the stage's width and `h` of its height, centred at `y` (default .5), and
push-ins aim at the middle of the frame. Without it the page layout leaves room for the card and band
(`[.74, .7, .47]`). It never changes `?record`. `demo/chapters` uses it.

Steps run in order on one clock. **Pointer steps** take time and the next step waits for them.
**Side steps** start at the current moment and the next step starts with them, so
`click('@create'), hide('@modal'), show('@toast')` hides the modal and shows the toast as the click lands.

Every step takes:
`at: 12.5` pin it to an absolute time · `wait: .4` start this much later ·
`parallel: true` (pointer steps) don't hold up the next step · `block: true` (side steps) do hold it up.

### Pointer steps

| step | what happens | options (defaults) |
|---|---|---|
| `move(sel)` | glides there on a gentle arc, smootherstep | `dur` .9, `aim` [x, y] fractions of the target, `cursor` |
| `click(sel)` | moves, presses (cursor shrinks, target gets `.is-press`), ripple | as `move` |
| `dblclick(sel)` | moves, two presses, two ripples | as `move` |
| `hover(sel)` | moves and rests (`.is-hover` on the target) | `dur` .9, `hold` .6 |
| `type(sel, text)` | characters appear in `sel` at a human, uneven pace; `.is-caret` while typing, then blinking | `cps` 13, `rhythm` (below), `lead` (s of steady caret before the first key), `caret` (s it blinks after the last key, 1.6), `blink` (absolute time it goes) |
| `stream(sel)` | each match appears in turn, like output arriving: gets `.is-in`, and `--in` 0→1 over `dur`. A match's `data-tour-wait="1.2"` adds that pause before it (a slow step) | `every` .06 s, `jitter` .5 (±50 % of `every`; 0 for an exact beat), `dur` .08 |
| `drag(handle, o)` | moves to the handle, presses, then drives a value while the cursor stays on the handle | `approach` .8, `dur` 1.2, `prop` + `from` + `to` (+ `el` to put the property on another element), `text: [sel, v => label]`, or `onto: sel` to carry the handle itself there |
| `scroll(sel, to)` | scrolls an element; `to` is px, `'50%'`, `'end'` or a selector inside it | `dur` 1.4, `offset` 16 |
| `key(keys)` | key caps on screen, e.g. `key(['⌘', 'K'])` | `dur` .9, `hold` 1.4 |
| `pause(s)` | a beat | |
| `tap(sel)` | the same step as `click`; reads better in a touch film | as `click` |
| `longpress(sel)` | moves, presses and holds; it fires (`.is-press` stays on, a ripple) after `hold`, and the finger stays down `lift` longer while the next steps start (open a context menu there) | `dur` .9, `hold` .7, `lift` .35 |
| `swipe(sel, o)` | a finger flick that starts on `sel`: lands, travels `by` [dx, dy] window px speeding up, lifts while still moving. What it moves follows it 1:1, then coasts to rest over `coast` s with the speed it was let go at. `scroll: to` scrolls `sel` (or `in: sel`) to `to` (px, `'50%'`, `'end'`, a selector; `offset`); `prop` + `from` + `to` (+ `el`) drives a CSS variable instead (a carousel, a sheet dragged down), `follow` (.45) of it under the finger | `approach` .7, `by` [0, -220], `dur` .36, `coast` .8 (0: a slow drag that ends at rest), `settle` (when the next step starts, `coast` × .5) |

`type`'s `rhythm`: unset is the even, slightly uneven pace it always had. `'human'` types like a person at a
keyboard: a beat between words, a reach for symbols (`- / . : =`), a pause after punctuation, doubled letters
run together, the odd hesitation. `'stream'` lands the text in chunks of 1–5 characters, the way a model's reply
arrives. `stream()` is for whole lines or blocks; hide them in CSS until `.is-in`
(`.line{display:none}.line.is-in{display:block}`) so they take space only once they've arrived.

The cursor's path between targets is a smootherstep glide with a slight bow (direction-dependent, never
a straight line) and a slightly early peak speed, like a hand. It never teleports: each move starts
where the last one ended.

**A finger instead of a cursor.** `pointer: 'touch'` in the script (or `data-pointer="touch"` on the root,
`?pointer=touch`) swaps the arrow for a fingertip: a soft translucent dot, 44 window px, that is part of the
screen, so it zooms with it. It is unseen between touches (a hand travelling isn't on the glass); a shadow
gathers for a fifth of a second before contact, the dot flattens and darkens while pressed (`.is-down` on
`.tour-cur`), and lifts away. `drag` and `swipe` carry it across the glass. Give each touch a beat: the `dur`
before it is the hand travelling. Restyle the dot with `--tour-touch` / `--tour-touch-down`. `demo/phone` is
the worked example.

**More than one pointer.** Any pointer step with `by: 'agent'` moves a second cursor on its own track (any name
works; steps without `by` move the usual one, `'main'`). Describe each in the script:

```js
pointers: {
  main:  { label: 'You', idle: 1.4 },                  // a tag on the person's cursor; it fades after 1.4 s still
  agent: { label: 'Agent', look: 'agent', bow: .2, enter: [.33, .2] },
},
steps: [ click('@search', { by: 'agent', tag: 'search_code' }), …, click('@approve', { from: [.99, 1.03] }) ]
```

A second pointer is an arrow in `--tour-agent` (look `'agent'`) with a label tag beside it; `tag` on a step adds a
word to that label from then on (the tool it's using, "waiting for you"). `bow` scales the curve of its path (0 is a
straight, machine-like line), `enter` is where it first appears, `shapes: true` lets it take the hand and I-beam
too. `idle: s` fades a pointer out once it has been still that long and back in when it next moves; `from: [x, y]`
(fractions of the window) on a step starts that move there instead, so a hand can come back in from off the edge.
Each pointer's clicks ripple in its own colour (`.tour-ring[data-who]`), and `.tour-cur[data-who="…"]` lets a page
hide one (`demo/agentic` hides the person's cursor on the live page, where the visitor is the person). Touch mode
(`pointer: 'touch'`) applies to the main pointer only.

### Side steps

| step | what happens | options |
|---|---|---|
| `show(sel)` / `hide(sel)` | tweens `--in` to 1 / 0 on every match; your CSS uses `opacity: var(--in)` etc. | `dur` .35 / .28, `stagger` |
| `set(sel, changes)` | instant: `{class: '+on -off'}`, `{text: 'Copied'}`, `{'--x': 2}`, `{'data-view': 'room'}`, `{attr: null}` removes | |
| `tween(sel, prop, from, to)` | animates a CSS variable, `'text'` (with `fmt`) or `'scrollTop'` | `dur` .45, `fmt`, `stagger` |
| `zoom(sel, z)` | camera pushes in on the target. `z` a number, or `'fit'` to frame the element at `fill` of the frame | `dur` 1.3, `fill` .66 (or `[wide, stacked]`, e.g. `[.76, .96]`: tighter on 1:1 and phones, where the window is small), `aim`, `max` 2.6 (the most a `'fit'` may push in: raise it for a big window such as a whole board), `arc` 0 (0–1: pull back by that share mid-flight and push in again, so a long pan reads as a camera crossing; `demo/canvas`) |
| `unzoom()` | camera back to the whole window | `dur` 1.3 |
| `chapter(n, title, line)` | the card: `'02 / 05'`, a title with one `<em>` word, one line; until the next chapter | `until` |
| `caption(text)` | the caption line, until the next caption | `dur` 4 |
| `mark(name)` | nothing on screen: a named moment. `tour.api.marks` lists them in order (`{ t, name }`) and `marks[name]` is that moment's time, so a page can seek to one or stop at the next (`demo/chat`'s beats, `demo/mcp`'s tabs) | |

`show`, `hide` and `tween` take `ease`: `'out'` (decelerate), `'ios'` (a critically damped spring, UIKit's
pushes and sheets), `'spring'` (overshoots by about 3 %), `'linear'`, or any `(t) => t` function. The default
is smootherstep. The curves are exported as `eases`.

`data-tour-follow` on a scrolling element (a terminal, a chat thread, a log) keeps its newest content in view
every frame, so lines that `stream()` in push the old ones up.

`data-tour-grow` on an element that should take height as it arrives (a message in a thread, a folded panel): the
engine measures its natural height into `--h` (design px, innermost first, before targets are measured, and again on
every relayout), so your CSS can open it with `--in` and let go once it's in:
`max-height: max(calc(var(--in) * var(--h)), calc((var(--in) - .999) * 1e7px))`. Rows arrive smoothly and may
change size afterwards. `../_chat/chat.css` is the worked example.

Elements that `show()` controls should start hidden in CSS (`--in: 0`). Anything the script changes is
reset when you seek backwards, because every value is recomputed from `t`.

### The camera

`zoom` pushes in on a point and keeps the window filling the frame: it borrows Monet Shot's fit clamp,
so a push-in never pans past the window's edge (the window is either wholly inside the frame or covers
it). Zoom levels move on a log scale, so in and out feel even. Numbers are multiplied by 1.15 on
portrait stages, where the window is small (not inside a `data-tour-frame`, which the window always fills). `?camera=off` turns all push-ins off. On stacked stages (1:1, 9:16, phones) the cursor fades out rather than
being drawn outside the window's frame.

### Measuring

Targets are measured in the window's own pixels, against the product as it is at the moment each step
happens (so a button inside a modal that opens two steps earlier is measured with the modal open), and
measured again whenever the layout can change: fonts loading, the stage resizing, your CSS. Edit the
product freely; the script follows.

## The card and caption keep out of the way

The chapter card and the caption never sit on what the tour is doing. Each frame the engine checks the cursor (or
fingertip) and any text being typed (`type`) or streamed in (`stream`), with its last second after. If the card
would cover it, the card slides to the other side of the stage; if both sides are busy it steps out, and it comes
home once the spot has been clear for .8 s. The caption lifts to the top. Outside `?record` the card carries a ×
that hides the cards for the rest of the visit; recordings have none. Nothing to configure. In stacked layouts
(phones, 9:16) the card already sits under the window, so nothing moves.

## Drivers

| driver | how | when |
|---|---|---|
| `scroll` (default) | `data-driver="scroll"`. The section gets tall, the stage pins, scroll maps to `t`. The gate starts an auto-play drift at real speed. With `data-lock` (default on) wheel, touch and keys can't skip the film while it drifts; the Auto-play switch is the way out. A film at the very top of the page holds the page still until the first click, tap or key. | the opening of a launch page, Monet Shot style |
| `play` | `data-driver="play"`. A 100svh stage with a play button, a scrubber with chapter ticks and a timecode. Space or K plays, arrows step 3 s. | a film in the middle of a page |
| `manual` | `data-driver="manual"` (or `new Tour(root, script, { driver: 'manual' })`). No gate, controls or scroll handling: it draws `t = 0` and waits. The page drives it with the instance's `play()`, `pause()`, `render(t)`, `load(script)` (or `tour.api`), and may set `tour.onFrame = (t) => …`, called after every frame. `play()` dispatches `tour:end` on the root when it reaches the end. | a format with its own idea of when to play: `demo/chapters` (one film per chapter, played as you reach it), `demo/playground` |
| `?t=12.5` | freezes that moment, any driver. Use it to check stills. | checking |
| loop | `data-loop` on the root, `loop: true` in the script or `?loop`: the `play` driver starts again at the end, fading the window through the seam. Never in `?record`, which plays once. `begin()` (or `tour.api.begin()`) starts it from code, e.g. when it scrolls into view. | a short feature loop: `demo/launch-note` |
| reduced motion | shows `still` with the camera off and the card on: the whole window, a sensible frame | always on |
| `?record` | see below | recording |

`data-music="audio/track.mp3"` on the root starts a loop with a fade at the gate. `data-captions`:
`record` (default: only in `?record`), `always`, `off`. `data-cursor="off"` hides the cursor;
`data-cursor-look="light"` gives a white arrow.

## Recording: `?record`

```
index.html?record&ratio=16:9      16:9, 1:1 or 9:16, centred in the browser window
          &hold=1.2               seconds held on the first frame before it plays (default 1.2)
          &camera=off             no push-ins (see below)
          &captions=off           no caption line
          &t=12.5                 a frozen frame of the recording, for checking
```

It renders only the stage, at the largest box of that ratio that fits the window, on near-black, with
no page, notes, spec card, gate or controls, and sizes the overlays to the stage. The film may sit anywhere in the page, inside another section: everything that isn't the film or one of its ancestors is hidden. It holds the first
frame (the title band), plays once from 0 and stops on the closing frame. Captions are on, because X
autoplays muted.

Record it with **Monet Shot**: pick the browser window, crop to the stage, and export. Two things to know:

- Monet Shot zooms on **real** clicks. The tour's clicks are drawn, not real, so Monet Shot sees none
  and adds no zooms of its own. The tour's camera therefore stays **on** by default. If you would rather
  place zooms yourself on Monet Shot's timeline, use `&camera=off` and you won't get double zooms.
- Monet Shot draws its own cursor from the real pointer. Park the real pointer off the recorded window
  (or set Monet Shot's cursor to hidden) so only the tour's cursor shows.

From script: `window.tour` has `seek(t)`, `play()`, `pause()`, `load(script)`, `t`, `duration`, `chapters` and
`ready` (a promise that resolves once fonts are in and everything is measured). The root gets a `tour:end`
event whenever `play()` reaches the end (any driver).

**Several tours in one recorded frame.** A format whose recording is more than one film (two windows racing in
`demo/versus`, a whole slide deck in `demo/deck`) makes its own element the record stage and drives the tours
itself:

```js
import { Tour, recordStage } from './tour.js';
const box = q.has('record') ? recordStage(root) : null;   // root becomes the ratio's box, centred on near-black, the rest hidden
const a = new Tour(filmA, scriptA, { driver: 'manual', record: 'page' });   // no record stage or auto-play of its own
a.render(t);                                               // the page decides t, every frame
```

`recordStage(el)` does for `el` what `?record` does for a single film (the `tour-record` and `sf-clean` classes,
`--rw`/`--rh` from `&ratio=`, kept current on resize) and returns `{ w, h, ratio }`. `{ record: 'page' }` on a Tour
means: in `?record` stay on the manual driver and let the page play it (captions follow `captions` as usual).
Without `?record` it changes nothing. The page then holds the first frame, plays once and honours `&t=` itself.

`load(script)` swaps in another script on the same window: every value the old script touched goes back to
how the page drew it, then the new script is compiled and measured. `demo/playground` uses it to turn a
visitor's clicks into a live script that the engine plays on from, so their clicks get the film's eases.

## Harvested screens: `include()` and `snapshot.py`

```html
<div data-tour-include="fragments/projects.html"></div>
<script type="module">
  import { Tour, include } from './tour.js';
  await include(root);            // fetch the fragments first
  new Tour(root, script);
</script>
```

`snapshot.py` captures an element of a running page with all its computed styles into a scoped, static
fragment (`uv run tour/snapshot.py --help`). `--mobile` captures a mobile web build as a phone sees it (mobile viewport, touch, an iPhone user agent). `examples/harvest/` (in the StyleFeatures repo) is a
working example: a live pricing page captured in two states and clicked through.

## Making another format

Two more formats are built this way, as worked examples: `../terminal/` (a desk with a terminal and a browser,
typed commands, streamed output, `ansi.py` for capturing a CLI's real output) and `../split/` (input and output
panes that stack on phones). Each has its own `AGENT.md` and `export.py`.
`../chapters/` (one short film per feature, stacked in a pinned slot beside the text and played on the `manual`
driver as you reach it) and `../playground/` (a film, then the same product handed to the visitor: named actions in
`machine.js` drive both, through `load()`) export with `export.py <dest> --format chapters|playground`.
`../versus/` (two tours racing on one wall clock, the numbers from measured runs) and `../deck/` (a keynote: a tour
per slide, played as the slide arrives) export with `--format versus|deck`; both use `recordStage()`.
`../phone/` (a mobile app: a fingertip, iOS/Android screen transitions in `moves.js`, the phone in a
`data-tour-frame`, 9:16 first) and `../launch-note/` (one shipped feature: a looping film inside a changelog post, a
before/after, three notes) export with `--format phone|launch-note`.
`../chat/` (the page is a conversation: the thread in the HTML is the script, played message by message, the last
message the CTA) and `../mcp/` (an MCP server's page: short toured conversations, one tool each, then Add the MCP)
share the chat kit in `../_chat/` and export with `--format chat|mcp`.
`../agentic/` (an AI agent doing one task: a task box, then a run sheet of tool calls beside a desk of windows its own
labelled cursor works, time-lapses, an approval the visitor gives, a printed receipt; three design sizes, two
pointers, its own speed-controlled clock on the `manual` driver) exports with `--format agentic`.

Copy `section.html`, keep the `data-tour-*` skeleton, import `tour.css` from your CSS and `Tour` from
`../tour/tour.js`, and write a script. Change how it looks through `tour.css`'s tokens
(`--tour-stage`, `--tour-ring`, `--tour-cap-bg`, `--tour-cap-ink`, `--tour-win-radius`) and your own
`data-tour-band` / `data-tour-end`. If the engine needs a new step type, add it to `tour.js` here
so every format gets it.
