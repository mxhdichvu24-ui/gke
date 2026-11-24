// Keep the invitation small and recurring; an explicit dismissal pauses it across page visits.
export const greetingTiming={first:5000,visible:14000,repeat:90000,snooze:600000};
const storageKey='gke:chat-greeting-next:v1';
export function createGreetingSchedule({show,hide,canShow,isEngaged=()=>false,storage,clock={now:()=>Date.now(),setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:id=>clearTimeout(id)}}){
 const read=()=>{try{const value=Number(storage?.getItem(storageKey));return Number.isFinite(value)&&value>0?value:0}catch{return 0}};
 const save=()=>{try{storage?.setItem(storageKey,String(nextAt))}catch{}};
 let nextAt=Math.max(clock.now()+greetingTiming.first,read()),hideAt=0,visible=false,timer=null,stopped=true;
 const schedule=delay=>{clock.clearTimeout(timer);if(!stopped)timer=clock.setTimeout(check,Math.max(1000,delay))};
 function remove(){if(visible){visible=false;hide()}}
 function check(){
  if(stopped)return;
  clock.clearTimeout(timer);
  const now=clock.now();
  if(visible&&(!canShow()||now>=hideAt&&!isEngaged()))remove();
  if(visible){schedule(hideAt-now);return}
  nextAt=Math.max(nextAt,read());
  if(now>=nextAt&&canShow()){
   visible=true;hideAt=now+greetingTiming.visible;nextAt=now+greetingTiming.repeat;save();show();schedule(greetingTiming.visible);return;
  }
  schedule(now>=nextAt?5000:nextAt-now);
 }
 return{
  start(){if(!stopped)return;stopped=false;schedule(Math.max(0,nextAt-clock.now()))},
  wake:check,
  snooze(){remove();nextAt=clock.now()+greetingTiming.snooze;save();schedule(greetingTiming.snooze)},
  stop(){stopped=true;clock.clearTimeout(timer);remove()}
 };
}

export function greetingMessage(pathname,locale='en'){
 const index=locale==='vi'?1:locale==='zh'?2:0;
 let message=['Hello! Where would you like to ship? GKE can help you choose a service.','Xin chào! Bạn muốn gửi hàng tới đâu? GKE có thể tư vấn dịch vụ phù hợp cho bạn.','您好！您想将货物寄往哪里？GKE 可以协助您选择合适的服务。'];
 if(/\/(tinh-cuoc|calculate-shipping)(?:\/|$)/.test(pathname))message=['Need help checking your parcel’s weight or dimensions? Ask GKE.','Bạn cần hỗ trợ kiểm tra cân nặng hoặc kích thước kiện hàng? Nhắn GKE nhé.','需要核对包裹重量或尺寸吗？欢迎咨询 GKE。'];
 else if(/\/(bao-gia|shipping-calculator)(?:\/|$)/.test(pathname))message=['Have a question about this shipment? Leave GKE a message.','Bạn cần tư vấn cho lô hàng này? Cứ để lại lời nhắn cho GKE nhé.','对这票货物有疑问吗？欢迎给 GKE 留言。'];
 else if(/\/(kien-thuc|resources)(?:\/|$)/.test(pathname))message=['Learning about shipping? Ask GKE how it applies to your shipment.','Bạn đang tìm hiểu cách gửi hàng? GKE có thể tư vấn thêm cho lô hàng của bạn.','正在了解运输流程吗？GKE 可以为您的货件提供进一步建议。'];
 else if(/\/(tra-cuu|tracking)(?:\/|$)/.test(pathname))message=['Need help tracking a shipment? Message GKE for guidance.','Bạn cần hỗ trợ tra cứu vận đơn? Nhắn GKE để được hướng dẫn nhé.','需要帮助查询货件吗？欢迎联系 GKE 获取指引。'];
 return message[index];
}
