import {json,parseBody} from '../server/http.mjs';
import {listDocuments,recordEvent,saveDocument} from '../server/documents.mjs';
import {readSettings,consumeLimit,localMode,localTransaction} from '../server/storage.mjs';
import {sameOrigin,fingerprint} from '../server/auth.mjs';
import {randomBytes} from 'node:crypto';
import {publicArticles,shortText} from '../server/content.mjs';
export default async function handler(req,res){
 try{
  const p=new URL(req.url,'http://local').searchParams,kind=p.get('kind')||'config',locale=['vi','en','zh'].includes(p.get('lang'))?p.get('lang'):'en';
  if(req.method==='GET'){
   if(kind==='articles')return json(res,200,await publicArticles(locale,{featured:p.get('featured')==='1',q:(p.get('q')||'').slice(0,120),category:(p.get('category')||'').slice(0,80),page:Math.max(1,Math.min(10000,Number(p.get('page'))||1))}));
   const [channels,agents,workspace,services,settings]=await Promise.all([listDocuments('channels'),listDocuments('agents'),listDocuments('workspace'),listDocuments('services'),readSettings()]);
   return json(res,200,{preview:localMode(),widgetEnabled:workspace[0]?.value.widgetEnabled!==false,channels:channels.filter(row=>row.value.enabled).sort((a,b)=>a.value.order-b.value.order).map(row=>({id:row.id,...row.value})),agents:agents.filter(row=>row.value.enabled).map(row=>({id:row.id,...row.value})),services:services.filter(row=>row.value.enabled).map(row=>({id:row.id,...row.value})),businessFactsApproved:workspace[0]?.value.businessFactsApproved===true,contact:{phone:settings.value.phone,email:settings.value.email},supportHours:workspace[0]?.value.supportHours||{vi:'',en:''}});
  }
  if(req.method!=='POST'||!sameOrigin(req))return json(res,403,{code:'invalid_origin'});
  let secret=process.env.GKE_RATE_LIMIT_SECRET;if(localMode())secret=await localTransaction(state=>state.rateSecret||(state.rateSecret=randomBytes(48).toString('hex')));if(!secret)return json(res,503,{code:'unconfigured'});
  if(!await consumeLimit('public:'+fingerprint(req,secret),60,60))return json(res,429,{code:'rate_limited'});
  const {data,error}=await parseBody(req);if(error)return json(res,error,{code:'invalid_input'});
  if(kind==='event'){
   if(!['widget_open','channel_select','external_open'].includes(data?.event)||data.channel&&!/^[a-f0-9-]{36}$/.test(data.channel))return json(res,400,{code:'invalid_event'});
   const channel=data.channel?(await listDocuments('channels')).find(row=>row.id===data.channel&&!row.deleted&&row.value.enabled):null;
   if(data.channel&&!channel)return json(res,400,{code:'invalid_channel'});
   await recordEvent({event:data.event,channel:channel?.id,department:channel?.value.department||'',locale:['en','vi','zh'].includes(data.locale)?data.locale:'en'});return json(res,202,{ok:true});
  }
  if(kind==='feedback'){
   if(!['issue','feedback'].includes(data?.type)||!shortText(data.message,3000)||data.consent!==true||data.website)return json(res,400,{code:'invalid_feedback'});
   const email=shortText(data.email,200);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{code:'invalid_email'});
   const row=await saveDocument('feedback',null,{type:data.type,message:data.message.trim(),email:email||'',reference:shortText(data.reference,100)||'',status:'new',consent:true},0,'public');return json(res,201,{reference:row.id});
  }
  return json(res,405,{code:'method'});
 }catch{return json(res,503,{code:'service_unavailable'})}
}
