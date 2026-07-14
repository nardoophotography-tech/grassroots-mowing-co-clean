/**
 * Shared money + GST utilities — the SINGLE source of truth for GST across the app.
 *
 * Do not add separate GST formulas in components. Import GST_RATE / computeGst /
 * deriveGstFromInclusive / formatAUD from here so every screen, document, email,
 * SMS, Stripe charge and dashboard figure agrees to the cent.
 */

/** Australian GST rate. Change here only — never hard-code 0.1 elsewhere. */
export const GST_RATE = 0.10;

/** Round to 2 decimal places (cents), avoiding binary-float drift. NaN/undefined -> 0. */
export function round2(n: number): number {
  const v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export interface GstBreakdown {
  subtotal: number;          // ex-GST
  gstRate: number;           // 0.10
  gstAmount: number;         // rounded to cents
  totalIncludingGst: number; // subtotal + gstAmount
}

/**
 * Compute GST from a GST-EXCLUSIVE subtotal.
 *   subtotal 100 -> gst 10 -> total 110
 *   subtotal 99.95 -> gst 10.00 -> total 109.95
 */
export function computeGst(subtotal: number, rate: number = GST_RATE): GstBreakdown {
  const sub = round2(subtotal);
  const gstAmount = round2(sub * rate);
  return {
    subtotal: sub,
    gstRate: rate,
    gstAmount,
    totalIncludingGst: round2(sub + gstAmount),
  };
}

/**
 * Derive the GST split from a GST-INCLUSIVE total (for historical records or any
 * figure already known to include GST). For rate 0.10, GST = total / 11.
 */
export function deriveGstFromInclusive(totalIncludingGst: number, rate: number = GST_RATE): GstBreakdown {
  const total = round2(totalIncludingGst);
  const gstAmount = round2(total - total / (1 + rate));
  return {
    subtotal: round2(total - gstAmount),
    gstRate: rate,
    gstAmount,
    totalIncludingGst: total,
  };
}

/** Australian currency formatting, e.g. 1234.5 -> "$1,234.50". */
export function formatAUD(n: number | null | undefined): string {
  const v = Number(n) || 0;
  return v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}
