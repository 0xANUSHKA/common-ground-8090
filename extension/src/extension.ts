import * as vscode from 'vscode';
import { newOffers } from './offers.js';
import { chooseCompany } from './company-context.js';
import { runDownloaded } from './run-downloaded.js';
import { randomBytes,createHash } from 'node:crypto';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { join,basename } from 'node:path';
type Recent={name:string;uri:string};
type Receipt={name:string;uri:string;hash:string;toolId?:string;at:string;companyId?:string;userId?:string;server?:string};
// Two backends. The local builder (127.0.0.1, `npm start`) builds and checks tools in a sandbox on this machine.
// Common Ground (the hosted service, commonGround.server) holds your account, your company and fund, who may receive
// what, and the exact files of each shared tool. Signing in goes through the browser and back via a vscode:// link.
const FILE_OK=/^[A-Za-z0-9_.-]{1,80}\.(js|json|md|csv|txt)$/;
export function activate(context:vscode.ExtensionContext){
 let panel:vscode.WebviewPanel|undefined;
 let signInState='',signInServer='';
 let offerToken='',offerIds:Set<string>|null=null,offerPolling=false,notificationOpen=false;
 const recents=()=>context.globalState.get<Recent[]>('recents',[]);
 async function track(){const f=vscode.workspace.workspaceFolders?.[0];if(f)await context.globalState.update('recents',[{name:f.name,uri:f.uri.toString()},...recents().filter(r=>r.uri!==f.uri.toString())].slice(0,10));}
 void track();context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(track));
 const server=()=>vscode.workspace.getConfiguration('commonGround').get<string>('server','https://common-ground-theta.vercel.app').replace(/\/+$/,'');
 async function api(path:string,method='GET',body?:unknown){
  // Only the compiled view's small API allowlist. No arbitrary network proxy or file access.
  if(!/^\/(state|health|demo-identities|demo-session|preferences|build|audio-brief|audit|jobs\/[a-z0-9-]+|artifacts\/[a-z0-9-]+(?:\/(matches|publish|revoke|dismiss|adopt|run|package|evidence|lineage|drift))?)$/.test(path))throw new Error('Unsupported route');
  if(!['GET','POST','PUT'].includes(method))throw new Error('Unsupported method');
  if((path==='/build'||path==='/candidate'||path.endsWith('/run')||path.endsWith('/adopt'))&&!vscode.workspace.isTrusted)throw new Error('Trust your workspace before running factory operations.');
  const token=await context.secrets.get('session');
  const port=vscode.workspace.getConfiguration('commonGround').get<number>('port',4317);
  let response:Response;
  try{response=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{'Content-Type':'application/json','X-Common-Ground':'1',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(85000)});}
  catch{throw new Error('The local builder isn’t running. Start it with npm start in the Common Ground repo.');}
  const data=await response.json() as any;if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
  if(path==='/demo-session'){await context.secrets.store('session',data.token);return {user:data.user};}return data;
 }
 async function hosted(path:string,method='GET',body?:unknown){
  // The hosted routes the view needs, and nothing else.
  if(!/^(me|shared(?:\?companyId=[a-z0-9]+)?|suggest|tools|tools\/[a-z0-9]+\/(grants|package(?:\?companyId=[a-z0-9]+)?|uses)|grants\/[a-z0-9]+|orgs\/[a-z0-9]+)$/.test(path))throw new Error('Unsupported route');
  if(!['GET','POST','DELETE'].includes(method))throw new Error('Unsupported method');
  const token=await context.secrets.get('hostedToken');if(token && await context.secrets.get('hostedServer')!==server())throw new Error('Sign in again to connect this Common Ground server.');if(!token)throw Object.assign(new Error('Sign in to Common Ground first.'),{status:401});
  const response=await fetch(`${server()}/api/${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:method==='GET'?undefined:JSON.stringify(body??{}),signal:AbortSignal.timeout(30000)});
  const data=await response.json().catch(()=>({})) as any;
  if(response.status===401){await context.secrets.delete('hostedToken');throw new Error('Your Common Ground sign-in expired. Sign in again.');}
  if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;
 }
 async function workspace(selected?:string){
  const r=await hosted('me');
  const key=`company:${server()}:${r.user.id}`;
  if(selected!==undefined){
   if(!r.orgs.some((o:any)=>o.kind==='company'&&o.id===selected))throw new Error('You are no longer a member of that company. Refresh companies.');
   await context.globalState.update(key,selected);
  }
  return {...r,companyId:chooseCompany(r.orgs,context.globalState.get<string>(key))};
 }
 // writes a verified package into a fresh folder next to where the person chooses; never runs anything
 const receipts=()=>context.globalState.get<Receipt[]>('receipts',[]);
 async function savePackage(pkg:any,label:string,toolId?:string,scope?:{companyId:string;userId:string;server:string}){
  if(!vscode.workspace.isTrusted)throw new Error('Trust your workspace before downloading code.');
  const names=Object.keys(pkg?.files||{});
  if(!names.length||names.some(n=>!FILE_OK.test(n)||basename(n)!==n||typeof pkg.files[n]!=='string'))throw new Error('Unsupported package file');
  if(!pkg.files['inspector.js']||createHash('sha256').update(pkg.files['inspector.js']).digest('hex')!==pkg.hash)throw new Error('Package integrity mismatch');
  const parent=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'Save project here'});
  if(!parent?.[0])return {cancelled:true};
  const safe=String(label).replace(/[^\w.-]/g,'-').slice(0,40)||'tool';
  const folder=join(parent[0].fsPath,`${safe}-${String(pkg.hash).slice(0,8)}-${Date.now()}`);await mkdir(folder,{recursive:false});
  for(const n of names)await writeFile(join(folder,n),pkg.files[n],{flag:'wx'});
  const uri=vscode.Uri.file(folder);await context.globalState.update('recents',[{name:safe,uri:uri.toString()},...recents()].slice(0,10));
  // a receipt of the sealed version, so the factory can tell later whether this copy has drifted
  await context.globalState.update('receipts',[{name:safe,uri:uri.toString(),hash:String(pkg.hash),toolId,at:new Date().toISOString(),...scope},...receipts()].slice(0,20));
  await vscode.commands.executeCommand('vscode.openFolder',uri,{forceNewWindow:true});return {ok:true};
 }
 async function signIn(){
  const endpoint=new URL(server());
  if(endpoint.protocol!=='https:' && !(endpoint.protocol==='http:' && ['127.0.0.1','localhost'].includes(endpoint.hostname)))throw new Error('Common Ground requires HTTPS, except on localhost.');
  signInServer=server();signInState=randomBytes(16).toString('hex');
  await vscode.env.openExternal(vscode.Uri.parse(`${server()}/api/auth/extension?state=${signInState}&scheme=${encodeURIComponent(vscode.env.uriScheme)}`));
 }
 context.subscriptions.push(vscode.window.registerUriHandler({async handleUri(uri){
  if(uri.path!=='/auth')return;
  const q=new URLSearchParams(uri.query);
  if(!signInState||q.get('state')!==signInState){vscode.window.showWarningMessage('Common Ground: that sign-in link didn’t come from this window. Try signing in again.');return;}
  if(signInServer!==server()){vscode.window.showWarningMessage('Common Ground server changed during sign-in. Please try again.');return;}
  signInState='';await context.secrets.store('hostedToken',q.get('token')||'');await context.secrets.store('hostedServer',signInServer);
  vscode.window.showInformationMessage('Signed in to Common Ground.');
  await show();await panel?.webview.postMessage({action:'signedIn'});
 }}));
 const show=async()=>{
  if(panel){panel.reveal();return;}
  panel=vscode.window.createWebviewPanel('commonGround','Start · Common Ground',vscode.ViewColumn.One,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[vscode.Uri.joinPath(context.extensionUri,'media')]});
  const webview=panel.webview,nonce=randomBytes(20).toString('hex');
  const js=webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media/main.js')),css=webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media/main.css'));
  webview.html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;"><link rel="stylesheet" href="${css}"><title>Common Ground</title></head><body><div id="app"></div><script nonce="${nonce}" src="${js}"></script></body></html>`;
  panel.onDidDispose(()=>{panel=undefined;});
  webview.onDidReceiveMessage(async m=>{try{
   let data:unknown;
   if(m.action==='request')data=await api(m.path,m.method,m.body);
   else if(m.action==='hosted')data=await hosted(m.path,m.method,m.body);
   else if(m.action==='account')data={signedIn:!!(await context.secrets.get('hostedToken')),server:server()};
   else if(m.action==='workspace')data=await workspace(m.companyId);
   else if(m.action==='signIn'){await signIn();data={ok:true};}
   else if(m.action==='signOut'){await context.secrets.delete('hostedToken');data={ok:true};}
   else if(m.action==='recents')data=recents();
   else if(m.action==='receipts'){
    // drift: compare each saved copy's code with the version the factory sealed
    data=await Promise.all(receipts().map(async(r,i)=>{try{const src=await readFile(join(vscode.Uri.parse(r.uri).fsPath,'inspector.js'),'utf8');const h=createHash('sha256').update(src).digest('hex');return {...r,index:i,state:h===r.hash?'sealed':'drifted'};}catch{return {...r,index:i,state:'missing'};}}));
   }
   else if(m.action==='runSolar'){
    if(!vscode.workspace.isTrusted)throw new Error('Trust this workspace before running the downloaded inspector.');
    const r=receipts().find(r=>r.uri===m.uri && r.hash===m.hash);if(!r)throw new Error('Choose a downloaded project first.');
    data=await runDownloaded(join(context.extensionPath,'dist','solar-worker.cjs'),vscode.Uri.parse(r.uri).fsPath,r.hash);
   }
   else if(m.action==='openReceipt'){const r=receipts()[m.index];if(!r)throw new Error('Unknown project');await vscode.commands.executeCommand('vscode.openFolder',vscode.Uri.parse(r.uri),{forceNewWindow:true});data={ok:true};}
   else if(m.action==='openRecent'){const r=recents()[m.index];if(!r)throw new Error('Unknown recent workspace');await vscode.commands.executeCommand('vscode.openFolder',vscode.Uri.parse(r.uri),{forceNewWindow:true});data={ok:true};}
   else if(m.action==='openFolder'){await vscode.commands.executeCommand('workbench.action.files.openFolder');data={ok:true};}
   else if(m.action==='openArtifact'){
    if(!/^[a-z0-9-]+$/.test(m.artifactId))throw new Error('Invalid artifact');
    const w=await workspace();if(!w.companyId)throw new Error('Select your working company first.');
    data=await savePackage(await api(`/artifacts/${m.artifactId}/package`),'telemetry-inspector',undefined,{companyId:w.companyId,userId:w.user.id,server:server()});
   }
   else if(m.action==='publishHosted'){
    // the locally checked package goes up as-is; the service re-verifies its hash before storing it
    if(!/^[a-z0-9-]+$/.test(m.artifactId)||!/^[a-z0-9]+$/.test(m.orgId))throw new Error('Invalid tool');
    const w=await workspace();if(w.companyId!==m.orgId)throw new Error('Your working company changed. Select it again before sharing.');
    const art=await api(`/artifacts/${m.artifactId}`),pkg=await api(`/artifacts/${m.artifactId}/package`);
    data=await hosted('tools','POST',{provenance:art.provenance,requirementId:art.requirementId,name:m.name||art.name,description:m.description||'',hours:m.hours,orgId:m.orgId,hash:pkg.hash,files:pkg.files,checks:art.checks});
   }
   else if(m.action==='openHosted'){
    if(!/^[a-z0-9]+$/.test(m.toolId)||!/^[a-z0-9]+$/.test(m.companyId))throw new Error('Select your working company first.');
    const w=await workspace();if(w.companyId!==m.companyId)throw new Error('Your working company changed. Refresh Start before opening this tool.');
    const pkg=await hosted(`tools/${m.toolId}/package?companyId=${m.companyId}`);
    if(pkg.companyId!==m.companyId)throw new Error('The hosted service needs the company-selection update. Ask your deployer to deploy the latest site.');
    data=await savePackage(pkg,pkg.name,m.toolId,{companyId:m.companyId,userId:w.user.id,server:server()});
    if((data as any).ok)await hosted(`tools/${m.toolId}/uses`,'POST',{kind:'download',companyId:m.companyId}).catch(()=>{});
   }
   else throw new Error('Unsupported editor action');
   await webview.postMessage({id:m.id,data});
  }catch(e){await webview.postMessage({id:m.id,error:e instanceof Error?e.message:'Request failed'});}});
 };
 context.subscriptions.push(
  vscode.commands.registerCommand('commonGround.start',show),
  vscode.commands.registerCommand('commonGround.signIn',signIn),
  vscode.commands.registerCommand('commonGround.signOut',async()=>{await context.secrets.delete('hostedToken');await panel?.webview.postMessage({action:'signedIn'});}),
  vscode.commands.registerCommand('commonGround.clearLocalHistory',async()=>{
   const choice=await vscode.window.showWarningMessage('Clear Common Ground history on this computer? This signs you out and clears recent-project entries and download receipts. Downloaded folders, local builder records and hosted company data remain.',{modal:true},'Clear local history');
   if(choice!=='Clear local history')return;
   signInState='';signInServer='';offerToken='';offerIds=null;
   await Promise.all([
    context.globalState.update('recents',[]),context.globalState.update('receipts',[]),
    context.secrets.delete('hostedToken'),context.secrets.delete('hostedServer'),context.secrets.delete('session')
   ]);
   for(const key of context.globalState.keys().filter(k=>k.startsWith('company:')))await context.globalState.update(key,undefined);
   panel?.dispose();await show();
   void vscode.window.showInformationMessage('Local Common Ground history cleared. Downloaded folders and server data were not deleted.');
  }),
  vscode.commands.registerCommand('commonGround.settings',async()=>{await show();await panel?.webview.postMessage({action:'showSettings'});}));
 // One quiet native notification for newly arriving approved versions. Never notify on initial login.
 async function pollOffers(){
  if(offerPolling || notificationOpen)return;offerPolling=true;
  try{
   const token=await context.secrets.get('hostedToken');
   if(!token){offerToken='';offerIds=null;return;}
   const w=await workspace();if(!w.companyId){offerIds=null;return;}
   const scopedToken=`${token}:${w.companyId}`;
   if(offerToken!==scopedToken){offerToken=scopedToken;offerIds=null;}
   const result=await hosted(`shared?companyId=${w.companyId}`);
   if(result.companyId!==w.companyId)return;
   if(token!==await context.secrets.get('hostedToken'))return;
   const next=newOffers(offerIds,result.shared);offerIds=next.current;
   if(!next.fresh.length)return;
   await panel?.webview.postMessage({action:'offersChanged'});
   if(panel?.visible || !vscode.workspace.getConfiguration('commonGround').get<boolean>('notifications',true))return;
   const first=next.fresh[0];notificationOpen=true;
   const choice=await vscode.window.showInformationMessage(`${first.owner.name} shared ${first.tool.name} with you${next.fresh.length>1?` (+${next.fresh.length-1} more)`:''}.`,'Open Common Ground');
   if(choice && token===await context.secrets.get('hostedToken'))await show();
  }catch{/* An expired session or offline service must not spam the editor. */}
  finally{offerPolling=false;notificationOpen=false;}
 }
 const offerTimer=setInterval(()=>void pollOffers(),15000);
 context.subscriptions.push({dispose:()=>clearInterval(offerTimer)});void pollOffers();
 // first run: open Start so a fresh install isn't a blank slate
 if(!context.globalState.get('welcomed')){void context.globalState.update('welcomed',true);void show();}
}
