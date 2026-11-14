import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { newQuickJSWASMModuleFromVariant, shouldInterruptAfterDeadline } from 'quickjs-emscripten-core';
import variant from '@jitl/quickjs-singlefile-cjs-release-sync';
import { reportSchema } from '../../server/report.js';

const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
const SOLAR_HASH='1aa6357e55b56d70e9289f48b5fdf012c7ee5c07eb1478a8137dcb079df9479c';
const gaps=['2015-01-01T10:00:00','2015-01-01T10:01:00','2015-01-01T10:02:00'];
export async function runSolar(input:{source:string;expectedHash:string;bindingText:string;csv:string}){
 const {source,expectedHash,bindingText,csv}=input;
 if(source.length>24000||bindingText.length>8000||csv.length>2_000_000)throw new Error('Demo input is too large.');
 if(!/^[a-f0-9]{64}$/.test(expectedHash)||digest(source)!==expectedHash)throw new Error('Downloaded code has changed. Download the approved version again before running this demo.');
 if(digest(csv)!==SOLAR_HASH)throw new Error('Bundled solar sample failed its integrity check. Reinstall the extension.');
 const raw=JSON.parse(bindingText);
 if(!raw || typeof raw!=='object')throw new Error('The project binding is missing.');
 const time=raw.time??raw.timeColumn,value=raw.value??raw.signalColumn;
 if(time!=='measured_on'||value!=='ac_power__423'||raw.timeBasis!=='local-unspecified'||raw.cadenceSeconds!==60||raw.skipUnitsRow!==false)
  throw new Error('This demo needs the saved Solar sample mapping (measured_on, ac_power__423, local time, 60 seconds, no units row). Download from your solar company after saving that mapping.');
 const binding={...raw,dataset:'solar',timeColumn:time,signalColumn:value,start:'2015-01-01T00:00:00',end:'2015-01-02T00:00:00'};
 const rows=(parse(csv,{columns:true,skip_empty_lines:true}) as Record<string,string>[]).map(r=>({time:r[time].replace(' ','T'),value:r[value]}));
 const duplicate=rows.find(r=>r.time==='2015-01-01T15:00:00');
 if(!duplicate)throw new Error('Solar challenge observation missing.');
 const altered=rows.filter(r=>!gaps.includes(r.time));altered.push({...duplicate});
 const q=await newQuickJSWASMModuleFromVariant(variant);
 const execute=(data:typeof rows)=>{
  // Untrusted source runs only inside QuickJS, never Node eval/require. No host callbacks are installed.
  const output=q.evalCode(`'use strict';\n${source}\nJSON.stringify(inspect(${JSON.stringify(data)},${JSON.stringify(binding)}))`,{
   memoryLimitBytes:32*1024*1024,maxStackSizeBytes:1024*1024,shouldInterrupt:shouldInterruptAfterDeadline(Date.now()+800),
  });
  if(typeof output!=='string'||output.length>500000)throw new Error('Inspector returned an invalid report.');
  return reportSchema.parse(JSON.parse(output));
 };
 const baseline=execute(rows),challenge=execute(altered);
 const caught=baseline.rows===1440&&baseline.duplicateRows===0&&baseline.missingTimestamps.length===0&&challenge.rows===1438&&challenge.duplicateRows===1&&JSON.stringify(challenge.missingTimestamps)===JSON.stringify(gaps);
 return {company:String(raw.company||'Solar sample'),sourceHash:expectedHash,sourceUnchanged:true,bindingHash:digest(bindingText),timeColumn:time,valueColumn:value,baseline,challenge,caught,
  injected:{removed:gaps,duplicated:duplicate.time},sample:'Public NREL PVDAQ sample; faults injected into a copy for this demonstration.',at:new Date().toISOString()};
}
