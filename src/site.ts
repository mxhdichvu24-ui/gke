import {enhanceDestinations} from './destination-picker';
import {defaultSettings} from './site-defaults.mjs';
import {sendEnquiry,showEnquiryError,clearEnquiryErrors} from './contact-feedback';
import {normalizePhone} from './contact-validation.mjs';
const locale = document.documentElement.lang;
const vi = locale === 'vi', zh = locale === 'zh';
const t = (en:string,vn:string,cn:string) => zh ? cn : vi ? vn : en;
const status = document.querySelector('#contact-status');
const contact = document.querySelector<HTMLFormElement>('#contact-form');
const money = new Intl.NumberFormat(zh?'zh-CN':vi?'vi-VN':'en-US',{style:'currency',currency:'VND',currencyDisplay:'code'});
const field = (key:string) => document.querySelector<HTMLInputElement>('#'+key)?.value || '';
const saveParcel = () => {
  const data = {weight:field('weight'),length:field('length'),width:field('width'),height:field('height'),route:field('landing-route')||'US',service:'',phone:field('estimate-phone')};
  try {sessionStorage.setItem('gke:estimate',JSON.stringify(data));} catch {}
  return data;
};
const calculator = document.querySelector<HTMLButtonElement>('#landing-estimate');
calculator?.addEventListener('click',()=>{saveParcel();location.href=document.body.dataset.quotePath!;});
for(const id of ['weight','length','width','height','landing-route'])document.getElementById(id)?.addEventListener('input',()=>{
  saveParcel();const output=document.querySelector('#landing-estimate-result');if(output)output.textContent='';
});
let payloadKey='', previous='';
contact?.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=contact.querySelector<HTMLButtonElement>('button[type=submit]')!;
  if(button.disabled)return;
  clearEnquiryErrors(contact);
  const data=Object.fromEntries(new FormData(contact));
  if(!normalizePhone(data.phone)){showEnquiryError(contact,status!,{field:'phone'});return;}
  const payload={...data,consent:data.consent==='on',locale};
  const serial=JSON.stringify(payload);
  if(serial!==previous)payloadKey=crypto.randomUUID();previous=serial;
  button.disabled=true;status!.textContent=t('Sending…','Đang gửi…','提交中…');
  try{
    const result=await sendEnquiry({...payload,key:payloadKey});
    status!.textContent=t('Enquiry received. Reference ','Đã nhận yêu cầu. Mã ','咨询已收到。参考编号 ')+result.reference;
    contact.reset();previous='';
  }catch(error){showEnquiryError(contact,status!,error);}
  finally{button.disabled=false;}
});
function applySettings(settings:typeof defaultSettings){
  const lang=['en','vi','zh'].includes(locale)?locale:'en';
  for(const node of document.querySelectorAll<HTMLElement>('[data-site-field]')){
    const key=node.dataset.siteField!;const value=settings[key as keyof typeof settings];
    if(typeof value!=='string')continue;node.textContent=value;
    if(node instanceof HTMLAnchorElement && key!=='office')node.href=key.toLowerCase().includes('email')?'mailto:'+value:'tel:'+value.replace(/[^\d+]/g,'');
  }
  for(const node of document.querySelectorAll<HTMLElement>('[data-site-content]')){
    const values=settings.content[lang as keyof typeof settings.content];node.textContent=values[node.dataset.siteContent as keyof typeof values]||'';
  }
  for(const node of document.querySelectorAll<HTMLElement>('[data-site-stat]'))node.textContent=settings.statistics[node.dataset.siteStat as keyof typeof settings.statistics];
}
fetch('/api/site-settings').then(r=>r.ok?r.json():defaultSettings).then(applySettings).catch(()=>applySettings(defaultSettings));
const menu=document.querySelector<HTMLButtonElement>('#menuToggle');menu?.addEventListener('click',()=>{
  const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.classList.toggle('active',open);document.querySelector('#nav')?.classList.toggle('show',open);
});
const scrollButton=document.querySelector<HTMLButtonElement>('#scrollTopBtn');scrollButton?.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
// Defer the introduction video until it is visible, then pause off screen.
const videoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
 const video=entry.target as HTMLVideoElement;
 if(entry.isIntersecting){void video.play().catch(()=>{});}else video.pause();
}),{threshold:0.15});
for(const video of document.querySelectorAll('video'))videoObserver.observe(video);
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('show','active');}));
for(const node of document.querySelectorAll('.animate-show'))observer.observe(node);
for(const tab of document.querySelectorAll<HTMLElement>('.group-item'))tab.addEventListener('click',()=>{
 for(const option of document.querySelectorAll('.group-item'))option.classList.toggle('active',option===tab);
 for(const group of document.querySelectorAll<HTMLElement>('.service-group-content'))group.classList.toggle('active',group.id==='group-'+tab.dataset.group);
});

document.querySelector<HTMLElement>('.group-item')?.click();

enhanceDestinations();

// Same-origin administrator preview only; draft text is never persisted here.
if(window.parent!==window && new URLSearchParams(location.search).get('admin-preview')==='1'){
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='GKE_ADMIN_PREVIEW')return;
  const value=event.data.settings;if(!value?.content?.[locale]||!value.statistics)return;
  applySettings(value);
  const target=event.data.section==='about'?'#about-us':event.data.section==='statistics'?'[data-site-stat]':null;
  if(target)document.querySelector(target)?.scrollIntoView({block:'center'});
 });
}
import '../public/original/css/frontend/global_frontend.css';
import '../public/original/swiper-bundle.min.css';
import '../public/site.css';
