import { PricingRules, ConditionFactors, AddOn, ClientType, ServicePackage, ServiceGrade, PricingSnapshot, BillingType } from '../types';

export const calculateServicePrice = (
  rules: PricingRules,
  servicePackage: ServicePackage,
  clientType: ClientType,
  grade: ServiceGrade,
  factors: ConditionFactors,
  selectedAddOns: AddOn[],
  billingType: BillingType = 'standard',
  squareFootage?: number
): PricingSnapshot => {
  // 1. Base Price from Package or Sqm
  let basePrice = rules?.base?.[servicePackage] ?? 0;
  
  if (squareFootage && rules.basePerSquareMetre) {
    const sqmPrice = squareFootage * rules.basePerSquareMetre;
    // Use sqm price if it's higher than base, or if package is "custom"
    if (servicePackage === 'custom' || sqmPrice > basePrice) {
      basePrice = sqmPrice;
    }
  }

  const packageDetail = rules?.packageDetails?.[servicePackage];

  // 2. Client Type Multiplier / Adjustment
  const tierValue = rules?.clientType?.[clientType] ?? 0;
  const tierName = clientType.replace(/-/g, ' ');

  let tierAdjustment = 0;
  if (Math.abs(tierValue) < 10 && tierValue > 0) {
    // Multiplier logic (e.g. 1.15)
    tierAdjustment = (basePrice * tierValue) - basePrice;
  } else {
    // Flat adjustment logic
    tierAdjustment = tierValue;
  }

  // 3. Grade Adjustment
  const gradeAdjustment = rules?.grade?.[grade] ?? 0;

  // 4. Condition Surcharges
  const timeSinceLastMowSurcharge = rules?.conditions?.timeSinceLastMow?.[factors.timeSinceLastMow] ?? 0;
  const grassHeightSurcharge = rules?.conditions?.grassHeight?.[factors.grassHeight] ?? 0;
  const thicknessSurcharge = rules?.conditions?.thickness?.[factors.thickness] ?? 0;
  const conditionSurcharge = timeSinceLastMowSurcharge + grassHeightSurcharge + thicknessSurcharge;

  // 5. Urgency
  const urgencySurcharge = rules?.conditions?.urgency?.[factors.urgency] ?? 0;

  // 6. Add-ons
  const addOnItems = selectedAddOns.map(addon => ({
    id: addon.id,
    name: rules?.addOnDetails?.[addon.id]?.name || addon.name,
    price: rules?.addOns?.[addon.id] || addon.price || 0
  }));
  const addOnTotal = addOnItems.reduce((sum, item) => sum + item.price, 0);

  // 7. Standardized Pricing Logic
  const subtotal = basePrice + tierAdjustment + gradeAdjustment + conditionSurcharge + urgencySurcharge + addOnTotal;
  const gst = subtotal * 0.1; // Standard 10% GST
  const total = subtotal + gst;

  // 8. Quote Requirement Checks
  const isQuoteRequired = grade === 'extreme' || billingType === 'quote-required' || servicePackage === 'custom' || total <= 0;

  return {
    basePrice,
    packageId: servicePackage,
    packageName: packageDetail?.name || servicePackage.replace(/_/g, ' '),
    gradeAdjustment,
    conditionSurcharge,
    urgencySurcharge,
    addOnTotal,
    addOns: addOnItems,
    tierAdjustment,
    tierName,
    discount: 0, 
    subtotal,
    gst,
    total,
    squareFootage,
    isQuoteRequired
  };
};

export const validateQuotePricing = (pricing: PricingSnapshot): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (typeof pricing.subtotal !== 'number' || isNaN(pricing.subtotal)) errors.push('Invalid subtotal');
  if (typeof pricing.gst !== 'number' || isNaN(pricing.gst)) errors.push('Invalid GST');
  if (typeof pricing.total !== 'number' || isNaN(pricing.total) || pricing.total < 0) errors.push('Invalid final total');
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const getDefaultPricingRules = (currentPricing?: PricingRules): PricingRules => {
  return currentPricing || {
    base: {
      'town_block': 110,
      'residential_standard': 150,
      'premium_estate': 200,
      'acreage': 320,
      'ultimate': 550,
      'custom': 0,
    },
    clientType: {
      'one-off': 1.15,
      'returning': 1.0,
      'ultimate-gold': 1.25,
      'real-estate': 1.15,
    },
    grade: {
      'standard': 0,
      'medium': 30,
      'heavy': 70,
      'extreme': 200,
    },
    conditions: {
      timeSinceLastMow: {
        'under-2-weeks': 0,
        '2-4-weeks': 0,
        '1-2-months': 40,
        'over-2-months': 100,
      },
      grassHeight: {
        'short': 0,
        'medium': 10,
        'tall': 30,
        'very-tall': 80,
      },
      thickness: {
        'light': 0,
        'medium': 5,
        'thick': 15,
        'very-thick': 40,
      },
      urgency: {
        'normal': 0,
        'priority': 25,
        'urgent': 60,
      }
    },
    addOns: {
      'edging': 15,
      'blowing': 10,
      'whipper-snipping': 20,
      'brush-cutting': 40,
      'weed-spraying': 30,
      'hedge-trimming': 50,
      'green-waste-removal': 40,
      'fertiliser-treatment': 35,
      'pruning': 45,
      'mulching': 90,
      'clipping-removal': 25,
      'yearly-analysis': 150,
    },
    addOnDetails: {
      'edging': { name: 'Edge Trimming', active: true, displayOrder: 1 },
      'blowing': { name: 'Path Blowing', active: true, displayOrder: 2 },
      'whipper-snipping': { name: 'Whipper Snipping', active: true, displayOrder: 3 },
      'brush-cutting': { name: 'Brush Cutting', active: true, displayOrder: 4 },
      'weed-spraying': { name: 'Garden Weeding/Spraying', active: true, displayOrder: 5 },
      'hedge-trimming': { name: 'Hedge Trimming', active: true, displayOrder: 6 },
      'green-waste-removal': { name: 'Green Waste Removal', active: true, displayOrder: 7 },
      'fertiliser-treatment': { name: 'Fertiliser Treatment', active: true, displayOrder: 8 },
      'pruning': { name: 'Pruning', active: true, displayOrder: 9 },
      'mulching': { name: 'Mulching Service', active: true, displayOrder: 10 },
      'clipping-removal': { name: 'Clipping Removal', active: true, displayOrder: 11 },
      'yearly-analysis': { name: 'Full Yearly Analysis & Planning', active: true, displayOrder: 12 },
    },
    packageDetails: {
      'town_block': { name: 'Town Block', description: 'Standard small town block', active: true, displayOrder: 1, category: 'Small' },
      'residential_standard': { name: 'Residential Standard', description: 'Popular family choice', active: true, displayOrder: 2, category: 'Medium' },
      'premium_estate': { name: 'Premium Estate', description: 'Full care for larger properties', active: true, displayOrder: 3, category: 'Large' },
      'acreage': { name: 'Large Lot / Acreage', description: 'For big open spaces', active: true, displayOrder: 4, category: 'XL' },
      'ultimate': { name: 'Ultimate Property Gold', description: 'The absolute premium service', active: true, displayOrder: 5, category: 'Premium' },
      'custom': { name: 'Custom Quote', description: 'Tailored pricing for unique needs', active: true, displayOrder: 6, category: 'Special' },
    }
  };
};
