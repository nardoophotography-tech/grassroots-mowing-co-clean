export type FinancialSummary = {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  unpaidInvoiceCount: number;
  monthlyRevenue: number;
};

export function calculateFinancialSummary(
  invoices: any[],
  payments: any[],
  month: Date
): FinancialSummary {
  let totalInvoiced = 0;
  let totalOutstanding = 0;
  let unpaidInvoiceCount = 0;

  const currentMonth = month.getMonth();
  const currentYear = month.getFullYear();

  // Unified ledger for payments
  let refinedTotalPaid = 0;
  let refinedMonthlyRevenue = 0;

  const validPaymentRecords = Array.isArray(payments) ? payments.filter(p => {
    const s = String(p.status || '').toLowerCase();
    return ['successful', 'succeeded', 'paid'].includes(s);
  }) : [];

  // Process explicit payments collection
  validPaymentRecords.forEach(payment => {
    const pDate = new Date(payment.createdAt || payment.paidAt || payment.paymentDate);
    if (isNaN(pDate.getTime())) return;
    const amount = Number(payment.amount || 0);
    if (amount <= 0) return;

    refinedTotalPaid += amount;
    if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
      refinedMonthlyRevenue += amount;
    }
  });

  if (Array.isArray(invoices)) {
    invoices.forEach(invoice => {
      const status = String(invoice.status || '').toLowerCase();
      
      // Exclude draft, void, deleted, quote
      if (['draft', 'void', 'voided', 'deleted', 'quote'].includes(status)) return;
      
      // Normalise total
      const total = Number(
        invoice.totalIncludingGst ??
        invoice.finalAmount ??
        invoice.totalAmount ??
        invoice.total ??
        invoice.amount ??
        0
      );

      // Normalise amountPaid
      let amountPaid = Number(
        invoice.amountPaid ??
        invoice.paidAmount ??
        0
      );
      
      // Safety fallback: if status is paid but amountPaid is missing, assume fully paid
      if (status === 'paid' && amountPaid === 0) {
        amountPaid = total;
      }

      const balanceDue = Math.max(0, Number(invoice.balanceDue ?? (total - amountPaid)));

      if (total > 0 && ['sent', 'payment_pending', 'partially_paid', 'overdue', 'paid'].includes(status)) {
        totalInvoiced += total;

        if (balanceDue > 0 && status !== 'paid') {
          totalOutstanding += balanceDue;
          unpaidInvoiceCount++;
        }

        // Deduplicate manual cash/bank transfers that aren't in the payments collection
        if (amountPaid > 0) {
          const isManualMethod = ['cash', 'bank-transfer', 'eft', 'payid'].includes(String(invoice.paymentMethod || '').toLowerCase());
          
          // Legacy check: did we already count a Stripe payment for this invoice?
          // The webhook usually stores invoiceId, but let's check jobId too just in case.
          const hasPaymentRecord = validPaymentRecords.some(p => 
            (p.invoiceId && p.invoiceId === invoice.id) || 
            (p.jobId && p.jobId === invoice.jobId)
          );
          
          if (!hasPaymentRecord || isManualMethod) {
            // Count this manual payment directly from the invoice
            refinedTotalPaid += amountPaid;
            
            // For monthly revenue, we need the date it was paid
            const pDate = new Date(invoice.paidAt || invoice.updatedAt || invoice.createdAt);
            if (!isNaN(pDate.getTime()) && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
              refinedMonthlyRevenue += amountPaid;
            }
          }
        }
      } else if (total === 0) {
        console.warn('[FinancialSummary] Invalid or missing total on invoice:', invoice.id);
      }
    });
  }

  return {
    totalInvoiced,
    totalPaid: refinedTotalPaid,
    totalOutstanding,
    unpaidInvoiceCount,
    monthlyRevenue: refinedMonthlyRevenue
  };
}
