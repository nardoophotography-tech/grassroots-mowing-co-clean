import { describe, it, expect } from 'vitest';
import { computeFinalAmount, applyManualPayment } from '@/utils/invoicing';

describe('computeFinalAmount — completion maths', () => {
  it('base + add-ons - discount', () => {
    expect(computeFinalAmount(150, 40, 20)).toBe(170);
  });
  it('never goes below zero (discount exceeds charges)', () => {
    expect(computeFinalAmount(100, 0, 250)).toBe(0);
  });
  it('coerces junk inputs to 0', () => {
    expect(computeFinalAmount(NaN as any, undefined as any, null as any)).toBe(0);
    expect(computeFinalAmount('150' as any, '10' as any, '5' as any)).toBe(155);
  });
});

describe('applyManualPayment — PayID/cash/EFT ledger', () => {
  it('full payment marks invoice paid, balance 0', () => {
    const r = applyManualPayment(200, 0, 200);
    expect(r).toMatchObject({ amountPaid: 200, balanceDue: 0, isPaid: true, status: 'paid' });
  });
  it('partial payment leaves balance and stays "sent"', () => {
    const r = applyManualPayment(200, 0, 80);
    expect(r).toMatchObject({ amountPaid: 80, balanceDue: 120, isPaid: false, status: 'sent' });
  });
  it('two partial payments settle the invoice', () => {
    const first = applyManualPayment(200, 0, 120);
    const second = applyManualPayment(200, first.amountPaid, 80);
    expect(second.isPaid).toBe(true);
    expect(second.balanceDue).toBe(0);
  });
  it('overpayment is capped — amountPaid never exceeds total, balance never negative', () => {
    const r = applyManualPayment(200, 0, 500);
    expect(r.amountPaid).toBe(200);
    expect(r.balanceDue).toBe(0);
    expect(r.isPaid).toBe(true);
  });
  it('a $0 invoice is not considered "paid" by a $0 payment', () => {
    const r = applyManualPayment(0, 0, 0);
    expect(r.isPaid).toBe(false);
  });
  it('cumulative overpay across two payments still caps at total', () => {
    const first = applyManualPayment(200, 0, 150);
    const second = applyManualPayment(200, first.amountPaid, 150);
    expect(second.amountPaid).toBe(200);
    expect(second.balanceDue).toBe(0);
  });
});
