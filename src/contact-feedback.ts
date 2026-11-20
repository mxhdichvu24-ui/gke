const messages:Record<string,[string,string,string]>={
 phone:['Enter a phone number with a country code, for example +84 879 089 789.','Nhập số điện thoại kèm mã quốc gia, ví dụ +84 879 089 789.','请输入带国家代码的电话号码，例如 +84 879 089 789。'],
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
 const copy=document.documentElement.lang==='vi'
  ?['Gửi yêu cầu thành công!','GKE đã nhận thông tin và sẽ sớm liên hệ tư vấn cho bạn.','Gửi yêu cầu khác']
  :document.documentElement.lang==='zh'
  ?['提交成功！','GKE 已收到您的信息，将尽快联系您提供咨询。','提交其他申请']
  :['Request sent successfully!','GKE has received your details. Our team will contact you soon.','Send another request'];
 const hidden=Array.from(form.children).filter(child=>child!==status).map(child=>({element:child as HTMLElement,wasHidden:(child as HTMLElement).hidden}));
 hidden.forEach(({element})=>{element.hidden=true;});
 status.classList.add('gke-form-success');status.setAttribute('tabindex','-1');
 status.innerHTML=`<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#11975b"/><path d="m13 24 8 8 15-16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><h2>${copy[0]}</h2><p>${copy[1]}</p><button type="button">${copy[2]}</button>`;
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
