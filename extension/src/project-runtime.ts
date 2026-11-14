import {createHash} from 'node:crypto';
import {newQuickJSWASMModuleFromVariant,shouldInterruptAfterDeadline} from 'quickjs-emscripten-core';
import variant from '@jitl/quickjs-singlefile-cjs-release-sync';
import {z} from 'zod';
const cell=z.union([z.string().max(500),z.number().finite()]);
const report=z.object({title:z.string().max(100),summary:z.string().max(1000),metrics:z.array(z.object({label:z.string().max(100),value:cell})).max(8),columns:z.array(z.string().max(100)).min(1).max(8),rows:z.array(z.array(cell).max(8)).max(3000),notes:z.array(z.string().max(1000)).max(200)});
export const sourceHash=(source:string)=>createHash('sha256').update(source).digest('hex');
export async function executeProject(source:string,input:unknown,expectedHash:string){
 if(source.length>24000||JSON.stringify(input).length>100000)throw new Error('Project or input is too large.');
 if(sourceHash(source)!==expectedHash)throw new Error('Project code changed since it was shared. Download the approved version again.');
 const q=await newQuickJSWASMModuleFromVariant(variant);
 const output=q.evalCode(`'use strict';\n${source}\nJSON.stringify(run(${JSON.stringify(input)}))`,{memoryLimitBytes:32*1024*1024,maxStackSizeBytes:1024*1024,shouldInterrupt:shouldInterruptAfterDeadline(Date.now()+800)});
 if(typeof output!=='string'||output.length>500000)throw new Error('Project returned an invalid report.');
 const parsed=report.parse(JSON.parse(output));if(parsed.rows.some(r=>r.length!==parsed.columns.length))throw new Error('Project returned inconsistent table columns.');
 return parsed;
}
export async function verifyProject(project:any){
 const checks=[];
 for(const c of project.checks){let passed=false;try{const r=await executeProject(project.source,c.input,sourceHash(project.source));passed=!c.error&&r.metrics.find(x=>x.label===c.metric)?.value===c.value;}catch{passed=!!c.error;}checks.push({name:c.name,passed});}
 return checks;
}
