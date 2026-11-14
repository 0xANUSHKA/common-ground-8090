import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { Store } from '../server/store.js';
import { hash } from '../server/policy.js';
import { CHECK_NAMES } from '../server/runner.js';
import { parseBlueprint } from '../server/blueprint.js';
const reportFields=['rows','uniqueTimestamps','duplicateRows','missingTimestamps','outsideGrid','finiteValues','missingValues','malformedValues','negativeValues','zeroValues','physicalValidity'];
test('blueprint, lineage and drift detection (reference mode)',async()=>{
 process.env.BUILD_PROVIDER='reference';const s=new Store(':memory:'),{app}=createApp(s);
 const call=async(path:string,token='',method='GET',body?:any)=>{const r=await app.inject({url:'/api'+path,method:method as any,headers:{host:'127.0.0.1','x-common-ground':'1',...(token?{authorization:'Bearer '+token}:{})},...(body===undefined?{}:{payload:body})});return {status:r.statusCode,data:r.json()};};
 try{
  const fabio=(await call('/demo-session','','POST',{userId:'fabio'})).data.token;
  const maya=(await call('/demo-session','','POST',{userId:'maya'})).data.token;
  const build=(await call('/build',fabio,'POST',{prompt:'Build a wind telemetry CSV completeness inspector'})).data;
  let job:any;for(let i=0;i<100;i++){job=(await call('/jobs/'+build.id,fabio)).data;if(job.status!=='building')break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(job.status,'ready',JSON.stringify(job));
  // Blueprint shape
  const bp=job.blueprint;
  assert.deepEqual(Object.keys(bp).sort(),['inputs','mustPass','notes','outputs','standard','summary']);
  assert.equal(bp.standard,'Sensor time-series v1');
  assert.deepEqual(bp.inputs,['time','value','start','end','cadenceSeconds','timeBasis']);
  assert.deepEqual(bp.outputs,reportFields);
  assert.deepEqual(bp.mustPass,[...CHECK_NAMES]);assert.equal(bp.mustPass.length,7);
  assert.ok(bp.notes.length>=1&&bp.notes.length<=3);
  assert.ok(/^[^.]+\.$/.test(bp.summary),bp.summary);
  assert.equal(job.blueprintHash,hash(bp));
  assert.ok(job.events.includes('Blueprint written: '+bp.summary));
  assert.ok(job.events.indexOf('Blueprint written: '+bp.summary)<job.events.findIndex((e:string)=>e.startsWith('7 independent checks passed')));
  // Lineage hashes equal the artifact's own fields
  const id=job.artifactId,a=(await call('/artifacts/'+id,fabio)).data;
  const ln=(await call(`/artifacts/${id}/lineage`,fabio)).data;
  assert.equal(ln.lineage.sourceHash,a.hash);assert.equal(ln.lineage.checksHash,a.checksHash);assert.equal(ln.lineage.bindingHash,a.bindingHash);
  assert.equal(ln.lineage.blueprintHash,hash(ln.blueprint));assert.equal(ln.lineage.blueprintHash,job.blueprintHash);
  assert.equal(ln.lineage.workOrder,job.id);assert.equal(ln.lineage.builtBy,'reference');assert.equal(ln.lineage.standard,'Sensor time-series v1');assert.equal(ln.lineage.sealedAt,a.createdAt);
  assert.deepEqual(ln.requirement,{system:'8090 Software Factory'});
  assert.deepEqual(a.lineage,ln.lineage);assert.deepEqual(a.blueprint,bp);
  assert.equal((await call(`/artifacts/${id}/lineage`,maya)).status,404);
  // Package provenance carries lineage and blueprint
  const prov=JSON.parse((await call(`/artifacts/${id}/package`,fabio)).data.files['provenance.json']);
  assert.deepEqual(prov.lineage,ln.lineage);assert.deepEqual(prov.blueprint,bp);
  // Drift: sealed source stays sealed; an edited copy is flagged
  const sealed=(await call(`/artifacts/${id}/drift`,fabio,'POST',{})).data;
  assert.deepEqual({sealed:sealed.sealed,sourceMatches:sealed.sourceMatches,reasons:sealed.reasons},{sealed:true,sourceMatches:null,reasons:[]});
  assert.equal(sealed.checks.length,7);assert.ok(sealed.checks.every((c:any)=>c.passed));
  const same=(await call(`/artifacts/${id}/drift`,fabio,'POST',{source:a.source})).data;
  assert.equal(same.sealed,true);assert.equal(same.sourceMatches,true);
  const edited=(await call(`/artifacts/${id}/drift`,fabio,'POST',{source:a.source+'\n// tweak'})).data;
  assert.equal(edited.sealed,false);assert.equal(edited.sourceMatches,false);assert.ok(edited.reasons.includes('This copy differs from the sealed version.'));
  assert.equal((await call(`/artifacts/${id}/drift`,fabio,'POST',{source:1})).status,400);
  assert.equal((await call(`/artifacts/${id}/drift`,maya,'POST',{})).status,404);
 }finally{await app.close();s.close();}
});
test('agent blueprint replies are parsed robustly or rejected',()=>{
 const ok=parseBlueprint('Here you go:\n```json\n{"summary":"Counts gaps in wind data. Extra sentence.","notes":["Use a UTC grid.",""," ",2,"Edges count.","Third.","Fourth."]}\n```');
 assert.ok(ok);assert.equal(ok.summary,'Counts gaps in wind data.');assert.deepEqual(ok.notes,['Use a UTC grid.','Edges count.','Third.']);assert.equal(ok.mustPass.length,7);assert.equal(ok.standard,'Sensor time-series v1');
 const long=parseBlueprint(JSON.stringify({summary:'Inspects wind rows '+'across the window '.repeat(20),notes:['x '.repeat(100)]}));
 assert.ok(long);assert.ok(long.summary.length<=201&&long.summary.endsWith('…')&&!/\s…$/.test(long.summary),long.summary);assert.ok(long.notes[0].length<=141);
 assert.equal(parseBlueprint('not json'),undefined);
 assert.equal(parseBlueprint('{"summary":"Counts gaps.","notes":[]}'),undefined);
 assert.equal(parseBlueprint('{"summary":"x","notes":["a"]'),undefined);
});
