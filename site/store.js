// Common Ground: the one place state lives. Accounts, companies, the standard, grants and the activity log, plus the
// signed-in session. Shared by the dashboard, sign-in and join pages. A browser-only prototype: localStorage when it
// can, nothing sent anywhere, and no passwords. Every field mirrors server/types.ts and server/policy.ts.
export const KEY = 'cg-dashboard-v3';
const SESSION = 'cg-session-v1';
export const DAY = 86400000;
export const CHECKS = [
  'NOAA: 1,440 rows, 55 missing wind values',
  'PVDAQ: 1,440 rows, negative power preserved',
  'Detect three missing timestamps and one duplicate',
  'First and last missing observations are detected',
  'Zero is not missing; malformed is separate',
  'Wrong units-row assumption is rejected',
  'Unseen synthetic window, duplicates and off-grid rows',
];
// columns in each company's real sample export (fixtures/*.csv); Mast has no sample yet
export const COLUMNS = {
  saildrone: ['time', 'latitude', 'longitude', 'WIND_SPEED_MEAN', 'TEMP_AIR_MEAN', 'BARO_PRES_MEAN', 'WAVE_SIGNIFICANT_HEIGHT'],
  palmetto: ['measured_on', 'ac_current__427', 'ac_power__423', 'ac_voltage__426', 'ambient_temp__428', 'dc_power__422', 'poa_irradiance__421', 'system_id'],
};

