import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';

// Test fixtures must never inherit production storage or administrator credentials.
const env={...process.env,NODE_ENV:'test'};
for(const key of Object.keys(env))if(key==='VERCEL'||key.startsWith('VERCEL_')||key.startsWith('SUPABASE_')||key.startsWith('GKE_')||key==='GOOGLE_TRANSLATE_API_KEY')delete env[key];
const run=args=>{
 const child=spawnSync(process.execPath,args,{env,stdio:'inherit'});
 if(child.error){console.error(child.error.message);process.exit(1)}
 if(child.status!==0)process.exit(child.status||1);
};
run(['node_modules/typescript/bin/tsc','--noEmit']);
run(['--test',...readdirSync('test').filter(file=>file.endsWith('.test.mjs')).sort().map(file=>'test/'+file)]);
