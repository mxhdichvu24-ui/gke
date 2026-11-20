import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {carrierForRoute,carriers} from '../../data/carriers.mjs';
import {selectedRoute} from '../../data/selectedRoute.js';
const loader=new GLTFLoader();
const baseBrands=['usps','uniuni','evri','fedex'];
function crispLabels(model){
 model.traverse(node=>{
  if(!node.isMesh||!node.material?.map)return;
  const map=node.material.map;
  map.anisotropy=16;
  map.colorSpace=THREE.SRGBColorSpace;
  node.material=new THREE.MeshBasicMaterial({map,toneMapped:false,side:node.material.side,transparent:node.material.transparent});
 });
 return model;
}
export const carrierModels=Object.fromEntries(await Promise.all(baseBrands.map(async brand=>{
 const [van,parcel]=await Promise.all(['van','parcel'].map(async kind=>{
  try{return crispLabels((await loader.loadAsync('/gke3d/models/'+kind+'_'+brand+'.glb')).scene);}catch{return null;}
 }));return [brand,{van,parcel}];
})));
function logoTexture(image,brand,label=false){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=label?768:384;
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(image.naturalWidth){
  const width=800,height=Math.min(250,width*image.naturalHeight/image.naturalWidth);
  ctx.drawImage(image,112,45,width,height);
 }else{
  ctx.fillStyle=carriers[brand].color;ctx.font='bold 130px Arial';ctx.textAlign='center';ctx.fillText(carriers[brand].name,512,230);
 }
 if(label){
  ctx.fillStyle='#111';ctx.font='bold 32px Arial';ctx.fillText('GKE DEMO · '+carriers[brand].name,60,400);
  for(let i=0;i<110;i++){const x=60+i*8;ctx.fillRect(x,460,i%3===0?5:2,150);}
  ctx.font='24px Arial';ctx.fillText('SIMULATION LABEL',60,680);
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=16;return texture;
}
for(const brand of ['speedx','royalmail']){
 const image=new Image();image.src='/gke3d/logos/'+brand+(brand==='speedx'?'.webp':'.svg');await image.decode().catch(()=>{});
 const logo=logoTexture(image,brand),label=logoTexture(image,brand,true);
 const van=carrierModels.fedex.van?.clone(true),parcel=carrierModels.fedex.parcel?.clone(true);
 for(const [model,isParcel]of [[van,false],[parcel,true]]){
  model?.traverse(node=>{
   if(!node.isMesh)return;
   if(/decal|side_carrier_logo|shipping_label_texture/.test(node.name)){
    node.material=new THREE.MeshBasicMaterial({map:isParcel&&node.name==='shipping_label_texture'?label:logo,toneMapped:false});
   }else if(/cargo_stripe|packing_tape/.test(node.name)){
    node.material=node.material.clone();node.material.color.set(carriers[brand].color);
   }else if(brand==='royalmail'&&/cargo_body|cab_shell/.test(node.name)){
    node.material=node.material.clone();node.material.color.set('#d71920');
   }
  });
 }
 carrierModels[brand]={van,parcel};
}
export const carrierKeys=Object.fromEntries(['waretrack','bluepeak','nordline','cargoviva',...Object.keys(carriers)].map(key=>[key,carrierForRoute(key,selectedRoute)]));
