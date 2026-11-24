import {randomBytes} from 'node:crypto';
import {json,parseBody} from '../server/http.mjs';
import {estimateFromTariffs} from '../server/tariffs.mjs';
import {sameOrigin,fingerprint} from '../server/auth.mjs';
import {consumeLimit,localMode,localTransaction} from '../server/storage.mjs';
import {saveDocument} from '../server/documents.mjs';
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{code:'method'});
 if(!sameOrigin(req))return json(res,403,{code:'invalid_origin'});
 const {data,error}=await parseBody(req);if(error)return json(res,error,{code:'invalid_input'});
 try{
  let secret=process.env.GKE_RATE_LIMIT_SECRET;if(localMode())secret=await localTransaction(state=>state.rateSecret||(state.rateSecret=randomBytes(48).toString('hex')));
  if(!secret)return json(res,503,{code:'estimate_unavailable'});
  if(!await consumeLimit('estimate:'+fingerprint(req,secret),30,60))return json(res,429,{code:'rate_limited'});
  const {http,body}=await estimateFromTariffs(data);
  if(body.status==='estimated'){
   const expiresAt=new Date(Math.min(Date.parse(body.validUntil),Date.now()+1800000)).toISOString();
   const snapshot=await saveDocument('quoteSnapshots',null,{input:{route:data.route,service:data.service||'',packages:data.packages||[data],zip:data.zip||''},result:body,expiresAt},0,'public_estimate');
   body.snapshotId=snapshot.id;body.expiresAt=expiresAt;
  }
  return json(res,http,body);
 }catch(error){return json(res,error.status||503,{code:'estimate_unavailable'})}
}
