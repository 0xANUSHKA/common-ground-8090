import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { Store } from '../server/store.js';
test('full factory flow, private metadata, download, opt-out and revocation',async()=>{
 process.env.BUILD_PROVIDER='reference';const s=new Store(':memory:'),{app}=createApp(s);
 const call=async(path:string,token='',method='GET',body?:any)=>{const r=await app.inject({url:'/api'+path,method:method as any,headers:{host:'127.0.0.1','x-common-ground':'1',...(token?{authorization:'Bearer '+token}:{})},...(body===undefined?{}:{payload:body})});return {status:r.statusCode,data:r.json()};};
 try{
  assert.equal((await call('/state')).status,401);
  const fabio=(await call('/demo-session','','POST',{userId:'fabio'})).data.token;
  const maya=(await call('/demo-session','','POST',{userId:'maya'})).data.token;
  const elli=(await call('/demo-session','','POST',{userId:'elli'})).data.token;
  const build=(await call('/build',fabio,'POST',{prompt:'Build a telemetry CSV completeness inspector'})).data;
  let job:any;for(let i=0;i<100;i++){job=(await call('/jobs/'+build.id,fabio)).data;if(job.status!=='building')break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(job.status,'ready',JSON.stringify(job));assert.ok(!('tokenHash' in job));
  const id=job.artifactId,a=(await call('/artifacts/'+id,fabio)).data;
  assert.equal((await call('/artifacts/'+id,maya)).status,404);
  const matches=(await call(`/artifacts/${id}/matches`,fabio)).data;assert.deepEqual(matches.map((m:any)=>m.id).sort(),['maya','theo']);
  assert.equal((await call(`/artifacts/${id}/publish`,fabio,'POST',{hash:a.hash,scope:'portfolio',recipients:['elli']})).status,404);
  assert.equal((await call(`/artifacts/${id}/publish`,fabio,'POST',{hash:a.hash,scope:'portfolio',recipients:['maya','theo']})).status,200);
  assert.equal((await call('/state',maya)).data.offers.length,1);
  assert.equal((await call('/state',elli)).data.offers.length,0);
  assert.equal((await call('/artifacts/'+id,elli)).status,404);
  assert.equal((await call(`/artifacts/${id}/publish`,maya,'POST',{hash:a.hash,scope:'portfolio',recipients:['elli']})).status,404);
  const adopted=(await call(`/artifacts/${id}/adopt`,maya,'POST',{})).data;assert.equal(adopted.report.rows,1440);assert.equal(adopted.wrongBindingRows,1439);assert.equal(adopted.hash,a.hash);
  const fault=(await call(`/artifacts/${id}/run`,maya,'POST',{challenge:true})).data;assert.equal(fault.report.missingTimestamps.length,3);assert.equal(fault.report.duplicateRows,1);
  const pkg=(await call(`/artifacts/${id}/package`,maya)).data;assert.equal(pkg.files['inspector.js'],a.source);assert.ok(pkg.files['pvdaq_system10_sample.csv']);
  assert.equal((await call('/preferences',maya,'PUT',{mode:'off',muted:[],exporter:true})).status,400);
  await call('/preferences',maya,'PUT',{mode:'off',muted:[]});assert.equal((await call('/state',maya)).data.offers.length,0);assert.equal((await call('/state',maya)).data.adoptions.length,1);assert.equal((await call(`/artifacts/${id}/package`,maya)).status,404);
  await call('/preferences',maya,'PUT',{mode:'portfolio',muted:[]});await call(`/artifacts/${id}/revoke`,fabio,'POST',{});assert.equal((await call(`/artifacts/${id}/package`,maya)).status,404);
  const evil=await app.inject({url:'/api/demo-session',method:'POST',headers:{host:'evil.example','x-common-ground':'1'},payload:{userId:'fabio'}});assert.equal(evil.statusCode,403);
  const cross=await app.inject({url:'/api/state',headers:{host:'127.0.0.1',origin:'https://evil.example',authorization:'Bearer '+fabio}});assert.equal(cross.statusCode,403);
 }finally{await app.close();s.close();}
});
