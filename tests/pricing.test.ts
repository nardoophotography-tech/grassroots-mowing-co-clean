import { describe, it, expect } from 'vitest';
import { calculateServicePrice, getDefaultPricingRules, validateQuotePricing } from '@/services/pricingEngine';
import { calculateBookingPrice } from '@/utils/pricing';
import { PRICING_RULES } from '@/constants';

const DEFAULT_CONDITIONS = {
  timeSinceLastMow: 'under-2-weeks',
  grassHeight: 'short',
  thickness: 'light',
  obstacles: 'low',
  urgency: 'normal',
} as any;

describe('pricingEngine.calculateServicePrice — base packages (one_off, +10% GST)', () => {
  const cases: Array<[string, number, number]> = [
    // [package, expectedBase, expectedTotalIncGst]  (one_off tier = 1.15)
    ['town_block', 110, +(126.5 * 1.1).toFixed(2)],
    ['residential_standard', 150, +(172.5 * 1.1).toFixed(2)],
    ['premium_estate', 200, +(230 * 1.1).toFixed(2)],
    ['acreage', 320, +(368 * 1.1).toFixed(2)],
    ['ultimate', 550, +(632.5 * 1.1).toFixed(2)],
  ];
  it.each(cases)('%s: base %d, correct GST-inclusive total', (pkg, base, total) => {
    const s = calculateServicePrice(PRICING_RULES as any, pkg as any, 'one_off', 'standard', DEFAULT_CONDITIONS, []);
    expect(s.basePrice).toBe(base);
    expect(+s.total.toFixed(2)).toBe(total);
    expect(s.isQuoteRequired).toBe(false);
    expect(s.total).toBeGreaterThan(0);
  });
});

describe('client type tiers on residential_standard (base 150)', () => {
  it('returning tier (1.0) applies no surcharge', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'returning', 'standard', DEFAULT_CONDITIONS, []);
    expect(s.tierAdjustment).toBe(0);
    expect(+s.total.toFixed(2)).toBe(165); // 150 *1.1
  });
  it('one_off tier (1.15) adds 15%', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'one_off', 'standard', DEFAULT_CONDITIONS, []);
    expect(s.tierAdjustment).toBeCloseTo(22.5, 5);
    expect(+s.total.toFixed(2)).toBe(189.75);
  });
  it('premium tier (1.25) adds 25%', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'premium', 'standard', DEFAULT_CONDITIONS, []);
    expect(s.tierAdjustment).toBeCloseTo(37.5, 5);
    expect(+s.total.toFixed(2)).toBe(206.25);
  });
  it('asset_management tier (1.15)', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'asset_management', 'standard', DEFAULT_CONDITIONS, []);
    expect(+s.total.toFixed(2)).toBe(189.75);
  });
});

describe('grade, condition, urgency surcharges and add-ons', () => {
  it('heavy grade adds 70', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'returning', 'heavy', DEFAULT_CONDITIONS, []);
    expect(s.gradeAdjustment).toBe(70);
    expect(+s.subtotal.toFixed(2)).toBe(220);
  });
  it('condition surcharges stack (over-2-months + tall + thick)', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'returning', 'standard',
      { timeSinceLastMow: 'over-2-months', grassHeight: 'tall', thickness: 'thick', obstacles: 'low', urgency: 'normal' } as any, []);
    expect(s.conditionSurcharge).toBe(100 + 30 + 15);
  });
  it('urgency urgent adds 60', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'returning', 'standard',
      { ...DEFAULT_CONDITIONS, urgency: 'urgent' }, []);
    expect(s.urgencySurcharge).toBe(60);
  });
  it('add-ons sum into total', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'returning', 'standard', DEFAULT_CONDITIONS,
      [{ id: 'edging', name: 'Edge', price: 0, selected: true }, { id: 'mulching', name: 'Mulch', price: 0, selected: true }] as any);
    expect(s.addOnTotal).toBe(15 + 90);
  });
});

describe('quote-required protection', () => {
  it('custom package is quote-required', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'custom', 'one_off', 'standard', DEFAULT_CONDITIONS, []);
    expect(s.isQuoteRequired).toBe(true);
  });
  it('extreme grade is quote-required', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'one_off', 'extreme', DEFAULT_CONDITIONS, []);
    expect(s.isQuoteRequired).toBe(true);
  });
  it('quote-required billing type is quote-required', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'one_off', 'standard', DEFAULT_CONDITIONS, [], 'quote-required');
    expect(s.isQuoteRequired).toBe(true);
  });
});

