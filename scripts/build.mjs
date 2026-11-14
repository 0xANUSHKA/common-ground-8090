import {build} from 'esbuild';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
await mkdir('dist/web',{recursive:true});
await mkdir('extension/media',{recursive:true});
await build({entryPoints:['web/main.ts'],bundle:true,format:'iife',outfile:'dist/web/main.js',minify:true});
await writeFile('dist/web/index.html',(await readFile('web/index.html','utf8')).replace('<script type="module" src="./main.ts"></script>','<link rel="stylesheet" href="./main.css"><script src="./main.js" defer></script>'));
for(const name of ['main.js','main.css'])await copyFile('dist/web/'+name,'extension/media/'+name);
await build({entryPoints:['extension/src/extension.ts'],bundle:true,platform:'node',format:'cjs',external:['vscode'],outfile:'extension/dist/extension.cjs'});
console.log('Built Start view and VS Code extension.');
