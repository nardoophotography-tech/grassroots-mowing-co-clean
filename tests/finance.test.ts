import { describe, it, expect } from 'vitest';
import { calculateFinancialSummary } from '../src/utils/finance';

describe('Financial Summary Logic', () => {
  const currentMonth = new Date();

  it('handles empty state correctly', () => {
    const summary = calculateFinancialSummary([], [], currentMonth);
    expect(summary.totalInvoiced).toBe(0);
    expect(summary.totalPaid).toBe(0);
    expect(summary.totalOutstanding).toBe(0);
    expect(summary.unpaidInvoiceCount).toBe(0);
    expect(summary.monthlyRevenue).toBe(0);
  });

  it('handles a single unpaid invoice', () => {
    const invoices = [{
      id: 'inv_1',
      status: 'sent',
      totalAmount: 110,
      amountPaid: 0
    }];
    const summary = calculateFinancialSummary(invoices, [], currentMonth);
    expect(summary.totalInvoiced).toBe(110);
    expect(summary.totalPaid).toBe(0);
    expect(summary.totalOutstanding).toBe(110);
    expect(summary.unpaidInvoiceCount).toBe(1);
    expect(summary.monthlyRevenue).toBe(0);
  });

  it('handles a fully paid invoice (manual cash)', () => {
    const invoices = [{
      id: 'inv_2',
      status: 'paid',
      totalAmount: 110,
      amountPaid: 110,
      paymentMethod: 'cash',
      paidAt: currentMonth.getTime()
    }];
    const summary = calculateFinancialSummary(invoices, [], currentMonth);
    expect(summary.totalInvoiced).toBe(110);
    expect(summary.totalPaid).toBe(110);
    expect(summary.totalOutstanding).toBe(0);
    expect(summary.unpaidInvoiceCount).toBe(0);
    expect(summary.monthlyRevenue).toBe(110);
  });

  it('handles a partially paid invoice', () => {
    const invoices = [{
      id: 'inv_3',
      status: 'partially_paid',
      totalAmount: 150,
      amountPaid: 50,
      paymentMethod: 'bank-transfer',
      paidAt: currentMonth.getTime()
    }];
    const summary = calculateFinancialSummary(invoices, [], currentMonth);
    expect(summary.totalInvoiced).toBe(150);
    expect(summary.totalPaid).toBe(50);
    expect(summary.totalOutstanding).toBe(100);
    expect(summary.unpaidInvoiceCount).toBe(1);
    expect(summary.monthlyRevenue).toBe(50);
  });

  it('ignores voided invoices entirely', () => {
    const invoices = [{
      id: 'inv_4',
      status: 'void',
      totalAmount: 150,
      amountPaid: 0
    }];
    const summary = calculateFinancialSummary(invoices, [], currentMonth);
    expect(summary.totalInvoiced).toBe(0);
    expect(summary.totalOutstanding).toBe(0);
    expect(summary.unpaidInvoiceCount).toBe(0);
  });

  it('deduplicates Stripe webhook payments correctly', () => {
    const invoices = [{
      id: 'inv_stripe',
      jobId: 'job_stripe',
      status: 'paid',
      totalAmount: 110,
      amountPaid: 110,
      paymentMethod: 'stripe',
      paidAt: currentMonth.getTime()
    }];
    const payments = [{
      id: 'pay_1',
      invoiceId: 'inv_stripe',
      status: 'successful',
      amount: 110,
      createdAt: currentMonth.getTime()
    }];
    const summary = calculateFinancialSummary(invoices, payments, currentMonth);
    expect(summary.totalInvoiced).toBe(110);
    // Should be exactly 110, not 220
    expect(summary.totalPaid).toBe(110);
    expect(summary.monthlyRevenue).toBe(110);
  });

  it('safely handles legacy fields and missing values', () => {
    const invoices = [{
      id: 'inv_legacy',
      status: 'payment_pending',
      // Legacy uses totalIncludingGst instead of totalAmount
      totalIncludingGst: 200,
      // No amountPaid field
    }];
    const summary = calculateFinancialSummary(invoices, [], currentMonth);
    expect(summary.totalInvoiced).toBe(200);
    expect(summary.totalOutstanding).toBe(200);
    expect(summary.totalPaid).toBe(0);
  });

  it('filters monthly revenue properly for prior months', () => {
    const priorMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 15);
    const invoices = [{
      id: 'inv_old',
      status: 'paid',
      totalAmount: 110,
      amountPaid: 110,
      paymentMethod: 'cash',
      paidAt: priorMonth.getTime()
    }];
    const summary = calculateFinancialSummary(invoices, [], currentMonth);
    expect(summary.totalInvoiced).toBe(110);
    expect(summary.totalPaid).toBe(110);
    // Prior month payment should not be in current monthly revenue
    expect(summary.monthlyRevenue).toBe(0);
  });
});
