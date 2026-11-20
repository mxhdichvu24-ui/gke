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
export async function sendEnquiry(payload:unknown){
 const response=await fetch('/api/quote-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok)throw result;
 if(!result.reference)throw {code:'intake_unavailable'};
 notifyEnquiry();return result;
}
