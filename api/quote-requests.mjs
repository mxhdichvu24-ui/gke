import { createHash,randomBytes } from 'node:crypto';
import { json,parseBody } from '../server/http.mjs';
import { shipment } from '../server/shipping.mjs';
import { sameOrigin,fingerprint } from '../server/auth.mjs';
import { acceptContact,localMode,localTransaction,storageReady } from '../server/storage.mjs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default async function handler(req,res) {
  if (req.method !== 'POST') return json(res,405,{code:'method'});
  if (!sameOrigin(req)) return json(res,403,{code:'invalid_origin'});
  if (!storageReady()) return json(res,503,{code:'intake_unavailable'});
  const {data,error} = await parseBody(req); if(error) return json(res,error,{code:'invalid_input'});
  const phone = typeof data?.phone === 'string' ? data.phone.trim().replace(/[\s()-]/g,'') : '';
  const name = typeof data?.name === 'string' ? data.name.trim() : '';
  const email = typeof data?.email === 'string' ? data.email.trim() : '';
  const message = typeof data?.message === 'string' ? data.message.trim() : '';
  if (!/^(?:\+\d{7,15}|0\d{9})$/.test(phone) || !uuid.test(data?.key||'') || name.length>160 || email.length>200 || message.length>4000 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || data.consent !== true || data.website) return json(res,400,{code:'invalid_input'});
  if (!['US','UK',''].includes(data.route||'')) return json(res,400,{code:'invalid_input'});
  let packages=[];
  if (data.packages !== undefined) {
    if (!Array.isArray(data.packages) || !data.packages.length || data.packages.length>12) return json(res,400,{code:'invalid_input'});
    packages=data.packages.map(item=>({parcel:shipment({...item,route:data.route,service:data.service}),count:item?.count}));
    if (packages.some(item=>!item.parcel || !Number.isInteger(item.count) || item.count<1 || item.count>1000)) return json(res,400,{code:'invalid_input'});
  }
  if (!['parcel','seller','tiktok','b2b','general'].includes(data.type||'general')) return json(res,400,{code:'invalid_input'});
  const payload={name,phone,email,message,type:data.type||'general',route:data.route||'',service:data.service||null,packages,source:packages.length?'calculator':'landing',locale:['en','vi','zh'].includes(data.locale)?data.locale:'en',consent:true};
  try {
    let secret=process.env.GKE_RATE_LIMIT_SECRET;
    if(localMode()) secret=await localTransaction(state=>state.rateSecret||(state.rateSecret=randomBytes(48).toString('hex')));
    if(!secret)return json(res,503,{code:'intake_unavailable'});
    const digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const result=await acceptContact({key:data.key,digest,payload,fingerprint:fingerprint(req,secret)});
    if(result.code) return json(res,result.code==='rate_limited'?429:409,{code:result.code});
    if(!result.reference)throw new Error('No reference');
    return json(res,201,{status:'accepted',reference:result.reference});
  } catch {return json(res,503,{code:'intake_unavailable'});}
}
