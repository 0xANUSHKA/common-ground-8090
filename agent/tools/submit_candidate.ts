import { defineTool } from 'eve/tools';
import { z } from 'zod';
export default defineTool({description:'Submit a pure JavaScript inspector to independent tests. Cannot publish or grant access.',inputSchema:z.object({jobId:z.string(),capability:z.string(),source:z.string().max(24000)}),async execute(input){
 const r=await fetch(`http://127.0.0.1:${process.env.PORT||4317}/api/candidate`,{method:'POST',headers:{'Content-Type':'application/json','X-Common-Ground':'1'},body:JSON.stringify(input),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`Candidate rejected (${r.status})`);return r.json();
}});
