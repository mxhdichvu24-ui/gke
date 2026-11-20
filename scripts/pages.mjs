import {dongAnhMapUrl,dongAnhAddress} from '../src/gke-locations.mjs';
import {quoteRequestPage} from './quote-page.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tracks,trackPortal} from '../src/catalog.mjs';
import {defaultSettings} from '../src/site-defaults.mjs';
export const paths={
 en:{home:'/',services:'/services',quote:'/shipping-calculator',warehouse:'/gke-3d',track:'/tracking',contact:'/contact'},
 vi:{home:'/vi',services:'/vi/dich-vu',quote:'/vi/bao-gia',warehouse:'/vi/gke-3d',track:'/vi/tra-cuu',contact:'/vi/lien-he'},
 zh:{home:'/zh',services:'/zh/services',quote:'/zh/shipping-calculator',warehouse:'/zh/gke-3d',track:'/zh/tracking',contact:'/zh/contact'}
};
const labels={en:{home:'Home',services:'Services',quote:'Request a quote',warehouse:'GKE 3D',track:'Track shipment',contact:'Contact'},vi:{home:'Trang chủ',services:'Dịch vụ',quote:'Yêu cầu báo giá',warehouse:'GKE 3D',track:'Tra cứu vận đơn',contact:'Liên hệ'},zh:{home:'首页',services:'物流服务',quote:'申请报价',warehouse:'GKE 3D',track:'运单查询',contact:'联系我们'}};
const source=readFileSync('content/landing.html','utf8');
const optimizedMedia=JSON.parse(readFileSync('content/optimized-media.json','utf8'));
function optimizeImages(html){
 return html.replace(/<img\b[^>]*>/g,tag=>{
  const original=tag.match(/\bsrc="([^"]+)"/)?.[1],media=optimizedMedia[original];
  if(media){tag=tag.replace(`src="${original}"`,`src="${media.src}"`);if(!/\bwidth=/.test(tag))tag=tag.replace('<img',`<img width="${media.width}" height="${media.height}"`);}
  const eager=original?.includes('1775110180_69ce082465d2c')||original?.includes('6a8ff001df543');
  if(!/\bloading=/.test(tag))tag=tag.replace('<img',`<img loading="${eager?'eager':'lazy'}"`);
  if(!/\bdecoding=/.test(tag))tag=tag.replace('<img','<img decoding="async"');
  if(original?.includes('1775110180_69ce082465d2c'))tag=tag.replace('<img','<img fetchpriority="high"');
  return tag;
 });
}
const maps={vi:JSON.parse(readFileSync('content/vi.json','utf8')),zh:JSON.parse(readFileSync('content/zh.json','utf8'))};
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const tr=(l,en,vi,zh)=>l==='vi'?vi:l==='zh'?zh:en;
const languageLinks=(l,page)=>Object.keys(paths).map(k=>`<a href="${paths[k][page]}" lang="${k}" hreflang="${k}" ${k===l?'aria-current="page"':''}>${{en:'EN',vi:'VI',zh:'中文'}[k]}</a>`).join('');
function translate(html,l){
 const map=maps[l];if(!map)return html;
 return html.split(/(<[^>]+>)/g).map(part=>{
  const t=s=>map[s.replaceAll('&amp;','&').trim().replace(/\s+/g,' ')];
  if(part.startsWith('<'))return part.replace(/\b(alt|placeholder|aria-label)="([^"]+)"/g,(all,key,v)=>t(v)?`${key}="${esc(t(v))}"`:all);
  const value=t(part);return value?part.replace(/^(\s*)[\s\S]*?(\s*)$/,(_,a,b)=>a+esc(value)+b):part;
 }).join('');
}
function header(l,page){return `<header class="header show"><div class="logo"><a href="${paths[l].home}"><img src="/original/images/upload/6a8ff001df543.png" alt="GKE Logistics"></a></div><button class="menu-toggle" id="menuToggle" aria-label="${tr(l,'Open menu','Mở menu','打开菜单')}" aria-controls="nav" aria-expanded="false"><span></span></button><nav class="nav" id="nav"><a href="${paths[l].home}">${labels[l].home}</a><a href="${paths[l].home}#about-us">${tr(l,'About Us','Giới thiệu','关于我们')}</a><a href="${paths[l].services}">${labels[l].services}</a><a href="${paths[l].warehouse}">${labels[l].warehouse}</a><a href="${paths[l].track}">${tr(l,'Track','Tra cứu','查询')}</a><a href="${paths[l].contact}">${labels[l].contact}</a><div class="mobile-lang gke-lang">${languageLinks(l,page)}</div></nav><div class="right"><div class="lang gke-lang">${languageLinks(l,page)}</div></div></header>`;}
function footer(l){
 let html=source.slice(source.indexOf('<footer class="footer">'),source.indexOf('</footer>')+9);
 html=html.replace('class="company-slogan"','class="company-slogan" data-site-content="heroDescription"').replace('alt="logo"','alt="GKE Logistics"');
 let route='US',index=0;
 html=html.replace(/<a href="#services" class="footer-service-(group|item)">([\s\S]*?)<\/a>/g,(_,kind,label)=>{
  if(kind==='group'){route=label.includes('UK')?'UK':'US';index=0;return `<a href="${paths[l].services}?route=${route}" class="footer-service-group">${label}</a>`;}
  const service=tracks[route][index++];return `<a href="${paths[l].quote}?route=${route}&amp;service=${service[0]}" class="footer-service-item">${label}</a>`;
 });
 html=html.replace('class="footer-map-link">\n                            Phuong Liet','class="footer-map-link" data-site-field="office">\n                            Phuong Liet');
 html=html.replace('class="facebook"','class="facebook" aria-label="Facebook"').replace('class="instagram"','class="instagram" aria-label="Instagram"').replace('class="tiktok"','class="tiktok" aria-label="TikTok"');
 html=html.replace('Hanoi Warehouse:', 'GKE Hoang Mai:').replace('HCM Warehouse:','GKE Ho Chi Minh:').replace('Da Nang Warehouse:','GKE Da Nang:');
 for(const [value,key]of [['cs2hangkelogistics@gmail.com','email'],['marketing.gkelogistics@gmail.com','marketingEmail']])html=html.replace(value,`<a class="footer-contact-value" data-site-field="${key}" href="mailto:${value}">${value}</a>`);
 let phones=0;html=html.replace(/0879 089 789/g,()=>`<a class="footer-contact-value" data-site-field="${phones++?'salesPhone':'phone'}" href="tel:+84879089789">0879 089 789</a>`);
 const insert=`<p><svg class="footer-address-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Zm0-9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg><strong>GKE Dong Anh:</strong><a class="footer-map-link" href="${dongAnhMapUrl}" target="_blank" rel="noopener noreferrer">${dongAnhAddress}</a></p>`;
 const addressEnd=html.indexOf('</div>',html.indexOf('GKE Da Nang:'));html=html.slice(0,addressEnd)+insert+html.slice(addressEnd);
 return translate(html,l);
}
function contactForm(l){const t=(a,b,c)=>tr(l,a,b,c);return `<section class="gke-contact-section" id="contact-us"><div class="container"><div class="gke-contact-heading"><span class="gke-eyebrow">GKE LOGISTICS</span><h2>${t('Let’s move your business forward.','Cùng đưa doanh nghiệp bạn vươn xa.','助力您的业务走向全球。')}</h2><p>${t('Tell us what you are shipping. Our team will help you find the right solution.','Chia sẻ nhu cầu gửi hàng. Đội ngũ GKE sẽ giúp bạn chọn giải pháp phù hợp.','告诉我们您的运输需求，GKE 团队将为您提供合适的物流方案。')}</p><div class="gke-contact-hotline"><span class="gke-contact-phone-icon" aria-hidden="true">☎</span><div><small>${t('Talk to our team','Liên hệ đội ngũ GKE','联系 GKE 团队')}</small><a data-site-field="phone" href="tel:+84879089789">${defaultSettings.phone}</a></div></div><div class="gke-contact-locations"><span>GKE Hoang Mai</span><span>GKE Dong Anh</span><span>GKE Ho Chi Minh</span><span>GKE Da Nang</span></div></div><form id="contact-form" class="gke-panel"><div class="gke-grid"><label>${t('Full name','Họ và tên','姓名')}<input name="name" required maxlength="160" autocomplete="name"></label><label>${t('Phone number','Số điện thoại','联系电话')}<input type="tel" name="phone" value="+84 " required maxlength="40" autocomplete="tel"></label><label>Email<input type="email" name="email" maxlength="200" autocomplete="email"></label><div class="gke-destination-field"><label for="contact-route">${t('Destination','Điểm đến','目的地')}</label><select id="contact-route" name="route"><option value="US">${t('United States','Hoa Kỳ','美国')}</option><option value="UK">${t('United Kingdom','Vương quốc Anh','英国')}</option></select></div></div><label>${t('Your shipping needs','Nhu cầu gửi hàng','运输需求')}<textarea name="message" rows="4" maxlength="4000"></textarea></label><label class="gke-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><label class="gke-consent"><input type="checkbox" name="consent" required>${t('I agree to GKE using my contact details to respond to this enquiry.','Tôi đồng ý để GKE sử dụng thông tin liên hệ để phản hồi yêu cầu này.','我同意 GKE 使用我的联系方式回复本次咨询。')}</label><button class="gke-primary" type="submit">${t('Send enquiry','Gửi yêu cầu','提交咨询')}</button><p role="status" id="contact-status"></p></form></div></section>`;}
function warehousePromo(l){const t=(a,b,c)=>tr(l,a,b,c);return `<section class="gke-warehouse-promo"><div class="container"><div><span class="gke-eyebrow">GKE · 3D</span><h2>${t('Explore the GKE network.','Khám phá hệ thống kho của GKE.','走进 GKE 仓库网络。')}</h2><p>${t('Explore Hoang Mai, Dong Anh, Ho Chi Minh City and Da Nang through an interactive 3D operations simulation.','Khám phá Hoàng Mai, Đông Anh, Hồ Chí Minh và Đà Nẵng qua mô phỏng vận hành kho 3D tương tác.','通过交互式 3D 运营模拟，探索黄梅、东英、胡志明市和岘港仓库。')}</p><a href="${paths[l].warehouse}" class="gke-primary">${t('Explore GKE 3D','Khám phá GKE 3D','探索 GKE 3D')} ↗</a><small>${t('GKE operations simulation','Mô phỏng quy trình vận hành','仓库运营模拟')}</small></div><a href="${paths[l].warehouse}" aria-label="${labels[l].warehouse}"><img src="/warehouse/overview.png" alt="GKE 3D" loading="lazy"></a></div></section>`;}
function options(l){return Object.entries(tracks).map(([route,rows])=>`<optgroup label="${route}">${rows.map(([id,name])=>`<option value="${id}" data-route="${route}">${esc(name)}</option>`).join('')}</optgroup>`).join('');}
function dimensions(l,count=false){const t=(a,b,c)=>tr(l,a,b,c);return [['weight',t('Actual weight','Cân thực','实际重量'),'kg'],['length',t('Length','Chiều dài','长'),'cm'],['width',t('Width','Chiều rộng','宽'),'cm'],['height',t('Height','Chiều cao','高'),'cm']].map(([key,label,unit])=>`<label>${label} (${unit})<input required type="text" name="${key}" inputmode="decimal" autocomplete="off"></label>`).join('')+(count?`<label>${t('Packages','Số kiện','件数')}<input required type="number" name="count" min="1" max="1000" step="1" value="1"></label>`:'');}
function quote(l){return quoteRequestPage(l,labels,paths,dimensions,options);}
function feature(l,page){const t=(a,b,c)=>tr(l,a,b,c);if(page==='quote')return quote(l);if(page==='contact')return `<main class="gke-page gke-contact-page"><h1>${labels[l].contact}</h1>${contactForm(l)}</main>`;
 if(page==='services')return `<main class="gke-page"><h1>${labels[l].services}</h1><p class="gke-lead">${t('Shipping from Vietnam to the United States and United Kingdom.','Vận chuyển từ Việt Nam đến Hoa Kỳ và Vương quốc Anh.','从越南发往美国和英国。')}</p><div class="gke-filters"><button class="gke-secondary" data-filter="ALL" aria-pressed="true">${t('All destinations','Tất cả tuyến','所有目的地')}</button><button class="gke-secondary" data-filter="US" aria-pressed="false">US</button><button class="gke-secondary" data-filter="UK" aria-pressed="false">UK</button></div>${Object.entries(tracks).map(([route,rows])=>`<section data-service-track="${route}"><h2>${route}</h2><div class="gke-service-grid">${rows.map(([id,name,days,en,vi])=>`<article class="gke-panel"><h3>${esc(name)}</h3><p>${days} ${t('business days (published time)','ngày làm việc (thời gian công bố)','个工作日（公布时效）')}</p><p>${esc(t(en,vi,en.replace('last mile','末端派送').replace('labels and scanning','面单与扫描')))}</p><a href="${paths[l].quote}?route=${route}&amp;service=${id}" class="gke-primary">${labels[l].quote}</a></article>`).join('')}</div></section>`).join('')}<script type="module" src="/src/services.ts"></script></main>`;
 return `<main class="gke-page"><h1>${labels[l].track}</h1><section class="gke-panel"><p>${t('Open GKE Track and enter the tracking number provided for your shipment.','Mở GKE Track và nhập mã vận đơn đã được cấp cho kiện hàng.','打开 GKE 运单查询门户，输入您的运单号。')}</p><a href="${trackPortal}" target="_blank" rel="noopener noreferrer" class="gke-primary">${t('Open GKE Track','Mở GKE Track','打开 GKE 运单查询')} ↗</a><p><a href="${paths[l].contact}">${labels[l].contact}</a></p></section></main>`;
}
function landing(l){let main=source.slice(source.indexOf('<main>'),source.indexOf('<footer class="footer">'));
 main=main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 main=main.replace(/(<h1 class="animate-show")/, '$1 data-site-content="heroTitle"').replace('class="banner-slogan animate-show"','class="banner-slogan animate-show" data-site-content="heroDescription"');
 main=main.replace('class="intro-highlight"','class="intro-highlight" data-site-content="introduction"');
 main=main.replace(/(<h3 class="about-subtitle about-subtitle--vision">[\s\S]*?<p class="about-highlight")/,'$1 data-site-content="vision"');
 main=main.replace('class="about-desc"','class="about-desc" data-site-content="mission"');
 main=main.replace(/(<h3 class="about-subtitle about-subtitle--service">[\s\S]*?<p class="about-highlight")/,'$1 data-site-content="philosophy"');
 for(const [value,key] of [['1-6H','processing'],['100,000+','monthlyOrders'],['24/7','support'],['300+','clients'],['API','integration']])main=main.replace(`<h4>${value}</h4>`,`<h4 data-site-stat="${key}">${value}</h4>`);
 main=main.replace('Measurable operational pansactions.','Measurable operational performance.').replace('Tailored solutions for each busiansactions.','Tailored solutions for each business.');
 main=translate(main,l).replace('Cost Estimation','Request a quote').replace('Ước tính chi phí','Yêu cầu báo giá').replace('Ước tính cước phí','Yêu cầu báo giá').replace('运费估算','申请报价');
 main=main.replace(/<div class="form-group-banner">\s*<label>[^<]+<\/label>\s*<input type="tel" id="phone"[^>]+>\s*<\/div>/,`<div class="form-group-banner"><label for="estimate-phone">${tr(l,'Phone number','Số điện thoại','联系电话')}</label><input type="tel" id="estimate-phone" value="+84 " autocomplete="tel" maxlength="40" placeholder="${tr(l,'Enter your phone number','Nhập số điện thoại','请输入联系电话')}"></div>`)
 .replace(/<button type="button" class="btn-calc" onclick="handleCalc\(\)">[\s\S]*?<\/button>/,`<button type="button" class="btn-calc" id="landing-estimate">${labels[l].quote}</button>`)
 .replace('<div class="price" aria-live="polite">$0.00</div>','')
 .replace(/<label>([^<]+)<\/label>\s*(<input type="number" id="(weight|length|width|height)")/g,(_,label,input,key)=>`<label for="${key}">${label} (${key==='weight'?'kg':'cm'})</label>${input}`)
 .replace(/type="number" id="(weight|length|width|height)"[^>]+/g,(_,key)=>`type="text" id="${key}" inputmode="decimal" autocomplete="off" placeholder="${key==='weight'?'0 kg':'0 cm'}"`)
 .replace(/href="https:\/\/gkelogistics.com\/contact"/g,`href="${paths[l].contact}"`)
 .replace('</main>',`${warehousePromo(l)}</main>`);
 main=main.replaceAll('https://gkelogistics.com/videos/upload/gke_intro.mp4','/original/videos/gke-intro.mp4').replace('<video autoplay loop muted playsinline controls>','<video preload="none" loop muted playsinline controls>');
 main=main.replace('<div class="estimate-footer">',`<div id="landing-estimate-result" role="status"></div><div class="estimate-footer">`);
 return main;
}
function warehouse(l){const t=(a,b,c)=>tr(l,a,b,c);return `<div id="app"><div id="viewport"></div><div id="ui"></div></div><div class="gke-warehouse-toolbar"><a href="${paths[l].home}">← ${labels[l].home}</a><span>${t('GKE operations simulation','Mô phỏng quy trình vận hành','仓库运营模拟')}</span><nav aria-label="Language">${languageLinks(l,'warehouse')}</nav><button id="simulation-toggle" type="button">${t('Pause','Tạm dừng','暂停')}</button></div><div id="warehouse-fallback" hidden><img src="/warehouse/overview.png" alt="GKE"><h1>${labels[l].warehouse}</h1><p>${t('Interactive 3D is unavailable on this device. Explore our four GKE locations below.','Thiết bị chưa hỗ trợ cảnh 3D. Xem bốn địa điểm GKE bên dưới.','此设备暂不支持交互式 3D，请查看下方四个 GKE 网点。')}</p><ul><li>GKE Hoang Mai · Hanoi</li><li>GKE Dong Anh · Hanoi</li><li>GKE Ho Chi Minh</li><li>GKE Da Nang</li></ul><a href="${paths[l].contact}">${labels[l].contact}</a></div><script type="module" src="/src/warehouse/main.js"></script>`;}
function document(l,page,env){
 const title=`${labels[l][page]} | GKE Logistics`;
 let head=source.slice(source.indexOf('<head>')+6,source.indexOf('</head>')).replace(/<title>[\s\S]*?<\/title>/,`<title>${title}</title>`).replaceAll('https://gkelogistics.com/images/default-share.jpg','/brand/logo-preview.png');
 head=head.replace(/<link[^>]+rel="(?:icon|shortcut icon|apple-touch-icon|manifest)"[^>]*>/g,'');
 head=head.replace(/<link\b[^>]*href="\/original\/(?:css\/frontend\/global_frontend\.css|swiper-bundle\.min\.css)"[^>]*>/g,'');
 head+='<link rel="icon" type="image/png" href="/brand/icon.png?v=2"><link rel="apple-touch-icon" href="/brand/icon.png?v=2">';
 head+=`<meta name="description" content="${esc(defaultSettings.content[l].heroDescription)}"><meta name="robots" content="${env.GKE_INDEXING==='1'?'index, follow':'noindex, nofollow'}">`;
 for(const lang of Object.keys(paths))head+=`<link vite-ignore rel="alternate" hreflang="${lang}" href="${env.SITE_URL||''}${paths[lang][page]}">`;
 if(env.SITE_URL)head+=`<link rel="canonical" href="${esc(new URL(paths[l][page],env.SITE_URL).href)}">`;
 if(page==='warehouse')return `<!doctype html><html lang="${l}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="robots" content="noindex"><link rel="icon" href="/brand/icon.png?v=2"></head><body data-locale="${l}" class="gke-warehouse-body">${warehouse(l)}</body></html>`;
 return optimizeImages(`<!doctype html><html lang="${l}"><head>${head}</head><body data-locale="${l}" data-quote-path="${paths[l].quote}">${header(l,page)}${page==='home'?landing(l):feature(l,page)}${footer(l)}<button id="scrollTopBtn" aria-label="${tr(l,'Scroll to top','Về đầu trang','返回顶部')}">↑</button><script type="module" src="/src/site.ts"></script></body></html>`);
}
function adminDocument(){return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>GKE Administration</title><link rel="icon" href="/brand/icon.png?v=2"></head><body><div id="admin-app"></div><script type="module" src="/src/admin.ts"></script></body></html>`;}
export function generatePages(env=process.env){const input={};for(const [l,pages]of Object.entries(paths))for(const [page,route]of Object.entries(pages)){const file=resolve(route==='/'?'index.html':route.slice(1)+'.html');mkdirSync(dirname(file),{recursive:true});writeFileSync(file,document(l,page,env));input[`${l}-${page}`]=file;}writeFileSync('admin.html',adminDocument());input.admin=resolve('admin.html');return input;}
