import {test} from 'node:test';
import assert from 'node:assert/strict';
test('saved warehouse metrics and explicit zeroes drive each site and network without simulated counts',async()=>{
 globalThis.location=new URL('http://localhost/gke-3d?route=US');
 const {db}=await import('../src/warehouse/data/db.js');
 const {siteStats,kpis}=await import('../src/warehouse/data/selectors.js');
 const {defaultWarehouseSettings,validateWarehouseSettings}=await import('../src/warehouse-settings.mjs');
 const input=structuredClone(defaultWarehouseSettings);
 for(const [index,site]of input.sites.entries())Object.assign(site,{stock:index?0:123,capacity:500,onTime:97.5,outboundToday:7,putawaysToday:0,trucksOnSite:2,trucksTotal:5,docksTotal:4,docksBusy:1,docked:1,arriving:3,staged:9,forkliftsTotal:3,forkliftsWorking:2});
 const saved=validateWarehouseSettings(input);assert.ok(saved);
 for(const site of saved.sites)Object.assign(db.site(site.id),{...site,reported:site});
 const first=siteStats('WH-01');assert.equal(first.stock,123);assert.equal(first.capacity,500);assert.equal(first.fullPct,24.6);assert.equal(first.putawaysToday,0);assert.equal(first.inbound,3);assert.equal(first.onTime,97.5);
 const cards=kpis('WH-01');assert.deepEqual(cards.map(card=>card.value),[123,2,97.5]);
 const all=siteStats('ALL');assert.equal(all.stock,123);assert.equal(all.capacity,2000);assert.equal(all.outboundToday,28);assert.equal(all.trucksOnSite,8);assert.equal(all.onTime,97.5);
 db.site('WH-02').reported.stock=null;assert.equal(siteStats('ALL').stock,null);assert.equal(siteStats('WH-01').stock,123);
 delete globalThis.location;
});
