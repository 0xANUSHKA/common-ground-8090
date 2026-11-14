import {parentPort,workerData} from 'node:worker_threads';
import {executeProject,verifyProject} from './project-runtime.js';
(async()=>workerData.verify?{checks:await verifyProject(workerData.project)}:{report:await executeProject(workerData.source,workerData.input,workerData.expectedHash),hash:workerData.expectedHash})()
.then(result=>parentPort?.postMessage({result})).catch(e=>parentPort?.postMessage({error:e instanceof Error?e.message:'Project execution failed'}));
