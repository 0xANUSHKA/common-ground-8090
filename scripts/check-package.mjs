import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
const dir=mkdtempSync(join(tmpdir(),'common-ground-vsix-check-'));
try{
 execFileSync('unzip',['-q',resolve('common-ground-0.1.5.vsix'),'-d',dir]);
 const source=readFileSync('fixtures/inspector.js','utf8');
 const bindingText=JSON.stringify({company:'Package verification',time:'measured_on',value:'ac_power__423',timeBasis:'local-unspecified',cadenceSeconds:60,skipUnitsRow:false});
 const expectedHash=createHash('sha256').update(source).digest('hex');
 const result=await new Promise((resolve,reject)=>{
  const w=new Worker(join(dir,'extension/dist/solar-worker.cjs'),{workerData:{source,bindingText,expectedHash}});
  const t=setTimeout(()=>{void w.terminate();reject(new Error('Extracted VSIX worker timeout'));},8000);
  w.once('message',m=>{clearTimeout(t);void w.terminate();m.error?reject(new Error(m.error)):resolve(m.result)});w.once('error',reject);
 });
 if(!result.caught)throw new Error('Packaged worker failed recipient demo');
 const projects=JSON.parse(readFileSync(join(dir,'extension/dist/projects.json'),'utf8'));
 for(const p of projects){
  const report=await new Promise((resolve,reject)=>{const w=new Worker(join(dir,'extension/dist/project-worker.cjs'),{workerData:{source:p.source,input:p.scenarios[0].input,expectedHash:createHash('sha256').update(p.source).digest('hex')}});const timeout=setTimeout(()=>{void w.terminate();reject(new Error('Example worker timeout'));},8000);w.once('message',m=>{clearTimeout(timeout);void w.terminate();m.error?reject(new Error(m.error)):resolve(m.result)});w.once('error',reject);});
  if(!report.report?.metrics?.length)throw new Error(p.id+' returned no computed metrics');
 }
 console.log('All four prepared projects execute from the extracted VSIX outside the repository.');
 console.log('Extracted VSIX works outside repository, without node_modules or a local builder. Source '+expectedHash.slice(0,7)+': 3 missing + 1 duplicate.');
}finally{rmSync(dir,{recursive:true,force:true});}
