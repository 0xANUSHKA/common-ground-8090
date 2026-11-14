import 'dotenv/config';
import {createHash} from 'node:crypto';
import {purgePlan} from './purge-records.mjs';
const args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
if(!url||!token)throw new Error('Load the existing hosted Redis credentials into the environment. Do not create a new database.');
async function cmd(...command){const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(30000)});const b=await r.json();if(!r.ok||b.error)throw new Error(`Redis request failed: ${r.status} ${b.error||''}`);return b.result;}
const prefixes=new Set(['user','org','mem','uorgs','fundcos','inv','oinv','tool','utools','otools','grant','tgrants','ogrants','ugrants','audit','reuse','pkg']);
let snapshot={};let cursor='0';
do{const [next,keys]=await cmd('SCAN',cursor,'COUNT',200);cursor=String(next);for(const key of keys){if(!prefixes.has(key.split(':')[0]))continue;const type=await cmd('TYPE',key);if(type==='none')continue;if(key.startsWith('pkg:')){snapshot[key]={type,value:null};continue;}const read={string:'GET',set:'SMEMBERS',hash:'HGETALL',list:'LRANGE'}[type];if(!read)throw new Error(`Unexpected data type at ${key}`);const raw=await cmd(read,key,...(type==='list'?[0,-1]:[]));snapshot[key]={type,value:type==='hash'?Object.fromEntries(Array.from({length:raw.length/2},(_,i)=>[raw[2*i],raw[2*i+1]])):type==='set'?raw.sort():raw};}}while(cursor!=='0');
snapshot=Object.fromEntries(Object.entries(snapshot).sort(([a],[b])=>a.localeCompare(b)));
const known=Object.entries(snapshot).filter(([k,v])=>k.startsWith('user:')&&v.type==='string').map(([,v])=>JSON.parse(v.value));
if(args.includes('--list-users')){console.log(JSON.stringify(known.map(u=>({id:u.id,name:u.name,email:u.email})),null,2));process.exit(0);}
const selected=[...new Set((arg('--users')||'').split(',').filter(Boolean))].sort();
const plan=purgePlan(snapshot,selected);
const digest=createHash('sha256').update(JSON.stringify({url,selected,snapshot,commands:plan.commands})).digest('hex').slice(0,16);
console.log(JSON.stringify({...plan.summary,confirmation:digest,hydraCollections:plan.companyIds.map(id=>'cg_company_'+id)},null,2));
if(!args.includes('--apply')){console.log(`PREVIEW ONLY. Pause demo activity, review the list, then rerun with --apply ${digest}. Accounts and Google login remain; selected users get empty workspaces.`);process.exit(0);}
if(arg('--apply')!==digest)throw new Error('The database changed or the confirmation is wrong. Review a fresh preview. Nothing deleted.');
// One atomic operation: compare every inspected record before making any change.
const expected=Object.entries(snapshot).filter(([k])=>!k.startsWith('pkg:')).map(([key,r])=>({key,type:r.type,value:r.type==='hash'?Object.entries(r.value).sort().flat():r.value}));
const script=`local e=cjson.decode(ARGV[1]); local ops=cjson.decode(ARGV[2]); for _,v in ipairs(e) do local typ=redis.call('TYPE',v.key).ok; if typ~=v.type then return redis.error_reply('Data changed; preview again') end; local a; if typ=='string' then a=redis.call('GET',v.key); if a~=v.value then return redis.error_reply('Data changed; preview again') end else if typ=='set' then a=redis.call('SMEMBERS',v.key); table.sort(a) elseif typ=='list' then a=redis.call('LRANGE',v.key,0,-1) elseif typ=='hash' then local h=redis.call('HGETALL',v.key); local names={}; local vals={}; for i=1,#h,2 do table.insert(names,h[i]); vals[h[i]]=h[i+1] end; table.sort(names); a={}; for _,n in ipairs(names) do table.insert(a,n); table.insert(a,vals[n]) end end; if #a~=#v.value then return redis.error_reply('Data changed; preview again') end; for i=1,#a do if a[i]~=v.value[i] then return redis.error_reply('Data changed; preview again') end end end end; for _,op in ipairs(ops) do redis.call(unpack(op)) end; return #ops`;
if(process.env.HYDRADB_API_KEY){
 const {HydraDBClient}=await import('@hydradb/sdk');const c=new HydraDBClient({token:process.env.HYDRADB_API_KEY});
 // Our integration uses one stable source per company. Never delete the whole shared Hydra database.
 for(const id of plan.companyIds){await c.context.delete({database:process.env.HYDRADB_DATABASE||'default-tenant',collection:'cg_company_'+id,ids:['cg_brief_'+id],type:'knowledge'}).catch(e=>{if(e.statusCode!==404)throw e;});}
 console.log('Selected company brief sources removed from HydraDB.');
}else if(plan.companyIds.some(id=>JSON.parse(snapshot['org:'+id]?.value||'{}').hydra?.revision))throw new Error('These companies have indexed HydraDB briefs. Configure HYDRADB_API_KEY before purging; Redis remains unchanged.');
const count=await cmd('EVAL',script,0,JSON.stringify(expected),JSON.stringify(plan.commands));
console.log(`Applied ${count} scoped Redis operations. No FLUSH command used. Downloaded files and local editor history remain on each laptop.`);

