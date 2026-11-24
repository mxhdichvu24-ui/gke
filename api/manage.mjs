import {translationConfigured,translateArticle} from '../server/translation.mjs';
import {randomUUID} from 'node:crypto';
import {json,parseBody} from '../server/http.mjs';
import {session,sameOrigin,hasRole,hashPassword} from '../server/auth.mjs';
import {listDocuments,getDocument,saveDocument,documentHistory,fail,listEvents} from '../server/documents.mjs';
import {validateArticle,validateChannel,validateAgent,validateService,shortText} from '../server/content.mjs';
import {validateTariff,validatePromotion,assertTariffActivation,importTariffCsv,tariffTemplate,moneyUnits} from '../server/tariffs.mjs';
import {createArticlePreview} from './articles.mjs';
const kinds=['articles','channels','agents','services','tariffs','promotions','staff','workspace','feedback'];
const publicStaff=row=>{const value={...row.value};delete value.passwordHash;return{...row,value}};
const sanitize=(kind,row)=>kind==='staff'?publicStaff(row):row;
export default async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 try{
  const user=await session(req);if(!user)return json(res,401,{code:'unauthorized'});
  const params=new URL(req.url,'http://local').searchParams,kind=params.get('kind')||'articles',action=params.get('action')||'';
  if(!kinds.includes(kind)&&action!=='events')fail('invalid_resource');
  if(!hasRole(user,'owner')&&!(hasRole(user,'editor')&&kind==='articles')&&!(hasRole(user,'sales')&&kind==='feedback'))fail('forbidden',403);
  if(req.method!=='GET'&&!sameOrigin(req))fail('invalid_origin',403);
  if(action==='translation-status'&&kind==='articles'&&req.method==='GET')return json(res,200,{configured:translationConfigured(),provider:'google-cloud-translation'});
  if(action==='events'&&req.method==='GET')return json(res,200,{rows:await listEvents()});
  if(action==='template'&&kind==='tariffs'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="gke-tariff-template.csv"','Cache-Control':'no-store'});return res.end(tariffTemplate())}
  if(action==='history'&&req.method==='GET'){const rows=await documentHistory(kind,params.get('id'));return json(res,200,{rows:rows.map(row=>kind==='staff'?{...row,value:undefined,previous:undefined}:row)})}
  if(req.method==='GET')return json(res,200,{rows:(await listDocuments(kind,{deleted:true})).map(row=>sanitize(kind,row)),role:user.role});
  const {data,error}=await parseBody(req,3000000);if(error)fail('invalid_input');
  if(action==='translate'&&kind==='articles'&&req.method==='POST')return json(res,200,await translateArticle(data.id,data.revision,user.email));
  if(action==='preview'&&kind==='articles'){
   const translations=Object.fromEntries(Object.entries(data.value?.translations||{}).map(([lang,value])=>[lang,{...value,status:'draft'}]));
   const article=await validateArticle({...data.value,translations},data.id);
   const row=await saveDocument('articlePreviews',null,{article,expiresAt:new Date(Date.now()+900000).toISOString()},0,user.email);
   return json(res,200,{url:await createArticlePreview(row.id,['vi','en','zh'].includes(data.locale)?data.locale:'vi','draft'),expiresIn:900});
  }
  if(action==='import'&&kind==='tariffs'){
   const imported=importTariffCsv(data?.csv),currency=data?.currency;
   const rows=imported.rows.map((row,i)=>{const amountMinor=moneyUnits(row.amount,currency),minimumMinor=moneyUnits(row.minimum,currency);if(amountMinor===null||minimumMinor===null)imported.errors.push({line:i+2,field:'amount',code:'invalid_currency_precision'});const {amount,minimum,...rest}=row;return{...rest,amountMinor,minimumMinor}});
   return json(res,200,{rows,errors:imported.errors});
  }
  if(!['POST','PUT','DELETE'].includes(req.method))fail('method',405);
  const id=data?.id||randomUUID(),previous=await getDocument(kind,id,{deleted:true});
  if(data.id&&!previous)fail('not_found',404);
  if(req.method==='DELETE'){if(!previous)fail('not_found',404);return json(res,200,{row:sanitize(kind,await saveDocument(kind,id,previous.value,data.revision,user.email,{deleted:true}))})}
  if(action==='restore'&&previous)return json(res,200,{row:sanitize(kind,await saveDocument(kind,id,previous.value,data.revision,user.email,{deleted:false}))});
  let value=data.value;
  if(action==='restore-version'){
   const old=(await documentHistory(kind,id)).find(row=>row.revision===data.restoreRevision);if(!old||kind==='staff')fail('invalid_version');value=old.value;
  }
  if(kind==='articles'){
   if(['save-draft','publish','hide'].includes(action)){
    const locale=['vi','en','zh'].includes(data.locale)?data.locale:'vi',translations=Object.fromEntries(Object.entries(value.translations||{}).map(([lang,v])=>[lang,{...v,status:action==='publish'&&lang===locale?'published':'draft'}]));
    const checked=await validateArticle({...value,translations},id),old=previous?.value.translations||{};
    value={...checked,translations:{...old}};
    for(const [lang,t]of Object.entries(checked.translations))if(!value.translations[lang])value.translations[lang]=t;
    const proposed=checked.translations[locale];if(!proposed)fail('missing_translation');
    if(action==='hide')value.translations[locale]={...(old[locale]||proposed),status:'hidden'};
    else if(action==='save-draft'&&['published','hidden'].includes(old[locale]?.status))value.translations[locale]={...old[locale],draft:proposed};
    else value.translations[locale]=proposed;
   }else value=await validateArticle(value,id);
  }
  if(kind==='channels')value=validateChannel(value);
  if(kind==='agents')value=validateAgent(value);
  if(kind==='services')value=validateService(value);
  if(kind==='tariffs'){
   const checked=validateTariff(value);if(checked.errors.length)fail('invalid_tariff',400,checked.errors);value=checked.value;await assertTariffActivation(value,id);
  }
  if(kind==='promotions')value=validatePromotion(value);
  if(kind==='workspace')value={widgetEnabled:value?.widgetEnabled===true,supportHours:{vi:shortText(value?.supportHours?.vi,300)||'',en:shortText(value?.supportHours?.en,300)||''},businessFactsApproved:value?.businessFactsApproved===true,defaultSales:shortText(value?.defaultSales,160)||'',reminderMinutes:Number.isInteger(value?.reminderMinutes)&&value.reminderMinutes>=5?Math.min(value.reminderMinutes,10080):60};
  if(kind==='staff'){
   const email=shortText(value?.email,160)?.toLowerCase();if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['editor','sales'].includes(value.role))fail('invalid_staff');
   if((await listDocuments('staff')).some(row=>row.id!==id&&row.value.email===email))fail('email_in_use',409);
   if(value.password!==undefined&&(typeof value.password!=='string'||value.password.length<12||value.password.length>256))fail('password_too_short');
   const passwordHash=value.password?await hashPassword(value.password):previous?.value.passwordHash;if(!passwordHash)fail('password_required');value={email,role:value.role,enabled:value.enabled===true,passwordHash,name:shortText(value.name,120)||''};
  }
  if(kind==='feedback'){if(!previous)fail('invalid_feedback');value={...previous.value,status:['new','in_progress','resolved'].includes(value?.status)?value.status:'new',notes:shortText(value?.notes,3000)||''}}
  const row=await saveDocument(kind,id,value,data.revision??0,user.email,{deleted:data.deleted===true});return json(res,previous?200:201,{row:sanitize(kind,row)});
 }catch(error){return json(res,error.status||503,{code:error.status?error.message:'service_unavailable',...(error.details?{details:error.details}:{})})}
}
