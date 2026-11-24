import {previewFromToken} from './articles.mjs';
import {json,parseBody} from '../server/http.mjs';
import {session,sameOrigin,hasRole} from '../server/auth.mjs';
import {storeImage,imageBytes,imageIsPublic,previewImageAllowed} from '../server/media.mjs';
export default async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const user=await session(req),allowed=hasRole(user,'owner','editor');
  if(req.method==='GET'){
   const p=new URL(req.url,'http://local').searchParams,id=p.get('id'),preview=p.get('preview')?await previewFromToken(p.get('preview')):null;
   if(!allowed&&!await imageIsPublic(id)&&!await previewImageAllowed(id,preview))return json(res,404,{code:'not_found'});
   const image=await imageBytes(id);if(!image)return json(res,404,{code:'not_found'});
   res.writeHead(200,{'Content-Type':'image/webp','Cache-Control':'private, max-age=300','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Length':image.bytes.length});return res.end(image.bytes);
  }
  if(!allowed)return json(res,401,{code:'unauthorized'});
  if(req.method!=='POST'||!sameOrigin(req))return json(res,403,{code:'invalid_origin'});
  const {data,error}=await parseBody(req,4300000);if(error)return json(res,error,{code:'invalid_input'});
  if(typeof data?.base64!=='string'||data.base64.length>4200000||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.base64))return json(res,400,{code:'invalid_image'});
  const result=await storeImage(Buffer.from(data.base64,'base64'),data.filename,user.email);return json(res,201,result);
 }catch(error){return json(res,error.status||503,{code:error.status?error.message:'image_unavailable'})}
}
