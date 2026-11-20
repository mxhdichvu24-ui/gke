// Reports use stored enquiries only. Calendar boundaries follow GKE's Vietnam timezone.
export const localDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const daysAgo=(day,days)=>new Date(Date.parse(day+'T00:00:00Z')-days*86400000).toISOString().slice(0,10);
export function dashboardReport(all,params=new URLSearchParams(),now=new Date()){
 const today=localDay(now);
 const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'));
 const to=valid(params.get('to'))?params.get('to'):today;
 const from=valid(params.get('from'))?params.get('from'):daysAgo(to,29);
 const inRange=all.filter(row=>{const day=localDay(row.created_at);return day>=from&&day<=to;});
 const byDay=new Map(),byService=new Map();
 for(const row of inRange){const day=localDay(row.created_at);byDay.set(day,(byDay.get(day)||0)+1);const service=row.payload.service||row.payload.type||'unspecified';byService.set(service,(byService.get(service)||0)+1);}
 const days=[];
 for(let day=from;day<=to&&days.length<366;day=daysAgo(day,-1))days.push({day,count:byDay.get(day)||0});
 return {total:inRange.length,today:inRange.filter(row=>localDay(row.created_at)===today).length,pending:inRange.filter(row=>['received','contacted','qualified'].includes(row.status)).length,closed:inRange.filter(row=>row.status==='closed').length,recent:[...inRange].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,6),days,services:[...byService].map(([service,count])=>({service,count})),from,to,timeZone:'Asia/Ho_Chi_Minh'};
}
