import test from 'node:test';import assert from 'node:assert/strict';
test('team invitation requires explicit company confirmation before membership changes',async()=>{
 const original=globalThis.fetch;const checkbox={checked:false},button={disabled:true};let accepted=0;
 const form={innerHTML:'',elements:{namedItem:()=>checkbox},querySelector:()=>button};const preview={innerHTML:''};
 globalThis.location={search:'?invite=teamlink',origin:'https://test.local',href:''};
 globalThis.document={querySelector:s=>s==='#form'?form:s==='#preview'?preview:{textContent:''}};
 globalThis.fetch=async(url,opts)=>{if(url==='/api/me')return Response.json({user:{id:'connor',name:'Connor',email:'connor@example.test'},orgs:[]});if(url==='/api/invites/teamlink')return Response.json({kind:'member',org:{id:'ulysses',kind:'company',name:'Ulysses'},memberCount:1});if(url.endsWith('/accept')){accepted++;return Response.json({orgId:'ulysses'});}throw new Error(url);};
 try{await import('../join/live.js?test=explicit-team-confirmation');await new Promise(r=>setImmediate(r));
 assert.match(form.innerHTML,/Join Ulysses as an engineer/);assert.match(form.innerHTML,/does not create your own company/);
 await form.onsubmit({preventDefault(){}});assert.equal(accepted,0);
 checkbox.checked=true;form.onchange();assert.equal(button.disabled,false);
 await form.onsubmit({preventDefault(){}});assert.equal(accepted,1);assert.equal(location.href,'/dashboard/#/ulysses/setup');
 }finally{globalThis.fetch=original;delete globalThis.document;delete globalThis.location;}
});
