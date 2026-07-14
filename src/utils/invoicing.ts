/**
 * Pure invoice/payment maths — extracted so the money logic in server.ts is
 * unit-testable and cannot silently drift.
 */

/**
 * Final invoice amount for a completed job:
 *   base + add-ons − discount, never below $0.
 * Mirrors the calculation in POST /api/jobs/:jobId/complete.
 */
export function computeFinalAmount(
  baseAmount: number,
  addOnsTotal: number,
  discountAmount: number
): number {
  const base = Number(baseAmount) || 0;
  const addOns = Number(addOnsTotal) || 0;
  const discount = Number(discountAmount) || 0;
  return Math.max(0, base + addOns - discount);
}

export interface ManualPaymentResult {
  amountPaid: number;   // cumulative
  balanceDue: number;   // clamped >= 0
  isPaid: boolean;
  status: 'paid' | 'sent';
}

/**
 * Apply a manual payment (PayID / cash / EFT / other) to an invoice.
 * Overpayment is prevented: cumulative amountPaid never exceeds the total.
 * Mirrors the calculation in POST /api/jobs/:jobId/manual-payment.
 */
export function applyManualPayment(
  totalAmount: number,
  previousAmountPaid: number,
  paymentAmount: number
): ManualPaymentResult {
  const total = Number(totalAmount) || 0;
  const prev = Number(previousAmountPaid) || 0;
  const pay = Number(paymentAmount) || 0;
  const amountPaid = Math.min(prev + pay, total);
  const balanceDue = Math.max(0, total - amountPaid);
  const isPaid = balanceDue === 0 && total > 0;
  return {
    amountPaid,
    balanceDue,
    isPaid,
    status: isPaid ? 'paid' : 'sent',
  };
}
