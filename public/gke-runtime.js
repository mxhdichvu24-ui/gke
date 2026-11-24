(()=>{
'use strict';
const locale=document.body.dataset.locale||document.documentElement.lang||'en',vi=locale==='vi',zh=locale==='zh',t=(a,b,c)=>vi?b:zh?(c||a):a;
const paths={home:vi?'/vi':zh?'/zh':'/',quote:vi?'/vi/bao-gia':zh?'/zh/shipping-calculator':'/shipping-calculator',resources:vi?'/vi/kien-thuc':zh?'/zh/resources':'/resources',contact:vi?'/vi/lien-he':zh?'/zh/contact':'/contact'};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=p=>p?.[locale]||p?.en||p?.vi||'';
const icon=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${({chat:'M21 11a8 8 0 0 1-8 8H5l-4 3V11a10 10 0 0 1 20 0Z M7 10h8 M7 14h5',phone:'M7 3 4 4c-4 8 8 20 16 16l1-3-5-3-2 2-6-6 2-2-3-5Z',email:'M3 5h18v14H3z M3 5l9 7 9-7',close:'M6 6l12 12 M6 18 18 6',previous:'m14 5-7 7 7 7',next:'m10 5 7 7-7 7',external:'M14 3h7v7 M21 3 11 13 M10 3H3v18h18v-7'})[kind]||'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c-4 5-4 13 0 18 4-5 4-13 0-18'}"/></svg>`;
function event(name,channel){void fetch('/api/public-content?kind=event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:name,channel:channel?.id,locale}),keepalive:true}).catch(()=>{})}
async function slider(){
 const host=document.querySelector('[data-featured-articles]');if(!host)return;
 try{
  const [response,{newsCards,newsHeading}]=await Promise.all([fetch(`/api/public-content?kind=articles&lang=${locale}&featured=1`),import('/news-layout.mjs')]);
  if(!response.ok)return;const {rows}=await response.json();if(!rows.length)return;
  host.classList.add('gx-featured');host.innerHTML=newsHeading(locale,{allHref:paths.resources})+newsCards(rows,{locale,base:paths.resources});host.hidden=false;
 }catch{}
}
function editorialNavigation(){
 const button=document.querySelector('.gx-nav-toggle'),nav=document.querySelector('#gx-primary-nav');if(!button||!nav)return;
 const close=()=>{button.setAttribute('aria-expanded','false');nav.classList.remove('is-open')};
 button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open)});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&button.getAttribute('aria-expanded')==='true'){close();button.focus()}});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))close()});
 window.addEventListener('resize',()=>{if(innerWidth>=1200)close()});
}
editorialNavigation();
function widget(config){void import('/contact-widget.mjs').then(({mountContactWidget})=>mountContactWidget(config,{locale,onEvent:event})).catch(()=>{});}
async function config(){try{const r=await fetch(`/api/public-content?lang=${locale}`);if(!r.ok)return;const value=await r.json();if(!value.businessFactsApproved)document.querySelectorAll('[data-site-stat]').forEach(n=>n.closest('.stat-item,.stat-box,.stat-card')?.setAttribute('hidden',''));widget(value)}catch{}}

