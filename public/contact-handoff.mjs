const handles=/^[a-zA-Z0-9._-]{1,100}$/;
const facebookHosts=new Set(['facebook.com','www.facebook.com','m.facebook.com','web.facebook.com']);
const instagramHosts=new Set(['instagram.com','www.instagram.com']);

/** Return a conversation link only when the provider documents that format. */
export function conversationUrl(channel){
 let u;try{u=new URL(channel.url)}catch{return null}
 if(u.username||u.password)return null;
 const host=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);
 if(['facebook','messenger'].includes(channel.kind)){
  if(u.protocol!=='https:')return null;
  const handle=host==='m.me'?parts[0]:facebookHosts.has(host)&&parts[0]==='profile.php'?u.searchParams.get('id'):facebookHosts.has(host)&&parts.length===1?parts[0]:null;
  if(!handle||!handles.test(handle)||['groups','share','sharer.php','watch','messages','login'].includes(handle))return null;
  return 'https://m.me/'+encodeURIComponent(handle);
 }
 if(channel.kind==='instagram'){
  if(u.protocol!=='https:')return null;
  const handle=host==='ig.me'&&parts[0]==='m'?parts[1]:instagramHosts.has(host)&&parts.length===1?parts[0]:null;
  return handle&&handles.test(handle)?'https://ig.me/m/'+encodeURIComponent(handle):null;
 }
 if(channel.kind==='whatsapp'){
  const number=host==='wa.me'?parts[0]:host==='api.whatsapp.com'&&u.pathname==='/send'?u.searchParams.get('phone'):null;
  return u.protocol==='https:'&&number&&/^[1-9]\d{5,14}$/.test(number)?'https://wa.me/'+number:null;
 }
 if(channel.kind==='zalo')return u.protocol==='https:'&&host==='zalo.me'&&parts.length===1&&/^[a-zA-Z0-9._-]+$/.test(parts[0])?u.origin+'/'+parts[0]:null;
 // TikTok must supply a verified provider-issued message link. A profile URL
 // cannot be relabelled as a conversation and is deliberately not accepted.
 if(channel.kind==='tiktok')return null;
 if(channel.kind==='email')return u.protocol==='mailto:'&&!u.search&&/^[^\s?]+@[^\s?]+$/.test(u.pathname)?'mailto:'+u.pathname:null;
 if(channel.kind==='phone')return u.protocol==='tel:'&&/^\+?[\d()-]+$/.test(u.pathname)?'tel:'+u.pathname:null;
 return null;
}

export function prepareHandoff(channel,message=''){
 const base=conversationUrl(channel);if(!base)return{url:null,prefilled:false,copyRequired:false};
 const content=String(message).trim().slice(0,4000),url=new URL(base);
 const prefilled=Boolean(content&&['whatsapp','email'].includes(channel.kind));
 if(prefilled)url.searchParams.set(channel.kind==='email'?'body':'text',content);
 return{url:url.href,prefilled,copyRequired:Boolean(content&&!prefilled&&channel.kind!=='phone')};
}
