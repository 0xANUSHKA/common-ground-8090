// Scene 3, the fund's view: an ontology map. Portfolio companies around the edge, the shared concepts they build
// or need in the middle, and the one match the film follows: built at Saildrone, needed at Palmetto and Mast.
// Everything is placed in the window's design px: [x, y] wide (1200 × 750) and [x, y] tall (440 × 820).
// Companies are public Social Capital investment references (fixtures/company-evidence.json); favicons are their own.

export const COMPANIES = [
  { id: 'saildrone', icon: 'saildrone.png', name: 'Saildrone', sector: 'ocean telemetry', w: [122, 420], t: [46, 262], links: ['ts', 'cc', 'csv'] },
  { id: 'palmetto', icon: 'palmetto.png', name: 'Palmetto', sector: 'residential solar', w: [778, 420], t: [394, 262], links: ['ts', 'cc', 'csv'] },
  { id: 'mast', icon: 'mast.png', name: 'Mast Reforestation', sector: 'reforestation', w: [752, 596], t: [384, 360], links: ['cc'] },
  { id: 'groq', icon: 'groq.svg', name: 'Groq', sector: 'AI inference', w: [200, 214], t: [62, 128], links: ['inf'] },
  { id: 'intercom', icon: 'intercom.png', name: 'Intercom', sector: 'customer messaging', w: [700, 214], t: [378, 128], links: ['inf'] },
  { id: 'netskope', icon: 'netskope.webp', name: 'Netskope', sector: 'security', w: [168, 650], t: [52, 470], links: ['acl'] },
  { id: 'slack', icon: 'slack.png', name: 'Slack', sector: 'workplace messaging', w: [450, 702], t: [220, 486], links: ['acl', 'msg'] },
];
export const CONCEPTS = [
  { id: 'inf', label: 'model inference', w: [450, 214], t: [220, 128] },
  { id: 'ts', label: 'sensor time-series', w: [450, 330], t: [220, 196] },
  { id: 'cc', label: 'completeness checks', w: [450, 420], t: [220, 262] },
  { id: 'csv', label: 'CSV schemas', w: [450, 510], t: [220, 328] },
  { id: 'acl', label: 'access policies', w: [330, 606], t: [140, 404] },
  { id: 'msg', label: 'customer messages', w: [570, 606], t: [300, 404] },
];
const CENTER = { w: [450, 420], t: [220, 262] };
const GLOW = { w: [450, 412], t: [220, 268] };
const TAGS = { saildrone: ['Built it', 'is-built'], palmetto: ['Needs it', 'is-need'], mast: ['Same need', 'is-need'] };

const at = (k, o) => o[k === 'wide' ? 'w' : 't'];
// a gentle curve from a to b, bowed toward the middle of the map
function ctrl(a, b, c) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; return [m[0] + (c[0] - m[0]) * .18, m[1] + (c[1] - m[1]) * .18 - (Math.abs(a[1] - b[1]) < 12 ? 26 : 0)]; }
const curve = (a, b, c) => { const q = ctrl(a, b, c); return `M${a[0]} ${a[1]}Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${b[0]} ${b[1]}`; };
const tail = (a, b, c) => { const q = ctrl(a, b, c); return `Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${b[0]} ${b[1]}`; };

const C = (id) => CONCEPTS.find((x) => x.id === id), CO = (id) => COMPANIES.find((x) => x.id === id);