describe('validateQuotePricing', () => {
  it('accepts a valid snapshot', () => {
    const s = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'one_off', 'standard', DEFAULT_CONDITIONS, []);
    expect(validateQuotePricing(s).valid).toBe(true);
  });
  it('rejects NaN totals', () => {
    const bad = { subtotal: NaN, gst: 0, total: NaN } as any;
    expect(validateQuotePricing(bad).valid).toBe(false);
  });
  it('rejects negative total', () => {
    const bad = { subtotal: 10, gst: 1, total: -5 } as any;
    expect(validateQuotePricing(bad).valid).toBe(false);
  });
});

describe('calculateBookingPrice — status resolution & zero-price protection', () => {
  it('returns no_service when nothing selected', () => {
    const r = calculateBookingPrice('', 'one_off', PRICING_RULES);
    expect(r.pricingStatus).toBe('no_service');
    expect(r.estimatedTotal).toBe(0);
  });
  it('a normal paid booking never resolves to $0', () => {
    for (const pkg of ['town_block', 'residential_standard', 'premium_estate', 'acreage', 'ultimate']) {
      const r = calculateBookingPrice(pkg, 'one_off', PRICING_RULES);
      expect(r.pricingStatus).toBe('calculated');
      expect(r.estimatedTotal).toBeGreaterThan(0);
    }
  });
  it('custom returns quote_required (not zero_price)', () => {
    const r = calculateBookingPrice('custom', 'one_off', PRICING_RULES);
    expect(r.pricingStatus).toBe('quote_required');
    expect(r.isQuoteRequired).toBe(true);
  });
  it('maps legacy hyphenated client key one-off -> one_off', () => {
    const legacy = calculateBookingPrice('residential_standard', 'one-off', PRICING_RULES);
    const canon = calculateBookingPrice('residential_standard', 'one_off', PRICING_RULES);
    expect(legacy.estimatedTotal).toBe(canon.estimatedTotal);
    expect(legacy.pricingStatus).toBe('calculated');
  });
  it('maps legacy ultimate-gold -> premium and real-estate -> asset_management', () => {
    expect(calculateBookingPrice('residential_standard', 'ultimate-gold', PRICING_RULES).estimatedTotal)
      .toBe(calculateBookingPrice('residential_standard', 'premium', PRICING_RULES).estimatedTotal);
    expect(calculateBookingPrice('residential_standard', 'real-estate', PRICING_RULES).estimatedTotal)
      .toBe(calculateBookingPrice('residential_standard', 'asset_management', PRICING_RULES).estimatedTotal);
  });
  it('tolerates missing pricing rules by falling back to defaults', () => {
    const r = calculateBookingPrice('residential_standard', 'one_off', null);
    expect(r.pricingStatus).toBe('calculated');
    expect(r.estimatedTotal).toBeGreaterThan(0);
  });
  it('a partial Firestore rules record does not wipe base defaults', () => {
    // Only clientType provided; base map should still come from defaults
    const r = calculateBookingPrice('residential_standard', 'returning', { clientType: { returning: 1.0 } } as any);
    expect(r.pricingStatus).toBe('calculated');
    expect(r.calculatedBasePrice).toBe(150);
  });
});

describe('historical price snapshots are immutable to later config changes', () => {
  it('a captured snapshot keeps its total after rules change', () => {
    const snap = calculateServicePrice(PRICING_RULES as any, 'residential_standard', 'one_off', 'standard', DEFAULT_CONDITIONS, []);
    const capturedTotal = snap.total;
    // simulate a later pricing change
    const changed = JSON.parse(JSON.stringify(PRICING_RULES));
    changed.base.residential_standard = 999;
    calculateServicePrice(changed, 'residential_standard', 'one_off', 'standard', DEFAULT_CONDITIONS, []);
    expect(snap.total).toBe(capturedTotal); // old snapshot object unchanged
  });
});

describe('getDefaultPricingRules', () => {
  it('returns provided rules when present', () => {
    expect(getDefaultPricingRules(PRICING_RULES as any)).toBe(PRICING_RULES);
  });
  it('returns sane defaults when none provided', () => {
    const d = getDefaultPricingRules();
    expect(d.base.residential_standard).toBeGreaterThan(0);
  });
});
