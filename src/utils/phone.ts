/**
 * Australian E.164 phone formatting — single source of truth.
 *
 * Extracted from server.ts so the exact production logic is unit-testable.
 * Rules:
 *  - Strips all non-digits.
 *  - "04xxxxxxxx" (10 digits, leading 0) -> "+614xxxxxxxx"
 *  - "4xxxxxxxx"/"5xxxxxxxx" (9 digits, no leading 0) -> "+614xxxxxxxx"
 *  - Anything already carrying a country code is passed through with a leading '+'.
 *  - Empty / falsy input returns '' (caller decides how to handle a missing number).
 */
export const toE164 = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '61' + cleaned.substring(1);
  } else if (cleaned.length === 9 && (cleaned.startsWith('4') || cleaned.startsWith('5'))) {
    cleaned = '61' + cleaned;
  }
  return '+' + cleaned;
};
