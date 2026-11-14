import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';import {existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {createConnection} from 'node:net';
const file=fileURLToPath(new URL('../.local/common-ground.sqlite',import.meta.url));
const args=process.argv.slice(2);
if(!existsSync(file)){console.log('No local builder database.');process.exit(0);}
if(args.includes('--apply')){
 const listening=await new Promise(resolve=>{const s=createConnection({host:'127.0.0.1',port:Number(process.env.PORT||4317)});s.setTimeout(1000);s.once('connect',()=>{s.destroy();resolve(true);});s.once('error',()=>resolve(false));s.once('timeout',()=>{s.destroy();resolve(true);});});
 if(listening)throw new Error('Stop the local builder with Ctrl+C before applying this reset.');
}
const d=new DatabaseSync(file,{readOnly:!args.includes('--apply')});
try{const rows=d.prepare('SELECT kind,id,value FROM records ORDER BY kind,id').all();const confirmation=createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0,16);const counts={};for(const r of rows)counts[r.kind]=(counts[r.kind]||0)+1;
 console.log(JSON.stringify({database:file,counts,confirmation},null,2));
 if(!args.includes('--apply'))console.log('PREVIEW ONLY. Stop the builder, then rerun with --apply '+confirmation+'. API keys and downloaded project folders are preserved.');
 else{if(args[args.indexOf('--apply')+1]!==confirmation)throw new Error('Records changed; review a new preview.');d.exec('PRAGMA secure_delete=ON; BEGIN IMMEDIATE; DELETE FROM records; COMMIT; PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');console.log('Local builder records cleared. Run npm start to recreate the demo identities.');}
}finally{d.close();}
