import { parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSolar } from './solar-runner.js';
runSolar({...workerData,csv:readFileSync(join(__dirname,'pvdaq_system10_sample.csv'),'utf8')})
 .then(result=>parentPort?.postMessage({result}))
 .catch(error=>parentPort?.postMessage({error:error instanceof Error?error.message:'The downloaded inspector failed in the sandbox.'}));
