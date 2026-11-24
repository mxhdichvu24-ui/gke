import {conversationUrl} from '../public/contact-handoff.mjs';
import {fail,listDocuments} from './documents.mjs';
export const escapeHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function safeUrl(value,{image=false}={}){
 if(typeof value!=='string'||value.length>2000||/[\u0000-\u0020\u007f\\]/.test(value))return null;
 if(value.startsWith('/')&&!value.startsWith('//'))return value;
 try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;if(!image&&['mailto:','tel:'].includes(url.protocol))return value}catch{}return null;
}
export const shortText=(v,max=200)=>typeof v==='string'&&v.trim().length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)?v.trim():null;
export const pair=v=>({vi:shortText(v?.vi,1000)||'',en:shortText(v?.en,1000)||''});
function required(v,max,field){const result=shortText(v,max);if(!result)fail('invalid_field',400,{field});return result}
const slug=v=>typeof v==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)&&v.length<=120;
export async function validateArticle(value,id){
 if(!value||typeof value!=='object')fail('invalid_article');
 const clean={autoTranslate:value.autoTranslate===true,featured:value.featured===true,order:Number(value.order)||0,category:required(value.category||'guides',80,'category'),translations:{}};
 const others=await listDocuments('articles');
 for(const lang of ['vi','en','zh']){
  const v=value.translations?.[lang];if(!v)continue;
  if(!['draft','published','hidden'].includes(v.status))fail('invalid_status');
  const body=shortText(v.body,200000);if(body===null)fail('invalid_body');
  const t={title:shortText(v.title,180)||'',slug:shortText(v.slug,120)||'',excerpt:shortText(v.excerpt,600)||'',body,status:v.status,cover:v.cover?safeUrl(v.cover,{image:true}):'',alt:shortText(v.alt,200)||'',seoTitle:shortText(v.seoTitle,180)||'',seoDescription:shortText(v.seoDescription,320)||'',shareImage:v.shareImage?safeUrl(v.shareImage,{image:true}):'',publishedAt:v.publishedAt||null,machineTranslated:v.machineTranslated===true,translationSourceHash:/^[a-f0-9]{64}$/.test(v.translationSourceHash||'')?v.translationSourceHash:null};
  if(t.slug&&!slug(t.slug))fail('invalid_slug',400,{field:`${lang}.slug`});
  if(others.some(row=>row.id!==id&&row.value.translations?.[lang]?.slug===t.slug&&t.slug))fail('slug_in_use',409,{field:`${lang}.slug`});
  if(v.cover&&!t.cover||v.shareImage&&!t.shareImage)fail('invalid_image_url');
  if(v.status==='published'&&(!t.title||!t.slug||!t.body||!t.excerpt||!t.cover||!t.alt))fail('article_incomplete',400,{locale:lang});
  const old=others.find(row=>row.id===id)?.value.translations?.[lang];
  t.publishedAt=old?.publishedAt||(v.status==='published'?new Date().toISOString():null);t.updatedAt=v.status==='published'?new Date().toISOString():old?.updatedAt||old?.publishedAt||null;
  clean.translations[lang]=t;
 }
 if(!Object.keys(clean.translations).length)fail('missing_translation');return clean;
}
export function validateChannel(value){
 const kinds=['phone','email','whatsapp','messenger','facebook','instagram','zalo','tiktok','url'];if(!kinds.includes(value?.kind))fail('invalid_channel');
 const name=pair(value.name);if(!name.vi||!name.en)fail('missing_name');
 const mode=value.mode==='profile'?'profile':'chat';
 const url=mode==='chat'?conversationUrl(value):safeUrl(value.url);if(!url)fail('invalid_conversation_url',400,{field:'url'});
 if(value.kind==='phone'&&!/^tel:\+?[\d()-]+$/.test(url)||value.kind==='email'&&!/^mailto:[^?\s]+@[^?\s]+$/.test(url))fail('invalid_contact_url');
 return{kind:value.kind,name,url,mode,department:shortText(value.department,80)||'',agentIds:Array.isArray(value.agentIds)?value.agentIds.filter(id=>/^[a-f0-9-]{36}$/.test(id)).slice(0,20):[],groups:Array.isArray(value.groups)?value.groups.filter(g=>['vietnam_seller','international_seller','business','partner'].includes(g)):[],languages:Array.isArray(value.languages)?value.languages.filter(l=>['vi','en','zh'].includes(l)):['vi','en'],greeting:pair(value.greeting),hours:pair(value.hours),enabled:value.enabled===true,order:Number(value.order)||0};
}
export function validateAgent(v){
 const name=required(v?.name,120,'name'),photo=v.photo?safeUrl(v.photo,{image:true}):'';if(v.photo&&!photo)fail('invalid_image_url');
 return{name,photo,department:pair(v.department),languages:Array.isArray(v.languages)?v.languages.filter(l=>['vi','en','zh'].includes(l)):[],enabled:v.enabled===true,order:Number(v.order)||0};
}
export function validateService(v){if(!['US','UK'].includes(v?.route))fail('unsupported_route');return{route:v.route,code:required(v.code,60,'code'),name:pair(v.name),description:pair(v.description),conditions:pair(v.conditions),transit:pair(v.transit),transitApproved:v.transitApproved===true,enabled:v.enabled===true,order:Number(v.order)||0}}
function inline(raw){
 const expression=/!\[([^\]\n]*)\]\(([^)\s]+)\)|\[([^\]\n]+)\]\(([^)\s]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;let result='',end=0;
 for(const m of raw.matchAll(expression)){
  result+=escapeHtml(raw.slice(end,m.index));end=m.index+m[0].length;
  if(m[1]!==undefined){const url=safeUrl(m[2],{image:true});result+=url?`<img src="${escapeHtml(url)}" alt="${escapeHtml(m[1])}" loading="lazy" decoding="async">`:escapeHtml(m[0])}
  else if(m[3]){const url=safeUrl(m[4]);result+=url?`<a href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(m[3])}</a>`:escapeHtml(m[3])}
  else if(m[5])result+=`<code>${escapeHtml(m[5])}</code>`;
  else if(m[6])result+=`<strong>${escapeHtml(m[6])}</strong>`;
  else result+=`<em>${escapeHtml(m[7])}</em>`;
 }
 return result+escapeHtml(raw.slice(end));
}
export function renderMarkdown(body){
 const lines=String(body||'').replaceAll('\r','').split('\n'),html=[],toc=[];let list=null,paragraph=[],code=null,headingIndex=0;
 const flush=()=>{if(paragraph.length){html.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);paragraph=[]}if(list){html.push(`</${list}>`);list=null}};
 for(const line of lines){
  if(line.startsWith('```')){flush();if(code!==null){html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);code=null}else code=[];continue}
  if(code!==null){code.push(line);continue}
  if(!line.trim()){flush();continue}
  const heading=line.match(/^(#{1,4})\s+(.+)$/);if(heading){flush();const level=Math.max(2,heading[1].length),id=`section-${++headingIndex}`;toc.push({id,text:heading[2],level});html.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);continue}
  const item=line.match(/^(?:([-*])|\d+\.)\s+(.+)$/);if(item){if(paragraph.length)flush();const type=item[1]?'ul':'ol';if(list!==type){if(list)html.push(`</${list}>`);list=type;html.push(`<${type}>`)}html.push(`<li>${inline(item[2])}</li>`);continue}
  if(line.startsWith('> ')){flush();html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);continue}
  if(list)flush();paragraph.push(line);
 }
 if(code)html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);flush();return{html:html.join('\n'),toc};
}
export async function publicArticles(locale,{featured=false,q='',category='',page=1}={}){
 const rows=(await listDocuments('articles')).filter(row=>row.value.translations?.[locale]?.status==='published').map(row=>{const {draft,...published}=row.value.translations[locale];return{id:row.id,category:row.value.category,featured:row.value.featured,order:row.value.order,updatedAt:row.updated_at,...published}});
 let selected=rows.filter(row=>(!featured||row.featured)&&(!category||row.category===category)&&(!q||`${row.title} ${row.body}`.toLowerCase().includes(q.toLowerCase())));
 selected.sort(featured?(a,b)=>a.order-b.order:(a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt)));
 const total=selected.length;selected=featured?selected.slice(0,5):selected.slice((page-1)*10,page*10);return{rows:selected,total,pages:Math.max(1,Math.ceil(total/10)),page,categories:[...new Set(rows.map(r=>r.category))]};
}