export function seed() {
  const now = Date.now(), at = (h) => new Date(now - h * 3600000).toISOString();
  const co = (id, name, sector, icon, status, source, binding, extra = {}) => ({
    id, name, sector, icon, status, source, binding, participating: status === 'joined',
    fundPeers: [], peers: [], classes: ['data-quality'], receive: 'portfolio', dismissed: [], invite: null,
    mapping: binding ? { state: 'verified', detail: '1,440 observations checked' } : { state: 'unmapped', detail: 'Not mapped yet' }, ...extra,
  });
  return {
    v: 3,
    fund: { name: 'Your fund' },
    network: { enabled: true, crossCompany: true, classes: ['data-quality'], maxOpenOffers: 2, expiryDays: 7 },
    standard: { name: 'Sensor time-series v1', version: '1.0', contract: 'inspect(rows, binding) → Report' },
    companies: [
      co('saildrone', 'Saildrone', 'ocean telemetry', 'saildrone.png', 'joined', 'NOAA PMEL ERDDAP export (CSV, units row, UTC)',
        { timeColumn: 'time', signalColumn: 'WIND_SPEED_MEAN', unit: 'm s-1', skipUnitsRow: true, timeBasis: 'utc', cadenceSeconds: 60 },
        { fundPeers: ['palmetto', 'mast'], peers: ['palmetto', 'mast'], mapping: { state: 'verified', detail: '1,440 observations · 55 missing wind values · 0 missing timestamps' } }),
      co('palmetto', 'Palmetto', 'residential solar', 'palmetto.png', 'joined', 'SolarEdge, Enphase and CURB monitoring exports (local time)',
        { timeColumn: 'measured_on', signalColumn: 'ac_power__423', unit: 'kW', skipUnitsRow: false, timeBasis: 'local-unspecified', cadenceSeconds: 60 },
        { fundPeers: ['saildrone', 'mast'], peers: ['saildrone', 'mast'], mapping: { state: 'verified', detail: '1,440 observations · local time preserved · negative power kept' } }),
      co('mast', 'Mast Reforestation', 'reforestation', 'mast.png', 'invited', 'Greenhouse-gas sensor logger exports', null,
        { fundPeers: ['saildrone', 'palmetto'], peers: ['saildrone', 'palmetto'], invite: { url: 'https://commonground.dev/join/m4st7q2k9x', at: at(20) } }),
      co('groq', 'Groq', 'AI inference', 'groq.svg', 'none', '', null),
      co('intercom', 'Intercom', 'customer messaging', 'intercom.png', 'none', '', null),
      co('netskope', 'Netskope', 'security', 'netskope.webp', 'none', '', null),
      co('slack', 'Slack', 'workplace messaging', 'slack.png', 'none', '', null),
    ],
    users: [
      { id: 'fabio', name: 'Fabio', company: 'saildrone', handle: 'fabio-sd', admin: true, publisher: true, exporter: true, receiver: true, eligible: true, capabilities: ['time-series', 'csv', 'completeness'] },
      { id: 'theo', name: 'Theo', company: 'saildrone', handle: 'theo-tides', publisher: true, exporter: false, receiver: true, eligible: true, capabilities: ['time-series', 'csv', 'completeness'] },
      { id: 'ines', name: 'Ines', company: 'saildrone', handle: 'ines-qc', publisher: false, exporter: false, receiver: true, eligible: true, capabilities: ['time-series', 'csv', 'completeness'] },
      { id: 'maya', name: 'Maya', company: 'palmetto', handle: 'maya-sun', admin: true, publisher: true, exporter: true, receiver: true, eligible: true, capabilities: ['time-series', 'csv', 'completeness'] },
      { id: 'leo', name: 'Leo', company: 'palmetto', handle: 'leo-billing', publisher: true, exporter: false, receiver: true, eligible: true, capabilities: ['billing', 'invoices'] },
      // individuals: no company, friends in circles
      { id: 'sam', name: 'Sam', company: null, handle: 'sam-builds', publisher: true, exporter: false, receiver: true, eligible: true, capabilities: ['csv'] },
      { id: 'kai', name: 'Kai', company: null, handle: 'kai-dev', publisher: true, exporter: false, receiver: true, eligible: true, capabilities: ['csv'] },
      { id: 'noa', name: 'Noa', company: null, handle: 'noa-codes', publisher: true, exporter: false, receiver: true, eligible: true, capabilities: ['csv'] },
      { id: 'pat', name: 'Pat', company: null, handle: 'pat-fund', fund: true, publisher: false, exporter: false, receiver: false, eligible: false, capabilities: [] },
      { id: 'elli', name: 'Elli', company: 'palmetto', handle: 'elli-ops', publisher: false, exporter: false, receiver: false, eligible: false, capabilities: ['time-series', 'csv'] },
    ],
    circles: [
      { id: 'weekend-hackers', name: 'Weekend hackers', owner: 'sam', members: ['sam', 'kai', 'noa'], invites: ['rhea-ml'], createdAt: at(120) },
    ],
    artifacts: [
      { id: 'csv-sanity', name: 'csv-sanity', owner: 'kai', company: null, hash: '7c2e91d0a4b3f6e1', checks: 7, class: 'data-quality', createdAt: at(30) },
      { id: 'telemetry-inspector', name: 'telemetry-inspector', owner: 'fabio', company: 'saildrone', hash: 'a1f3c9e4b72d08f5', checks: 7, class: 'data-quality', createdAt: at(9) },
    ],
    grants: [
      { id: 'c1', artifactId: 'csv-sanity', issuer: 'kai', scope: 'circle', circleId: 'weekend-hackers', recipients: ['sam', 'noa'], expiresAt: new Date(now + 30 * DAY).toISOString(), revoked: false, reshare: false, at: at(29) },
      { id: 'g1', artifactId: 'telemetry-inspector', issuer: 'fabio', scope: 'company', recipients: ['theo', 'ines'], expiresAt: new Date(now + 7 * DAY).toISOString(), revoked: false, reshare: false, at: at(8.8) },
      { id: 'g2', artifactId: 'telemetry-inspector', issuer: 'fabio', scope: 'portfolio', recipients: ['maya'], expiresAt: new Date(now + 7 * DAY).toISOString(), revoked: false, reshare: false, at: at(8.7) },
    ],
    audit: [
      { at: at(120), actor: 'Sam', action: 'Started a circle', subject: 'Weekend hackers', company: null, circle: 'weekend-hackers' },
      { at: at(29), actor: 'Kai', action: 'Shared with the circle', subject: 'csv-sanity', company: null, circle: 'weekend-hackers' },
      { at: at(70), actor: 'Fund', action: 'Published standard', subject: 'Sensor time-series v1', company: null },
      { at: at(66), actor: 'Fund', action: 'Invited to the standard', subject: 'Saildrone', company: 'saildrone' },
      { at: at(66), actor: 'Fund', action: 'Invited to the standard', subject: 'Palmetto', company: 'palmetto' },
      { at: at(50), actor: 'Saildrone', action: 'Mapping verified, joined', subject: 'ERDDAP export → Sensor time-series v1', company: 'saildrone' },
      { at: at(44), actor: 'Palmetto', action: 'Mapping verified, joined', subject: 'Monitoring exports → Sensor time-series v1', company: 'palmetto' },
      { at: at(20), actor: 'Fund', action: 'Invited to the standard', subject: 'Mast Reforestation', company: 'mast' },
      { at: at(9), actor: 'Fabio', action: 'Published tool, 7 of 7 checks passed', subject: 'telemetry-inspector', company: 'saildrone' },
      { at: at(8.8), actor: 'Fabio', action: 'Shared with Theo and Ines (company)', subject: 'telemetry-inspector', company: 'saildrone' },
      { at: at(8.7), actor: 'Fabio', action: 'Shared with Maya (portfolio)', subject: 'telemetry-inspector', company: 'saildrone', also: 'palmetto' },
    ].reverse(),
  };
}

export const load = () => { try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); if (v && v.v === 3) return v; } } catch {} return seed(); };
export const save = (S) => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
export const reset = () => { try { localStorage.removeItem(KEY); } catch {} return seed(); };

// the signed-in person: their user id, or null
export const session = {
  get() { try { return localStorage.getItem(SESSION) || sessionStorage.getItem(SESSION) || null; } catch { return null; } },
  set(id) { try { localStorage.setItem(SESSION, id); } catch { try { sessionStorage.setItem(SESSION, id); } catch {} } },
  clear() { try { localStorage.removeItem(SESSION); sessionStorage.removeItem(SESSION); } catch {} },
};
export const me = (S) => { const id = session.get(); return id ? S.users.find((u) => u.id === id) || null : null; };
export const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'org';

