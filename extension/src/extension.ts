import * as vscode from 'vscode';
import { randomBytes,createHash } from 'node:crypto';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { join,basename } from 'node:path';
type Recent={name:string;uri:string};
export function activate(context:vscode.ExtensionContext){
 let panel:vscode.WebviewPanel|undefined;
 const recents=()=>context.globalState.get<Recent[]>('recents',[]);
 async function track(){const f=vscode.workspace.workspaceFolders?.[0];if(f)await context.globalState.update('recents',[{name:f.name,uri:f.uri.toString()},...recents().filter(r=>r.uri!==f.uri.toString())].slice(0,10));}
 void track();context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(track));
 async function api(path:string,method='GET',body?:unknown){
  // Only the compiled view's small API allowlist. No arbitrary network proxy or file access.
  if(!/^\/(state|health|demo-identities|demo-session|preferences|build|audio-brief|audit|jobs\/[a-z0-9-]+|artifacts\/[a-z0-9-]+(?:\/(matches|publish|revoke|dismiss|adopt|run|package|evidence))?)$/.test(path))throw new Error('Unsupported route');
  if(!['GET','POST','PUT'].includes(method))throw new Error('Unsupported method');
  if((path==='/build'||path==='/candidate'||path.endsWith('/run')||path.endsWith('/adopt'))&&!vscode.workspace.isTrusted)throw new Error('Trust your workspace before running factory operations.');
  const token=await context.secrets.get('session');
  const port=vscode.workspace.getConfiguration('commonGround').get<number>('port',4317);
  const response=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{'Content-Type':'application/json','X-Common-Ground':'1',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(85000)});
  const data=await response.json() as any;if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
  if(path==='/demo-session'){await context.secrets.store('session',data.token);return {user:data.user};}return data;
 }
 const show=async()=>{
  if(panel){panel.reveal();return;}
  panel=vscode.window.createWebviewPanel('commonGround','Start · Common Ground',vscode.ViewColumn.One,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[vscode.Uri.joinPath(context.extensionUri,'media')]});
  const webview=panel.webview,nonce=randomBytes(20).toString('hex');
  const js=webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media/main.js')),css=webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media/main.css'));
  webview.html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource};"><link rel="stylesheet" href="${css}"><title>Common Ground</title></head><body><div id="app"></div><script nonce="${nonce}" src="${js}"></script></body></html>`;
  panel.onDidDispose(()=>{panel=undefined;});
  webview.onDidReceiveMessage(async m=>{try{
   let data:unknown;
   if(m.action==='request')data=await api(m.path,m.method,m.body);
   else if(m.action==='recents')data=recents();
   else if(m.action==='openRecent'){const r=recents()[m.index];if(!r)throw new Error('Unknown recent workspace');await vscode.commands.executeCommand('vscode.openFolder',vscode.Uri.parse(r.uri),{forceNewWindow:true});data={ok:true};}
   else if(m.action==='openFolder'){await vscode.commands.executeCommand('workbench.action.files.openFolder');data={ok:true};}
   else if(m.action==='openArtifact'){
    if(!vscode.workspace.isTrusted)throw new Error('Trust your workspace before downloading code.');
    if(!/^[a-z0-9-]+$/.test(m.artifactId))throw new Error('Invalid artifact');
    const pkg=await api(`/artifacts/${m.artifactId}/package`);
    if(createHash('sha256').update(pkg.files['inspector.js']).digest('hex')!==pkg.hash)throw new Error('Package integrity mismatch');
    const parent=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'Save project here'});
    if(!parent?.[0]){data={cancelled:true};}
    else {
     // Unique directory, fixed safe names, no overwrite, no install scripts or execution.
     const folder=join(parent[0].fsPath,`telemetry-inspector-${pkg.hash.slice(0,8)}-${Date.now()}`);await mkdir(folder,{recursive:false});
     const allowed=new Set(['inspector.js','binding.json','provenance.json','README.md','DATA_LICENSES.md','pvdaq_system10_sample.csv','saildrone_1045_2021-09-30.csv']);
     for(const [name,content] of Object.entries(pkg.files)){if(!allowed.has(name)||basename(name)!==name||typeof content!=='string')throw new Error('Unsupported package file');await writeFile(join(folder,name),content,{flag:'wx'});}
     const uri=vscode.Uri.file(folder);await context.globalState.update('recents',[{name:'telemetry-inspector',uri:uri.toString()},...recents()].slice(0,10));
     await vscode.commands.executeCommand('vscode.openFolder',uri,{forceNewWindow:true});data={ok:true};
    }
   }else throw new Error('Unsupported editor action');
   await webview.postMessage({id:m.id,data});
  }catch(e){await webview.postMessage({id:m.id,error:e instanceof Error?e.message:'Request failed'});}});
 };
 context.subscriptions.push(vscode.commands.registerCommand('commonGround.start',show),vscode.commands.registerCommand('commonGround.settings',async()=>{await show();await panel?.webview.postMessage({action:'showSettings'});}));
}
