import 'dotenv/config';
import { existsSync } from 'node:fs';

// Deliberately prints presence only. Never print keys, environment dumps or provider responses.
let failed = false;
function report(name: string, ok: boolean, detail: string, required = false) {
  console.log(`${ok ? 'OK' : required ? 'FIX' : 'OPTIONAL'}  ${name}: ${detail}`);
  if (!ok && required) failed = true;
}
const nodeOk = Number(process.versions.node.split('.')[0]) === 26;
report('Node', nodeOk, nodeOk ? '26.x' : 'Install Node 26.x for the SQLite runtime', true);
report('.env', existsSync('.env'), existsSync('.env') ? 'Local configuration found' : 'Copy .env.example to .env; offline mode also works without it');
const provider = process.env.BUILD_PROVIDER || 'reference';
report('Build mode', ['reference', 'eve', 'claude'].includes(provider), provider === 'reference' ? 'Hand-authored reference template; no model generation' : provider === 'eve' ? 'Live Eve worker requested' : provider === 'claude' ? 'Live Claude Code worker requested; CLI must be signed in' : 'Use reference, claude or eve', true);
const gateway = Boolean(process.env.AI_GATEWAY_API_KEY);
report('AI Gateway', gateway, gateway ? 'Key present; successful generation must still be verified' : 'Missing; required only for live Eve generation', provider === 'eve');
for (const [name, key, purpose] of [
  ['8090', 'SOFTWARE_FACTORY_API_KEY', 'Requirements storage'],
  ['ElevenLabs', 'ELEVENLABS_API_KEY', 'Audio transcription'],
  ['HydraDB', 'HYDRADB_API_KEY', 'Optional fit evidence; local public evidence works without it'],
]) report(name, Boolean(process.env[key]), process.env[key] ? `${purpose}; key present, validity not checked` : `${purpose}; not connected`);
report('Compiled view', existsSync('dist/web/index.html'), existsSync('dist/web/index.html') ? 'Found' : 'Run npm run build', true);
if (process.argv.includes('--server')) {
  try {
    const response = await fetch(`http://127.0.0.1:${Number(process.env.PORT || 4317)}/api/health`, { signal: AbortSignal.timeout(3000) });
    const body = await response.json() as { ok?: boolean; mode?: string };
    report('Backend', response.ok && body.ok === true && body.mode === 'local-demo', 'Loopback health check', true);
  } catch {
    report('Backend', false, 'Not reachable; run npm start in another terminal', true);
  }
}
console.log('No provider requests, purchases, generation or secret output performed.');
process.exitCode = failed ? 1 : 0;
