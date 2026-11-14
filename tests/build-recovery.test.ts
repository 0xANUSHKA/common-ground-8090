import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';

// Exercise the actual webview with an editor bridge, including a lost connection and a reloaded view.
const bundle=await build({entryPoints:['web/main.ts'],bundle:true,write:false,format:'iife',loader:{'.css':'empty'}});
function harness(options:{saved?:any;status?:string;offline?:boolean;running?:boolean}={}){
 let persisted=options.saved,offline=options.offline||false,status=options.status||'building',posts=0,polls=0;
 const events:Record<string,Function>={},windowEvents:Record<string,Function>={};
 const root={innerHTML:'',addEventListener:(name:string,fn:Function)=>events[name]=fn};
 const clock={textContent:''};
 const job=()=>({id:'job-1',status,prompt:'Inspect telemetry without guessing time zones.',createdAt:new Date().toISOString(),events:['Repair attempt 2: sending the failing checks back to the agent.'],artifactId:'artifact-1',...(status==='failed'?{error:'Server restarted during build; start a new build.'}:{})});
 const reply=async(m:any)=>{
  if(m.action==='buildSession'){if(m.build===null)persisted=undefined;else if(m.build)persisted={build:m.build};return persisted?.build;}
  if(m.action==='account')return {signedIn:true,server:'https://example.test'};
  if(m.action==='workspace')return {user:{id:'source',name:'Source'},orgs:[{id:'co',kind:'company',name:'Source company'}],companyId:'co'};
  if(m.action==='recents'||m.action==='receipts')return [];
  if(m.action==='hosted'){
   if(m.path==='shared?companyId=co')return {companyId:'co',shared:[]};
   if(m.path==='orgs/co')return {tools:[]};
   if(m.path==='suggest')return {suggestions:[]};
  }
  if(m.action==='request'){
   if(m.path==='/health')return {integrations:{builder:'Claude Code agent'}};
   if(m.path==='/demo-session')return {user:{id:'fabio'}};
   if(m.path==='/state')return {jobs:options.running?[job()]:[]};
   if(m.path==='/build'){posts++;return job();}
   if(m.path==='/jobs/job-1'){polls++;if(offline)throw new Error('Cannot reach the local builder.');return job();}
   if(m.path==='/artifacts/artifact-1')return {id:'artifact-1',name:'inspector',hash:'abc',checks:[],source:'function inspect(){}'};
   if(m.path==='/artifacts/artifact-1/lineage')return null;
  }
  throw new Error('Unexpected bridge request '+JSON.stringify(m));
 };
 runInNewContext(bundle.outputFiles[0].text,{
  document:{querySelector:(s:string)=>s==='#app'?root:clock,addEventListener:()=>{},visibilityState:'visible'},
  window:{addEventListener:(name:string,fn:Function)=>windowEvents[name]=fn},
  acquireVsCodeApi:()=>({getState:()=>persisted,setState:(s:any)=>{persisted=s;},postMessage:(m:any)=>{void reply(m).then(data=>windowEvents.message({data:{id:m.id,data}}),e=>windowEvents.message({data:{id:m.id,error:e.message}}));}}),
  crypto:{randomUUID},setInterval:()=>0,setTimeout:(fn:()=>void,ms:number)=>{if(ms===2000)return setTimeout(fn,0);return 0;},console,Date,
 });
 return {root,get saved(){return persisted;},get posts(){return posts;},get polls(){return polls;},setOffline:(v:boolean)=>offline=v,setStatus:(v:string)=>status=v,
 click:(act:string)=>events.click({target:{closest:()=>({dataset:{act}})}})};
}
async function until(predicate:()=>boolean){for(let n=0;n<200;n++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}assert.fail('Webview did not reach expected state');}

test('lost polling connection preserves the job and reconnects without submitting another build',async()=>{
 const h=harness({offline:true});await until(()=>h.root.innerHTML.includes('Source company'));
 h.click('buildview');await until(()=>h.root.innerHTML.includes('data-act="build"'));
 h.click('build');await until(()=>h.root.innerHTML.includes('data-act="resume" >Reconnect to this build'));
 assert.equal(h.posts,1);assert.equal(h.polls,3);assert.match(h.root.innerHTML,/Connection interrupted/);assert.doesNotMatch(h.root.innerHTML,/data-act="build"/);
 assert.equal(h.saved.build.id,'job-1');
 h.setOffline(false);h.setStatus('failed');h.click('resume');await until(()=>h.root.innerHTML.includes('Retry build'));
 assert.equal(h.posts,1);assert.match(h.root.innerHTML,/Server restarted during build/);
});

test('reloading the webview restores a saved build only in its original account and company',async()=>{
 const saved={build:{id:'job-1',companyId:'co',userId:'source',server:'https://example.test'}};
 const h=harness({saved,status:'failed'});await until(()=>h.root.innerHTML.includes('Source company'));h.click('buildview');await until(()=>h.root.innerHTML.includes('Retry build'));assert.equal(h.posts,0);assert.equal(h.polls,1);
 const other=harness({saved:{build:{...saved.build,companyId:'other'}}});await until(()=>other.root.innerHTML.includes('Source company'));other.click('buildview');await until(()=>other.root.innerHTML.includes('data-act="build"'));assert.equal(other.polls,0);
});

test('an existing running job is reattached after a lost initial POST response',async()=>{
 const h=harness({running:true,offline:true});await until(()=>h.root.innerHTML.includes('Source company'));h.click('buildview');await until(()=>h.root.innerHTML.includes('data-act="build"'));h.click('build');await until(()=>h.root.innerHTML.includes('data-act="resume" >Reconnect to this build'));assert.equal(h.posts,0);assert.equal(h.saved.build.id,'job-1');
});

 test('a completed build survives reopening and allows explicitly starting another tool',async()=>{
 const h=harness({saved:{build:{id:'job-1',companyId:'co',userId:'source',server:'https://example.test'}},status:'ready'});
 await until(()=>h.root.innerHTML.includes('Source company'));h.click('buildview');await until(()=>h.root.innerHTML.includes('Build another tool'));
 h.click('newbuild');await until(()=>h.root.innerHTML.includes('data-act="build"'));assert.equal(h.saved?.build,undefined);assert.equal(h.posts,0);
 });
