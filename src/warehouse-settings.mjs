import {dongAnhAddress} from './gke-locations.mjs';
export const warehouseMetrics = {
 stock:'Stock on hand (pallets)', capacity:'Storage capacity (pallets)', onTime:'On-time delivery (%)',
 outboundToday:'Outbound today (trucks)', putawaysToday:'Put-aways today (pallets)',
 trucksOnSite:'Trucks on site', trucksTotal:'Total trucks', docksTotal:'Total bays', docksBusy:'Busy bays',
 docked:'Docked trucks', arriving:'Arriving trucks', staged:'Staged pallets',
 forkliftsTotal:'Total forklifts', forkliftsWorking:'Working forklifts',
};
export const defaultWarehouseSettings = {
 mode:'manual', updatedAt:null,
 sites:[['WH-01','GKE Hoang Mai','Hoang Van Thu Ward, Hoang Mai District, Hanoi'],['WH-02','GKE Dong Anh',dongAnhAddress],['WH-03','GKE Ho Chi Minh','Van Phuc Urban Area, Hiep Binh Ward, Ho Chi Minh City'],['WH-04','GKE Da Nang','Thac Gian Ward, Thanh Khe District, Da Nang']].map(([id,name,address])=>({
  id,name,address,status:null,...Object.fromEntries(Object.keys(warehouseMetrics).map(key=>[key,null])),inventory:[],
 })),
};
export function validateWarehouseSettings(value) {
 if(!value || !['simulation','manual'].includes(value.mode) || !Array.isArray(value.sites) || ![3,4].includes(value.sites.length))return null;
 const sites=[];
 const ids=new Set();
 for(const site of value.sites){
  if(!['WH-01','WH-02','WH-03','WH-04'].includes(site?.id)||ids.has(site.id))return null;
  ids.add(site.id);
  if(!['name','address'].every(key=>typeof site[key]==='string'&&site[key].trim().length>0&&site[key].length<=250))return null;
  if(site.status!==null&&!['Operational','Maintenance','Closed'].includes(site.status))return null;
  const clean={id:site.id,name:site.name.trim(),address:site.address.trim(),status:site.status};
  for(const key of Object.keys(warehouseMetrics)){
   const number=site[key];
   if(number===null){clean[key]=null;continue;}
   if(typeof number!=='number'||!Number.isFinite(number)||number<0||number>100000000|| (key==='onTime'?number>100:!Number.isSafeInteger(number)))return null;
   clean[key]=number;
  }
  for(const [count,total]of [['stock','capacity'],['docksBusy','docksTotal'],['docked','docksTotal'],['trucksOnSite','trucksTotal'],['forkliftsWorking','forkliftsTotal']])if(clean[count]!==null&&clean[total]!==null&&clean[count]>clean[total])return null;
  if(!Array.isArray(site.inventory)||site.inventory.length>100)return null;
  const skus=new Set();
  clean.inventory=[];
  for(const item of site.inventory){
   if(!item||typeof item.sku!=='string'||!/^[-A-Z0-9]{1,40}$/.test(item.sku)||skus.has(item.sku)||!Number.isSafeInteger(item.qty)||item.qty<0||item.qty>100000000||!['in_stock','low_stock','out_of_stock'].includes(item.status))return null;
   skus.add(item.sku);clean.inventory.push({sku:item.sku,qty:item.qty,status:item.status});
  }
  sites.push(clean);
 }
 if(!['WH-01','WH-02','WH-03'].every(id=>ids.has(id)))return null;
 if(!ids.has('WH-04'))sites.push(structuredClone(defaultWarehouseSettings.sites[3]));
 return {mode:'manual',updatedAt:value.updatedAt||null,sites};
}
