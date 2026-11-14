// Pure, reviewable plan. Identities remain so Google login returns to an empty account.
export function purgePlan(snapshot,userIds){
 const users=new Set(userIds);if(!users.size)throw new Error('Select explicit user IDs.');
 const json=prefix=>Object.entries(snapshot).filter(([k,v])=>k.startsWith(prefix+':')&&v.type==='string').map(([key,v])=>({key,data:JSON.parse(v.value)}));
 const allUsers=json('user');for(const id of users)if(!allUsers.some(x=>x.data.id===id))throw new Error(`Unknown user ${id}`);
 const orgs=json('org'),goneOrgs=new Set(orgs.filter(x=>users.has(x.data.owner)).map(x=>x.data.id));
 const tools=json('tool'),goneTools=new Set(tools.filter(x=>users.has(x.data.owner)||goneOrgs.has(x.data.orgId)).map(x=>x.data.id));
 const grants=json('grant'),goneGrants=new Set(grants.filter(({data:g})=>goneTools.has(g.toolId)||users.has(g.issuer)||users.has(g.target?.userId)||goneOrgs.has(g.target?.orgId)||goneOrgs.has(g.target?.companyId)).map(x=>x.data.id));
 const invites=json('inv'),goneInvites=new Set(invites.filter(x=>goneOrgs.has(x.data.orgId)||users.has(x.data.createdBy)).map(x=>x.data.code));
 const commands=[],deleted=new Set();
 const del=key=>{if(!deleted.has(key)){commands.push(['DEL',key]);deleted.add(key);}};
 const put=(key,data)=>commands.push(['SET',key,JSON.stringify(data)]);
 const related=e=>users.has(e.uid)||goneTools.has(e.toolId)||goneOrgs.has(e.from?.id)||goneOrgs.has(e.to?.id);
 for(const {key,data:o} of orgs){
  if(goneOrgs.has(o.id)){for(const p of ['org','mem','oinv','fundcos','audit','reuse','ogrants','otools'])del(`${p}:${o.id}`);}
  else if(goneOrgs.has(o.fundId))put(key,{...o,fundId:null,status:'unaffiliated'});
 }
 for(const {key,data:t} of tools){
  if(goneTools.has(t.id)){del(key);del(`pkg:${t.id}`);del(`tgrants:${t.id}`);}
  else if(t.uses?.some(u=>users.has(u.uid)||goneOrgs.has(u.companyId)))put(key,{...t,uses:t.uses.filter(u=>!users.has(u.uid)&&!goneOrgs.has(u.companyId))});
 }
 for(const id of goneGrants)del(`grant:${id}`);for(const id of goneInvites)del(`inv:${id}`);
 for(const [key,r] of Object.entries(snapshot)){
  if(deleted.has(key))continue;
  const [prefix,id]=key.split(':');
  if(r.type==='set'){
   const remove=r.value.filter(v=>['uorgs','fundcos'].includes(prefix)?goneOrgs.has(v):['utools','otools'].includes(prefix)?goneTools.has(v):['tgrants','ogrants','ugrants'].includes(prefix)?goneGrants.has(v):prefix==='oinv'?goneInvites.has(v):false);
   if(['uorgs','utools','ugrants'].includes(prefix)&&users.has(id))del(key);
   else if(remove.length)commands.push(['SREM',key,...remove]);
  }
  if(r.type==='hash'&&prefix==='mem'){
   const remove=Object.keys(r.value).filter(uid=>users.has(uid));if(remove.length)commands.push(['HDEL',key,...remove]);
  }
  if(r.type==='list'&&prefix==='reuse'){
   const keep=r.value.filter(v=>!related(JSON.parse(v)));if(keep.length!==r.value.length){del(key);if(keep.length)commands.push(['RPUSH',key,...keep]);}
  }
 }
 // Preferences can contain old mute lists. Keep the identity and sign-in bindings.
 for(const {key,data:u} of allUsers)if(users.has(u.id))put(key,{...u,pref:{mode:'portfolio',muted:[]}});
 return {commands,summary:{users:allUsers.filter(x=>users.has(x.data.id)).map(x=>({id:x.data.id,name:x.data.name})),organizations:orgs.filter(x=>goneOrgs.has(x.data.id)).map(x=>({id:x.data.id,name:x.data.name,kind:x.data.kind})),tools:goneTools.size,grants:goneGrants.size,invitations:goneInvites.size},companyIds:orgs.filter(x=>goneOrgs.has(x.data.id)&&x.data.kind==='company').map(x=>x.data.id)};
}
