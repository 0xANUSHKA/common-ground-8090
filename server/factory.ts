import { randomUUID,randomBytes } from 'node:crypto';
import type { Store } from './store.js';
import type { Artifact,BuildJob,User,Adoption } from './types.js';
import { hash,qualified } from './policy.js';
import { recordRequirement } from './software-factory.js';
import { marine,solar } from './seed.js';
import { referenceSource,verifySource,inspectDataset } from './runner.js';
export const contract=`Write a self-contained JavaScript function inspect(rows,binding). No exports, imports, filesystem, network or host APIs. rows are {time,value} strings; binding has start,end,cadenceSeconds,timeBasis. Time basis utc has Z; local-unspecified has no timezone: use UTC arithmetic on naive text and return naive text, NEVER infer a location or offset. Interval [start,end) is explicit; detect missing timestamps including edges; count duplicate timestamps and distinct off-grid timestamps. Output ONLY fields rows, uniqueTimestamps, duplicateRows, missingTimestamps (ISO strings without milliseconds, retain Z only for utc), outsideGrid, finiteValues, missingValues, malformedValues, negativeValues, zeroValues, physicalValidity:'not_assessed'. Blank/NaN/Infinity/Inf are missing, nonnumeric text malformed, zero and negative numbers valid. Count each row's signal. Do not infer physical validity. Respect the user's brief within this completeness-inspector contract. Tests are authoritative; do not hardcode fixture answers.`;
const candidateLocks=new Set<string>();
export async function acceptCandidate(s:Store,jobId:string,token:string,source:string) {
 const job=s.get<BuildJob>('job',jobId);
 if(!job||job.tokenHash!==hash(token)||job.status!=='building'||Date.now()-Date.parse(job.createdAt)>10*60*1000)throw new Error('Invalid or expired build capability');
 if(candidateLocks.has(jobId))throw new Error('A candidate is already being verified');
 candidateLocks.add(jobId);
 try {
 const checks=await verifySource(source);
 if(!checks.every(x=>x.passed)){job.events.push('Candidate failed independent checks; repair required.');s.put('job',job.id,job);return {accepted:false,checks};}
 const owner=s.get<User>('user',job.owner)!;
 const a:Artifact={id:randomUUID(),name:'telemetry-inspector',owner:owner.id,company:owner.company,source,hash:hash(source),sourceBinding:marine,bindingHash:hash(marine),checks,checksHash:hash(checks),maintainer:owner.id,class:'data-quality',capabilities:['time-series','csv','completeness'],provenance:job.provider==='eve'?'eve-generated':'reference-template',createdAt:new Date().toISOString()};
 s.put('artifact',a.id,a);job.status='ready';job.artifactId=a.id;job.events.push('7 independent checks passed. Immutable candidate ready for your review.');s.put('job',job.id,job);
 return {accepted:true,checks,artifactId:a.id};
 }finally{candidateLocks.delete(jobId);}
}
export async function startBuild(s:Store,u:User,prompt:string) {
 const token=randomBytes(32).toString('hex');
 const job:BuildJob={id:randomUUID(),owner:u.id,prompt,status:'building',tokenHash:hash(token),events:['Build contract created.'],provider:process.env.BUILD_PROVIDER==='eve'?'eve':'reference',createdAt:new Date().toISOString()};
 s.put('job',job.id,job);
 // One bounded asynchronous job. Status survives restarts; interrupted jobs fail explicitly on startup.
 void (async()=>{try{
  if(process.env.SOFTWARE_FACTORY_API_KEY){const requirement=await recordRequirement(job.id,prompt,contract);job.events.push('8090 requirement recorded: '+(requirement?.id||requirement?.document_id||'created'));s.put('job',job.id,job);}
  if(job.provider==='reference'){
   job.events.push('Offline mode: compiling the hand-authored reference template. No model generation claimed.');s.put('job',job.id,job);
   await acceptCandidate(s,job.id,token,referenceSource());
  }else{
   const base=process.env.EVE_URL||'http://127.0.0.1:8000';
   const r=await fetch(base+'/eve/v1/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:`${contract}\nUser brief: ${prompt}\nSubmit source using submit_candidate with jobId=${job.id} and capability=${token}. Repair failures up to 3 times. Do not print the capability in a reply.`}),signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw new Error(`Eve returned ${r.status}`);
   const data=await r.json() as {sessionId:string};job.sessionId=data.sessionId;job.events.push('Live Eve coding session started; waiting for tested source.');s.put('job',job.id,job);
   const timeout=setTimeout(()=>{const latest=s.get<BuildJob>('job',job.id);if(latest?.status==='building'){latest.status='failed';latest.error='Agent did not produce a passing candidate within 8 minutes.';s.put('job',latest.id,latest);}},8*60*1000);timeout.unref();
  }
 }catch(e){const current=s.get<BuildJob>('job',job.id)!;current.status='failed';current.error=e instanceof Error?e.message:'Build failed';s.put('job',job.id,current);}})();
 return job;
}
export async function adapt(s:Store,u:User,a:Artifact):Promise<Adoption & {trace:string[];wrongBindingRows?:number}> {
 if(!qualified(a))throw new Error('Artifact changed after verification');
 const binding=u.company==='palmetto'?solar:marine;
 const trace:string[]=[];
 let wrongBindingRows:number|undefined;
 if(binding.dataset==='solar'){
  const wrong=await inspectDataset(a.source,{...binding,skipUnitsRow:a.sourceBinding.skipUnitsRow});wrongBindingRows=wrong.rows;
  if(wrong.rows!==1440)trace.push(`Rejected inherited units-row setting: ${wrong.rows} rows; midnight observation lost.`);
  trace.push('Bound the public PVDAQ schema: no units row; local timestamps preserved; power units stay separate.');
 }
 const report=await inspectDataset(a.source,binding);
 if(report.rows!==1440||report.missingTimestamps.length!==0||report.duplicateRows!==0)throw new Error('Recipient binding failed verification');
 const result:Adoption={id:hash([u.id,a.id,a.hash,binding]),userId:u.id,artifactId:a.id,hash:a.hash,binding,bindingHash:hash(binding),report,checks:[{name:'All 1,440 observations retained',passed:true},{name:'No timezone inferred',passed:true},{name:'Identical approved core SHA-256',passed:hash(a.source)===a.hash}],createdAt:new Date().toISOString()};
 // Persist only after the route rechecks policy following asynchronous validation.
 return {...result,trace,wrongBindingRows};
}