function edges(k) {
  const c = at(k, CENTER), g = at(k, GLOW), box = k === 'wide' ? '0 0 1200 750' : '0 0 440 820';
  const dim = COMPANIES.flatMap((co) => co.links.map((l) => `<path class="fd-e" pathLength="1" d="${curve(at(k, co), at(k, C(l)), c)}"/>`)).join('');
  const s = at(k, CO('saildrone')), p = at(k, CO('palmetto')), m = at(k, CO('mast')), cc = at(k, C('cc'));
  return `<svg class="fd-edges is-${k}" viewBox="${box}" aria-hidden="true">`
    + `<defs><linearGradient id="fd-g-${k}" gradientUnits="userSpaceOnUse" x1="${s[0]}" y1="0" x2="${p[0]}" y2="0"><stop offset="0" stop-color="#3794ff"/><stop offset="1" stop-color="#3fb68b"/></linearGradient></defs>`
    + `<radialGradient id="fd-glow-${k}" cx="${g[0]}" cy="${g[1]}" r="${k === 'wide' ? 260 : 170}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3794ff" stop-opacity=".09"/><stop offset="1" stop-color="#3794ff" stop-opacity="0"/></radialGradient>`
    + `<rect width="100%" height="100%" fill="url(#fd-glow-${k})"/>`
    + `<text class="fd-col-l" x="${at(k, C('inf'))[0]}" y="${at(k, C('inf'))[1] - 30}" text-anchor="middle">SHARED ONTOLOGY</text>`
    + dim
    + `<path class="fd-hl is-1" pathLength="1" d="${curve(s, cc, c)}" stroke="url(#fd-g-${k})"/>`
    + `<path class="fd-hl is-2" pathLength="1" d="${curve(cc, p, c)}"/>`
    + `<path class="fd-hl is-3" pathLength="1" d="${curve(m, cc, c)}"/>`
    + `</svg>`;
}
// the route the shared tool travels: Saildrone, through the concept, to Palmetto
const route = (k) => { const c = at(k, CENTER), s = at(k, CO('saildrone')), cc = at(k, C('cc')), p = at(k, CO('palmetto')); return `path('${curve(s, cc, c)}${tail(cc, p, c)}')`; };

export function fundMap(el) {
  el.innerHTML = `<div class="fd-grid" aria-hidden="true"></div>`
    + `<header class="fd-head"><p class="fd-eye">Fund view · ${COMPANIES.length} portfolio companies</p><h3 class="fd-h">One ontology across the portfolio</h3>`
    + `<p class="fd-legend"><span class="is-built"></span>builds<span class="is-need"></span>needs<span class="is-cx"></span>shared concept</p></header>`
    + edges('wide') + edges('tall')
    + CONCEPTS.map((x) => `<span class="fd-cx" data-tour="cx-${x.id}" style="--x:${x.w[0]}px;--y:${x.w[1]}px;--tx:${x.t[0]}px;--ty:${x.t[1]}px"><i></i>${x.label}</span>`).join('')
    + COMPANIES.map((x) => `<div class="fd-co" data-tour="co-${x.id}" style="--x:${x.w[0]}px;--y:${x.w[1]}px;--tx:${x.t[0]}px;--ty:${x.t[1]}px">`
      + `<img class="fav" src="./film/favicons/${x.icon}" alt=""><span><b>${x.name}</b><small>${x.sector}</small></span>`
      + (TAGS[x.id] ? `<em class="fd-tag ${TAGS[x.id][1]}" data-tour="tag-${x.id}">${TAGS[x.id][0]}</em>` : '') + `</div>`).join('')
    + `<div class="fd-packet" data-tour="packet" style="--route-w:${route('wide')};--route-t:${route('tall')}"><span class="cg-lg" data-lilguy="fabio-sd"></span><code>telemetry-inspector</code></div>`
    + `<aside class="fd-panel" data-tour="panel">`
    + `<p class="fd-eye"><i></i>Match found</p><b>Completeness checks on sensor time-series</b>`
    + `<dl>`
    + `<div class="fd-row"><dt>Built at</dt><dd><img class="fav" src="./film/favicons/saildrone.png" alt="">Saildrone · telemetry-inspector</dd></div>`
    + `<div class="fd-row"><dt>Needed at</dt><dd><img class="fav" src="./film/favicons/palmetto.png" alt="">Palmetto <img class="fav" src="./film/favicons/mast.png" alt="">Mast</dd></div>`
    + `<div class="fd-row"><dt>Permissions</dt><dd>Both companies opted in. Named people only.</dd></div>`
    + `<div class="fd-row"><dt>Security</dt><dd>7 checks passed. Never runs on its own.</dd></div>`
    + `</dl></aside>`
    + `<p class="fd-fine">Illustrative. Companies from public Social Capital investment references; no partnership implied.</p>`;
}
