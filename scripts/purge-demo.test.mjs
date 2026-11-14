import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const exec=promisify(execFile);
test('purge previews, rejects a changed plan, and removes only selected account history',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cg-purge-')),socket=join(dir,'redis.sock');
 const redis=spawn('redis-server',['--port','0','--unixsocket',socket,'--save','','--appendonly','no'],{stdio:'ignore'});
 const cli=async(...args)=>JSON.parse((await exec('redis-cli',['-s',socket,'--json',...args.map(String)])).stdout);
 const http=createServer(async(req,res)=>{try{let text='';for await(const c of req)text+=c;const command=JSON.parse(text);let result=await cli(...command);if(command[0]==='HGETALL'&&!Array.isArray(result))result=Object.entries(result||{}).flat();res.end(JSON.stringify({result}));}catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}));}});
 try{
  for(let i=0;i<40;i++){try{await cli('PING');break;}catch{await new Promise(r=>setTimeout(r,50));}}
  const put=async(k,v)=>cli('SET',k,JSON.stringify(v));
  for(const id of ['me','connor','other'])await put('user:'+id,{id,name:id,email:id+'@example.test'});
  for(const o of [{id:'f',kind:'fund',owner:'me',name:'Old fund'},{id:'ocean',kind:'company',owner:'me',fundId:'f'},{id:'solar',kind:'company',owner:'connor',fundId:'f'},{id:'outside',kind:'company',owner:'other',fundId:'f'}])await put('org:'+o.id,o);
  await cli('SADD','uorgs:me','f','ocean');await cli('SADD','uorgs:connor','solar','outside');await cli('SADD','uorgs:other','outside');await cli('SADD','fundcos:f','ocean','solar','outside');
  await cli('HSET','mem:outside','other','{"role":"owner"}','connor','{"role":"member"}');
  await put('tool:old',{id:'old',owner:'me',orgId:'ocean'});await put('pkg:old',{files:{'inspector.js':'old code'}});await cli('SADD','utools:me','old');
  await put('tool:keep',{id:'keep',owner:'other',orgId:'outside',uses:[{uid:'connor',companyId:'solar'},{uid:'other',companyId:'outside'}]});
  await put('grant:g',{id:'g',toolId:'old',issuer:'me',target:{userId:'connor',companyId:'solar'}});await cli('SADD','ugrants:connor','g');
  await put('inv:old',{code:'old',orgId:'f',createdBy:'me'});await cli('SADD','oinv:f','old');
  await cli('RPUSH','reuse:outside',JSON.stringify({toolId:'old',uid:'connor'}),JSON.stringify({toolId:'keep',uid:'other'}));
  await cli('SET','unrelated:secret','preserve');
  await new Promise(r=>http.listen(0,'127.0.0.1',r));
  const options={cwd:dir,env:{...process.env,HYDRADB_API_KEY:'',KV_REST_API_URL:`http://127.0.0.1:${http.address().port}`,KV_REST_API_TOKEN:'test-only'}};
  const script=resolve('scripts/purge-demo.mjs');
  const preview=(await exec(process.execPath,[script,'--users','me,connor'],options)).stdout;
  assert.match(preview,/PREVIEW ONLY/);assert.notEqual(await cli('GET','pkg:old'),null);
  const hash=preview.match(/"confirmation": "([^"]+)"/)[1];
  await put('org:ocean',{id:'ocean',kind:'company',owner:'me',fundId:'f',name:'Changed'});
  await assert.rejects(exec(process.execPath,[script,'--users','me,connor','--apply',hash],options),/database changed/);
  assert.notEqual(await cli('GET','org:ocean'),null);
  const fresh=(await exec(process.execPath,[script,'--users','me,connor'],options)).stdout.match(/"confirmation": "([^"]+)"/)[1];
  await exec(process.execPath,[script,'--users','me,connor','--apply',fresh],options);
  for(const k of ['org:f','org:ocean','org:solar','pkg:old','tool:old','grant:g','inv:old','uorgs:me','uorgs:connor'])assert.equal(await cli('EXISTS',k),0,k);
  assert.equal(await cli('GET','unrelated:secret'),'preserve');
  assert.equal(JSON.parse(await cli('GET','org:outside')).fundId,null);
  assert.equal(await cli('HGET','mem:outside','connor'),null);assert.notEqual(await cli('HGET','mem:outside','other'),null);
  assert.equal(JSON.parse(await cli('GET','tool:keep')).uses.length,1);
  assert.equal((await cli('LRANGE','reuse:outside',0,-1)).length,1);
  assert.equal(JSON.parse(await cli('GET','user:me')).id,'me');
 }finally{await new Promise(r=>http.close(r));redis.kill();await new Promise(r=>redis.once('exit',r));await rm(dir,{recursive:true,force:true});}
});
