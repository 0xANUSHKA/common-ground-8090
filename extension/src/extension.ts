import * as vscode from 'vscode';
import { randomBytes,createHash } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { join,basename } from 'node:path';
type Recent={name:string;uri:string};
// Two backends. The local builder (127.0.0.1, `npm start`) builds and checks tools in a sandbox on this machine.
// Common Ground (the hosted service, commonGround.server) holds your account, your company and fund, who may receive
// what, and the exact files of each shared tool. Signing in goes through the browser and back via a vscode:// link.
const FILE_OK=/^[A-Za-z0-9_.-]{1,80}\.(js|json|md|csv|txt)$/;
export function activate(context:vscode.ExtensionContext){
 let panel:vscode.WebviewPanel|undefined;
 let signInState='';
 const recents=()=>context.globalState.get<Recent[]>('recents',[]);
 async function track(){const f=vscode.workspace.workspaceFolders?.[0];if(f)await context.globalState.update('recents',[{name:f.name,uri:f.uri.toString()},...recents().filter(r=>r.uri!==f.uri.toString())].slice(0,10));}
 void track();context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(track));
 const server=()=>vscode.workspace.getConfiguration('commonGround').get<string>('server','https://common-ground-theta.vercel.app').replace(/\/+$/,'');
 async function api(path:string,method='GET',body?:unknown){
  // Only the compiled view's small API allowlist. No arbitrary network proxy or file access.
  if(!/^\/(state|health|demo-identities|demo-session|preferences|build|audio-brief|audit|jobs\/[a-z0-9-]+|artifacts\/[a-z0-9-]+(?:\/(matches|publish|revoke|dismiss|adopt|run|package|evidence))?)$/.test(path))throw new Error('Unsupported route');
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
  if(!/^(me|shared|tools|tools\/[a-z0-9]+\/(grants|package|uses)|grants\/[a-z0-9]+|orgs\/[a-z0-9]+)$/.test(path))throw new Error('Unsupported route');
  if(!['GET','POST','DELETE'].includes(method))throw new Error('Unsupported method');
  const token=await context.secrets.get('hostedToken');if(!token)throw Object.assign(new Error('Sign in to Common Ground first.'),{status:401});
  const response=await fetch(`${server()}/api/${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:method==='GET'?undefined:JSON.stringify(body??{}),signal:AbortSignal.timeout(30000)});
  const data=await response.json().catch(()=>({})) as any;
  if(response.status===401){await context.secrets.delete('hostedToken');throw new Error('Your Common Ground sign-in expired. Sign in again.');}
  if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;
 }
 // writes a verified package into a fresh folder next to where the person chooses; never runs anything
 async function savePackage(pkg:any,label:string){
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
  await vscode.commands.executeCommand('vscode.openFolder',uri,{forceNewWindow:true});return {ok:true};
 }
 async function signIn(){
  signInState=randomBytes(16).toString('hex');
  await vscode.env.openExternal(vscode.Uri.parse(`${server()}/api/auth/extension?state=${signInState}&scheme=${encodeURIComponent(vscode.env.uriScheme)}`));
 }
 context.subscriptions.push(vscode.window.registerUriHandler({async handleUri(uri){
  if(uri.path!=='/auth')return;
  const q=new URLSearchParams(uri.query);
  if(!signInState||q.get('state')!==signInState){vscode.window.showWarningMessage('Common Ground: that sign-in link didn’t come from this window. Try signing in again.');return;}
  signInState='';await context.secrets.store('hostedToken',q.get('token')||'');
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
   else if(m.action==='signIn'){await signIn();data={ok:true};}
   else if(m.action==='signOut'){await context.secrets.delete('hostedToken');data={ok:true};}
   else if(m.action==='recents')data=recents();
   else if(m.action==='openRecent'){const r=recents()[m.index];if(!r)throw new Error('Unknown recent workspace');await vscode.commands.executeCommand('vscode.openFolder',vscode.Uri.parse(r.uri),{forceNewWindow:true});data={ok:true};}
   else if(m.action==='openFolder'){await vscode.commands.executeCommand('workbench.action.files.openFolder');data={ok:true};}
   else if(m.action==='openArtifact'){
    if(!/^[a-z0-9-]+$/.test(m.artifactId))throw new Error('Invalid artifact');
    data=await savePackage(await api(`/artifacts/${m.artifactId}/package`),'telemetry-inspector');
   }
   else if(m.action==='publishHosted'){
    // the locally checked package goes up as-is; the service re-verifies its hash before storing it
    if(!/^[a-z0-9-]+$/.test(m.artifactId)||!/^[a-z0-9]+$/.test(m.orgId))throw new Error('Invalid tool');
    const art=await api(`/artifacts/${m.artifactId}`),pkg=await api(`/artifacts/${m.artifactId}/package`);
    data=await hosted('tools','POST',{name:m.name||art.name,description:m.description||'',hours:m.hours,orgId:m.orgId,hash:pkg.hash,files:pkg.files,checks:art.checks});
   }
   else if(m.action==='openHosted'){
    if(!/^[a-z0-9]+$/.test(m.toolId))throw new Error('Invalid tool');
    const pkg=await hosted(`tools/${m.toolId}/package`);
    data=await savePackage(pkg,pkg.name);
    if((data as any).ok)await hosted(`tools/${m.toolId}/uses`,'POST',{kind:'download'}).catch(()=>{});
   }
   else throw new Error('Unsupported editor action');
   await webview.postMessage({id:m.id,data});
  }catch(e){await webview.postMessage({id:m.id,error:e instanceof Error?e.message:'Request failed'});}});
 };
 context.subscriptions.push(
  vscode.commands.registerCommand('commonGround.start',show),
  vscode.commands.registerCommand('commonGround.signIn',signIn),
  vscode.commands.registerCommand('commonGround.signOut',async()=>{await context.secrets.delete('hostedToken');await panel?.webview.postMessage({action:'signedIn'});}),
  vscode.commands.registerCommand('commonGround.settings',async()=>{await show();await panel?.webview.postMessage({action:'showSettings'});}));
 // first run: open Start so a fresh install isn't a blank slate
 if(!context.globalState.get('welcomed')){void context.globalState.update('welcomed',true);void show();}
}
