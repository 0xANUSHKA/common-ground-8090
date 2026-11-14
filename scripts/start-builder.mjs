// Keep the local builder alive when the launching terminal or agent session closes.
import 'dotenv/config';
import {spawn} from 'node:child_process';
import {mkdirSync,openSync,closeSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||4317);
const health=async()=>{try{const r=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1500)});const h=await r.json();return r.ok&&h.ok&&h.mode==='local-demo';}catch{return false;}};
if(await health()){console.log(`Common Ground builder is already running on port ${port}.`);process.exit(0);}
mkdirSync(new URL('../.local/',import.meta.url),{recursive:true,mode:0o700});
const log=openSync(new URL('../.local/builder.log',import.meta.url),'a',0o600);
const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:root,env:process.env,detached:true,stdio:['ignore',log,log]});
closeSync(log);child.unref();
child.on('error',()=>{console.error('Could not start the builder. See .local/builder.log.');process.exitCode=1;});
for(let n=0;n<20;n++){await new Promise(r=>setTimeout(r,250));if(await health()){console.log(`Builder ready on port ${port}. It stays running when this terminal closes. Logs: .local/builder.log`);process.exit(0);}}
console.error('Builder did not become ready. Check .local/builder.log.');process.exitCode=1;
