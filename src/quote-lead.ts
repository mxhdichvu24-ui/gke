export {};
const form=document.querySelector<HTMLFormElement>('#quote-lead-form')!;
const status=document.querySelector('#quote-lead-status')!;
const lang=document.documentElement.lang;
const t=(en:string,vi:string,zh:string)=>lang==='vi'?vi:lang==='zh'?zh:en;
const route=form.elements.namedItem('route') as HTMLSelectElement;
const service=form.elements.namedItem('service') as HTMLSelectElement;
function filter(){for(const option of service.options){const allowed=!option.dataset.route||option.dataset.route===route.value;option.hidden=!allowed;option.disabled=!allowed;}if(service.selectedOptions[0]?.disabled)service.value='';}
try{const saved=JSON.parse(sessionStorage.getItem('gke:estimate')||'{}');for(const key of ['name','phone','weight','length','width','height','route'])if(saved[key]){const field=form.elements.namedItem(key) as HTMLInputElement;if(field)field.value=saved[key];}}catch{}
const params=new URLSearchParams(location.search);if(params.get('route'))route.value=params.get('route')!;if(params.get('service'))service.value=params.get('service')!;filter();route.addEventListener('change',filter);
let key='',previous='';
form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector('button')!;button.disabled=true;
 const data=Object.fromEntries(new FormData(form));
 const sizes=['weight','length','width','height'].map(key=>String(data[key]||'').trim());
 if(sizes.some(Boolean)&&!sizes.every(value=>/^\d+(?:[.,]\d+)?$/.test(value)&&Number(value.replace(',','.'))>0)){status.textContent=t('Enter all four package measurements, or leave them empty.','Nhập đủ bốn số đo kiện hàng, hoặc để trống nếu chưa có.','请填写完整的四项包裹数据，或全部留空。');button.disabled=false;return;}
 const payload={...data,consent:data.consent==='on',type:'parcel',locale:lang,packages:sizes.every(Boolean)?[{weight:data.weight,length:data.length,width:data.width,height:data.height,count:Number(data.count)}]:undefined};
 const serial=JSON.stringify(payload);if(previous!==serial){key=crypto.randomUUID();previous=serial;}
 status.textContent=t('Sending…','Đang gửi…','正在提交…');
 try{const response=await fetch('/api/quote-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,key})});const result=await response.json();if(!response.ok)throw new Error();status.textContent=t('Request received. Reference: ','Đã nhận yêu cầu. Mã: ','已收到申请，编号：')+result.reference;form.reset();filter();previous='';}
 catch{status.textContent=t('Please check the details and retry, or call GKE.','Vui lòng kiểm tra thông tin và gửi lại, hoặc gọi GKE.','请检查信息后重试，或致电 GKE。');}finally{button.disabled=false;}
});
