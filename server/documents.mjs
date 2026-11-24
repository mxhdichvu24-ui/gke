import {randomUUID} from 'node:crypto';
import {localMode,localTransaction,localReadState,supabase,storageReady} from './storage.mjs';
export class Problem extends Error{constructor(code,status=400,details){super(code);this.status=status;this.details=details}}
export const fail=(code,status=400,details)=>{throw new Problem(code,status,details)};
export async function listDocuments(kind,{deleted=false}={}){
 if(localMode()){const state=await localReadState();return Object.values(state.documents||{}).filter(d=>d.kind===kind&&(deleted||!d.deleted)).map(d=>structuredClone(d))}
 if(!storageReady())return[];
 const rows=[];for(let offset=0;;offset+=1000){const batch=await supabase(`gke_documents?kind=eq.${encodeURIComponent(kind)}${deleted?'':'&deleted=eq.false'}&order=updated_at.desc&limit=1000&offset=${offset}`);rows.push(...batch);if(batch.length<1000)return rows}
}
export async function getDocument(kind,id,{deleted=false}={}){return(await listDocuments(kind,{deleted})).find(row=>row.id===id)||null}
export async function saveDocument(kind,id,value,revision,actor,{deleted=false}={}){
 if(!Number.isSafeInteger(revision)||revision<0)fail('invalid_revision');
 id=id||randomUUID();if(!/^[a-f0-9-]{36}$/.test(id))fail('invalid_id');
 if(localMode())return localTransaction(state=>{
  state.documents||={};state.documentHistory||=[];const old=state.documents[id];
  if((old?.revision||0)!==revision||old&&old.kind!==kind)fail('conflict',409);
  const row={id,kind,value:structuredClone(value),revision:revision+1,deleted,created_at:old?.created_at||new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:actor};
  state.documents[id]=row;state.documentHistory.push({...structuredClone(row),previous:old?structuredClone(old):null});return structuredClone(row);
 });
 const result=await supabase('rpc/save_gke_document',{method:'POST',body:{document_kind:kind,document_id:id,new_value:value,expected_revision:revision,actor,is_deleted:deleted}});
 if(result?.code)fail(result.code,['conflict','duplicate','active_tariff_overlap'].includes(result.code)?409:400);return result;
}
export async function documentHistory(kind,id){
 if(localMode())return(await localReadState()).documentHistory?.filter(row=>row.kind===kind&&row.id===id).map(row=>structuredClone(row))||[];
 return supabase(`gke_document_history?document_id=eq.${encodeURIComponent(id)}&kind=eq.${encodeURIComponent(kind)}&order=revision.desc&limit=100`);
}
export async function recordEvent(value){
 const clean={event:value.event,channel:value.channel||null,department:value.department||null,locale:value.locale||'en',created_at:new Date().toISOString()};
 if(localMode())return localTransaction(state=>{state.events||=[];state.events.push(clean);if(state.events.length>20000)state.events.splice(0,state.events.length-20000);return true});
 await supabase('gke_events',{method:'POST',body:clean});return true;
}
export async function listEvents(){return localMode()?(await localReadState()).events||[]:supabase('gke_events?select=event,channel,department,locale,created_at&order=created_at.desc&limit=10000')}
