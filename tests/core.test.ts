import test from 'node:test';
import assert from 'node:assert/strict';
import { referenceSource,verifySource,execute,inspectDataset } from '../server/runner.js';
import { marine,solar } from '../server/seed.js';
test('independent reference checks and real source data',async()=>{const checks=await verifySource(referenceSource());assert.equal(checks.length,7);assert.ok(checks.every(c=>c.passed),JSON.stringify(checks));});
test('time basis preserved and challenge changes copies only',async()=>{const before=await inspectDataset(referenceSource(),solar);const fault=await inspectDataset(referenceSource(),solar,true);assert.equal(fault.duplicateRows,1);assert.equal(fault.missingTimestamps.length,3);assert.equal(fault.rows,1438);assert.deepEqual(await inspectDataset(referenceSource(),solar),before);assert.equal((await inspectDataset(referenceSource(),marine)).missingValues,55);});
test('generated code cannot see process, fetch, or require',async()=>{for(const v of ['process.env','fetch("https://example.com")','require("node:fs")'])await assert.rejects(execute(`function inspect(){return ${v}}`,[],solar));});
test('infinite code stops at runtime deadline',async()=>{const start=Date.now();await assert.rejects(execute('function inspect(){while(true){}}',[],solar));assert.ok(Date.now()-start<4000);});
test('malformed result rejected instead of marked passed',async()=>{await assert.rejects(execute('function inspect(){return {success:true}}',[],solar));});
