import {Worker} from 'node:worker_threads';
import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
export async function runDownloaded(workerPath:string,folder:string,expectedHash:string){
 async function bounded(name:string,limit:number){const path=join(folder,name);if((await stat(path)).size>limit)throw new Error(`${name} exceeds the demo size limit.`);const text=await readFile(path,'utf8');if(text.length>limit)throw new Error(`${name} exceeds the demo size limit.`);return text;}
 const [source,bindingText]=await Promise.all([bounded('inspector.js',24000),bounded('binding.json',8000)]);
 return new Promise((resolve,reject)=>{
  const worker=new Worker(workerPath,{workerData:{source,bindingText,expectedHash},resourceLimits:{maxOldGenerationSizeMb:96,maxYoungGenerationSizeMb:16}});
  const timer=setTimeout(()=>{void worker.terminate();reject(new Error('Solar demo exceeded its time limit.'));},8000);
  worker.once('message',m=>{clearTimeout(timer);void worker.terminate();m.error?reject(new Error(m.error)):resolve(m.result);});
  worker.once('error',e=>{clearTimeout(timer);reject(new Error(`Solar sandbox failed: ${e instanceof Error?e.message:'worker error'}`));});
  worker.once('exit',code=>{clearTimeout(timer);reject(new Error(`Solar sandbox stopped before returning a report (${code}).`));});
 });
}
