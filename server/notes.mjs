import {randomUUID} from 'node:crypto';
import {localMode,localTransaction,localReadState,supabase} from './storage.mjs';
export function noteRange(from,to){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||''))return null;
 const start=new Date(from+'T00:00:00+07:00'),end=new Date(to+'T00:00:00+07:00');
 const valid=value=>!Number.isNaN(value.getTime());
 if(!valid(start)||!valid(end)||end<start||end-start>62*86400000)return null;
 // Reject calendar dates that JavaScript would silently normalize (e.g. February 30).
 const day=value=>new Date(value.getTime()+7*3600000).toISOString().slice(0,10);
 if(day(start)!==from||day(end)!==to)return null;
 return {from:start.toISOString(),to:new Date(end.getTime()+86400000).toISOString()};
}
export function validateNote(value){
 if(typeof value?.due_at!=='string'||!noteRange(value.due_at.slice(0,10),value.due_at.slice(0,10)))return null;
 if(typeof value?.title!=='string'||!value.title.trim()||value.title.trim().length>160||typeof value.body!=='string'||value.body.length>4000||typeof value.due_at!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value.due_at)||Number.isNaN(Date.parse(value.due_at))||typeof value.done!=='boolean'||!['blue','green','amber','purple'].includes(value.color)||value.archived!==undefined&&typeof value.archived!=='boolean')return null;
 return {title:value.title.trim(),body:value.body,due_at:new Date(value.due_at).toISOString(),done:value.done,color:value.color,archived:value.archived||false};
}
export async function listNotes(range){
 if(localMode())return ((await localReadState()).notes||[]).filter(n=>!n.archived&&n.due_at>=range.from&&n.due_at<range.to).sort((a,b)=>a.due_at.localeCompare(b.due_at));
 const all=[];
 for(let offset=0;;offset+=1000){
  const rows=await supabase(`gke_admin_notes?archived=eq.false&due_at=gte.${encodeURIComponent(range.from)}&due_at=lt.${encodeURIComponent(range.to)}&order=due_at.asc,id.asc&limit=1000&offset=${offset}`);
  all.push(...rows);if(rows.length<1000)return all;
 }
}
export async function writeNote(id,value,actor){
 const now=new Date().toISOString();
 if(localMode())return localTransaction(state=>{
  state.notes??=[];
  if(id){const existing=state.notes.find(note=>note.id===id);if(!existing)return null;Object.assign(existing,value,{updated_at:now,updated_by:actor});return existing;}
  const row={...value,id:randomUUID(),created_at:now,updated_at:now,updated_by:actor};state.notes.push(row);return row;
 });
 const rows=await supabase(id?`gke_admin_notes?id=eq.${encodeURIComponent(id)}`:'gke_admin_notes',{method:id?'PATCH':'POST',body:{...value,updated_at:now,updated_by:actor},prefer:'return=representation'});
 return rows[0]||null;
}
export async function archiveNote(id,actor){
 if(localMode())return localTransaction(state=>{const note=state.notes?.find(n=>n.id===id);if(!note)return false;note.archived=true;note.updated_at=new Date().toISOString();note.updated_by=actor;return true;});
 const rows=await supabase(`gke_admin_notes?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{archived:true,updated_at:new Date().toISOString(),updated_by:actor},prefer:'return=representation'});return Boolean(rows.length);
}
