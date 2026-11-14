import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runSolar} from '../extension/src/solar-runner.js';
const source=readFileSync(new URL('../fixtures/inspector.js',import.meta.url),'utf8');
const csv=readFileSync(new URL('../fixtures/pvdaq_system10_sample.csv',import.meta.url),'utf8');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const binding={company:'Solar Solutions',time:'measured_on',value:'ac_power__423',timeBasis:'local-unspecified',cadenceSeconds:60,skipUnitsRow:false};
const input={source,csv,expectedHash:hash(source),bindingText:JSON.stringify(binding)};

test('recipient executes byte-identical downloaded code on original and faulted solar samples',async()=>{
 const r=await runSolar(input);
 assert.equal(r.company,'Solar Solutions');assert.equal(r.sourceHash,hash(source));assert.equal(r.caught,true);
 assert.equal(r.baseline.rows,1440);assert.equal(r.baseline.duplicateRows,0);assert.equal(r.baseline.missingTimestamps.length,0);
 assert.equal(r.challenge.rows,1438);assert.equal(r.challenge.duplicateRows,1);assert.equal(r.challenge.missingTimestamps.length,3);
 assert.equal(r.baseline.negativeValues,913);assert.equal(hash(source),input.expectedHash);
});
test('solar replay refuses changed code, corrupted data and incompatible recipient mappings',async()=>{
 await assert.rejects(runSolar({...input,source:source+'\n// changed'}),/changed/);
 await assert.rejects(runSolar({...input,csv:csv+'\n'}),/integrity/);
 await assert.rejects(runSolar({...input,bindingText:JSON.stringify({...binding,time:'time'})}),/saved Solar sample mapping/);
});
test('solar replay runs source rather than returning canned success, and restricts host access',async()=>{
 const bad='function inspect(){throw new Error("actual execution")}';
 await assert.rejects(runSolar({...input,source:bad,expectedHash:hash(bad)}));
 const probe='if(typeof process!=="undefined"||typeof require!=="undefined"||typeof fetch!=="undefined")throw new Error("host exposed");\n'+source;
 assert.equal((await runSolar({...input,source:probe,expectedHash:hash(probe)})).caught,true);
 const loop='while(true){}';
 await assert.rejects(runSolar({...input,source:loop,expectedHash:hash(loop)}));
});
