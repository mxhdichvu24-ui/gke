// Preserve the customer's digits exactly, including leading zeroes.
export function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const phone=value.trim();
  return /^[0-9]{1,13}$/.test(phone) ? phone : null;
}
