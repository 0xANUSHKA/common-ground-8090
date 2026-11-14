import {Worker} from 'node:worker_threads';
export async function projectWorker(path:string,workerData:unknown):Promise<any>{
 return new Promise((resolve,reject)=>{
 const worker=new Worker(path,{workerData,resourceLimits:{maxOldGenerationSizeMb:96,maxYoungGenerationSizeMb:16}});
 const timer=setTimeout(()=>{void worker.terminate();reject(new Error('Project exceeded its execution time limit.'));},10000);
 worker.once('message',m=>{clearTimeout(timer);void worker.terminate();m.error?reject(new Error(m.error)):resolve(m.result);});
 worker.once('error',()=>{clearTimeout(timer);reject(new Error('Project sandbox failed.'));});
 worker.once('exit',code=>{clearTimeout(timer);reject(new Error(`Project sandbox stopped (${code}).`));});
 });
}
