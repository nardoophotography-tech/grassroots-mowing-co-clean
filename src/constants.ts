import { JobStatus, BusinessSettings, ImageConfig } from './types';

export const DEFAULT_IMAGES: ImageConfig = {
  town_block: "https://drive.google.com/uc?export=view&id=1R6FXKmFotUobJcX5ZB8A97ESVjjFpbsB",
  residential_standard: "https://images.pexels.com/photos/1438248/pexels-photo-1438248.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
  premium_estate: "https://images.pexels.com/photos/584399/pexels-photo-584399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
  acreage: "https://images.pexels.com/photos/5945674/pexels-photo-5945674.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
  placeholder: "https://images.pexels.com/photos/1105189/pexels-photo-1105189.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  quoted: 'Quoted',
  scheduled: 'Scheduled',
  'on-the-way': 'On The Way',
  'in-progress': 'In Progress',
  completed: 'Completed',
  invoiced_final: 'Invoiced',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const JOB_STATUS_COLORS: Record<JobStatus, 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning'> = {
  quoted: 'secondary',
  scheduled: 'default',
  'on-the-way': 'warning',
  'in-progress': 'warning',
  completed: 'success',
  invoiced_final: 'warning',
  paid: 'success',
  cancelled: 'destructive',
};

export const TIME_SLOT_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
};

export const PRICING_RULES = {
  base: {
    'town_block': 110,
    'residential_standard': 150,
    'premium_estate': 200,
    'acreage': 320,
    'ultimate': 550,
    'custom': 0,
  },
  clientType: {
    'one_off': 1.15, 
    'returning': 1.0,
    'premium': 1.25, 
    'asset_management': 1.15,
  },
  packageDetails: {
    'town_block': { name: 'Town Block', description: 'Standard small town block', active: true, displayOrder: 1, category: 'Small' },
    'residential_standard': { name: 'Residential Standard', description: 'Popular family choice', active: true, displayOrder: 2, category: 'Medium' },
    'premium_estate': { name: 'Large Corner Block', description: 'Full care for larger properties', active: true, displayOrder: 3, category: 'Large' },
    'acreage': { name: 'Acreage & Paddock', description: 'For big open spaces', active: true, displayOrder: 4, category: 'XL' },
    'premium': { name: 'Full Property Care (Gold)', description: 'The absolute premium service', active: true, displayOrder: 5, category: 'Premium' },
    'custom': { name: 'Custom Quote', description: 'Tailored pricing for unique needs', active: true, displayOrder: 6, category: 'Special' },
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
  }
};

export const ADD_ON_LABELS: Record<string, string> = {
  'edging': 'Edge Trimming',
  'blowing': 'Path Blowing',
  'whipper-snipping': 'Whipper Snipping',
  'brush-cutting': 'Brush Cutting',
  'weed-spraying': 'Garden Weeding/Spraying',
  'hedge-trimming': 'Hedge Trimming',
  'green-waste-removal': 'Green Waste Removal',
  'fertiliser-treatment': 'Fertiliser Treatment',
  'pruning': 'Pruning',
  'mulching': 'Mulching Service',
  'clipping-removal': 'Clipping Removal',
  'yearly-analysis': 'Full Yearly Analysis & Planning',
};

export const SUBURBS = [
  'Barkly',
  'Breakaway',
  'Fisher',
  'Happy Valley',
  'Healy',
  'Kalkadoon',
  'Lanskey',
  'Menzies',
  'Miles End',
  'Mornington',
  'Mount Isa City',
  'Mount Isa East',
  'Parkside',
  'Pioneer',
  'Ryan',
  'Soldiers Hill',
  'Spreadborough',
  'Sunset',
  'The Gap',
  'Townview',
  'Winston'
];

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending',
  paid: 'Paid',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: 'Card / Stripe',
  'apple-pay': 'Apple Pay',
  'google-pay': 'Google Pay',
  cash: 'Cash',
  'bank-transfer': 'Bank Transfer',
};

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  'one_off': 'One-Off Client',
  'returning': 'Returning Client',
  'premium': 'Premium Member',
  'asset_management': 'Asset Management',
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  'up-to-date': 'Up to Date',
  'payment-due': 'Payment Due',
  overdue: 'Overdue',
};

export const ADMIN_EMAILS = ["nardoophotography@gmail.com", "jacka4687@gmail.com"];

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "GrassRoots Mowing Co.",
  businessEmail: "ops@grassrootsmowing.co",
  businessPhone: "0400 000 000",
  serviceLocation: "Mount Isa",
  nextClientNotificationEnabled: true,
  messageTemplate: "Hi [Client Name], I've just finished the previous job and will be with you soon.",
  paymentLinkTemplate: "Hi [Client Name], your lawn service is complete. You can pay here: [Link]",
  receiptTemplate: "Hi [Client Name], thanks for your payment via [Method]. Your receipt is attached.",
  suburbSchedules: SUBURBS.map(suburb => ({
    suburb,
    availableDays: [1, 2, 3, 4, 5], // Mon-Fri
    morningCapacity: 2,
    afternoonCapacity: 2,
    blockedDates: []
  })),
  stripeConnected: false,
  upfrontPaymentRequired: false,
  pricing: PRICING_RULES,
  images: DEFAULT_IMAGES,
  testimonials: [
    {
      id: '1',
      name: 'Sarah M.',
      quote: "The most reliable service in Parkside. Our edges have never looked sharper. Truly a cut above the rest.",
      suburb: 'Parkside'
    },
    {
      id: '2',
      name: 'John D.',
      quote: "Finally a mowing service that shows up on time in Healy. Professional and efficient.",
      suburb: 'Healy'
    }
  ]
};
