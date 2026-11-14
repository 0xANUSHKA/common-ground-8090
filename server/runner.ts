import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { getQuickJS, shouldInterruptAfterDeadline } from 'quickjs-emscripten';
import { reportSchema } from './report.js';
import { hash } from './policy.js';
import { marine, solar } from './seed.js';
import type { Binding, Check, Report } from './types.js';
export const fixtureDir=fileURLToPath(new URL('../fixtures/',import.meta.url));
const files={marine:'saildrone_1045_2021-09-30.csv',solar:'pvdaq_system10_sample.csv'};
const digests={marine:'758abc1ed90b26e200c75dc6e3659c0670326b6ec52ab57a246d0ccb586a6225',solar:'1aa6357e55b56d70e9289f48b5fdf012c7ee5c07eb1478a8137dcb079df9479c'};
export const referenceSource=()=>readFileSync(fixtureDir+'inspector.js','utf8');
export function records(b: Binding, challenge=false) {
 const csv=readFileSync(fixtureDir+files[b.dataset],'utf8');
 if(hash(csv)!==digests[b.dataset]) throw new Error('Fixture checksum mismatch');
 let rows=parse(csv,{columns:true,skip_empty_lines:true}) as Record<string,string>[];
 if (b.skipUnitsRow) rows=rows.slice(1);
 let mapped=rows.map(r=>{
   if (!(b.timeColumn in r)||!(b.signalColumn in r)) throw new Error('Binding columns are absent');
   const time=r[b.timeColumn].replace(' ','T');
   if (b.timeBasis==='utc'&&!time.endsWith('Z')) throw new Error('Explicit UTC timestamps required');
   if (b.timeBasis==='local-unspecified'&&/[Z+]/.test(time)) throw new Error('Do not infer local timezones');
   return {time,value:r[b.signalColumn]};
 });
 if(challenge) {
  if(b.dataset!=='solar')throw new Error('Fault challenge is solar only');
  const duplicate=mapped.find(x=>x.time==='2015-01-01T15:00:00');
  mapped=mapped.filter(x=>!['2015-01-01T10:00:00','2015-01-01T10:01:00','2015-01-01T10:02:00'].includes(x.time));
  if(duplicate)mapped.push({...duplicate});
 }
 return mapped;
}
export const CHECK_NAMES=['NOAA: 1,440 rows, 55 missing wind values','PVDAQ: 1,440 rows, negative power preserved','Detect three missing timestamps and one duplicate','First and last missing observations are detected','Zero is not missing; malformed is separate','Wrong units-row assumption is rejected','Unseen synthetic window, duplicates and off-grid rows'] as const;
export const REPORT_FIELDS=Object.keys(reportSchema.shape);
export async function execute(source:string, rows:{time:string;value:string}[], binding:Binding):Promise<Report> {
 if(source.length>24000||rows.length>10000)throw new Error('Execution input limit');
 const q=await getQuickJS();
 // No host callbacks, module loader, network, environment, filesystem or credentials.
 // Local naive timestamps use UTC arithmetic only; output retains the unresolved local basis.
 const output=q.evalCode(`'use strict';\n${source}\nJSON.stringify(inspect(${JSON.stringify(rows)},${JSON.stringify(binding)}))`,{
  memoryLimitBytes:32*1024*1024,maxStackSizeBytes:1024*1024,shouldInterrupt:shouldInterruptAfterDeadline(Date.now()+800),
 });
 if(typeof output!=='string'||output.length>500000)throw new Error('Invalid inspector output');
 return reportSchema.parse(JSON.parse(output));
}
export async function inspectDataset(source:string,b:Binding,challenge=false){return execute(source,records(b,challenge),b);}
export async function verifySource(source:string):Promise<Check[]> {
 const checks:Check[]=[];
 const check=async(name:string,fn:()=>Promise<boolean>)=>{try{checks.push({name,passed:await fn()});}catch{checks.push({name,passed:false,detail:'Execution or contract failed'});}};
 await check(CHECK_NAMES[0],async()=>{const r=await inspectDataset(source,marine);return r.rows===1440&&r.missingValues===55&&r.finiteValues===1385&&r.duplicateRows===0&&r.missingTimestamps.length===0;});
 await check(CHECK_NAMES[1],async()=>{const r=await inspectDataset(source,solar);return r.rows===1440&&r.missingValues===0&&r.negativeValues===913&&r.physicalValidity==='not_assessed';});
 await check(CHECK_NAMES[2],async()=>{const r=await inspectDataset(source,solar,true);return r.rows===1438&&r.uniqueTimestamps===1437&&r.duplicateRows===1&&JSON.stringify(r.missingTimestamps)===JSON.stringify(['2015-01-01T10:00:00','2015-01-01T10:01:00','2015-01-01T10:02:00']);});
 await check(CHECK_NAMES[3],async()=>{const r=await execute(source,records(solar).slice(1,-1),solar);return r.missingTimestamps.length===2&&r.missingTimestamps[0]==='2015-01-01T00:00:00';});
 await check(CHECK_NAMES[4],async()=>{const rows=records(solar);rows[0].value='0';rows[1].value='bad';const r=await execute(source,rows,solar);return r.zeroValues===1&&r.malformedValues===1&&r.missingValues===0;});
 await check(CHECK_NAMES[5],async()=>{const r=await inspectDataset(source,{...solar,skipUnitsRow:true});return r.rows===1439&&r.missingTimestamps[0]==='2015-01-01T00:00:00';});
 await check(CHECK_NAMES[6],async()=>{
  const b={...solar,start:'2024-02-03T09:00:00',end:'2024-02-03T09:05:00'};
  const r=await execute(source,[{time:'2024-02-03T09:00:00',value:'0'},{time:'2024-02-03T09:02:00',value:'-1'},{time:'2024-02-03T09:02:00',value:'NaN'},{time:'2024-02-03T08:59:00',value:'2'}],b);
  return r.rows===4&&r.uniqueTimestamps===3&&r.duplicateRows===1&&r.outsideGrid===1&&r.missingTimestamps.length===3&&r.missingValues===1&&r.zeroValues===1;
 });
 return checks;
}
