/**
 * calculateBookingPrice — unified pricing utility
 *
 * Single source of truth for calculating a booking price across:
 *  - Public Booking.tsx
 *  - Admin quickBook modal (Dashboards.tsx)
 *  - Admin NewJob.tsx
 *
 * Always call this with `settings?.pricing` from useSettings() so live
 * Firestore rules are used. Falls back to PRICING_RULES from constants.ts.
 */

import { calculateServicePrice } from '@/services/pricingEngine';
import { PRICING_RULES } from '@/constants';
import type { PricingRules, PricingSnapshot, ConditionFactors, AddOn } from '@/types';

export type PricingStatus =
  | 'calculated'    // price is ready, estimatedTotal > 0
  | 'quote_required' // extreme grade / custom package / billing=quote-required
  | 'zero_price'    // calculation produced $0 unexpectedly
  | 'no_service';   // no service package selected yet

export interface BookingPriceResult {
  pricingStatus: PricingStatus;
  calculatedBasePrice: number;
  estimatedTotal: number;
  snapshot: PricingSnapshot | null;
  isQuoteRequired: boolean;
  explanation: string;
}

const DEFAULT_CONDITIONS: ConditionFactors = {
  timeSinceLastMow: 'under-2-weeks',
  grassHeight: 'short',
  thickness: 'light',
  obstacles: 'low',
  urgency: 'normal',
};

/**
 * Map any historical or hyphenated client type key to the canonical underscore key
 * used in constants.ts and types.ts.
 */
function normalizeClientType(clientType: string): string {
  const map: Record<string, string> = {
    // canonical (pass-through)
    'one_off': 'one_off',
    'returning': 'returning',
    'premium': 'premium',
    'asset_management': 'asset_management',
    // legacy hyphenated keys from old pricingEngine defaults
    'one-off': 'one_off',
    'ultimate-gold': 'premium',
    'real-estate': 'asset_management',
  };
  return map[clientType] ?? clientType;
}

export function calculateBookingPrice(
  servicePackage: string,
  clientType: string = 'one_off',
  pricingRules?: Partial<PricingRules> | null,
  options?: {
    serviceGrade?: 'standard' | 'medium' | 'heavy' | 'extreme';
    conditionFactors?: ConditionFactors;
    addOns?: AddOn[];
    squareFootage?: number;
    billingType?: 'standard' | 'extra' | 'quote-required' | 'included';
  }
): BookingPriceResult {
  if (!servicePackage) {
    return {
      pricingStatus: 'no_service',
      calculatedBasePrice: 0,
      estimatedTotal: 0,
      snapshot: null,
      isQuoteRequired: false,
      explanation: 'No service selected',
    };
  }

  // Build effective rules: live Firestore rules merged over static fallback
  const effectiveRules: PricingRules = {
    ...PRICING_RULES,
    ...(pricingRules || {}),
    // Deep-merge sub-objects so a partial Firestore record doesn't wipe defaults
    clientType: {
      ...PRICING_RULES.clientType,
      ...(pricingRules?.clientType || {}),
    },
    base: {
      ...PRICING_RULES.base,
      ...(pricingRules?.base || {}),
    },
    grade: {
      ...PRICING_RULES.grade,
      ...(pricingRules?.grade || {}),
    },
    conditions: {
      timeSinceLastMow: {
        ...PRICING_RULES.conditions.timeSinceLastMow,
        ...(pricingRules?.conditions?.timeSinceLastMow || {}),
      },
      grassHeight: {
        ...PRICING_RULES.conditions.grassHeight,
        ...(pricingRules?.conditions?.grassHeight || {}),
      },
      thickness: {
        ...PRICING_RULES.conditions.thickness,
        ...(pricingRules?.conditions?.thickness || {}),
      },
      urgency: {
        ...PRICING_RULES.conditions.urgency,
        ...(pricingRules?.conditions?.urgency || {}),
      },
    },
    addOns: {
      ...PRICING_RULES.addOns,
      ...(pricingRules?.addOns || {}),
    },
  };

  const normalizedClient = normalizeClientType(clientType);

  const snapshot = calculateServicePrice(
    effectiveRules,
    servicePackage,
    normalizedClient as any,
    options?.serviceGrade ?? 'standard',
    options?.conditionFactors ?? DEFAULT_CONDITIONS,
    options?.addOns ?? [],
    options?.billingType ?? 'standard',
    options?.squareFootage
  );

  if (snapshot.isQuoteRequired) {
    return {
      pricingStatus: 'quote_required',
      calculatedBasePrice: snapshot.basePrice,
      estimatedTotal: 0,
      snapshot,
      isQuoteRequired: true,
      explanation: servicePackage === 'custom_quote'
        ? 'Custom quote required'
        : options?.serviceGrade === 'extreme'
          ? 'Quote required for extreme conditions'
          : 'Quote required',
    };
  }

  if (snapshot.total <= 0) {
    return {
      pricingStatus: 'zero_price',
      calculatedBasePrice: snapshot.basePrice,
      estimatedTotal: 0,
      snapshot,
      isQuoteRequired: false,
      explanation: 'Price calculated as $0 — check pricing configuration',
    };
  }

  return {
    pricingStatus: 'calculated',
    calculatedBasePrice: snapshot.basePrice,
    estimatedTotal: snapshot.total,
    snapshot,
    isQuoteRequired: false,
    explanation: `$${snapshot.total.toFixed(2)} estimated (inc. GST)`,
  };
}
