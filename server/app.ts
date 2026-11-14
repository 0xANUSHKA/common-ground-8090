import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { randomBytes,randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import { Store } from './store.js';
import { seed } from './seed.js';
import { canPublish,canReceive,fit,hash } from './policy.js';
import { acceptCandidate,adapt,startBuild } from './factory.js';
import { inspectDataset,fixtureDir } from './runner.js';
import { sourceContext,transcribe,integrationStatus } from './integrations.js';
import { readFileSync } from 'node:fs';
import type { Artifact,Adoption,BuildJob,Company,Grant,Preference,User } from './types.js';
export function createApp(store=new Store(), staticRoot=resolve('dist/web')) {
 seed(store);
 const app=Fastify({logger:false,bodyLimit:8_000_000});
 const sessions=new Map<string,string>();
 const denied=()=>Object.assign(new Error('Unavailable for this identity or policy.'),{statusCode:404});
 const identity=(request:any):User=>{const id=sessions.get(String(request.headers.authorization||'').replace(/^Bearer /,''));const u=id&&store.get<User>('user',id);if(!u)throw Object.assign(new Error('Sign in to continue'),{statusCode:401});return u;};
 const event=(actor:string,action:string,subject:string,outcome:string)=>store.put('audit',randomUUID(),{actor,action,subject,outcome,at:new Date().toISOString()});
 const access=(u:User,id:string)=>{const a=store.get<Artifact>('artifact',id);if(!a)throw denied();if(a.owner===u.id)return a;if(!store.all<Grant>('grant').some(g=>canReceive(store,u,a,g))){event(u.id,'access',id,'denied');throw denied();}return a;};
 const safeJob=(j:BuildJob)=>{const {tokenHash,...safe}=j;return safe;};
 const summary=(a:Artifact)=>{const {source,...safe}=a;return safe;};
 app.addHook('onRequest',async(req,reply)=>{
  const host=String(req.headers.host||'').split(':')[0];
  if(!['127.0.0.1','localhost'].includes(host))return reply.code(403).send({error:'This v0 is loopback-only.'});
  if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`)return reply.code(403).send({error:'Cross-origin access denied'});
  if(req.method!=='GET'&&req.headers['x-common-ground']!=='1')return reply.code(403).send({error:'Missing request marker'});
  reply.header('X-Content-Type-Options','nosniff').header('Referrer-Policy','no-referrer');
  if(req.url.startsWith('/api/'))reply.header('Cache-Control','no-store');
 });
 app.setErrorHandler((err:any,_req,reply)=>reply.code(err instanceof z.ZodError?400:(err.statusCode||500)).send({error:err instanceof z.ZodError?'Invalid request':err.message||'Request failed'}));
 app.get('/api/health',async()=>({ok:true,mode:'local-demo',integrations:integrationStatus()}));
 app.get('/api/demo-identities',async()=>store.all<User>('user').map(({id,name,company})=>({id,name,company})));
 // Local rehearsal identities, NOT production authentication. Never bind this service publicly.
 app.post('/api/demo-session',async(req)=>{const {userId}=z.object({userId:z.string()}).strict().parse(req.body);const u=store.get<User>('user',userId);if(!u)throw denied();const token=randomBytes(32).toString('hex');sessions.set(token,u.id);return {token,user:u};});
 app.get('/api/state',async(req)=>{
  const u=identity(req),p=store.get<Preference>('preference',u.id)!;
  const adoptions=store.all<Adoption>('adoption').filter(a=>a.userId===u.id),dismissed=store.get<string[]>('dismissed',u.id)||[];
  const eligible=store.all<Artifact>('artifact').filter(a=>a.owner!==u.id&&!dismissed.includes(a.id)&&!adoptions.some(d=>d.artifactId===a.id&&d.hash===a.hash)&&store.all<Grant>('grant').some(g=>canReceive(store,u,a,g))&&fit(u,a).qualified);
  const cap=store.get<{maxOpenOffers:number}>('network','demo')!.maxOpenOffers;
  return {user:u,preference:p,company:store.get<Company>('company',u.company),offers:[...new Map(eligible.map(a=>[a.hash,a])).values()].slice(0,cap).map(a=>({...summary(a),creator:store.get<User>('user',a.owner),companyName:store.get<Company>('company',a.company)!.name,fit:fit(u,a)})),owned:store.all<Artifact>('artifact').filter(a=>a.owner===u.id).map(summary),adoptions,jobs:store.all<BuildJob>('job').filter(j=>j.owner===u.id).map(safeJob),integrations:integrationStatus()};
 });
 app.put('/api/preferences',async(req)=>{const u=identity(req),p=z.object({mode:z.enum(['off','company','portfolio']),muted:z.array(z.string()).max(50)}).strict().parse(req.body);store.put('preference',u.id,p);event(u.id,'preferences',u.id,p.mode);return p;});
 app.post('/api/build',async(req)=>{const u=identity(req);const {prompt}=z.object({prompt:z.string().min(10).max(12000)}).strict().parse(req.body);if(store.all<BuildJob>('job').some(j=>j.owner===u.id&&j.status==='building'))throw Object.assign(new Error('A build is already running'),{statusCode:409});return safeJob(await startBuild(store,u,prompt));});
 app.get<{Params:{id:string}}>('/api/jobs/:id',async(req)=>{const u=identity(req),j=store.get<BuildJob>('job',req.params.id);if(!j||j.owner!==u.id)throw denied();return safeJob(j);});
 app.post('/api/candidate',async(req)=>{const b=z.object({jobId:z.string(),capability:z.string(),source:z.string().max(24000)}).strict().parse(req.body);return acceptCandidate(store,b.jobId,b.capability,b.source);});
 app.get<{Params:{id:string}}>('/api/artifacts/:id',async(req)=>{const u=identity(req),a=access(u,req.params.id);return {...a,creator:store.get<User>('user',a.owner)};});
 app.get<{Params:{id:string}}>('/api/artifacts/:id/matches',async(req)=>{
  const u=identity(req),a=access(u,req.params.id);if(a.owner!==u.id||!canPublish(store,u,a,'company'))throw denied();
  const scope=canPublish(store,u,a,'portfolio')?'portfolio':'company',reviewed={...a,reviewedHash:a.hash,reviewedBy:u.id};
  const g:Grant={id:'preview',artifactId:a.id,hash:a.hash,issuer:u.id,scope,recipients:store.all<User>('user').map(x=>x.id),expiresAt:new Date(Date.now()+86400000).toISOString(),revoked:false,reshare:false};
  return store.all<User>('user').filter(x=>x.id!==u.id&&canReceive(store,x,reviewed,g)&&fit(x,a).qualified).map(x=>({id:x.id,name:x.name,company:x.company,reason:fit(x,a).reason}));
 });
 app.post<{Params:{id:string}}>('/api/artifacts/:id/publish',async(req)=>{
  const u=identity(req),a=access(u,req.params.id),b=z.object({hash:z.string(),scope:z.enum(['company','portfolio']),recipients:z.array(z.string()).min(1).max(3)}).strict().parse(req.body);
  if(b.hash!==a.hash||!canPublish(store,u,a,b.scope))throw denied();
  const reviewed={...a,reviewedHash:a.hash,reviewedBy:u.id};
  const g:Grant={id:randomUUID(),artifactId:a.id,hash:a.hash,issuer:u.id,scope:b.scope,recipients:[...new Set(b.recipients)],expiresAt:new Date(Date.now()+7*86400000).toISOString(),revoked:false,reshare:false};
  if(!g.recipients.every(id=>{const target=store.get<User>('user',id);return target&&canReceive(store,target,reviewed,g)&&fit(target,a).qualified;}))throw denied();
  store.put('artifact',a.id,reviewed);store.put('grant',g.id,g);event(u.id,'publish',a.id,'allowed');return {grant:g,recipients:g.recipients};
 });
 app.post<{Params:{id:string}}>('/api/artifacts/:id/revoke',async(req)=>{const u=identity(req),a=access(u,req.params.id);if(a.owner!==u.id)throw denied();for(const g of store.all<Grant>('grant').filter(g=>g.artifactId===a.id)){g.revoked=true;store.put('grant',g.id,g);}event(u.id,'revoke',a.id,'allowed');return {revoked:true};});
 app.post<{Params:{id:string}}>('/api/artifacts/:id/dismiss',async(req)=>{const u=identity(req);access(u,req.params.id);store.put('dismissed',u.id,[...new Set([...(store.get<string[]>('dismissed',u.id)||[]),req.params.id])]);return {dismissed:true};});
 app.post<{Params:{id:string}}>('/api/artifacts/:id/adopt',async(req)=>{const u=identity(req),a=access(u,req.params.id);const result=await adapt(store,u,a);access(u,a.id);store.put('adoption',result.id,result);event(u.id,'adopt',a.id,'allowed');return result;});
 app.post<{Params:{id:string}}>('/api/artifacts/:id/run',async(req)=>{
  const u=identity(req),a=access(u,req.params.id),b=z.object({challenge:z.boolean().default(false)}).strict().parse(req.body);
  const adoption=store.all<Adoption>('adoption').filter(x=>x.userId===u.id&&x.artifactId===a.id).at(-1);
  if(adoption&&(adoption.hash!==a.hash||hash(adoption.binding)!==adoption.bindingHash))throw denied();
  if(a.owner!==u.id&&!adoption)throw denied();
  const binding=adoption?.binding||a.sourceBinding,report=await inspectDataset(a.source,binding,b.challenge);
  return {report,coreHash:a.hash,binding,challenge:b.challenge,label:b.challenge?'Deliberately modified in-memory copy; original unchanged':'Unmodified public dataset'};
 });
 app.get<{Params:{id:string}}>('/api/artifacts/:id/package',async(req)=>{
  const u=identity(req),a=access(u,req.params.id),adoption=store.all<Adoption>('adoption').filter(x=>x.userId===u.id&&x.artifactId===a.id).at(-1);
  if(u.id!==a.owner&&!adoption)throw denied();
  const binding=adoption?.binding||a.sourceBinding;
  if(adoption&&(adoption.hash!==a.hash||adoption.bindingHash!==hash(binding)))throw denied();
  const dataset=binding.dataset==='solar'?'pvdaq_system10_sample.csv':'saildrone_1045_2021-09-30.csv';
  return {name:a.name,hash:a.hash,files:{'inspector.js':a.source,'binding.json':JSON.stringify(binding,null,2),'provenance.json':JSON.stringify({hash:a.hash,bindingHash:hash(binding),checks:a.checks,provenance:a.provenance},null,2),'README.md':`# Telemetry inspector\n\nApproved core: ${a.hash}\n\nUse Common Ground Start to run in bounded QuickJS. This download never executes automatically.\n\nDataset: ${dataset}. See DATA_LICENSES.md. Solar timezone is unspecified. Physical validity is not assessed.\n`,'DATA_LICENSES.md':readFileSync(fixtureDir+'DATA_LICENSES.md','utf8'),[dataset]:readFileSync(fixtureDir+dataset,'utf8')}};
 });
 app.get<{Params:{id:string}}>('/api/artifacts/:id/evidence',async(req)=>{const u=identity(req),a=access(u,req.params.id);return sourceContext([...new Set([u.company,a.company])]);});
 app.post('/api/audio-brief',async(req)=>{identity(req);const b=z.object({base64:z.string(),mime:z.enum(['audio/webm','audio/wav','audio/mpeg','audio/mp4','audio/ogg'])}).strict().parse(req.body);return transcribe(b.base64,b.mime);});
 app.get('/api/audit',async(req)=>{const u=identity(req);return store.all<{actor:string}>('audit').filter(x=>x.actor===u.id).slice(-30);});
 app.register(fastifyStatic,{root:staticRoot,prefix:'/'});
 return {app,store};
}
