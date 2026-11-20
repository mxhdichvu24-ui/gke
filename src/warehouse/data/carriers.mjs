export const carriers = {
  usps: {key:'usps', name:'USPS', fullName:'USPS', color:'#003b71'},
  uniuni: {key:'uniuni', name:'UniUni', fullName:'UniUni', color:'#f47721'},
  fedex: {key:'fedex', name:'FedEx', fullName:'FedEx', color:'#4d148c'},
  speedx: {key:'speedx', name:'SpeedX', fullName:'SpeedX', color:'#1849db'},
  evri: {key:'evri', name:'Evri', fullName:'Evri', color:'#007fc8'},
  royalmail: {key:'royalmail', name:'Royal Mail', fullName:'Royal Mail', color:'#d71920'},
};
export const routeCarriers = {
  US: ['usps','uniuni','fedex','speedx'],
  UK: ['evri','royalmail'],
};
export function carrierForRoute(key, route) {
  const legacy = {waretrack:'fedex', bluepeak:'usps', nordline:'uniuni', cargoviva:'evri'};
  const resolved = legacy[key] || key;
  const allowed = routeCarriers[route];
  if (allowed.includes(resolved)) return resolved;
  const position = ['fedex','usps','uniuni','evri','speedx','royalmail'].indexOf(resolved);
  return allowed[Math.max(0,position) % allowed.length];
}
