// Integer arithmetic throughout: kg -> grams, cm -> hundredths of a centimetre.
// GKE commercial rules must be supplied and approved before prices can be enabled.
export function decimalUnits(value, precision, maximum) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const input = String(value).trim().replace(',', '.');
  if (!new RegExp('^\\d{1,5}(?:\\.\\d{1,' + precision + '})?$').test(input)) return null;
  const [whole, fraction = ''] = input.split('.');
  const units = Number(whole + fraction.padEnd(precision, '0'));
  return Number.isSafeInteger(units) && units > 0 && units <= maximum ? units : null;
}
export function normalizeParcel(input) {
  const weightG = decimalUnits(input?.weight, 3, 1_000_000);
  const dimensions = ['length','width','height'].map(key => decimalUnits(input?.[key], 2, 100_000));
  const count = input?.count === undefined ? 1 : input.count;
  return weightG && dimensions.every(x => x !== null) && Number.isInteger(count) && count >= 1 && count <= 1000
    ? {weightG, dimensions, count} : null;
}
const ceilDiv = (n,d) => (n+d-1n)/d;
const roundUp = (n,d,step,minimum) => {
  const result = ceilDiv(n, d*BigInt(step))*BigInt(step);
  return result > BigInt(minimum) ? result : BigInt(minimum);
};
export function validateRules(r) {
  return Boolean(r && Number.isSafeInteger(r.divisor) && r.divisor > 0 && r.divisor <= 100_000 &&
    Number.isSafeInteger(r.incrementG) && r.incrementG > 0 && r.incrementG <= 1_000_000 &&
    Number.isSafeInteger(r.minimumG) && r.minimumG >= 0 && r.minimumG <= 1_000_000 &&
    Number.isSafeInteger(r.dimensionIncrementCentiCm) && r.dimensionIncrementCentiCm >= 0 && r.dimensionIncrementCentiCm <= 1000 &&
    ['per_package','aggregate'].includes(r.aggregation));
}
export function measurePackages(inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 12) throw new RangeError('invalid_packages');
  const parcels = inputs.map(normalizeParcel);
  if (parcels.some(p => !p)) throw new RangeError('invalid_package');
  const volume = parcels.reduce((n,p) => n + p.dimensions.reduce((v,d) => v*BigInt(d),1n)*BigInt(p.count),0n);
  return {actualKg:parcels.reduce((n,p) => n+p.weightG*p.count,0)/1000,
    volumeCm3:Number(volume)/1_000_000, volumeCentiCmCubed:volume.toString(),
    packageCount:parcels.reduce((n,p) => n+p.count,0)};
}
export function calculateWeights(inputs, rules) {
  if (!validateRules(rules)) throw new RangeError('invalid_rules');
  const measured = measurePackages(inputs);
  const divisor = BigInt(rules.divisor)*1000n;
  const parcels = inputs.map(normalizeParcel);
  let totalActual=0n, totalVolume=0n, totalBillableNumerator=0n, perPackageGrams=0n;
  const breakdown = parcels.map(p => {
    const dims = p.dimensions.map(d => rules.dimensionIncrementCentiCm
      ? Number(ceilDiv(BigInt(d),BigInt(rules.dimensionIncrementCentiCm)))*rules.dimensionIncrementCentiCm : d);
    const volume = dims.reduce((v,d) => v*BigInt(d),1n);
    const actual = BigInt(p.weightG)*divisor;
    const billing = volume > actual ? volume : actual;
    const rounded = roundUp(billing,divisor,rules.incrementG,rules.minimumG);
    totalActual += BigInt(p.weightG)*BigInt(p.count);
    totalVolume += volume*BigInt(p.count);
    totalBillableNumerator += billing*BigInt(p.count);
    perPackageGrams += rounded*BigInt(p.count);
    return {actualKg:p.weightG/1000,volumeKg:Number(volume)/Number(divisor)/1000,billableKg:Number(rounded)/1000,count:p.count,dimensionsCm:dims.map(x=>x/100)};
  });
  const billableG = rules.aggregation === 'per_package' ? perPackageGrams
    : roundUp(totalBillableNumerator,divisor,rules.incrementG,rules.minimumG);
  return {...measured, actualKg:Number(totalActual)/1000, volumeKg:Number(totalVolume)/Number(divisor)/1000,
    billableKg:Number(billableG)/1000, billableG:Number(billableG), breakdown, rules:{...rules}};
}
