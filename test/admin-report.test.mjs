import{test}from'node:test';import assert from'node:assert/strict';
import{dashboardReport,localDay}from'../server/admin-report.mjs';
import handler from'../api/shipping-estimates.mjs';
test('empty reports contain zero counts and no generated customers or percentages',()=>{
 const report=dashboardReport([],new URLSearchParams(),new Date('2026-11-20T12:00:00Z'));
 assert.equal(report.total,0);assert.equal(report.today,0);assert.deepEqual(report.recent,[]);assert.deepEqual(report.services,[]);assert.ok(report.days.every(day=>day.count===0));
});
test('reports count stored rows using Vietnam midnight and respect date filters',()=>{
 const row=(at,status,service)=>({created_at:at,status,payload:{service}});
 const rows=[row('2026-11-19T16:59:59Z','received','economy'),row('2026-11-19T17:00:00Z','contacted','economy'),row('2026-11-20T10:00:00Z','closed','seller-uk')];
 assert.equal(localDay(rows[1].created_at),'2026-11-20');
 const result=dashboardReport(rows,new URLSearchParams('from=2026-11-20&to=2026-11-20'),new Date('2026-11-20T12:00:00Z'));
 assert.equal(result.total,2);assert.equal(result.today,2);assert.equal(result.pending,1);assert.equal(result.closed,1);assert.equal(result.days[0].count,2);assert.equal(result.services.reduce((sum,item)=>sum+item.count,0),2);
});
test('public quotation endpoint cannot expose the synthetic tariff even when enabled in the process',async()=>{
 const previous=process.env.GKE_DEMO_RATES;process.env.GKE_DEMO_RATES='1';
 try{const result=await new Promise(resolve=>{handler({method:'POST',body:{route:'US',weight:'44',length:'2',width:'21',height:'21'},headers:{'content-type':'application/json'}},{setHeader(){},writeHead(code){this.code=code;},end(text){resolve({code:this.code,data:JSON.parse(text)});}});});assert.equal(result.code,200);assert.equal(result.data.status,'request_required');assert.equal(result.data.services,undefined);}finally{if(previous===undefined)delete process.env.GKE_DEMO_RATES;else process.env.GKE_DEMO_RATES=previous;}
});
