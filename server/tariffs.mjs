import {calculateWeights,measurePackages,validateRules,decimalUnits} from './weights.mjs';
import {fail,listDocuments} from './documents.mjs';
import {shortText,pair} from './content.mjs';
const integer=(v,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&/T/.test(v)&&/(Z|[+-]\d\d:\d\d)$/.test(v);
const ceil=(n,d)=>Number((BigInt(n)+BigInt(d)-1n)/BigInt(d));
const product=(a,b,d)=>{const n=(BigInt(a)*BigInt(b)+BigInt(d)-1n)/BigInt(d);if(n>BigInt(Number.MAX_SAFE_INTEGER))fail('amount_overflow');return Number(n)};
const dateOverlap=(a,b)=>Date.parse(a.startsAt)<Date.parse(b.endsAt)&&Date.parse(b.startsAt)<Date.parse(a.endsAt);
export function validateTariff(value){
 const errors=[];const add=(field,code)=>errors.push({field,code});
 if(!value||typeof value!=='object')return{errors:[{field:'file',code:'invalid_tariff'}]};
 const v=structuredClone(value);v.name=shortText(v.name,160)||'';
 if(!v.name)add('name','required');
 if(!['public','internal_cost'].includes(v.classification))add('classification','required');
 if(!['VND','USD','GBP'].includes(v.currency))add('currency','unsupported_currency');
 if(!['draft','active','archived'].includes(v.status))add('status','invalid_status');
 if(!validDate(v.startsAt)||!validDate(v.endsAt)||Date.parse(v.startsAt)>=Date.parse(v.endsAt))add('startsAt','invalid_effective_dates');
 if(!validateRules(v.rules))add('rules','explicit_weight_rules_required');
 if(!integer(v.taxBps,10000))add('taxBps','explicit_tax_required');
 v.includes=pair(v.includes);v.excludes=pair(v.excludes);v.source=shortText(v.source,1000)||'';v.approved=v.approved===true;
 if(!Array.isArray(v.bands)||!v.bands.length||v.bands.length>2000)add('bands','invalid_bands');
 else{
  const groups=new Map();v.bands=v.bands.map((b,i)=>{
   if(!['US','UK'].includes(b.route)||!/^[-a-z0-9]{1,60}$/.test(b.service||''))add(`bands.${i}`,'invalid_route_or_service');
   if(!integer(b.fromG,1000000000)||b.toG!==null&&(!integer(b.toG,1000000000)||b.toG<=b.fromG))add(`bands.${i}`,'invalid_weight_band');
   if(!['per_kg','fixed','manual'].includes(b.model)||!integer(b.amountMinor,100000000000)||!integer(b.minimumMinor,100000000000))add(`bands.${i}`,'invalid_charge');
   const clean={route:b.route,service:b.service,zone:shortText(b.zone,60)||'all',fromG:b.fromG,toG:b.toG,model:b.model,amountMinor:b.amountMinor,minimumMinor:b.minimumMinor,name:pair(b.name)};
   const key=[clean.route,clean.service,clean.zone].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...clean,line:i+1});return clean;
  });
  for(const [key,bands] of groups){bands.sort((a,b)=>a.fromG-b.fromG);if(bands[0].fromG!==0)add(key,'band_must_start_at_zero');for(let i=1;i<bands.length;i++){const end=bands[i-1].toG;if(end===null||end>bands[i].fromG)add(`bands.${bands[i].line-1}`,'overlap');else if(end<bands[i].fromG)add(`bands.${bands[i].line-1}`,'gap')}}
 }
 if(!Array.isArray(v.zones))add('zones','explicit_zones_required');else v.zones=v.zones.map((z,i)=>{if(!/^[-a-z0-9]{1,60}$/.test(z.id||'')||!['US','UK'].includes(z.route)||!Array.isArray(z.prefixes)||!z.prefixes.length||z.prefixes.some(p=>!/^[- A-Za-z0-9]{1,12}$/.test(p)))add(`zones.${i}`,'invalid_zone');return{id:z.id,route:z.route,prefixes:z.prefixes||[]}});
 if(!Array.isArray(v.surcharges)||v.surcharges.length>30)add('surcharges','invalid_surcharges');else v.surcharges=v.surcharges.map((s,i)=>{
  if(!['fixed','percent'].includes(s.model)||!integer(s.amountMinor,100000000000)||!integer(s.rateBps,10000)||!['shipping','subtotal'].includes(s.basis))add(`surcharges.${i}`,'invalid_surcharge');
  return{code:shortText(s.code,40)||`fee-${i}`,name:pair(s.name),model:s.model,amountMinor:s.amountMinor,rateBps:s.rateBps,basis:s.basis,route:['US','UK'].includes(s.route)?s.route:'',zone:shortText(s.zone,60)||'',minWeightG:integer(s.minWeightG)?s.minWeightG:0,minSideCm:integer(s.minSideCm,1000)?s.minSideCm:0};
 });
 if(v.status==='active'&&(!v.approved||!v.source||v.classification!=='public'))add('approved','commercial_review_required');
 return{value:v,errors};
}
export async function assertTariffActivation(value,id){
 if(value.status!=='active')return;
 const others=(await listDocuments('tariffs')).filter(row=>row.id!==id&&row.value.status==='active'&&row.value.classification==='public'&&row.value.currency===value.currency&&dateOverlap(row.value,value));
 if(others.some(row=>row.value.bands.some(a=>value.bands.some(b=>a.route===b.route&&a.service===b.service&&(a.zone===b.zone||a.zone==='all'||b.zone==='all')))))fail('active_tariff_overlap',409);
}
export function validatePromotion(v){
 if(!v||!['draft','active','archived'].includes(v.status)||!['fixed','percent'].includes(v.model)||!['shipping','subtotal'].includes(v.basis)||!validDate(v.startsAt)||!validDate(v.endsAt)||Date.parse(v.startsAt)>=Date.parse(v.endsAt)||!integer(v.amountMinor,100000000000)||!integer(v.rateBps,10000)||!integer(v.minimumBillableG))fail('invalid_promotion');
 if(v.status==='active'&&(!v.referenceEvidence||v.approved!==true))fail('promotion_reference_required');
 return{name:shortText(v.name,160)||'',status:v.status,model:v.model,basis:v.basis,startsAt:v.startsAt,endsAt:v.endsAt,amountMinor:v.amountMinor,rateBps:v.rateBps,minimumBillableG:v.minimumBillableG,tariffId:shortText(v.tariffId,36)||'',route:['US','UK'].includes(v.route)?v.route:'',service:shortText(v.service,60)||'',referenceEvidence:shortText(v.referenceEvidence,1500)||'',approved:v.approved===true,public:v.public===true,conditions:pair(v.conditions)};
}
function csvRows(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(!quoted&&(c===','||c==='\n')){row.push(cell.trim());cell='';if(c==='\n'){if(row.some(Boolean))rows.push(row);row=[]}}else if(c!=='\r')cell+=c}
 if(quoted)fail('invalid_csv_quotes');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
