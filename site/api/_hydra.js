import {createHash} from 'node:crypto';
export const hydraReady=()=>!!process.env.HYDRADB_API_KEY;
const database=()=>process.env.HYDRADB_DATABASE||'default-tenant';
export const briefRevision=co=>createHash('sha256').update(`${co.id}\n${co.name}\n${co.needs||''}`).digest('hex');
const scope=co=>{if(!/^[a-z0-9]+$/.test(co.id))throw new Error('Invalid company scope');return {database:database(),collection:'cg_company_'+co.id,id:'cg_brief_'+co.id};};
async function call(path,body,method='POST'){
 const multipart=body instanceof FormData;
 const r=await fetch('https://api.hydradb.com'+path,{method,headers:{Authorization:`Bearer ${process.env.HYDRADB_API_KEY}`,'API-Version':'2',...(multipart?{}:{'Content-Type':'application/json'})},body:multipart?body:JSON.stringify(body),signal:AbortSignal.timeout(6000)});
 if(!r.ok)throw new Error(`HydraDB returned ${r.status}`);
 const result=await r.json();if(result.success===false)throw new Error('HydraDB request failed');return result;
}
export async function syncCompanyBrief(co){
 if(!hydraReady())return {state:'not-configured'};
 const s=scope(co),revision=briefRevision(co);
 if(!co.needs?.trim()){
  await call('/context',{database:s.database,collection:s.collection,ids:[s.id],type:'knowledge'},'DELETE');
  return {state:'empty',revision};
 }
 const form=new FormData();form.set('database',s.database);form.set('collection',s.collection);form.set('type','knowledge');form.set('upsert','true');
 // Only the admin-authored shared brief leaves Redis. No code, samples, email addresses or private directories.
 form.append('documents',new Blob([`# ${co.name}\n\n${co.needs}`],{type:'text/markdown'}),'workflow.md');
 form.set('document_metadata',JSON.stringify([{id:s.id,additional_metadata:{company_id:co.id,revision}}]));
 await call('/context/ingest',form);return {state:'indexing',revision};
}
export async function lookupCompanyBrief(co,query){
 if(!hydraReady()||!co.needs?.trim())return null;
 const s=scope(co),revision=briefRevision(co);
 if(co.hydra?.revision!==revision)return null;
 const r=await call('/query',{database:s.database,collections:[s.collection],ids:[s.id],type:'knowledge',query:String(query).slice(0,1500),mode:'fast',max_results:3,graph_context:false,query_forceful_relations:false,metadata_filters:{additional_metadata:{revision}}});
 const chunks=(r.data?.chunks||[]).filter(c=>c.collection===s.collection&&c.additional_metadata?.revision===revision);
 const score=Math.max(0,...chunks.map(c=>Number(c.relevancy_score)||0));
 // Retrieval is a candidate signal, never a permission or proof of usefulness.
 return chunks.length&&score>=0.65?{provider:'HydraDB',score,source:s.id,revision}:null;
}
