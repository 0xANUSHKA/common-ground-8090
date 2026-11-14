import 'dotenv/config';
import { HydraDBClient } from '@hydradb/sdk';
import { writeFile,mkdir } from 'node:fs/promises';
if(!process.env.HYDRADB_API_KEY)throw new Error('Set HYDRADB_API_KEY in .env');
const client=new HydraDBClient({token:process.env.HYDRADB_API_KEY});
const database=process.env.HYDRADB_DATABASE||'common_ground_demo';
try{await client.databases.status({database});}catch{await client.databases.create({database});}
async function waitFor(check:()=>Promise<boolean>){const deadline=Date.now()+180000;while(Date.now()<deadline){if(await check())return;await new Promise(r=>setTimeout(r,2000));}throw new Error('HydraDB indexing timed out; retry after checking dashboard.');}
await waitFor(async()=>!!(await client.databases.status({database})).data?.infra?.readyForIngestion);
await mkdir('.local/context',{recursive:true});
const documents={saildrone:'# Saildrone public context\nSaildrone builds ocean observation vehicles. Source: https://www.saildrone.com/about . NOAA mission 1045 provides timestamped wind observations: https://data.pmel.noaa.gov/pmel/erddap/tabledap/sd1045_hurricane_2021.html . Completeness inspection checks row cadence, duplicates and missing measurements. This public evidence is not a real internal requirement or endorsement.',palmetto:'# Palmetto public context\nPalmetto works in residential clean energy. Historical Social Capital investment: https://palmetto.com/about/media-center/press-release/palmetto-raises-375-million-to-accelerate-residential-clean-energy-independence . Public NREL PVDAQ time-series data supports an illustrative solar use case: https://data.openei.org/submissions/4568 . This is not Palmetto customer data or proof of actual demand. Reuse CSV completeness logic, keep recipient timestamp and measurement conventions separate.'};
for(const [company,text] of Object.entries(documents)){
 const path=`.local/context/${company}.md`,collection='public_'+company;await writeFile(path,text);
 const result=await client.context.ingest({database,collection,type:'knowledge',documents:[{path,filename:company+'.md',contentType:'text/markdown'}],documentMetadata:JSON.stringify([{id:'common-ground-public-'+company}])});
 const id=result.data?.results?.[0]?.id;if(!id)throw new Error('No ingestion id returned');
 await waitFor(async()=>{const status=(await client.context.status({database,collection,ids:[id]})).data?.statuses?.[0];if(status?.indexingStatus==='errored')throw new Error('HydraDB indexing failed');return status?.indexingStatus==='completed';});
 console.log(`Indexed ${company} public evidence.`);
}
