import { z } from 'zod';
import { fixtureDir } from './runner.js';
export function integrationStatus(){return {
 builder:process.env.BUILD_PROVIDER==='eve'?'Eve agent':'Offline reference template',
 hydra:process.env.HYDRADB_API_KEY?'Configured — queried on fit review':'Not connected',
 elevenlabs:process.env.ELEVENLABS_API_KEY?'Configured — audio brief enabled':'Not connected',
 factory:process.env.SOFTWARE_FACTORY_API_KEY?'Configured':'Not connected',
};}
export async function sourceContext(companyIds:string[]) {
 // Caller computes this allowlist from policy before querying. No cross-tenant global search.
 if(!process.env.HYDRADB_API_KEY)return {provider:'local-public-evidence',text:'Public company context: both marine and solar operations produce timestamped sensor observations. Reuse completeness logic; keep units, local time and domain interpretation separate.'};
 const {HydraDBClient}=await import('@hydradb/sdk');
 const {buildString}=await import('@hydradb/sdk/helpers');
 const client=new HydraDBClient({token:process.env.HYDRADB_API_KEY});
 const result=await client.query({database:process.env.HYDRADB_DATABASE||'common_ground_demo',collections:companyIds.map(x=>'public_'+x),type:'knowledge',query:'Find source evidence for timestamped sensor data, CSV intake and reusable data completeness checks. Do not infer adoption or private company needs.'});
 return {provider:'HydraDB',text:buildString(result).slice(0,6000)};
}
export async function transcribe(base64:string, mime:string) {
 if(!process.env.ELEVENLABS_API_KEY)throw new Error('Connect ELEVENLABS_API_KEY in .env to use an audio brief.');
 if(base64.length>7_000_000)throw new Error('Audio must be smaller than 5 MB');
 const form=new FormData();
 form.set('model_id','scribe_v2');
 form.set('file',new Blob([Buffer.from(base64,'base64')],{type:mime}),'brief.webm');
 const r=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY},body:form,signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw new Error(`ElevenLabs returned ${r.status}`);
 const data=z.object({text:z.string().max(12000)}).parse(await r.json());
 return {text:data.text,provider:'ElevenLabs Scribe'};
}
export {fixtureDir};
