import{test}from'node:test';import assert from'node:assert/strict';
import{carriers,routeCarriers,carrierForRoute}from'../src/warehouse/data/carriers.mjs';
import{defaultWarehouseSettings,validateWarehouseSettings}from'../src/warehouse-settings.mjs';
test('US and UK use the requested carriers, including legacy scene keys',()=>{
 assert.deepEqual(routeCarriers.US.map(key=>carriers[key].name),['USPS','UniUni','FedEx','SpeedX']);
 assert.deepEqual(routeCarriers.UK.map(key=>carriers[key].name),['Evri','Royal Mail']);
 for(const route of ['US','UK'])for(const key of ['waretrack','bluepeak','nordline','cargoviva',...Object.keys(carriers)])assert.ok(routeCarriers[route].includes(carrierForRoute(key,route)));
});
test('GKE data validates its totals and rejects duplicate sites',()=>{
 assert.ok(validateWarehouseSettings(defaultWarehouseSettings));
 const data=structuredClone(defaultWarehouseSettings);data.sites[0].forkliftsTotal=0;data.sites[0].forkliftsWorking=1;
 assert.equal(validateWarehouseSettings(data),null);
 data.sites[0].forkliftsWorking=0;data.sites[1].id='WH-01';
 assert.equal(validateWarehouseSettings(data),null);
});

test('missing GKE figures remain null while an explicitly entered zero is retained',()=>{
 const data=structuredClone(defaultWarehouseSettings);assert.equal(data.sites[0].stock,null);data.sites[0].stock=0;data.sites[0].capacity=0;const saved=validateWarehouseSettings(data);assert.equal(saved.sites[0].stock,0);assert.equal(saved.sites[1].stock,null);
});
