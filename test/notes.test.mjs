import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import admin from '../api/admin.mjs';
import {noteRange,validateNote} from '../server/notes.mjs';
function call(action,method='GET',body,cookie=''){
 return new Promise(resolve=>{let status,headers={};admin({method,url:'/api/admin?action='+action,body,headers:{host:'localhost:4173',origin:'http://localhost:4173','sec-fetch-site':'same-origin','content-type':'application/json',cookie},socket:{remoteAddress:'127.0.0.1'}},{setHeader(k,v){headers[k]=v;},writeHead(s,h){status=s;Object.assign(headers,h);},end(text){resolve({status,headers,body:JSON.parse(text)});}});});
}
test('calendar range follows Vietnam midnight and rejects invalid or unbounded dates',()=>{
 assert.deepEqual(noteRange('2026-11-20','2026-11-20'),{from:'2026-11-19T17:00:00.000Z',to:'2026-11-20T17:00:00.000Z'});
 for(const [a,b]of [['2026-02-30','2026-03-01'],['2026-11-21','2026-11-20'],['2026-01-01','2026-12-31'],['wrong','2026-11-20']])assert.equal(noteRange(a,b),null);
 assert.equal(validateNote({title:'x',body:'',done:false,color:'blue',due_at:'2026-02-30T09:00:00Z'}),null);
});
test('calendar notes require authentication and persist create/edit/complete/archive/restore',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'gke-notes-test-'));process.env.GKE_LOCAL_DEV='1';process.env.GKE_LOCAL_DATA=join(directory,'data.json');
 try{
  assert.equal((await call('notes&from=2026-11-20&to=2026-11-20')).status,401);
  const setup=await call('setup','POST',{email:'calendar@example.test',password:randomBytes(24).toString('hex')});const cookie=setup.headers['Set-Cookie'].split(';')[0];
  const value={title:'Local calendar test',body:'<script>text only</script>',due_at:'2026-11-20T02:00:00.000Z',done:false,color:'green'};
  const created=await call('notes','POST',value,cookie);assert.equal(created.status,201);const id=created.body.row.id;
  const list=()=>call('notes&from=2026-11-20&to=2026-11-20','GET',undefined,cookie);
  assert.equal((await list()).body.rows.length,1);
  assert.equal((await call('notes','PATCH',{...value,id,done:true},cookie)).status,200);
  assert.equal((await list()).body.rows[0].done,true);
  assert.equal((await call('notes','DELETE',{id},cookie)).status,200);assert.equal((await list()).body.rows.length,0);
  assert.equal((await call('notes','PATCH',{...value,id,archived:false},cookie)).status,200);assert.equal((await list()).body.rows.length,1);
  assert.equal((await call('notes','POST',{...value,title:' '},cookie)).status,400);
 }finally{await rm(directory,{recursive:true,force:true});delete process.env.GKE_LOCAL_DEV;delete process.env.GKE_LOCAL_DATA;}
});
