const messages:Record<string,[string,string,string]>={
 phone:['Enter a phone number using up to 13 digits.','Nhập số điện thoại chỉ gồm chữ số, tối đa 13 số.','请输入最多 13 位数字的电话号码。'],
 email:['Check the email address.','Kiểm tra lại địa chỉ email.','请检查电子邮箱地址。'],
 consent:['Please allow GKE to contact you about this request.','Vui lòng đồng ý để GKE liên hệ về yêu cầu này.','请同意 GKE 就本次申请与您联系。'],
 packages:['Check package measurements: up to 1,000 kg and 1,000 cm; weight has up to 3 decimal places, dimensions 2.','Kiểm tra số đo: tối đa 1.000 kg và 1.000 cm; cân nặng tối đa 3 số lẻ, kích thước 2 số lẻ.','请检查包裹数据：最多 1,000 千克和 1,000 厘米；重量保留最多 3 位小数，尺寸 2 位。'],
 rate_limited:['Too many requests. Please wait 15 minutes or call GKE.','Bạn đã gửi nhiều yêu cầu. Vui lòng chờ 15 phút hoặc gọi GKE.','申请次数过多，请等待 15 分钟或致电 GKE。'],
 invalid_input:['Check the highlighted details and try again.','Kiểm tra lại thông tin được đánh dấu rồi gửi lại.','请检查标记的信息后重试。'],
 invalid_origin:['Reopen this page on the GKE website and try again.','Mở lại trang này trên website GKE rồi gửi lại.','请在 GKE 网站重新打开此页面后重试。'],
 intake_unavailable:['Receipt could not be confirmed. Your details are still here; please retry or call GKE.','Chưa xác nhận tiếp nhận. Thông tin vẫn được giữ lại; hãy gửi lại hoặc gọi GKE.','暂时无法确认接收。您的信息已保留，请重试或致电 GKE。']
};
export function enquiryError(code:string,field?:string){
 const values=messages[field||'']||messages[code]||messages.intake_unavailable;
 return values[document.documentElement.lang==='vi'?1:document.documentElement.lang==='zh'?2:0];
}
export function notifyEnquiry(){
 // No customer details are shared between tabs.
 try{localStorage.setItem('gke:enquiry-change',crypto.randomUUID());}catch{}
}
export function showEnquiryError(form:HTMLFormElement,status:Element,error:any){
 status.textContent=enquiryError(error?.code||'intake_unavailable',error?.field);
 const fields=error?.field==='packages'?['weight','length','width','height','count']:[error?.field];
 for(const name of fields){if(!name)continue;const field=form.elements.namedItem(name) as HTMLElement|null;field?.setAttribute('aria-invalid','true');}
 const field=form.querySelector<HTMLElement>('[aria-invalid="true"]');field?.focus();
}
export function clearEnquiryErrors(form:HTMLFormElement){for(const field of form.querySelectorAll('[aria-invalid]'))field.removeAttribute('aria-invalid');}
export function showEnquirySuccess(form:HTMLFormElement,status:Element){
 const quote=form.id==='quote-lead-form';
 const vi=document.documentElement.lang==='vi',zh=document.documentElement.lang==='zh';
 const copy=document.documentElement.lang==='vi'
  ?['Gửi yêu cầu thành công!','GKE đã nhận thông tin và sẽ sớm liên hệ tư vấn cho bạn.','Gửi yêu cầu khác']
  :document.documentElement.lang==='zh'
  ?['提交成功！','GKE 已收到您的信息，将尽快联系您提供咨询。','提交其他申请']
  :['Request sent successfully!','GKE has received your details. Our team will contact you soon.','Send another request'];
 const hidden=Array.from(form.children).filter(child=>child!==status).map(child=>({element:child as HTMLElement,wasHidden:(child as HTMLElement).hidden}));
 hidden.forEach(({element})=>{element.hidden=true;});
 status.classList.add('gke-form-success');status.setAttribute('tabindex','-1');
 const check=`<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#11975b"/><path d="m13 24 8 8 15-16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
 const next=vi?[['Xem lại thông tin','Đội ngũ GKE tiếp nhận nhu cầu và thông tin kiện hàng.'],['Liên hệ tư vấn','GKE trao đổi phương án vận chuyển và xác nhận báo giá.']]:zh?[['查看申请','GKE 团队将查看您的运输需求和包裹信息。'],['联系并报价','我们将联系您，讨论运输方案并确认报价。']]:[['Review your request','Our team reviews your shipping needs and package details.'],['Discuss your quote','We contact you to discuss the shipping options and confirm a quote.']];
 status.innerHTML=quote?`<div class="quote-success-topline"><span class="quote-success-brand"><img src="/brand/gke-logo-transparent-navy.png" alt="GKE Logistics" width="2170" height="725"><small>${vi?'BÁO GIÁ':zh?'报价咨询':'QUOTATION'}</small></span><span class="quote-success-state"><i></i>${vi?'Đã tiếp nhận':zh?'已收到':'Received'}</span></div><div class="quote-success-content"><div class="quote-success-hero">${check}<div><span class="quote-success-eyebrow">${vi?'CẢM ƠN BẠN ĐÃ CHỌN GKE':zh?'感谢您选择 GKE':'THANK YOU FOR CHOOSING GKE'}</span><h2>${copy[0]}</h2><p>${copy[1]}</p></div></div><div class="quote-success-next"><span>${vi?'BƯỚC TIẾP THEO':zh?'接下来':'WHAT HAPPENS NEXT'}</span><ol>${next.map(([title,description],index)=>`<li><span>0${index+1}</span><div><h3>${title}</h3><p>${description}</p></div></li>`).join('')}</ol></div></div><div class="quote-success-footer"><span>${vi?'Bạn có lô hàng khác cần tư vấn?':zh?'还有其他货件需要咨询？':'Have another shipment in mind?'}</span><button type="button">${copy[2]} <span aria-hidden="true">→</span></button></div>`:`${check}<h2>${copy[0]}</h2><p>${copy[1]}</p><button type="button">${copy[2]}</button>`;
 status.querySelector('button')!.addEventListener('click',()=>{
  hidden.forEach(({element,wasHidden})=>{element.hidden=wasHidden;});status.classList.remove('gke-form-success');status.removeAttribute('tabindex');status.textContent='';form.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
 });
 const panel=status as HTMLElement;panel.focus({preventScroll:true});panel.scrollIntoView({block:'center',behavior:'smooth'});
}
export async function sendEnquiry(payload:unknown){
 const response=await fetch('/api/quote-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok)throw result;
 if(!result.reference)throw {code:'intake_unavailable'};
 notifyEnquiry();return result;
}
