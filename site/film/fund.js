// Scene 3, the fund's view: the portfolio mapped to the fund's shared ontology, Sensor time-series v1. The five fields
// sit in the middle; each company that has mapped its data connects to them, invited companies wait at the edge. The
// match the film follows: built at Saildrone against the fields, rebound to Palmetto's own columns, same hash.
// Everything is placed in the window's design px: [x, y] wide (1200 × 750) and [x, y] tall (440 × 820).
// Companies are the demo fund's five, from public Social Capital investment references; favicons are their own.

export const COMPANIES = [
  { id: 'saildrone', icon: 'saildrone.png', name: 'Saildrone', sector: 'ocean data · mapped', w: [130, 390], t: [46, 250], mapped: true },
  { id: 'palmetto', icon: 'palmetto.png', name: 'Palmetto', sector: 'solar data · mapped', w: [770, 390], t: [394, 250], mapped: true },
  { id: 'mast', icon: 'mast.png', name: 'Mast Reforestation', sector: 'soil sensors · mapped', w: [740, 590], t: [384, 380], mapped: true },
  { id: 'groq', icon: 'groq.svg', name: 'Groq', sector: 'invited', w: [170, 210], t: [56, 128], mapped: false },
  { id: 'netskope', icon: 'netskope.webp', name: 'Netskope', sector: 'invited', w: [170, 600], t: [56, 420], mapped: false },
];
// the standard's five fields
export const CONCEPTS = [
  { id: 'time', label: 'time', w: [450, 250], t: [220, 160] },
  { id: 'value', label: 'value', w: [450, 320], t: [220, 205] },
  { id: 'unit', label: 'unit', w: [450, 390], t: [220, 250] },
  { id: 'basis', label: 'time basis', w: [450, 460], t: [220, 295] },
  { id: 'cadence', label: 'cadence', w: [450, 530], t: [220, 340] },
];
const CENTER = { w: [450, 390], t: [220, 250] };
const GLOW = { w: [450, 390], t: [220, 250] };
const TAGS = { saildrone: ['Built it', 'is-built'], palmetto: ['Runs it', 'is-need'], mast: ['Mapped', 'is-need'] };

const at = (k, o) => o[k === 'wide' ? 'w' : 't'];
// a gentle curve from a to b, bowed toward the middle of the map
function ctrl(a, b, c) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; return [m[0] + (c[0] - m[0]) * .18, m[1] + (c[1] - m[1]) * .18 - (Math.abs(a[1] - b[1]) < 12 ? 26 : 0)]; }
const curve = (a, b, c) => { const q = ctrl(a, b, c); return `M${a[0]} ${a[1]}Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${b[0]} ${b[1]}`; };
const tail = (a, b, c) => { const q = ctrl(a, b, c); return `Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${b[0]} ${b[1]}`; };

const C = (id) => CONCEPTS.find((x) => x.id === id), CO = (id) => COMPANIES.find((x) => x.id === id);

