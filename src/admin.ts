import {channelSettings} from './admin-platform';
import {publishing} from './admin-publishing';
import {calendar,emailGuide} from './admin-organizer';
import {overview,enquiries,website,gke,searchContacts,invalidateContacts} from './admin-workspace';
import {adminText,type AdminLanguage} from './admin-i18n';
import {createLiveSync} from './admin-live.mjs';
import './admin.css';
const root=document.querySelector<HTMLElement>('#admin-app')!;
const esc=(v:unknown)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let language:AdminLanguage=localStorage.getItem('gke-admin-language')==='en'?'en':'vi';
const t=(text:string)=>adminText(language,text);
let currentSection=location.hash==='#articles'?'articles':'dashboard';
let role='owner',userEmail='';
const available=(key:string)=>role==='owner'||role==='editor'&&key==='articles'||role==='sales'&&['dashboard','contacts','calendar','mail'].includes(key);
let relocalizing=false;
const readCache=new Map<string,{value:any,at:number}>();
const pendingReads=new Map<string,Promise<any>>();
let cacheGeneration=0;
let sectionLoading=false,liveDirty=false;
const sections:Record<string,string>={dashboard:'Overview',contacts:'Customer enquiries',articles:'Articles',channels:'Contact management',settings:'Website content',warehouse:'GKE 3D data',calendar:'Calendar & notes',mail:'Email'};
const paths:Record<string,string>={calendar:'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 18h2',mail:'M3 5h18v14H3z M3 5l9 7 9-7',dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',contacts:'M21 11a8 8 0 0 1-8 8H5l-4 3V11a10 10 0 0 1 20 0Z M7 10h8 M7 14h5',settings:'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5',warehouse:'m3 8 9-5 9 5v10l-9 5-9-5V8Z m0 0 9 5 9-5 M12 13v10',external:'M14 3h7v7 M21 3l-11 11 M10 3H3v18h18v-7',logout:'M9 3H3v18h6 M13 7l5 5-5 5 M7 12h11',globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18'};
const icon=(name:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.settings}"/></svg>`;
const languageControl=()=>`<label class="admin-language">${icon('globe')}<span class="sr-only">${t('Language')}</span><select id="admin-language" aria-label="${t('Language')}"><option value="en" ${language==='en'?'selected':''}>English</option><option value="vi" ${language==='vi'?'selected':''}>Tiếng Việt</option></select></label>`;
const heading=(title:string,description:string)=>`<div class="admin-page-heading"><div><span class="admin-eyebrow">GKE LOGISTICS</span><h2>${t(title)}</h2><p>${t(description)}</p></div></div>`;
const errorText=(error:unknown)=>t(error instanceof Error?error.message:'Request failed');
const conflict='Another edit was saved. Reload this section before saving.';
const options=(values:string[],selected:string)=>values.map(value=>`<option value="${value}" ${value===selected?'selected':''}>${t(value)}</option>`).join('');
const locale=()=>language==='vi'?'vi-VN':'en-GB';
const date=(value:string)=>new Date(value).toLocaleString(locale());
async function request(action:string,method='GET',body?:unknown){
 const cached=readCache.get(action);
 if(method==='GET'&&action!=='changes'&&cached&&(relocalizing||Date.now()-cached.at<15000))return structuredClone(cached.value);
 if(method==='GET'&&pendingReads.has(action))return structuredClone(await pendingReads.get(action));
 const generation=cacheGeneration;
 const task=(async()=>{
  const r=await fetch('/api/admin?action='+action,{method,signal:AbortSignal.timeout(15000),headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok){if(r.status===401){readCache.clear();invalidateContacts();}throw new Error(data.code||'Request failed');}
  if(method==='GET'){if(action!=='changes'&&generation===cacheGeneration)readCache.set(action,{value:data,at:Date.now()});}else{cacheGeneration++;readCache.clear();pendingReads.clear();invalidateContacts();if(action==='warehouse')try{localStorage.setItem('gke:warehouse-change',crypto.randomUUID());}catch{}}
  return data;
 })();
 if(method==='GET')pendingReads.set(action,task);
 try{return structuredClone(await task);}finally{if(method==='GET'&&pendingReads.get(action)===task)pendingReads.delete(action);}
}
const context=(content:HTMLElement,status:Element)=>({content,status,language,userEmail,relocalizing,request,t,esc,icon,open:section});
async function refreshLiveData(){
 if(sectionLoading){liveDirty=true;return;}
 liveDirty=false;
 const content=root.querySelector<HTMLElement>('#admin-content'),status=root.querySelector('#admin-status');
 if(!content||!status)return;
 if(currentSection==='dashboard')await overview({...context(content,status),background:true});
 if(currentSection==='contacts'){invalidateContacts();await enquiries({...context(content,status),background:true});}
}
const liveSync=createLiveSync({
 readVersion:async()=>String((await request('changes')).version),
 onChange:async()=>{
  cacheGeneration++;pendingReads.clear();invalidateContacts();
  for(const key of readCache.keys())if(key.startsWith('contacts')||key.startsWith('dashboard'))readCache.delete(key);
  await refreshLiveData();
 },
 onStatus:(state:string)=>{
  const badge=root.querySelector<HTMLElement>('#admin-live');if(!badge)return;
  badge.dataset.state=state;badge.textContent=language==='vi'?(state==='live'?'Tự động cập nhật':'Đang kết nối lại…'):(state==='live'?'Live updates':'Reconnecting…');
 },
 isVisible:()=>!document.hidden
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)liveSync.wake();});
window.addEventListener('focus',()=>liveSync.wake());
window.addEventListener('online',()=>liveSync.wake());
window.addEventListener('storage',event=>{if(event.key==='gke:enquiry-change')liveSync.wake();});
window.addEventListener('pagehide',()=>liveSync.stop());
function bindLanguage(){
 root.querySelector<HTMLSelectElement>('#admin-language')!.addEventListener('change',async event=>{
  const controls=()=>Array.from(root.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('form input,form select,form textarea'));
  const draft=controls().map(field=>field.value);
  language=(event.currentTarget as HTMLSelectElement).value as AdminLanguage;
  localStorage.setItem('gke-admin-language',language);
  relocalizing=true;
  try{await boot();controls().forEach((field,index)=>{if(draft[index]!==undefined)field.value=draft[index];});}
  finally{relocalizing=false;}
 });
}
async function boot(){
 document.documentElement.lang=language;document.title=language==='vi'?'Quản trị GKE':'GKE Administration';
 try{
  const state=await request('session');
  if(!state.user){liveSync.stop();login(state);bindLanguage();return;}
  role=state.user.role||'owner';userEmail=state.user.email;if(!available(currentSection))currentSection=role==='editor'?'articles':'dashboard';
  root.innerHTML=`<aside class="admin-sidebar"><a class="admin-brand" href="/" aria-label="GKE Logistics"><img src="/media/509c6f2f6dca.webp" alt="GKE Logistics"></a><div class="admin-sidebar-title">${t('Workspace')}</div><nav aria-label="${t('Administration')}">${Object.entries(sections).filter(([key])=>available(key)).map(([key,title])=>`<button type="button" data-section="${key}">${icon(key)}<span>${t(title)}</span></button>`).join('')}</nav><div class="admin-sidebar-bottom"><a href="/gke-3d">${icon('warehouse')}${t('Open GKE 3D')}</a><a href="/">${icon('external')}${t('View website')}</a><button id="logout">${icon('logout')}${t('Sign out')}</button></div><small class="admin-sidebar-note">GKE Logistics · ${t('Administration')}</small></aside><main class="admin-main"><header class="admin-header"><div class="admin-breadcrumb">GKE <span>/</span> <strong id="admin-current-page">${t(sections[currentSection])}</strong></div><div class="admin-header-tools"><form id="admin-global-search"><label class="sr-only" for="admin-query">${t('Search')}</label><input id="admin-query" name="q" placeholder="${language==='vi'?'Tìm khách hàng…':'Search customers…'}" type="search"><button aria-label="${t('Search')}">${icon('contacts')}</button></form>${languageControl()}<div class="admin-account"><span class="admin-avatar">GK</span><span><strong>${esc(state.user.email)}</strong><small>${t('Administrator')}</small></span></div></div></header><div class="admin-content-wrap"><div id="admin-content"></div><p id="admin-status" role="status" aria-live="polite"></p></div></main>`;
  const liveBadge=document.createElement('small');liveBadge.id='admin-live';liveBadge.setAttribute('role','status');liveBadge.textContent=language==='vi'?'Đang đồng bộ…':'Syncing…';root.querySelector('.admin-breadcrumb')!.append(liveBadge);
  root.querySelector('#logout')!.addEventListener('click',async()=>{liveSync.stop();try{for(const key of Object.keys(sessionStorage))if(key.startsWith('gke:editor-draft:'))sessionStorage.removeItem(key)}catch{}await request('logout','POST');await boot();});
  root.querySelectorAll<HTMLButtonElement>('[data-section]').forEach(b=>b.addEventListener('click',()=>void section(b.dataset.section!)));
  root.querySelector<HTMLFormElement>('#admin-global-search')!.addEventListener('submit',event=>{event.preventDefault();searchContacts((root.querySelector('#admin-query') as HTMLInputElement).value);void section('contacts');});
  bindLanguage();await section(currentSection);if(role!=='editor'){liveSync.start();liveSync.wake()}else{liveSync.stop();root.querySelector('#admin-live')?.remove();root.querySelector('#admin-global-search')?.remove()}
 }catch(error){root.innerHTML=`<main class="admin-login"><h1>${t('Administration')}</h1><p>${esc(errorText(error))}</p><button id="retry">${t('Retry')}</button></main>`;root.querySelector('#retry')!.addEventListener('click',boot);}
}
function login(state:any){
 const setup=state.setupAllowed;
 root.innerHTML=`<div class="admin-login-layout"><section class="admin-login-intro"><img src="/brand/icon.png" alt="GKE"><span class="admin-eyebrow">GKE LOGISTICS</span><h2>${t('Welcome to GKE')}</h2><p>${t('Manage your operations in one place.')}</p><div class="admin-login-lines" aria-hidden="true"></div></section><main class="admin-login"><div class="admin-login-language">${languageControl()}</div><a class="admin-login-brand" href="/"><img src="/brand/admin-logo.png" alt="GKE Logistics"></a><span class="admin-eyebrow">${t('Administration')}</span><h1>${t(setup?'Set up your local administrator':'Administrator sign in')}</h1><p>${t(setup?'Create your administrator account for this local preview.':state.configured?'Enter your administrator account.':'Administrator credentials require server configuration.')}</p><form><label>${t(setup?'Email':'Username')}<input type="${setup?'email':'text'}" name="email" required autocomplete="username" maxlength="160"></label><label>${t('Password')}<input type="password" name="password" required minlength="${setup?'12':'6'}" maxlength="256" autocomplete="${setup?'new-password':'current-password'}"></label><button ${!state.configured&&!setup?'disabled':''}>${t(setup?'Create administrator':'Sign in')}</button><p role="status"></p></form><a class="admin-back" href="/">${t('Back to website')}</a></main></div>`;
 root.querySelector('form')!.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget as HTMLFormElement;const b=form.querySelector('button')!;b.disabled=true;
  try{await request(setup?'setup':'login','POST',Object.fromEntries(new FormData(form)));await boot();}catch(error){form.querySelector('[role=status]')!.textContent=errorText(error);b.disabled=false;}
 });
}
async function section(name:string){
 if(!available(name)||!sections[name])return;
 sectionLoading=true;
 currentSection=name;
 root.querySelector('#admin-current-page')!.textContent=t(sections[name]);
 root.querySelectorAll<HTMLElement>('[data-section]').forEach(button=>{const active=button.dataset.section===name;button.classList.toggle('is-active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 const previous=root.querySelector<HTMLElement>('#admin-content')!;const content=document.createElement('div');content.id='admin-content';content.innerHTML=`<div class="admin-loading" role="status">${language==='vi'?'Đang tải…':'Loading…'}</div>`;previous.replaceWith(content);const status=root.querySelector('#admin-status')!;status.textContent='';
 const views:Record<string,typeof overview>={dashboard:overview,contacts:enquiries,articles:publishing,channels:channelSettings,settings:website,warehouse:gke,calendar,mail:emailGuide};
 try{await views[name](context(content,status));}
 catch(error){status.textContent=errorText(error);}
 finally{if(content.isConnected){sectionLoading=false;if(liveDirty)void refreshLiveData().catch(()=>{});}}
}
void boot();

import '../public/scrollbars.css';
