import {test} from 'node:test';
import assert from 'node:assert/strict';
test('vehicle animation moves trucks and forklifts without changing reported site figures',async()=>{
 globalThis.location=new URL('http://localhost/gke-3d?route=US');
 const {db}=await import('../src/warehouse/data/db.js');
 const {applyInitialPoses}=await import('../src/warehouse/data/layout.js');
 const {createSimulation}=await import('../src/warehouse/state/simulation.js');
 db.reportedOnly=true;
 for(const site of db.sites())Object.assign(site,{stock:123,outboundToday:7,putawaysToday:3,reported:{stock:123,outboundToday:7,putawaysToday:3}});
 applyInitialPoses(db);const sim=createSimulation({});
 const positions=type=>db.list(type).map(e=>({...e.position}));
 const trucks=positions('truck'),forks=positions('forklift');
 for(let i=0;i<600;i++)sim.update(1/30,i/30);
 const moved=(type,before)=>positions(type).some((p,i)=>Math.hypot(p.x-before[i].x,p.z-before[i].z)>.1);
 assert.ok(moved('truck',trucks));assert.ok(moved('forklift',forks));assert.equal(sim.debug.errors,0);
 for(const site of db.sites()){assert.equal(site.stock,123);assert.equal(site.outboundToday,7);assert.equal(site.putawaysToday,3);assert.equal(site.reported.stock,123);}
 delete globalThis.location;
});
