import 'dotenv/config';
import { createApp } from './app.js';
import type { BuildJob } from './types.js';
const {app,store}=createApp();
for(const job of store.all<BuildJob>('job').filter(j=>j.status==='building')){job.status='failed';job.error='Server restarted during build; start a new build.';store.put('job',job.id,job);}
await app.listen({host:'127.0.0.1',port:Number(process.env.PORT||4317)});
console.log(`Common Ground · http://127.0.0.1:${process.env.PORT||4317} · local demo identities, not production SSO`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();store.close();process.exit(0);});