function edges(k) {
  const c = at(k, CENTER), g = at(k, GLOW), box = k === 'wide' ? '0 0 1200 750' : '0 0 440 820';
  const dim = COMPANIES.filter((co) => co.mapped).flatMap((co) => CONCEPTS.map((f) => `<path class="fd-e" pathLength="1" d="${curve(at(k, co), at(k, f), c)}"/>`)).join('');
  const s = at(k, CO('saildrone')), p = at(k, CO('palmetto')), m = at(k, CO('mast')), cc = at(k, C('unit'));
  return `<svg class="fd-edges is-${k}" viewBox="${box}" aria-hidden="true">`
    + `<defs><linearGradient id="fd-g-${k}" gradientUnits="userSpaceOnUse" x1="${s[0]}" y1="0" x2="${p[0]}" y2="0"><stop offset="0" stop-color="#3794ff"/><stop offset="1" stop-color="#3fb68b"/></linearGradient></defs>`
    + `<radialGradient id="fd-glow-${k}" cx="${g[0]}" cy="${g[1]}" r="${k === 'wide' ? 260 : 170}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3794ff" stop-opacity=".09"/><stop offset="1" stop-color="#3794ff" stop-opacity="0"/></radialGradient>`
    + `<rect width="100%" height="100%" fill="url(#fd-glow-${k})"/>`
    + `<text class="fd-col-l" x="${at(k, C('time'))[0]}" y="${at(k, C('time'))[1] - 30}" text-anchor="middle">SENSOR TIME-SERIES V1</text>`
    + dim
    + `<path class="fd-hl is-1" pathLength="1" d="${curve(s, cc, c)}" stroke="url(#fd-g-${k})"/>`
    + `<path class="fd-hl is-2" pathLength="1" d="${curve(cc, p, c)}"/>`
    + `<path class="fd-hl is-3" pathLength="1" d="${curve(m, cc, c)}"/>`
    + `</svg>`;
}
// the route the sealed tool travels: Saildrone, through the standard, to Palmetto
const route = (k) => { const c = at(k, CENTER), s = at(k, CO('saildrone')), cc = at(k, C('unit')), p = at(k, CO('palmetto')); return `path('${curve(s, cc, c)}${tail(cc, p, c)}')`; };

export function fundMap(el) {
  el.innerHTML = `<div class="fd-grid" aria-hidden="true"></div>`
    + `<header class="fd-head"><p class="fd-eye">Fund view · ${COMPANIES.length} portfolio companies · 3 mapped</p><h3 class="fd-h">Mapped to Sensor time-series v1</h3>`
    + `<p class="fd-legend"><b class="is-built">Built</b> at Saildrone, against the fields<b class="is-need">Runs</b> at Palmetto, on its own columns</p></header>`
    + edges('wide') + edges('tall')
    + CONCEPTS.map((x) => `<span class="fd-cx" data-tour="cx-${x.id}" style="--x:${x.w[0]}px;--y:${x.w[1]}px;--tx:${x.t[0]}px;--ty:${x.t[1]}px">${x.label}</span>`).join('')
    + COMPANIES.map((x) => `<div class="fd-co${x.mapped ? '' : ' is-wait'}" data-tour="co-${x.id}" style="--x:${x.w[0]}px;--y:${x.w[1]}px;--tx:${x.t[0]}px;--ty:${x.t[1]}px">`
      + `<img class="fav" src="./film/favicons/${x.icon}" alt=""><span><b>${x.name}</b><small>${x.sector}</small></span>`
      + (TAGS[x.id] ? `<em class="fd-tag ${TAGS[x.id][1]}" data-tour="tag-${x.id}">${TAGS[x.id][0]}</em>` : '') + `</div>`).join('')
    + `<div class="fd-packet" data-tour="packet" style="--route-w:${route('wide')};--route-t:${route('tall')}"><span class="cg-lg" data-lilguy="fabio-sd"></span><code>telemetry-inspector</code></div>`
    + `<aside class="fd-panel" data-tour="panel">`
    + `<p class="fd-eye">Rebound at Palmetto</p><b>telemetry-inspector, c54c31b</b>`
    + `<dl>`
    + `<div class="fd-row"><dt>Built at</dt><dd><img class="fav" src="./film/favicons/saildrone.png" alt="">Saildrone, against time and value</dd></div>`
    + `<div class="fd-row"><dt>Palmetto’s columns</dt><dd>measured_on → time · ac_power__423 → value · local time kept local</dd></div>`
    + `<div class="fd-row"><dt>Factory checks</dt><dd>7 of 7, in a sandbox. All 1,440 rows kept.</dd></div>`
    + `<div class="fd-row"><dt>Code</dt><dd>Same hash. Only the binding changed.</dd></div>`
    + `</dl></aside>`
    + `<p class="fd-fine">Illustrative. Companies from public Social Capital investment references; no partnership implied.</p>`;
}
