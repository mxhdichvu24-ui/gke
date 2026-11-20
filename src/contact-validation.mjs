// Accept familiar formatting while keeping a single international phone value.
export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 40) return null;
  let phone=value.trim().replace(/[\s().-]/g,'');
  if (phone.startsWith('00')) phone='+'+phone.slice(2);
  if (/^84\d{9,10}$/.test(phone)) phone='+'+phone;
  if (/^0\d{9,10}$/.test(phone)) phone='+84'+phone.slice(1);
  if (/^\+840\d{9,10}$/.test(phone)) phone='+84'+phone.slice(4);
  return /^\+[1-9]\d{6,14}$/.test(phone) ? phone : null;
}
