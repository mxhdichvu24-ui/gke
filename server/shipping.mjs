import { tracks } from '../src/catalog.mjs';
import { normalizeParcel, calculateWeights, measurePackages, decimalUnits } from './weights.mjs';
export { decimalUnits };
export function shipment(value) {
  if (!value || !['US','UK'].includes(value.route)) return null;
  if (value.service != null && value.service !== '' && !tracks[value.route].some(([id]) => id === value.service)) return null;
  const p = normalizeParcel(value);
  return p ? {route:value.route,service:value.service||null,weightG:p.weightG,dimensions:p.dimensions} : null;
}
export const demoRules = {divisor:5000,incrementG:500,minimumG:0,dimensionIncrementCentiCm:0,aggregation:'per_package'};
export function estimate(input, env=process.env) {
  const unit = shipment(input);
  if (!unit) return {http:400,body:{code:'invalid_shipment'}};
  const measurements = measurePackages([input]);
  if (unit.service === 'b2b') return {http:200,body:{status:'request_required',reason:'manual_service',measurements}};
  if (env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production' || env.GKE_DEMO_RATES !== '1')
    return {http:200,body:{status:'request_required',reason:'rates_unavailable',measurements}};
  const weights = calculateWeights([input],demoRules);
  const shipping = weights.billableG*100, handling=20_000;
  return {http:200,body:{status:'estimated',demo:true,currency:'VND',rateVersion:'demo-v1',...weights,
    services:tracks[unit.route].filter(([id]) => id !== 'b2b' && (!unit.service || unit.service === id))
      .map(([id,name,days]) => ({id,name,days,total:shipping+handling,charges:{shipping,handling}}))}};
}
