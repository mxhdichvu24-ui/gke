import {createHash,randomBytes} from 'node:crypto';
import {json,parseBody} from '../server/http.mjs';
import {normalizeParcel} from '../server/weights.mjs';
import {normalizePhone} from '../src/contact-validation.mjs';
import {sameOrigin,fingerprint} from '../server/auth.mjs';
import {acceptContact,localMode,localTransaction,storageReady} from '../server/storage.mjs';
import {listDocuments} from '../server/documents.mjs';
import {shortText,safeUrl} from '../server/content.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{code:'method'});
 if(!sameOrigin(req))return json(res,403,{code:'invalid_origin'});
 if(!storageReady())return json(res,503,{code:'intake_unavailable'});
 const {data,error}=await parseBody(req);if(error)return json(res,error,{code:'invalid_input'});
 const invalid=field=>json(res,400,{code:'invalid_input',field});
 const phone=data?.phone?normalizePhone(data.phone):'',name=shortText(data?.name||'',160),email=shortText(data?.email||'',200),message=shortText(data?.message||'',4000),partner=data?.type==='partner';
 if(data?.phone&&!phone)return invalid('phone');
 if(email===null||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return invalid('email');
 if(!phone&&!email)return invalid('email');
 if(data?.consent!==true)return invalid('consent');
 if(!uuid.test(data?.key||'')||name===null||message===null||data.website)return json(res,400,{code:'invalid_input'});
 if(partner&&(!name||!email||!shortText(data.company,160)||!message))return invalid(!email?'email':!name?'name':'company');
 if(!['US','UK',''].includes(data.route||''))return invalid('route');
 if(data.pickupCountry&&data.pickupCountry!=='VN')return invalid('pickupCountry');
 if(!['parcel','seller','tiktok','b2b','general','business','partner'].includes(data.type||'general'))return invalid('type');
 let packages=[];
 if(data.packages!==undefined){
  if(partner||!Array.isArray(data.packages)||!data.packages.length||data.packages.length>12)return invalid('packages');
  packages=data.packages.map(item=>({parcel:normalizeParcel(item),count:item?.count}));
  if(packages.some(item=>!item.parcel||!Number.isInteger(item.count)||item.count<1||item.count>1000))return invalid('packages');
 }
 const groups=partner?['partner']:[...new Set([data.customerGroup,...(Array.isArray(data.groups)?data.groups:[])].filter(g=>['vietnam_seller','international_seller','business'].includes(g)))];
 const sourceMeta={};for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const v=shortText(data.sourceMeta?.[key]||'',120);if(v&&!v.includes('@'))sourceMeta[key]=v}
 for(const key of ['landingPath','submittedPath']){const v=shortText(data.sourceMeta?.[key]||'',300);if(v&&/^\/(?!\/)[^?#]*$/.test(v))sourceMeta[key]=v}
 const department=partner?'partnerships':groups.includes('business')?'business':groups.includes('international_seller')?'international_sales':'vietnam_seller_support';
 const workspace=(await listDocuments('workspace'))[0]?.value,staff=await listDocuments('staff');
 const assignee=workspace?.defaultSales&&staff.some(row=>row.value.enabled&&row.value.role==='sales'&&row.value.email===workspace.defaultSales)?workspace.defaultSales:null;
 const payload={name,phone,email,message,type:data.type||'general',route:data.route||'',service:shortText(data.service||'',60)||null,packages,source:packages.length?'calculator':partner?'partnership':'landing',locale:['en','vi','zh'].includes(data.locale)?data.locale:'en',consent:true,marketingConsent:data.marketingConsent===true,groups,company:shortText(data.company||'',160)||'',businessCountry:shortText(data.businessCountry||'',80)||'',businessWebsite:data.businessWebsite?safeUrl(data.businessWebsite)||'':'',pickupCountry:'VN',contactLanguage:['vi','en','zh'].includes(data.contactLanguage)?data.contactLanguage:null,preferredChannel:['email','phone','whatsapp','zalo','other'].includes(data.preferredChannel)?data.preferredChannel:null,partnershipType:partner?shortText(data.partnershipType,80)||'other':null,capabilities:partner?shortText(data.capabilities||'',400)||'':null,sourceMeta,department,assignedTo:assignee,notificationStatus:'not_configured',reminderDueAt:new Date(Date.now()+(workspace?.reminderMinutes||60)*60000).toISOString()};
 try{
  let secret=process.env.GKE_RATE_LIMIT_SECRET;if(localMode())secret=await localTransaction(state=>state.rateSecret||(state.rateSecret=randomBytes(48).toString('hex')));if(!secret)return json(res,503,{code:'intake_unavailable'});
  const digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  // Reminder times are server metadata, not part of idempotency input identity.
  const canonical={...payload};delete canonical.reminderDueAt;const stableDigest=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  const result=await acceptContact({key:data.key,digest:stableDigest,payload,fingerprint:fingerprint(req,secret)});
  if(result.code)return json(res,result.code==='rate_limited'?429:409,{code:result.code});if(!result.reference)throw Error('No reference');
  return json(res,201,{status:'accepted',reference:result.reference});
 }catch(error){console.error('quote_intake_failed',{kind:error?.name||'Error',storageStatus:error?.status||null});return json(res,503,{code:'intake_unavailable'})}
}
