import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {localMode} from './storage.mjs';
import {getDocument,listDocuments,saveDocument,fail} from './documents.mjs';

const idPattern=/^[a-f0-9-]{36}$/;
const mediaPath=id=>resolve(dirname(process.env.GKE_LOCAL_DATA||'.gke-local/data.json'),'media',id+'.webp');
export async function optimizeImage(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length>3*1024*1024||bytes.length<12)fail('image_size_limit',413);
 const signature=bytes.subarray(0,12);if(!(signature[0]===255&&signature[1]===216||signature.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||signature.toString('ascii',0,4)==='RIFF'&&signature.toString('ascii',8,12)==='WEBP'||bytes.toString('ascii',4,8)==='ftyp'))fail('unsupported_image');
 const sharp=(await import('sharp')).default;
 try{
  const image=sharp(bytes,{limitInputPixels:40000000,failOn:'warning',animated:false});
  const meta=await image.metadata();
  if(!['jpeg','png','webp','avif'].includes(meta.format)||!meta.width||!meta.height||meta.pages>1)fail('unsupported_image');
  const {data,info}=await image.rotate().resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality:86,alphaQuality:100,lossless:meta.hasAlpha===true,effort:4}).toBuffer({resolveWithObject:true});
  if(data.length>3*1024*1024)fail('image_size_limit',413);
  return{bytes:data,width:info.width,height:info.height,mime:'image/webp',inputBytes:bytes.length,outputBytes:data.length,hash:createHash('sha256').update(data).digest('hex')};
 }catch(error){if(error.status)throw error;fail('invalid_image',400)}
}
async function storage(path,options={}){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)fail('storage_unconfigured',503);
 const headers={apikey:process.env.SUPABASE_SECRET_KEY,...options.headers};if(!process.env.SUPABASE_SECRET_KEY.startsWith('sb_secret_'))headers.Authorization='Bearer '+process.env.SUPABASE_SECRET_KEY;
 const response=await fetch(process.env.SUPABASE_URL+'/storage/v1/'+path,{...options,headers,signal:AbortSignal.timeout(15000)});
 if(!response.ok)fail('storage_unavailable',503);return response;
}
export async function storeImage(bytes,filename,actor){
 const image=await optimizeImage(bytes),id=randomUUID();
 if(localMode()){await mkdir(dirname(mediaPath(id)),{recursive:true,mode:0o700});await writeFile(mediaPath(id),image.bytes,{flag:'wx',mode:0o600})}
 else await storage('object/gke-media/'+id+'.webp',{method:'POST',body:image.bytes,headers:{'Content-Type':'image/webp','x-upsert':'false'}});
 const {bytes:unused,...value}=image;
 const row=await saveDocument('media',id,{...value,filename:String(filename||'image').slice(0,200)},0,actor);
 return{row:{id:row.id,revision:row.revision,...row.value},url:'/api/media?id='+id};
}
export async function imageBytes(id){if(!idPattern.test(id))return null;const row=await getDocument('media',id);if(!row)return null;try{return{row,bytes:localMode()?await readFile(mediaPath(id)):Buffer.from(await(await storage('object/gke-media/'+id+'.webp')).arrayBuffer())}}catch{return null}}
export async function imageIsPublic(id){
 if(!idPattern.test(id))return false;const path='/api/media?id='+id;
 const articles=await listDocuments('articles');
 if(articles.some(row=>Object.values(row.value.translations||{}).some(v=>v.status==='published'&&(v.cover===path||v.shareImage===path||v.body?.includes('('+path+')')))))return true;
 return(await listDocuments('agents')).some(row=>row.value.enabled&&row.value.photo===path);
}

export async function previewImageAllowed(id,preview){if(!preview||preview.kind!=='draft')return false;const row=await getDocument('articlePreviews',preview.id);if(!row||Date.parse(row.value.expiresAt)<=Date.now())return false;const tr=row.value.article.translations?.[preview.locale],path='/api/media?id='+id;return Boolean(tr&&(tr.cover===path||tr.shareImage===path||tr.body?.includes('('+path+')')));}
