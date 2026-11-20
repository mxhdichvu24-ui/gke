import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {carrierForRoute,carriers,routeCarriers} from '../../data/carriers.mjs';
import {selectedRoute} from '../../data/selectedRoute.js';
const loader=new GLTFLoader();
const baseBrands=selectedRoute==='UK'?['evri','fedex']:['usps','uniuni','fedex'];
const templates=Object.fromEntries(await Promise.all(baseBrands.map(async brand=>{
 const [van,parcel]=await Promise.all(['van','parcel'].map(async kind=>{
  try{return (await loader.loadAsync('/gke3d/models/'+kind+'_'+brand+'.glb')).scene;}catch{return null;}
 }));return [brand,{van,parcel}];
})));
const logoPaths={usps:'usps-official.svg',uniuni:'uniuni-official.svg',fedex:'fedex-official.svg',speedx:'speedx-official.webp',evri:'evri-official.svg',royalmail:'royalmail.svg'};
const textures=new Map();
function logoTexture(image,brand,aspect,label=false){
 const key=brand+':'+aspect.toFixed(2)+':'+label;
 if(textures.has(key))return textures.get(key);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024/aspect);
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
 const margin=canvas.width*.035,areaHeight=label?canvas.height*.38:canvas.height-margin*2;
 if(image.naturalWidth){
  const scale=Math.min((canvas.width-margin*2)/image.naturalWidth,areaHeight/image.naturalHeight);
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  ctx.drawImage(image,(canvas.width-width)/2,(label?margin:(canvas.height-height)/2),width,height);
 }else{
  ctx.fillStyle=carriers[brand].color;ctx.font='bold 100px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(carriers[brand].name,512,canvas.height/2,950);
 }
 if(label){ctx.fillStyle='#222';ctx.textAlign='left';ctx.font='32px Arial';ctx.fillText('GKE · '+carriers[brand].name,40,canvas.height*.55);ctx.font='24px Arial';ctx.fillText('VISUALIZATION',40,canvas.height*.7);}
 const texture=new THREE.CanvasTexture(canvas);
 // GLTF UV coordinates already account for image orientation.
 texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 textures.set(key,texture);return texture;
}
function applyBrand(model,brand,image){
 model?.traverse(node=>{
  if(!node.isMesh)return;
  if(/decal|side_carrier_logo|shipping_label_texture/.test(node.name)){
   node.geometry.computeBoundingBox();const size=node.geometry.boundingBox.getSize(new THREE.Vector3());
   const aspect=Math.max(size.x,size.z)/Math.max(size.y,.01);
   node.material=new THREE.MeshBasicMaterial({map:logoTexture(image,brand,aspect,/shipping_label_texture/.test(node.name)),toneMapped:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
   node.castShadow=false;node.receiveShadow=false;
  }else if(/cargo_stripe|packing_tape/.test(node.name)){
   node.material=node.material.clone();node.material.color.set(carriers[brand].color);
  }else if((brand==='royalmail'||brand==='speedx')&&/cargo_body|cab_shell/.test(node.name)){
   node.material=node.material.clone();node.material.color.set(brand==='royalmail'?'#d71920':'#f7f9fc');
  }
 });
 return model;
}
export const carrierModels=Object.fromEntries(await Promise.all(routeCarriers[selectedRoute].map(async brand=>{
 const image=new Image();image.src='/gke3d/logos/'+logoPaths[brand];await image.decode().catch(()=>{});
 const template=templates[brand]||templates.fedex;
 return [brand,{van:applyBrand(template.van?.clone(true),brand,image),parcel:applyBrand(template.parcel?.clone(true),brand,image)}];
})));
export const carrierKeys=Object.fromEntries(['waretrack','bluepeak','nordline','cargoviva',...Object.keys(carriers)].map(key=>[key,carrierForRoute(key,selectedRoute)]));
