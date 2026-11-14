import test from 'node:test';import assert from 'node:assert/strict';
import {briefRevision,syncCompanyBrief,lookupCompanyBrief} from '../api/_hydra.js';
test('Hydra indexes only shared briefs and reads only the selected current revision',async()=>{
 const fetch0=globalThis.fetch,key0=process.env.HYDRADB_API_KEY;process.env.HYDRADB_API_KEY='test-only';
 const co={id:'solar',name:'Solar',needs:'Check sensor gaps',secret:'Never upload this',mapping:{rawCsv:'PRIVATE'}};const revision=briefRevision(co);let calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});if(url.endsWith('/context/ingest'))return Response.json({success:true});return Response.json({success:true,data:{chunks:[{id:'cg_brief_solar',collection:'cg_company_solar',relevancy_score:0.9,additional_metadata:{revision}},{id:'foreign',collection:'cg_company_other',relevancy_score:1,additional_metadata:{revision}}]}});};
 try{co.hydra=await syncCompanyBrief(co);const form=calls[0].options.body;assert.equal(form.get('collection'),'cg_company_solar');assert.equal(await form.get('documents').text(),'# Solar\n\nCheck sensor gaps');
 const found=await lookupCompanyBrief(co,'missing measurements');assert.equal(found.score,0.9);
 const body=JSON.parse(calls[1].options.body);assert.deepEqual(body.collections,['cg_company_solar']);assert.deepEqual(body.ids,['cg_brief_solar']);assert.equal(body.metadata_filters.additional_metadata.revision,revision);
 co.needs='Changed brief';assert.equal(await lookupCompanyBrief(co,'missing'),null);assert.equal(calls.length,2,'stale indexed content is never queried');
 }finally{globalThis.fetch=fetch0;if(key0===undefined)delete process.env.HYDRADB_API_KEY;else process.env.HYDRADB_API_KEY=key0;}
});