try{const query=new URLSearchParams(location.search);if(!sessionStorage.getItem('gke:source')){const source={landingPath:location.pathname};for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const value=query.get(key);if(value&&value.length<=120&&!value.includes('@'))source[key]=value}sessionStorage.setItem('gke:source',JSON.stringify(source))}}catch{}
function enquiries(){
 document.querySelectorAll('[data-gke-enquiry]').forEach(form=>{
  const status=form.querySelector('.gx-enquiry-status'),button=form.querySelector('[type=submit]');let previous='',key='';
  let saved={};try{saved=JSON.parse(sessionStorage.getItem('gke:estimate')||'{}')}catch{}
  const query=new URLSearchParams(location.search),route=form.elements.namedItem('route');if(route)route.value=query.get('route')||saved.route||'';
  const service=form.elements.namedItem('service');if(service)service.value=query.get('service')||saved.service||'';
  const groups=saved.packages||([saved].filter(p=>p.weight));
  const initial=form.querySelector('.gx-parcel-fields');if(initial&&groups.length){groups.slice(0,12).forEach((p,i)=>{const row=i?initial.cloneNode(true):initial;if(i)initial.parentElement.append(row);for(const k of ['weight','length','width','height','count']){const input=row.querySelector(`[name="${k}"]`);if(input)input.value=p[k]||(k==='count'?'1':'')}});initial.closest('details').open=true}
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(button.disabled)return;form.querySelectorAll('[aria-invalid]').forEach(n=>n.removeAttribute('aria-invalid'));const values=Object.fromEntries(new FormData(form));
   const packages=[];for(const row of form.querySelectorAll('.gx-parcel-fields')){const parcel=Object.fromEntries([...row.querySelectorAll('input')].map(input=>[input.name,input.value.trim()]));if(['weight','length','width','height'].every(k=>!parcel[k]))continue;let invalid=null;for(const k of ['weight','length','width','height']){const value=String(parcel[k]||'').replace(',','.');if(!/^\d{1,5}(?:\.\d{1,3})?$/.test(value)||Number(value)<=0||Number(value)>1000)invalid=k;parcel[k]=value}if(invalid){row.querySelector(`[name="${invalid}"]`).setAttribute('aria-invalid','true');row.querySelector(`[name="${invalid}"]`).focus();status.textContent=t('Enter valid weight and all three dimensions, or leave all measurements blank.','Nhập cân nặng và đủ ba kích thước hợp lệ, hoặc để trống toàn bộ số đo.');return}parcel.count=Number(parcel.count||1);packages.push(parcel)}
   let source={};try{source=JSON.parse(sessionStorage.getItem('gke:source')||'{}')}catch{}
   const payload={...values,packages:packages.length?packages:undefined,type:form.dataset.gkeEnquiry==='partner'?'partner':'general',locale,consent:values.consent==='on',marketingConsent:values.marketingConsent==='on',sourceMeta:{...source,submittedPath:location.pathname}};
   if(JSON.stringify(payload)!==previous){previous=JSON.stringify(payload);key=crypto.randomUUID()}button.disabled=true;status.textContent=t('Saving your request…','Đang lưu yêu cầu…','正在保存您的请求…');
   try{const response=await fetch('/api/quote-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,key}),signal:AbortSignal.timeout(15000)}),data=await response.json();if(!response.ok||!data.reference){if(data.field){const input=form.elements.namedItem(data.field);input?.setAttribute('aria-invalid','true');input?.focus()}throw Error(response.status===429?'rate':data.field?'field':'save')}
    form.hidden=true;const success=el('section',undefined,'gx-request-success');success.innerHTML=`<span class="gx-eyebrow">GKE LOGISTICS</span><h2>${t('Your request is saved.','Đã lưu yêu cầu của bạn.','您的请求已保存。')}</h2><p>${t('GKE will review the details and contact you through the information you provided.','GKE sẽ xem thông tin và liên hệ qua đầu mối bạn đã cung cấp.','GKE 将审核信息并通过您提供的联系方式与您联系。')}</p><div><small>${t('Reference','Mã tham chiếu','参考编号')}</small><strong>${esc(data.reference)}</strong></div><button type="button" class="gx-button">${t('Send another request','Gửi yêu cầu khác','提交另一项请求')}</button>`;success.querySelector('button').addEventListener('click',()=>{success.remove();form.hidden=false;form.reset();previous='';status.textContent='';form.querySelector('input').focus()});form.after(success);success.tabIndex=-1;success.focus();
   }catch(error){status.textContent=error.message==='rate'?t('Please wait before sending another request.','Vui lòng chờ trước khi gửi thêm yêu cầu.'):error.message==='field'?t('Please check the highlighted field.','Vui lòng kiểm tra trường được đánh dấu.'):t('We could not confirm your request. Your details are preserved; please try again.','Chưa xác nhận được yêu cầu. Thông tin vẫn được giữ; bạn vui lòng thử lại.','无法确认您的请求。信息已保留，请重试。')}
   finally{button.disabled=false}
  });
 });
}
function estimators(){
 document.querySelectorAll('[data-estimator]').forEach(host=>{
  const form=host.querySelector('form'),list=form.querySelector('.gx-estimate-packages'),template=list.firstElementChild.cloneNode(true),status=form.querySelector('.gx-estimate-status'),result=host.querySelector('.gx-estimate-results'),submit=form.querySelector('[type=submit]'),route=form.elements.namedItem('route'),service=form.elements.namedItem('service');let revision=0,pending=false;
  let saved={};try{saved=JSON.parse(sessionStorage.getItem('gke:estimate')||'{}')}catch{}route.value=new URLSearchParams(location.search).get('route')||saved.route||'US';
  const packages=saved.packages||([saved].filter(p=>p.weight));packages.slice(0,12).forEach((p,i)=>{const row=i?template.cloneNode(true):list.firstElementChild;if(i)list.append(row);for(const key of ['weight','length','width','height','count'])if(p[key])row.querySelector(`[name="${key}"]`).value=p[key]});
  function renumber(){[...list.children].forEach((row,i)=>row.querySelector('legend').textContent=t('Package group ','Nhóm kiện ')+(i+1))}renumber();
  function input(){return{route:route.value,service:service.value,currency:form.elements.namedItem('currency').value||undefined,zip:form.elements.namedItem('zip').value.trim(),packages:[...list.children].map(row=>{const p=Object.fromEntries([...row.querySelectorAll('input')].map(n=>[n.name,n.value.trim().replace(',','.')]));p.count=Number(p.count);return p})}}
  function persist(){try{const v=input();sessionStorage.setItem('gke:estimate',JSON.stringify({...v,...v.packages[0]}))}catch{}}
  form.addEventListener('input',()=>{revision++;if(!result.hidden||pending)status.textContent=t('Inputs changed. Calculate again to update the result.','Số liệu đã đổi. Hãy tính lại để cập nhật kết quả.');result.hidden=true;result.replaceChildren();persist()});
  host.querySelector('.gx-add-package').addEventListener('click',()=>{if(list.children.length>=12)return;const row=template.cloneNode(true);row.querySelectorAll('input').forEach(n=>n.value=n.name==='count'?'1':'');const remove=el('button',t('Remove','Xóa'));remove.type='button';remove.addEventListener('click',()=>{row.remove();renumber();revision++;result.hidden=true;persist()});row.append(remove);list.append(row);renumber();row.querySelector('input').focus()});
  fetch(`/api/public-content?lang=${locale}`).then(r=>r.json()).then(config=>{for(const item of config.services||[]){const option=el('option',text(item.name));option.value=item.code;option.dataset.route=item.route;service.append(option)}const filter=()=>{[...service.options].forEach(o=>{o.disabled=Boolean(o.dataset.route&&o.dataset.route!==route.value);o.hidden=o.disabled});if(service.selectedOptions[0]?.disabled)service.value=''};route.addEventListener('change',filter);filter();const preferred=new URLSearchParams(location.search).get('service')||saved.service;if(preferred&&[...service.options].some(option=>option.value===preferred&&!option.disabled))service.value=preferred}).catch(()=>{});
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(pending)return;const payload=input(),version=++revision;pending=true;submit.disabled=true;result.hidden=true;result.replaceChildren();status.textContent=t('Calculating…','Đang tính cước…','正在计算…');persist();
   try{const response=await fetch('/api/shipping-estimates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)}),data=await response.json();if(!response.ok)throw Error();if(version!==revision)return;
    if(data.status==='needs_data'){status.textContent=data.field==='zip'?t('This tariff needs the destination ZIP or postcode.','Bảng cước này cần ZIP / mã bưu chính nơi nhận.'):t('Please choose a currency.','Vui lòng chọn tiền tệ.');form.elements.namedItem(data.field)?.focus();return}
    if(data.status!=='estimated'){status.textContent=data.status==='unsupported'?t('This shipment is outside the configured tariff. Ask GKE for an individual quote.','Lô hàng nằm ngoài phạm vi bảng cước. Bạn có thể yêu cầu GKE báo giá riêng.'):t('The confirmed GKE tariff is not available yet. You can request a formal quotation below.','Chưa có bảng cước GKE đã xác nhận. Bạn có thể yêu cầu báo giá chính thức bên dưới.');return}
    const money=new Intl.NumberFormat(vi?'vi-VN':'en-GB',{style:'currency',currency:data.currency}),format=n=>money.format(n/(data.minorScale||1));
    result.append(el('p',`${t('Actual','Cân thực')}: ${data.actualKg} kg · ${t('Volumetric','Cân thể tích')}: ${data.volumeKg.toFixed(3)} kg · ${t('Billable','Cân tính cước')}: ${data.billableKg} kg`));
    for(const price of data.services){const card=el('article',undefined,'gx-price-card');card.innerHTML=`<h2>${esc(text(price.name)||price.id)}</h2>${price.referenceTotal?`<del>${esc(format(price.referenceTotal))}</del>`:''}<strong>${esc(format(price.total))}</strong>${price.discount?`<p class="gx-discount">${esc(price.discount.name)} · ${price.discount.rateBps?price.discount.rateBps/100+'% ':''}${price.discount.basis==='shipping'?t('off shipping charges','giảm cước vận chuyển'):t('off the pre-tax subtotal','giảm tổng trước thuế')}</p>`:''}<dl><div><dt>${t('Shipping','Cước vận chuyển')}</dt><dd>${esc(format(price.charges.shipping))}</dd></div>${price.charges.fees.map(f=>`<div><dt>${esc(text(f.name)||f.code)}</dt><dd>${esc(format(f.amount))}</dd></div>`).join('')}<div><dt>${t('Tax','Thuế')}</dt><dd>${esc(format(price.charges.tax))}</dd></div>${price.discount?`<div><dt>${t('Discount','Ưu đãi')}</dt><dd>−${esc(format(price.discount.amount))}</dd></div>`:''}</dl><p>${esc(text(price.includes))}</p><p>${esc(text(price.excludes))}</p>`;result.append(card)}
    result.append(el('small',`${t('Tariff version','Phiên bản bảng cước')}: ${data.rateVersion} · ${t('Valid until','Hiệu lực đến')}: ${new Date(data.validUntil).toLocaleString(vi?'vi-VN':'en-GB')}`));result.hidden=false;status.textContent=t('Estimate updated.','Đã cập nhật cước ước tính.');
   }catch{if(version===revision)status.textContent=t('The estimate is temporarily unavailable. Your inputs are preserved. Please try again.','Tạm thời chưa tính được cước. Số liệu được giữ nguyên để bạn thử lại.','暂时无法计算费用。输入已保留，请重试。')}
   finally{pending=false;submit.disabled=false}
  });
 });
}
enquiries();estimators();

void slider();void config();
})();