export const TARIFF_COLUMNS=['route','service','zone','from_kg_inclusive','to_kg_exclusive','model','amount','minimum_charge'];
export function importTariffCsv(text){
 if(typeof text!=='string'||text.length>1000000)fail('file_too_large');
 const rows=csvRows(text.replace(/^\uFEFF/,'')),headers=rows.shift()||[],missing=TARIFF_COLUMNS.filter(c=>!headers.includes(c));
 if(missing.length)return{errors:missing.map(field=>({line:1,field,code:'missing_column'})),rows:[]};
 if(rows.length>2000)fail('too_many_rows');
 const errors=[],bands=rows.map((cells,i)=>{const data=Object.fromEntries(headers.map((h,j)=>[h,cells[j]||''])),grams=s=>s==='0'?0:decimalUnits(s,3,1000000000),money=s=>/^\d+(?:\.\d{1,2})?$/.test(s)?s:null;
  const value={route:data.route,service:data.service,zone:data.zone||'all',fromG:grams(data.from_kg_inclusive),toG:data.to_kg_exclusive===''?null:grams(data.to_kg_exclusive),model:data.model,amount:money(data.amount),minimum:money(data.minimum_charge)};
  for(const [field,valid] of [['from_kg_inclusive',value.fromG!==null],['to_kg_exclusive',data.to_kg_exclusive===''||value.toG!==null],['amount',value.amount!==null],['minimum_charge',value.minimum!==null]])if(!valid)errors.push({line:i+2,field,code:'invalid_number'});
  if(!['US','UK'].includes(value.route))errors.push({line:i+2,field:'route',code:'unsupported_route'});return value;
 });return{rows:bands,errors};
}
export const tariffTemplate=()=>TARIFF_COLUMNS.join(',')+'\r\n';
export function moneyUnits(value,currency){const precision=currency==='VND'?0:2;if(typeof value==='number')value=String(value);if(typeof value!=='string'||!new RegExp(`^\\d+(?:\\.\\d{1,${precision||1}})?$`).test(value)||precision===0&&value.includes('.'))return null;const [whole,f='']=value.split('.'),n=Number(whole+f.padEnd(precision,'0'));return integer(n,100000000000)?n:null}
export function priceShipment(input,tariff,promotions=[],now=Date.now()){
 const parcels=input.packages||[input];const weights=calculateWeights(parcels,tariff.value.rules),value=tariff.value;
 const zones=value.zones.filter(z=>z.route===input.route),zip=String(input.zip||'').replaceAll(' ','').toUpperCase();
 if(zones.length&&!zip)return{status:'needs_data',field:'zip'};
 const matchingZones=zones.filter(z=>z.prefixes.some(p=>zip.startsWith(p.replaceAll(' ','').toUpperCase()))).sort((a,b)=>Math.max(...b.prefixes.map(p=>p.length))-Math.max(...a.prefixes.map(p=>p.length)));
 const zone=matchingZones[0]?.id||'all';
 const bands=value.bands.filter(b=>b.route===input.route&&(!input.service||b.service===input.service)&&(b.zone===zone||b.zone==='all')&&weights.billableG>=b.fromG&&(b.toG===null||weights.billableG<b.toG));
 if(!bands.length)return{status:'unsupported',reason:'no_matching_band'};
 const byService=new Map();for(const band of bands){const previous=byService.get(band.service);if(!previous||previous.zone==='all'&&band.zone!=='all')byService.set(band.service,band)}
 const results=[];
 for(const band of byService.values()){
  if(band.model==='manual')continue;
  const shipping=Math.max(band.minimumMinor,band.model==='fixed'?band.amountMinor:product(weights.billableG,band.amountMinor,1000));
  let subtotal=shipping;const fees=[];
  for(const fee of value.surcharges){if(fee.route&&fee.route!==input.route||fee.zone&&fee.zone!==zone||weights.billableG<fee.minWeightG||fee.minSideCm&&!weights.breakdown.some(p=>Math.max(...p.dimensionsCm)>=fee.minSideCm))continue;const amount=fee.model==='fixed'?fee.amountMinor:product(fee.basis==='shipping'?shipping:subtotal,fee.rateBps,10000);subtotal+=amount;fees.push({code:fee.code,name:fee.name,amount})}
  const originalTotal=subtotal+product(subtotal,value.taxBps,10000),eligible=promotions.filter(p=>!p.deleted&&p.value.status==='active'&&p.value.public&&p.value.approved&&p.value.referenceEvidence&&(!p.value.tariffId||p.value.tariffId===tariff.id)&&(!p.value.route||p.value.route===input.route)&&(!p.value.service||p.value.service===band.service)&&weights.billableG>=p.value.minimumBillableG&&Date.parse(p.value.startsAt)<=now&&now<Date.parse(p.value.endsAt));
  // A single eligible promotion is applied; unconfirmed stacking is never inferred.
  let discount=null;
  for(const promotion of eligible){const p=promotion.value,basis=p.basis==='shipping'?shipping:subtotal,amount=Math.min(basis,p.model==='fixed'?p.amountMinor:product(basis,p.rateBps,10000));if(!discount||amount>discount.amount)discount={id:promotion.id,name:p.name,amount,basis:p.basis,rateBps:p.model==='percent'?p.rateBps:null,conditions:p.conditions,referenceEvidence:p.referenceEvidence}}
  const net=subtotal-(discount?.amount||0),tax=product(net,value.taxBps,10000),total=net+tax;
  if(!Number.isSafeInteger(total))fail('amount_overflow');
  results.push({id:band.service,name:band.name,total,referenceTotal:discount?originalTotal:null,discount,charges:{shipping,fees,tax},includes:value.includes,excludes:value.excludes});
 }
 return results.length?{status:'estimated',currency:value.currency,minorScale:value.currency==='VND'?1:100,rateVersion:tariff.id,rateRevision:tariff.revision,validUntil:value.endsAt,...weights,services:results}:{status:'request_required',reason:'manual_service'};
}
export async function estimateFromTariffs(input,now=Date.now()){
 if(!input||!['US','UK'].includes(input.route))return{http:400,body:{code:'invalid_shipment'}};
 let measurements;try{measurements=measurePackages(input.packages||[input])}catch{return{http:400,body:{code:'invalid_shipment'}}}
 const tariffs=(await listDocuments('tariffs')).filter(row=>row.value.status==='active'&&row.value.approved&&row.value.classification==='public'&&Date.parse(row.value.startsAt)<=now&&now<Date.parse(row.value.endsAt)&&(!input.currency||row.value.currency===input.currency)&&row.value.bands.some(b=>b.route===input.route&&(!input.service||b.service===input.service)));
 if(!tariffs.length)return{http:200,body:{status:'request_required',reason:'rates_unavailable',measurements}};
 if(new Set(tariffs.map(r=>r.value.currency)).size>1)return{http:200,body:{status:'needs_data',field:'currency'}};
 const all=await listDocuments('promotions'),quotes=tariffs.map(t=>priceShipment(input,t,all,now));
 const estimated=quotes.filter(q=>q.status==='estimated');if(!estimated.length)return{http:200,body:quotes[0]};
 return{http:200,body:{...estimated[0],services:estimated.flatMap(q=>q.services)}};
}
