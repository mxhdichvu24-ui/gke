import{test}from'node:test';import assert from'node:assert/strict';import{mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{randomBytes,randomUUID}from'node:crypto';
import admin from'../api/admin.mjs';import quote from'../api/quote-requests.mjs';
import{defaultSettings}from'../src/site-defaults.mjs';
function call(handler,action,method='GET',body,cookie=''){
 let status,headers={};let resolve;const done=new Promise(r=>resolve=r);
 const req={method,url:'/api/admin?action='+action,body,headers:{host:'localhost:4173',origin:'http://localhost:4173','sec-fetch-site':'same-origin','content-type':'application/json',cookie},socket:{remoteAddress:'127.0.0.1'}};
 const res={setHeader(k,v){headers[k]=v;},writeHead(code,values){status=code;Object.assign(headers,values);},end(text){resolve({status,headers,text,body:()=>JSON.parse(text)});}};
 handler(req,res);return done;
}
test('admin authentication, versioned settings, idempotent contact capture and CSV export',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'gke-admin-test-'));
 process.env.GKE_LOCAL_DEV='1';process.env.GKE_LOCAL_DATA=join(directory,'data.json');
 try{
 assert.equal((await call(admin,'contacts')).status,401);
 const password=randomBytes(24).toString('base64url');
 const setup=await call(admin,'setup','POST',{email:'qa@example.test',password});assert.equal(setup.status,201);
 const cookie=setup.headers['Set-Cookie'].split(';')[0];
 const modified=structuredClone(defaultSettings);modified.phone='0900 000 001';
 assert.equal((await call(admin,'settings','PUT',{value:modified,revision:0},cookie)).status,200);
 assert.equal((await call(admin,'settings','PUT',{value:modified,revision:0},cookie)).status,409);
 const config=await call(admin,'warehouse','GET',undefined,cookie);
 assert.equal(config.status,200);
 const gke=config.body().value;gke.mode='manual';gke.sites[0].capacity=500;gke.sites[0].stock=123;
 gke.sites[0].inventory=[{sku:'BOX-M-001',qty:300,status:'in_stock'}];
 assert.equal((await call(admin,'warehouse','PUT',{value:gke,revision:1})).status,401);
 const published=await call(admin,'warehouse','PUT',{value:gke,revision:1},cookie);
 assert.equal(published.status,200);
 assert.equal(published.body().value.warehouse.sites[0].stock,123);
 assert.ok(published.body().value.warehouse.updatedAt);
 assert.equal((await call(admin,'warehouse','PUT',{value:gke,revision:1},cookie)).status,409);
 const invalid=structuredClone(gke);invalid.sites[0].stock=501;
 assert.equal((await call(admin,'warehouse','PUT',{value:invalid,revision:2},cookie)).status,400);
 const data={name:'=CSV safety test',phone:'0900000001',email:'qa@example.test',route:'US',message:'Synthetic QA enquiry',consent:true,key:randomUUID()};
 const received=await call(quote,'','POST',data);assert.equal(received.status,201);
 const again=await call(quote,'','POST',data);assert.equal(again.body().reference,received.body().reference);
 const contacts=await call(admin,'contacts','GET',undefined,cookie);assert.equal(contacts.body().total,1);
 const output=await call(admin,'export','GET',undefined,cookie);assert.equal(output.status,200);assert.ok(output.text.includes("'=CSV safety test"));
 assert.equal((await call(admin,'login','POST',{email:'qa@example.test',password:'incorrect'})).status,401);
 assert.equal((await call(admin,'login','POST',{email:'qa@example.test',password})).status,200);
 }finally{await rm(directory,{recursive:true,force:true});delete process.env.GKE_LOCAL_DATA;delete process.env.GKE_LOCAL_DEV;}
});
