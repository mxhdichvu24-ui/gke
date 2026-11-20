import {routeCarriers,carriers} from './data/carriers.mjs';
import {selectedRoute} from './data/selectedRoute.js';
import './ui/styles.css';
import './gke.css';
import {mountUI} from './ui/index.js';
import {store,bus} from './state/store.js';
import {defaultWarehouseSettings} from '../warehouse-settings.mjs';
import {db} from './data/db.js';
import {localizeWarehouse} from './translate.js';

const toolbar=document.querySelector('.gke-warehouse-toolbar');
const locale=document.documentElement.lang;
const routeLabel={en:'Destination',vi:'Tuyến vận chuyển',zh:'目的地'}[locale];
const routeControl=document.createElement('label');
routeControl.className='gke-route-selector';
routeControl.textContent=routeLabel+' ';
const select=document.createElement('select');
select.setAttribute('aria-label',routeLabel);
for(const route of ['US','UK']){
 const option=document.createElement('option');option.value=route;
 option.textContent=route==='US'?{en:'United States',vi:'Mỹ',zh:'美国'}[locale]:{en:'United Kingdom',vi:'Anh',zh:'英国'}[locale];
 select.append(option);
}
select.value=selectedRoute;
select.addEventListener('change',()=>{
 const url=new URL(location.href);url.searchParams.set('route',select.value);
 if(store.state.siteId)url.searchParams.set('site',store.state.siteId);
 location.assign(url.href);
});
routeControl.append(select);toolbar.insertBefore(routeControl,toolbar.querySelector('nav'));
const carrierList=document.createElement('span');carrierList.className='gke-route-carriers';
carrierList.textContent=routeCarriers[selectedRoute].map(key=>carriers[key].name).join(' · ');
routeControl.after(carrierList);
for(const link of toolbar.querySelectorAll('a[hreflang]')){
 const url=new URL(link.href);url.searchParams.set('route',selectedRoute);
 const site=new URLSearchParams(location.search).get('site');if(site)url.searchParams.set('site',site);
 link.href=url.href;
}
const layoutOnly=new URLSearchParams(location.search).get('view')==='layout';
if(layoutOnly)document.body.classList.add('gke-layout-only');
let published=structuredClone(defaultWarehouseSettings);
let lastVersion='';
let dataUnavailable=false;
function applyPublished(value){
 const supplied=value?.warehouse;
 published=supplied?.updatedAt?{...supplied,sites:defaultWarehouseSettings.sites.map(fallback=>supplied.sites.find(site=>site.id===fallback.id)||structuredClone(fallback))}:structuredClone(defaultWarehouseSettings);
 published.mode='manual';
 for(const saved of published.sites){
  const site=db.site(saved.id);if(!site)continue;
  Object.assign(site,{name:saved.name,address:saved.address,status:saved.status,stock:saved.stock,capacity:saved.capacity,inventory:saved.inventory,reported:saved,kind:'GKE'});
 }
 const note=toolbar.querySelector('span');
 note.textContent=published.updatedAt?({en:'Figures updated',vi:'Số liệu cập nhật',zh:'数据更新'}[locale])+' · '+new Date(published.updatedAt).toLocaleString(locale,{timeZone:'Asia/Ho_Chi_Minh'}):({en:'No operational figures entered',vi:'Chưa nhập số liệu vận hành',zh:'尚未录入运营数据'}[locale]);
 if(dataUnavailable)note.textContent=({en:'Unable to refresh figures',vi:'Chưa kết nối được dữ liệu mới',zh:'暂时无法刷新数据'}[locale]);
 lastVersion=JSON.stringify(published);bus.emit('data:update',{});
}
async function refreshPublished(){
 if(document.hidden)return;
 try{const response=await fetch('/api/site-settings',{signal:AbortSignal.timeout(7000),cache:'no-store'});if(!response.ok)throw new Error();const value=await response.json();const wasUnavailable=dataUnavailable;dataUnavailable=false;if(wasUnavailable||JSON.stringify(value.warehouse)!==lastVersion)applyPublished(value);}
 catch{dataUnavailable=true;const note=toolbar.querySelector('span');note.textContent=({en:'Unable to refresh figures',vi:'Chưa kết nối được dữ liệu mới',zh:'暂时无法刷新数据'}[locale]);}
}
db.reportedOnly=true;db.notifications.splice(0);Object.assign(db.user,{name:'GKE Logistics',role:'GKE 3D'});
document.body.classList.add('gke-reported-data');applyPublished({warehouse:published});
void refreshPublished();
const dataTimer=setInterval(refreshPublished,15000);
 const params=new URLSearchParams(location.search),site=params.get('site');
 if(site&&(site==='ALL'||db.site(site)))store.setSite(site);
mountUI(document.getElementById('ui'));
 document.getElementById('wt-topbar').append(toolbar);
 const loading=document.createElement('div');loading.className='gke-scene-loading';loading.setAttribute('role','status');
 loading.textContent=({en:'Loading GKE 3D…',vi:'Đang tải GKE 3D…',zh:'正在加载 GKE 3D…'}[locale]);
 document.getElementById('viewport').append(loading);
 const search=document.querySelector('.tb-search input');if(search){search.placeholder=({en:'Search GKE locations…',vi:'Tìm địa điểm GKE…',zh:'搜索 GKE 网点…'}[locale]);search.setAttribute('aria-label',search.placeholder);}
 const avatar=document.querySelector('.tb-user__avatar');if(avatar)avatar.innerHTML='<img src="/brand/icon.png" alt="GKE" style="width:32px;height:32px;object-fit:contain">';
 localizeWarehouse(document.getElementById('ui'));
 document.getElementById('simulation-toggle').hidden=true;
try {
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const [{createScene},{createWorld},{createInteraction},{createCameraDirector}]=await Promise.all([
  import('./three/scene.js'),import('./three/world.js'),import('./three/interaction.js'),import('./three/cameraDirector.js')
 ]);
 const app=createScene(document.getElementById('viewport'),{maxFps:layoutOnly?12:30});
 app.renderer.setPixelRatio(layoutOnly?1:Math.min(devicePixelRatio||1,1.5));
 if(layoutOnly)app.renderer.shadowMap.enabled=false;
 const world=createWorld(app);
 world.pickables.splice(0,world.pickables.length,...world.pickables.filter(object=>object.userData.ref?.type==='site'));
 const director=createCameraDirector(app,world);
 const interaction=createInteraction(app,world);
 app.onFrame((dt,elapsed)=>{interaction.update(dt,elapsed);director.update(dt,elapsed);});
 const visibility=()=>document.hidden?app.stop():app.start();document.addEventListener('visibilitychange',visibility);
 app.start();
 loading.remove();
 app.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();app.stop();document.getElementById('warehouse-fallback').hidden=false;});
 window.addEventListener('pagehide',()=>{clearInterval(dataTimer);app.stop();app.renderer.dispose();document.removeEventListener('visibilitychange',visibility);});
} catch {
 document.getElementById('app').hidden=true;
 document.getElementById('warehouse-fallback').hidden=false;
}
