import {localMode,localTransaction} from './storage.mjs';
import {defaultSettings} from '../src/site-defaults.mjs';
import {tracks} from '../src/catalog.mjs';
import {randomUUID} from 'node:crypto';
export async function bootstrapPreview(){
 if(!localMode())return;
 await localTransaction(state=>{
  state.documents||={};const now=new Date().toISOString();
  const insert=(kind,value)=>{const id=randomUUID();state.documents[id]={id,kind,value,revision:1,deleted:false,created_at:now,updated_at:now,updated_by:'initial GKE configuration'}};
  if(!state.chatLinksInitialized){
   for(const [kind,name,url]of [['messenger','Messenger','https://m.me/gkelogistics.62'],['instagram','Instagram','https://ig.me/m/gkelogistics']]){if(!Object.values(state.documents).some(row=>row.kind==='channels'&&row.value.kind===kind))insert('channels',{kind,name:{vi:name,en:name},url,mode:'chat',department:'',agentIds:[],groups:[],languages:[],greeting:{vi:'',en:''},hours:{vi:'',en:''},enabled:true,order:kind==='messenger'?-2:-1});}
   state.chatLinksInitialized=true;
  }
  if(state.contentInitialized)return;
  insert('channels',{kind:'phone',name:{vi:'Điện thoại GKE',en:'GKE telephone'},url:'tel:'+defaultSettings.phone.replaceAll(' ',''),mode:'chat',department:'',agentIds:[],groups:[],languages:[],greeting:{vi:'',en:''},hours:{vi:'',en:''},enabled:true,order:0});
  insert('channels',{kind:'email',name:{vi:'Email chăm sóc khách hàng',en:'Customer support email'},url:'mailto:'+defaultSettings.email,mode:'chat',department:'',agentIds:[],groups:[],languages:[],greeting:{vi:'',en:''},hours:{vi:'',en:''},enabled:true,order:1});
  insert('workspace',{widgetEnabled:true,businessFactsApproved:false,supportHours:{vi:'',en:''},defaultSales:'',reminderMinutes:60});
  for(const [route,rows]of Object.entries(tracks))for(const [code,name,days,en,vi]of rows)insert('services',{route,code,name:{vi:name,en:name},description:{en,vi},conditions:{vi:'Điều kiện được xác nhận trong báo giá.',en:'Conditions are confirmed in the quotation.'},transit:{vi:days+' ngày làm việc',en:days+' business days'},transitApproved:false,enabled:true,order:rows.findIndex(r=>r[0]===code)});
  state.contentInitialized=true;
 });
}
