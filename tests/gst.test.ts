import { describe, it, expect } from 'vitest';
import { GST_RATE, round2, computeGst, deriveGstFromInclusive, formatAUD } from '@/utils/money';
import { calculateServicePrice } from '@/services/pricingEngine';
import { PRICING_RULES } from '@/constants';

const DEFAULT_CONDITIONS = {
  timeSinceLastMow: 'under-2-weeks', grassHeight: 'short', thickness: 'light',
  obstacles: 'low', urgency: 'normal',
} as any;

describe('GST_RATE is the single source', () => {
  it('is 10%', () => expect(GST_RATE).toBe(0.10));
});

describe('computeGst from a GST-exclusive subtotal', () => {
  const cases: Array<[number, number, number]> = [
    [100, 10, 110],
    [120, 12, 132],
    [160, 16, 176],
    [180, 18, 198],
  ];
  it.each(cases)('subtotal %d -> gst %d -> total %d', (sub, gst, total) => {
    const r = computeGst(sub);
    expect(r.subtotal).toBe(sub);
    expect(r.gstAmount).toBe(gst);
    expect(r.totalIncludingGst).toBe(total);
    // visible rows must add up exactly
    expect(round2(r.subtotal + r.gstAmount)).toBe(r.totalIncludingGst);
  });

  it('rounds GST to cents: 99.95 -> GST 10.00 -> total 109.95', () => {
    const r = computeGst(99.95);
    expect(r.gstAmount).toBe(10.00);
    expect(r.totalIncludingGst).toBe(109.95);
  });

  it('handles a cents subtotal cleanly (123.45)', () => {
    const r = computeGst(123.45);
    expect(r.gstAmount).toBe(12.35); // round2(12.345)
    expect(r.totalIncludingGst).toBe(135.80);
    expect(round2(r.subtotal + r.gstAmount)).toBe(r.totalIncludingGst);
  });

  it('zero-dollar (Project #156 complimentary) -> 0/0/0', () => {
    const r = computeGst(0);
    expect(r).toMatchObject({ subtotal: 0, gstAmount: 0, totalIncludingGst: 0 });
  });
});

describe('deriveGstFromInclusive (historical / stored-inclusive totals)', () => {
  it('110 inc -> subtotal 100, gst 10', () => {
    const r = deriveGstFromInclusive(110);
    expect(r.subtotal).toBe(100);
    expect(r.gstAmount).toBe(10);
    expect(round2(r.subtotal + r.gstAmount)).toBe(110);
  });
  it('198 inc -> subtotal 180, gst 18', () => {
    const r = deriveGstFromInclusive(198);
    expect(r.subtotal).toBe(180);
    expect(r.gstAmount).toBe(18);
  });
  it('109.95 inc -> gst 10.00, subtotal 99.95 (rows add to total)', () => {
    const r = deriveGstFromInclusive(109.95);
    expect(r.gstAmount).toBe(10.00);
    expect(round2(r.subtotal + r.gstAmount)).toBe(109.95);
  });
  it('missing/zero total is safe', () => {
    expect(deriveGstFromInclusive(0)).toMatchObject({ subtotal: 0, gstAmount: 0, totalIncludingGst: 0 });
    expect(deriveGstFromInclusive(undefined as any).totalIncludingGst).toBe(0);
  });
});

describe('pricing engine uses the shared, rounded GST', () => {
  it('residential_standard / returning -> subtotal 150, gst 15, total 165', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'returning', 'standard', DEFAULT_CONDITIONS, []);
    expect(s.subtotal).toBe(150);
    expect(s.gst).toBe(15);
    expect(s.total).toBe(165);
    expect(s.gstRate).toBe(0.10);
  });
  it('snapshot rows always add up: subtotal + gst == total', () => {
    for (const pkg of ['town_block', 'residential_standard', 'premium_estate', 'acreage', 'ultimate']) {
      for (const tier of ['one_off', 'returning', 'premium', 'asset_management']) {
        const s = calculateServicePrice(PRICING_RULES as any, pkg as any, tier as any, 'standard', DEFAULT_CONDITIONS, []);
        expect(round2(s.subtotal + s.gst)).toBe(s.total);
      }
    }
  });
  it('with an add-on the GST still balances', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'returning', 'standard', DEFAULT_CONDITIONS,
      [{ id: 'edging', name: 'Edge', price: 0, selected: true }] as any);
    expect(round2(s.subtotal + s.gst)).toBe(s.total);
  });
});

describe('formatAUD', () => {
  it('formats AUD currency', () => {
    expect(formatAUD(1234.5)).toBe('$1,234.50');
    expect(formatAUD(0)).toBe('$0.00');
    expect(formatAUD(null)).toBe('$0.00');
  });
});
