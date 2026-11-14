import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('site/download', { recursive: true });
await copyFile('common-ground-0.1.6.vsix', 'site/download/common-ground.vsix');
console.log('Site download updated: site/download/common-ground.vsix');
