import { describe, it, expect } from 'vitest';
import { calculateServicePrice, getDefaultPricingRules } from './pricingEngine';

describe('GST-Inclusive Pricing Engine', () => {
  const rules = getDefaultPricingRules();

  it('calculates exact GST-inclusive totals for standard packages', () => {
    // 1. Town Block -> $90
    let res = calculateServicePrice(rules, 'town_block', 'one_off', 'standard', { timeSinceLastMow: 'regular', overgrowth: 'none', moisture: 'dry', debris: 'none' }, []);
    expect(res.total).toBe(90.00);
    expect(res.subtotal).toBe(81.82);
    expect(res.gst).toBe(8.18);
    expect(res.isQuoteRequired).toBe(false);

    // 2. Standard Yard -> $100
    res = calculateServicePrice(rules, 'standard_yard', 'one_off', 'standard', { timeSinceLastMow: 'regular', overgrowth: 'none', moisture: 'dry', debris: 'none' }, []);
    expect(res.total).toBe(100.00);
    expect(res.subtotal).toBe(90.91);
    expect(res.gst).toBe(9.09);

    // 3. Corner Blocks -> $110
    res = calculateServicePrice(rules, 'corner_blocks', 'one_off', 'standard', { timeSinceLastMow: 'regular', overgrowth: 'none', moisture: 'dry', debris: 'none' }, []);
    expect(res.total).toBe(110.00);
    expect(res.subtotal).toBe(100.00);
    expect(res.gst).toBe(10.00);

    // 4. Large Lot / Acreage -> $150
    res = calculateServicePrice(rules, 'large_lot_acreage', 'one_off', 'standard', { timeSinceLastMow: 'regular', overgrowth: 'none', moisture: 'dry', debris: 'none' }, []);
    expect(res.total).toBe(150.00);
    expect(res.subtotal).toBe(136.36);
    expect(res.gst).toBe(13.64);

    // 5. Ultimate Property Gold -> $170
    res = calculateServicePrice(rules, 'ultimate_property_gold', 'one_off', 'standard', { timeSinceLastMow: 'regular', overgrowth: 'none', moisture: 'dry', debris: 'none' }, []);
    expect(res.total).toBe(170.00);
    expect(res.subtotal).toBe(154.55);
    expect(res.gst).toBe(15.45);

    // 6. Custom Quote -> Quote required
    res = calculateServicePrice(rules, 'custom_quote', 'one_off', 'standard', { timeSinceLastMow: 'regular', overgrowth: 'none', moisture: 'dry', debris: 'none' }, []);
    expect(res.isQuoteRequired).toBe(true);
  });

  it('does not apply hidden modifiers by default', () => {
    const res = calculateServicePrice(rules, 'town_block', 'one_off', 'standard', { timeSinceLastMow: 'regular', overgrowth: 'none', moisture: 'dry', debris: 'none' }, []);
    expect(res.tierAdjustment).toBe(0);
    expect(res.gradeAdjustment).toBe(0);
    expect(res.addOnTotal).toBe(0);
    expect(res.conditionSurcharge).toBe(0);
  });
});
