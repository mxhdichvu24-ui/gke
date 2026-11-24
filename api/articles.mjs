import {createHmac,timingSafeEqual} from 'node:crypto';
import {articlePage,articleListPage} from '../server/article-pages.mjs';
import {session,credentials,hasRole} from '../server/auth.mjs';
import {json} from '../server/http.mjs';
export async function createArticlePreview(id,locale,kind='article'){const config=await credentials();if(!config)return null;const payload=Buffer.from(JSON.stringify({id,locale,kind,exp:Date.now()+900000})).toString('base64url'),sig=createHmac('sha256',config.secret).update(payload).digest('base64url');return`/api/articles?preview=${payload}.${sig}`}
export async function previewFromToken(token){try{if(typeof token!=='string'||token.length>2048)return null;const config=await credentials(),[data,sig]=token.split('.'),expected=createHmac('sha256',config.secret).update(data).digest();const supplied=Buffer.from(sig,'base64url');if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return null;const payload=JSON.parse(Buffer.from(data,'base64url'));return payload.exp>Date.now()?payload:null}catch{return null}}
export default async function handler(req,res){
 if(req.method!=='GET')return json(res,405,{code:'method'});
 try{
  const p=new URL(req.url,'http://local').searchParams;let locale=['vi','en','zh'].includes(p.get('lang'))?p.get('lang'):'en';
  const token=p.get('preview'),preview=token?await previewFromToken(token):null;
  if(token&&!preview)return json(res,404,{code:'not_found'});
  const user=p.get('id')?await session(req):null,canPreview=Boolean(preview||user&&hasRole(user,'owner','editor'));
  if(preview)locale=preview.locale;
  if(p.get('id')&&!canPreview)return json(res,401,{code:'unauthorized'});
  const page=preview||p.get('id')||p.get('slug')?await articlePage(locale,p.get('slug'),{canPreview,previewId:preview?.id||p.get('id'),previewKind:preview?.kind,previewToken:token}):await articleListPage(locale,p);
  if(!page){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex'});return res.end('<!doctype html><html><head><title>Not found | GKE</title></head><body><h1>404</h1><a href="/">GKE Logistics</a></body></html>')}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',...(canPreview||process.env.GKE_INDEXING!=='1'?{'X-Robots-Tag':'noindex, nofollow'}:{}),'Content-Security-Policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self'; base-uri 'none'; object-src 'none'"});res.end(page);
 }catch{return json(res,503,{code:'content_unavailable'})}
}
