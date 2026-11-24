const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const labels={guides:['Shipping guides','Hướng dẫn gửi hàng','运输指南'],'shipping-cost':['Costs & dimensional weight','Cước & cân thể tích','运费与体积重量'],services:['Services','Dịch vụ','物流服务'],checklists:['Warehouse checklists','Checklist giao kho','入仓清单'],'case-studies':['Case studies','Ca vận chuyển','运输案例'],updates:['GKE updates','Hoạt động GKE','GKE 动态']};
export function newsHeading(locale,{allHref=''}={}){
 const i=locale==='vi'?1:locale==='zh'?2:0,t=(...a)=>a[i];
 return `<div class="gx-news-heading"><div><span class="gx-eyebrow">${t('INSIDE GKE','GÓC NHÌN TỪ GKE','GKE 视角')}</span><h2>${t('News & insights','Tin tức & Kiến thức','新闻与知识')}</h2><p>${t('Updates and practical logistics knowledge from GKE.','Cập nhật hoạt động và kiến thức logistics cùng GKE.','GKE 最新动态与物流实用知识。')}</p></div>${allHref?`<a class="gx-news-all" href="${escape(allHref)}">${t('View all articles','Xem tất cả bài viết','查看全部文章')} <span aria-hidden="true">→</span></a>`:''}</div>`;
}
export function newsCards(rows,{locale='vi',base='/vi/kien-thuc',headingTag='h3'}={}){
 if(!rows.length)return '';
 const i=locale==='vi'?1:locale==='zh'?2:0,t=(...a)=>a[i],tag=headingTag==='h2'?'h2':'h3';
 const url=row=>escape(base+'/'+row.slug),category=row=>escape(labels[row.category]?.[i]||row.category),date=row=>new Date(row.publishedAt).toLocaleDateString(locale==='vi'?'vi-VN':locale==='zh'?'zh-CN':'en-GB');
 const image=row=>`<img src="${escape(row.cover)}" alt="${escape(row.alt)}" width="800" height="600" loading="lazy" decoding="async">`;
 const meta=row=>`<div class="gx-news-meta"><span>${category(row)}</span><time datetime="${escape(row.publishedAt)}">${date(row)}</time></div>`;
 const [lead,...others]=rows;
 const compact=row=>`<article class="gx-news-small"><a href="${url(row)}"><div class="gx-news-thumb">${image(row)}</div><div class="gx-news-small-copy"><span class="gx-news-category">${category(row)}</span><${tag}>${escape(row.title)}</${tag}><time datetime="${escape(row.publishedAt)}">${date(row)}</time></div><span class="gx-news-arrow" aria-hidden="true">→</span></a></article>`;
 return `<div class="gx-news-layout${others.length?'':' is-single'}"><article class="gx-news-lead"><a href="${url(lead)}"><div class="gx-news-photo">${image(lead)}${lead.featured?`<span class="gx-news-badge">${t('Featured','Nổi bật','精选')}</span>`:''}</div><div class="gx-news-lead-copy">${meta(lead)}<${tag}>${escape(lead.title)}</${tag}><p>${escape(lead.excerpt)}</p><span class="gx-news-read">${t('Explore article','Khám phá bài viết','阅读文章')} <span aria-hidden="true">→</span></span></div></a></article>${others.length?`<div class="gx-news-list">${others.slice(0,4).map(compact).join('')}</div>`:''}</div>${others.length>4?`<div class="gx-news-more">${others.slice(4).map(compact).join('')}</div>`:''}`;
}
