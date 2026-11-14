// Upstash Redis over its REST API. Vercel's Upstash integration sets KV_REST_API_URL / KV_REST_API_TOKEN
// (older projects: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). Commands are plain arrays; pipeline() batches.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvReady = () => !!(URL_ && TOKEN);

async function call(path, body) {
  if (!kvReady()) throw Object.assign(new Error('Database not connected yet'), { status: 503 });
  const r = await fetch(`${URL_}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `Database error ${r.status}`);
  return data;
}
export async function cmd(...args) { const d = await call('', args); if (d.error) throw new Error(d.error); return d.result; }
export async function pipeline(cmds) { if (!cmds.length) return []; const d = await call('/pipeline', cmds); return d.map((x) => { if (x.error) throw new Error(x.error); return x.result; }); }

export const getJSON = async (key) => { const v = await cmd('GET', key); return v ? JSON.parse(v) : null; };
export const setJSON = (key, value) => cmd('SET', key, JSON.stringify(value));
export async function getMany(keys) { if (!keys.length) return []; const vals = await cmd('MGET', ...keys); return vals.map((v) => (v ? JSON.parse(v) : null)); }
