import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../server/store.js';
import { seed,marine } from '../server/seed.js';
import { canReceive,canPublish,hash,qualified } from '../server/policy.js';
import type { Artifact,Company,Grant,User } from '../server/types.js';
function fixture(){const s=new Store(':memory:');seed(s);const checks=Array.from({length:7},(_,i)=>({name:'check '+i,passed:true}));const source='function inspect() {}';const a:Artifact={id:'a',owner:'fabio',company:'saildrone',name:'private-tool',source,hash:hash(source),sourceBinding:marine,bindingHash:hash(marine),checks,checksHash:hash(checks),reviewedHash:hash(source),reviewedBy:'fabio',maintainer:'fabio',class:'data-quality',capabilities:['csv','time-series'],provenance:'reference-template',createdAt:new Date().toISOString()};const g:Grant={id:'g',artifactId:'a',hash:a.hash,issuer:'fabio',scope:'portfolio',recipients:['maya','theo','elli'],expiresAt:new Date(Date.now()+100000).toISOString(),revoked:false,reshare:false};return {s,a,g,u:s.get<User>('user','maya')!};}
test('permission hierarchy: positive and all hard denials',()=>{
 const {s,a,g,u}=fixture();assert.equal(canReceive(s,u,a,g),true);
 const deny=(label:string,change:()=>void,restore:()=>void)=>{change();assert.equal(canReceive(s,u,a,g),false,label);restore();};
 deny('revoked',()=>g.revoked=true,()=>g.revoked=false);
 const expiry=g.expiresAt;deny('expired',()=>g.expiresAt='2000-01-01',()=>g.expiresAt=expiry);
 deny('company scope',()=>g.scope='company',()=>g.scope='portfolio');
 deny('recipient not named',()=>g.recipients=[],()=>g.recipients=['maya']);
 deny('personal off',()=>s.put('preference','maya',{mode:'off',muted:[]}),()=>s.put('preference','maya',{mode:'portfolio',muted:[]}));
 deny('company preference',()=>s.put('preference','maya',{mode:'company',muted:[]}),()=>s.put('preference','maya',{mode:'portfolio',muted:[]}));
 deny('muted publisher',()=>s.put('preference','maya',{mode:'portfolio',muted:['fabio']}),()=>s.put('preference','maya',{mode:'portfolio',muted:[]}));
 const target=s.get<Company>('company','palmetto')!;
 deny('target optout',()=>s.put('company','palmetto',{...target,peers:[]}),()=>s.put('company','palmetto',target));
 deny('network off',()=>s.put('network','demo',{enabled:false,classes:['data-quality']}),()=>s.put('network','demo',{enabled:true,classes:['data-quality']}));
 deny('non eligible user',()=>u.eligible=false,()=>u.eligible=true);
 deny('modified source',()=>a.source+='x',()=>a.source= 'function inspect() {}');
 deny('modified binding',()=>a.sourceBinding={...marine,skipUnitsRow:false},()=>a.sourceBinding=marine);
 assert.equal(canPublish(s,u,a,'portfolio'),false,'recipient cannot reshare');s.close();
});
test('source publisher removed revokes existing grants',()=>{const {s,a,g,u}=fixture();const c=s.get<Company>('company','saildrone')!;s.put('company','saildrone',{...c,publishers:[]});assert.equal(canReceive(s,u,a,g),false);s.close();});
test('changed check proof invalidates version',()=>{const {s,a}=fixture();a.checks[0].passed=false;assert.equal(qualified(a),false);s.close();});
