import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {executeProject,verifyProject,sourceHash} from '../extension/src/project-runtime.js';
const projects=JSON.parse(readFileSync('examples/catalog.json','utf8'));
for(const p of projects)test(p.title+' executes seven independent acceptance cases',async()=>{p.source=readFileSync('examples/'+p.id+'.js','utf8');const checks=await verifyProject(p);assert.equal(checks.length,7);assert.deepEqual(checks.filter((c:any)=>!c.passed),[]);});
test('project sandbox rejects tampered source, host access, infinite loops and malformed output',async()=>{
 await assert.rejects(()=>executeProject('function run(){return {}}',{},'a'.repeat(64)),/changed/);
 for(const source of ['function run(){return process.env}','function run(){return fetch("https://example.com")}','function run(){while(true){}}','function run(){return {title:"bad"}}'])await assert.rejects(()=>executeProject(source,{},sourceHash(source)));
});
