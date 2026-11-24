import test from 'node:test';import assert from 'node:assert/strict';import{mkdtemp,rm}from'node:fs/promises';import{join}from'node:path';import{tmpdir}from'node:os';import{randomBytes}from'node:crypto';
import admin from'../api/admin.mjs';import manage from'../api/manage.mjs';import media from'../api/media.mjs';import articles from'../api/articles.mjs';import publicContent from'../api/public-content.mjs';import{renderMarkdown}from'../server/content.mjs';import{optimizeImage}from'../server/media.mjs';
function call(handler,path,method='GET',body,cookie='',headers={}){return new Promise((resolve,reject)=>{const req={method,url:path,body,headers:{host:'localhost:4180',origin:'http://localhost:4180','content-type':'application/json','sec-fetch-site':'same-origin',cookie,...headers},socket:{remoteAddress:'127.0.0.1'}};const h={};const res={setHeader(k,v){h[k]=v},writeHead(status,values){this.status=status;Object.assign(h,values)},end(value){let data;try{data=JSON.parse(value)}catch{}resolve({status:this.status,headers:h,data,raw:value})}};Promise.resolve(handler(req,res)).catch(reject)})}

test('CMS saves drafts independently, publishes translations, protects previews and handles conflicts/trash',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'gke-publishing-'));process.env.GKE_LOCAL_DEV='1';process.env.GKE_LOCAL_DATA=join(directory,'data.json');
 try{
  const setup=await call(admin,'/api/admin?action=setup','POST',{email:'owner@example.test',password:randomBytes(24).toString('hex')});assert.equal(setup.status,201);const cookie=setup.headers['Set-Cookie'].split(';')[0];
  assert.equal((await call(manage,'/api/manage?kind=articles')).status,401);
  const sharp=(await import('sharp')).default,source=await sharp({create:{width:2400,height:1600,channels:3,background:'#167ab4'}}).png().toBuffer();
  const uploaded=await call(media,'/api/media','POST',{base64:source.toString('base64'),filename:'qa-only.png'},cookie);assert.equal(uploaded.status,201);assert.equal(uploaded.data.row.width,2048);assert.ok(uploaded.data.row.outputBytes>0);const image=uploaded.data.url;
  assert.equal((await call(media,image)).status,404);
  const draft={category:'guides',featured:true,order:0,translations:{vi:{title:'QA only article',slug:'qa-only-article',excerpt:'QA only description',body:'## Kiểm thử\nPrivate test body.',cover:image,alt:'Technical test fixture',status:'draft'},en:{title:'English draft',body:'Not published',slug:'english-only-draft',status:'draft'}}};
  const created=await call(manage,'/api/manage?kind=articles&action=save-draft','POST',{locale:'vi',value:draft,revision:0},cookie);assert.equal(created.status,201);let row=created.data.row;
  assert.equal((await call(articles,'/api/articles?lang=vi&slug=qa-only-article')).status,404);
  const preview=await call(manage,'/api/manage?kind=articles&action=preview','POST',{id:row.id,locale:'vi',value:draft},cookie);assert.equal(preview.status,200);const token=new URL(preview.data.url,'http://local').searchParams.get('preview');
  const rendered=await call(articles,preview.data.url);assert.equal(rendered.status,200);assert.match(rendered.raw,/noindex/);assert.match(rendered.raw,/Private test body/);assert.equal((await call(media,image+'&preview='+token)).status,200);assert.equal((await call(media,image+'&preview='+token+'tampered')).status,404);
  const published=await call(manage,'/api/manage?kind=articles&action=publish','POST',{id:row.id,locale:'vi',value:draft,revision:row.revision},cookie);assert.equal(published.status,200);row=published.data.row;
  const publicArticle=await call(articles,'/api/articles?lang=vi&slug=qa-only-article');assert.equal(publicArticle.status,200);assert.doesNotMatch(publicArticle.raw,/hreflang="en"/);assert.equal((await call(media,image)).headers['Content-Type'],'image/webp');
  const actualDate=row.value.translations.vi.updatedAt;
  const changed=structuredClone(draft);changed.translations.vi.body='Work in progress, still private';
  const saved=await call(manage,'/api/manage?kind=articles&action=save-draft','POST',{id:row.id,locale:'vi',value:changed,revision:row.revision},cookie);assert.equal(saved.status,200);row=saved.data.row;
  assert.equal(row.value.translations.vi.updatedAt,actualDate);assert.equal(row.value.translations.vi.draft.body,'Work in progress, still private');
  const content=await call(publicContent,'/api/public-content?kind=articles&lang=vi&featured=1');assert.equal(content.data.rows[0].body,'## Kiểm thử\nPrivate test body.');assert.equal(content.data.rows[0].draft,undefined);
  assert.equal((await call(manage,'/api/manage?kind=articles&action=publish','POST',{id:row.id,locale:'vi',value:changed,revision:1},cookie)).status,409);
  const deleted=await call(manage,'/api/manage?kind=articles','DELETE',{id:row.id,revision:row.revision},cookie);assert.equal(deleted.status,200);row=deleted.data.row;assert.equal((await call(articles,'/api/articles?lang=vi&slug=qa-only-article')).status,404);assert.equal((await call(media,image)).status,404);
  const restored=await call(manage,'/api/manage?kind=articles&action=restore','POST',{id:row.id,revision:row.revision},cookie);assert.equal(restored.status,200);assert.equal(restored.data.row.value.translations.vi.draft.body,'Work in progress, still private');
  const history=await call(manage,'/api/manage?kind=articles&action=history&id='+row.id,'GET',undefined,cookie);assert.equal(history.data.rows.length,5);
  assert.equal((await call(manage,'/api/manage?kind=articles','POST',{value:draft,revision:0},cookie,{'sec-fetch-site':'cross-site'})).status,403);
 }finally{await rm(directory,{recursive:true,force:true});delete process.env.GKE_LOCAL_DEV;delete process.env.GKE_LOCAL_DATA;}
});
test('image optimiser rejects non-images and preserves transparent logo pixels',async()=>{
 await assert.rejects(()=>optimizeImage(Buffer.from('<svg onload="alert(1)"/>')),/unsupported_image/);
 const sharp=(await import('sharp')).default,source=await sharp({create:{width:80,height:80,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();const out=await optimizeImage(source);const meta=await sharp(out.bytes).metadata();assert.equal(meta.width,80);assert.equal(meta.hasAlpha,true);assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);
});
test('article formatter never executes raw HTML, script URLs or event attributes',()=>{
 const result=renderMarkdown('<script>alert(1)</script>\n\n[click](javascript:alert)\n\n![x](data:image/svg+xml,test)\n\n**safe**').html;
 assert.doesNotMatch(result,/<script|href="javascript:|src="data:/);assert.match(result,/&lt;script&gt;/);assert.match(result,/<strong>safe<\/strong>/);
});
