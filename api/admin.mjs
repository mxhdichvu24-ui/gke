import {carriers} from '../src/warehouse/data/carriers.mjs';
import {noteRange,validateNote,listNotes,writeNote,archiveNote} from '../server/notes.mjs';
import {dashboardReport,localDay} from '../server/admin-report.mjs';
import {validateWarehouseSettings} from '../src/warehouse-settings.mjs';
import { randomBytes } from 'node:crypto';
import { json,parseBody } from '../server/http.mjs';
import { defaultSettings,validateSettings } from '../src/site-defaults.mjs';
import { storageReady,localMode,localTransaction,readSettings,saveSettings,listContacts,updateContact,contactVersion } from '../server/storage.mjs';
import { credentials,session,sameOrigin,hashPassword,authenticate,hasRole,setSession,clearSession,allowLogin,setupAllowed } from '../server/auth.mjs';

export function filterContacts(rows,params) {
  const q=(params.get('q')||'').trim().toLowerCase();
  const status=params.get('status')||'';
  const from=params.get('from')||''; const to=params.get('to')||'';
  return rows.filter(row=> {
    const p=row.payload;
    return (!q || [p.name,p.email,p.phone,p.message,row.reference].some(v=>String(v||'').toLowerCase().includes(q))) &&
      (!status||row.status===status) && (!params.get('service')||p.service===params.get('service')) && (!params.get('route')||p.route===params.get('route')) && (!params.get('carrier')||(params.get('carrier')==='unassigned'?!p.carrier:p.carrier===params.get('carrier'))) && (!from||localDay(row.created_at)>=from) && (!to||localDay(row.created_at)<=to);
  });
}
export function contactsCsv(rows) {
  const escape=value=> {let s=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return '\uFEFF'+[
    ['Reference','Received at (UTC)','Name','Phone','Email','Source','Destination','Service','Carrier','Status','Message','Notes','Packages (JSON)'],
    ...rows.map(({reference,created_at,payload:p,status,notes})=>[reference,created_at,p.name,p.phone,p.email,p.source,p.route,p.service,carriers[p.carrier]?.name||'',status,p.message,notes,JSON.stringify(p.packages||[])])
  ].map(row=>row.map(escape).join(',')).join('\r\n');
}
export default async function handler(req,res) {
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const params=new URL(req.url,'http://local').searchParams;
  const action=params.get('action')||'session';
  try {
    if(req.method!=='GET' && !sameOrigin(req)) return json(res,403,{code:'invalid_origin'});
    if(action==='session' && req.method==='GET') {
      const user=await session(req); const config=await credentials();
      return json(res,200,{user,configured:Boolean(config),setupAllowed:!config&&setupAllowed(req),storage:localMode()?'local':storageReady()?'supabase':'unconfigured'});
    }
    if(action==='setup' && req.method==='POST') {
      if(!setupAllowed(req)||await credentials()) return json(res,403,{code:'setup_disabled'});
      const {data,error}=await parseBody(req); if(error)return json(res,error,{code:'invalid_input'});
      if(typeof data?.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||data.email.length>160||typeof data.password!=='string'||data.password.length<12||data.password.length>256)
        return json(res,400,{code:'invalid_credentials'});
      const config={email:data.email.trim().toLowerCase(),passwordHash:await hashPassword(data.password),secret:randomBytes(48).toString('base64url')};
      const created=await localTransaction(state=>{if(state.admin)return false;state.admin=config;return true;});
      if(!created)return json(res,409,{code:'already_configured'});
      setSession(res,config);return json(res,201,{user:{email:config.email}});
    }
    if(action==='login' && req.method==='POST') {
      const config=await credentials();if(!config||!storageReady())return json(res,503,{code:'admin_unconfigured'});
      if(!await allowLogin(req,config))return json(res,429,{code:'rate_limited'});
      const {data,error}=await parseBody(req);if(error)return json(res,error,{code:'invalid_input'});
      const identity=await authenticate(data?.email,data?.password,config);
      if(!identity)return json(res,401,{code:'invalid_credentials'});
      setSession(res,config,identity);return json(res,200,{user:{email:identity.email,role:identity.role}});
    }
    if(action==='logout' && req.method==='POST'){clearSession(res);return json(res,200,{ok:true});}
    const user=await session(req);if(!user)return json(res,401,{code:'unauthorized'});
    if(!hasRole(user,'owner')&&(!['contacts','export','dashboard','changes','notes'].includes(action)||!hasRole(user,'sales')))return json(res,403,{code:'forbidden'});
    if(!storageReady())return json(res,503,{code:'storage_unavailable'});
    if(action==='changes'&&req.method==='GET')return json(res,200,{version:await contactVersion()});
    if(action==='notes') {
      if(req.method==='GET'){
        const range=noteRange(params.get('from'),params.get('to'));if(!range)return json(res,400,{code:'invalid_input'});
        return json(res,200,{rows:await listNotes(range)});
      }
      if(!['POST','PATCH','DELETE'].includes(req.method))return json(res,405,{code:'method'});
      const {data,error}=await parseBody(req);if(error)return json(res,error,{code:'invalid_input'});
      const validId=typeof data?.id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(data.id);
      if(req.method!=='POST'&&!validId)return json(res,400,{code:'invalid_input'});
      if(req.method==='DELETE'){const ok=await archiveNote(data.id,user.email);return json(res,ok?200:404,{ok});}
      const value=validateNote(data);if(!value)return json(res,400,{code:'invalid_input'});
      const row=await writeNote(req.method==='POST'?null:data.id,value,user.email);
      return json(res,row?(req.method==='POST'?201:200):404,row?{row}:{code:'not_found'});
    }
    if(action==='warehouse' && req.method==='GET') {
      const saved=await readSettings();
      return json(res,200,{value:saved.value.warehouse?.updatedAt?validateWarehouseSettings(saved.value.warehouse):defaultSettings.warehouse,revision:saved.revision});
    }
    if(action==='warehouse' && req.method==='PUT') {
      const {data,error}=await parseBody(req,65536);
      if(error)return json(res,error,{code:'invalid_input'});
      const warehouse=validateWarehouseSettings(data?.value);
      if(!warehouse || !Number.isSafeInteger(data.revision) || data.revision<0)return json(res,400,{code:'invalid_warehouse_data'});
      const saved=await readSettings();
      if(saved.revision!==data.revision)return json(res,409,{code:'conflict'});
      warehouse.updatedAt=new Date().toISOString();
      const result=await saveSettings({...saved.value,warehouse},data.revision,user.email);
      return json(res,result.code==='conflict'?409:200,result);
    }
    if(action==='settings' && req.method==='GET')return json(res,200,await readSettings());
    if(action==='settings' && req.method==='PUT') {
      const {data,error}=await parseBody(req,65536);if(error)return json(res,error,{code:'invalid_input'});
      const value=validateSettings(data?.value);
      if(!value||!Number.isSafeInteger(data.revision)||data.revision<0)return json(res,400,{code:'invalid_settings'});
      const result=await saveSettings(value,data.revision,user.email);
      return json(res,result.code==='conflict'?409:200,result);
    }
    if(action==='contacts' && req.method==='PATCH') {
      const {data,error}=await parseBody(req);if(error)return json(res,error,{code:'invalid_input'});
      if(!/^[a-f0-9-]{36}$/.test(data?.reference||'')||!['received','contacted','qualified','closed','spam'].includes(data.status)||typeof data.notes!=='string'||data.notes.length>3000)return json(res,400,{code:'invalid_input'});
      let row;
      try{row=await updateContact(data.reference,{status:data.status,notes:data.notes,...(data.carrier!==undefined?{carrier:data.carrier}:{})});}
      catch(error){if(error.message==='invalid_carrier')return json(res,400,{code:'invalid_input'});throw error;}
      return json(res,row?200:404,row?{ok:true}:{code:'not_found'});
    }
    if((action==='contacts'||action==='export'||action==='dashboard')&&req.method==='GET') {
      const all=await listContacts();
      if(action==='dashboard') {
        return json(res,200,{...dashboardReport(all,params),storage:localMode()?'local':'supabase'});
      }
      const from=params.get('from'),to=params.get('to');
      const validDate=value=>!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value);
      if(!validDate(from)||!validDate(to)||(from&&to&&from>to))return json(res,400,{code:'invalid_date_range'});
      const rows=filterContacts(all,params);
      if(action==='contacts') {
        const page=Math.max(1,Math.floor(Number(params.get('page'))||1));
        const scope=new URLSearchParams(params);scope.delete('status');
        const scoped=filterContacts(all,scope);
        const counts=Object.fromEntries(['received','contacted','qualified','closed','spam'].map(status=>[status,scoped.filter(row=>row.status===status).length]));
        return json(res,200,{rows:rows.slice((page-1)*25,page*25),total:rows.length,page,pages:Math.max(1,Math.ceil(rows.length/25)),counts,scopeTotal:scoped.length,...(scoped.length<=25?{scopeRows:scoped}:{}),services:[...new Set(all.map(row=>row.payload.service).filter(Boolean))]});
      }
      const format=params.get('format')||'csv';
      if(!['csv','json','xlsx','print'].includes(format))return json(res,400,{code:'invalid_format'});
      if(format==='xlsx'||format==='print'){
        const {contactsXlsx,contactsPrint}=await import('../server/contact-exports.mjs');
        res.writeHead(200,{'Content-Type':format==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'text/html; charset=utf-8','Content-Disposition':`${format==='print'?'inline':'attachment'}; filename="gke-contacts-${new Date().toISOString().slice(0,10)}.${format==='print'?'html':'xlsx'}"`,'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'"});
        return res.end(format==='xlsx'?contactsXlsx(rows,params.get('lang')==='vi'):contactsPrint(rows,params));
      }
      res.writeHead(200,{'Content-Type':format==='csv'?'text/csv; charset=utf-8':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="gke-contacts-${new Date().toISOString().slice(0,10)}.${format}"`,'Cache-Control':'no-store'});
      return res.end(format==='csv'?contactsCsv(rows):JSON.stringify(rows,null,2));
    }
    if(action==='defaults' && req.method==='GET')return json(res,200,defaultSettings);
    return json(res,405,{code:'method'});
  } catch {return json(res,503,{code:'service_unavailable'});}
}
