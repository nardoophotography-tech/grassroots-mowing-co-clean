export type JobStatus = 'quoted' | 'scheduled' | 'on-the-way' | 'in-progress' | 'completed' | 'invoiced' | 'paid' | 'cancelled';
export type TimeSlot = 'morning' | 'afternoon';
export type ClientType = 'one-off' | 'returning' | 'ultimate-gold' | 'real-estate';
export type ServicePackage = string;
export type ServiceGrade = 'standard' | 'medium' | 'heavy' | 'extreme';
export type BillingType = 'included' | 'extra' | 'quote-required' | 'standard';
export type RecurringSchedule = 'weekly' | 'fortnightly' | 'monthly' | 'one-off';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid';
export type PaymentMethod = 'stripe' | 'apple-pay' | 'google-pay' | 'cash' | 'bank-transfer';
export type AccountStatus = 'up-to-date' | 'payment-due' | 'overdue';

export interface ConditionFactors {
  timeSinceLastMow: 'under-2-weeks' | '2-4-weeks' | '1-2-months' | 'over-2-months';
  grassHeight: 'short' | 'medium' | 'tall' | 'very-tall';
  thickness: 'light' | 'medium' | 'thick' | 'very-thick';
  obstacles: 'low' | 'medium' | 'high';
  urgency: 'normal' | 'priority' | 'urgent';
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  selected: boolean;
  addedBy?: string; // User UID
  approvedBy?: string; // Admin UID
  approvedAt?: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  suburb: string;
  notes?: string;
  clientType: ClientType;
  agencyName?: string;
  accountStatus: AccountStatus;
  createdAt: number;
}

export interface JobIssue {
  url: string;
  note?: string;
  category?: 'hazard' | 'damage' | 'access' | 'other';
  createdAt: number;
}

export interface PricingSnapshot {
  basePrice: number;
  packageId: string;
  packageName: string;
  gradeAdjustment: number;
  conditionSurcharge: number;
  urgencySurcharge: number;
  addOnTotal: number;
  addOns: { id: string; name: string; price: number }[];
  tierAdjustment: number;
  tierName: string;
  discount: number;
  total: number;
  pricingVersionId?: string;
  isQuoteRequired?: boolean;
}

export interface Job {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  address: string;
  suburb: string;
  status: JobStatus;
  scheduledDate: number;
  timeSlot: TimeSlot;
  clientType: ClientType;
  servicePackage?: ServicePackage;
  serviceGrade: ServiceGrade;
  conditionFactors: ConditionFactors;
  addOns: AddOn[];
  basePrice: number;
  gradeAdjustment: number;
  conditionSurcharge: number;
  addOnTotal: number;
  urgencySurcharge: number;
  price: number; // Final total
  pricingSnapshot?: PricingSnapshot;
  manualOverride?: boolean;
  packageNotes?: string;
  billingType: BillingType;
  recurringSchedule: RecurringSchedule;
  description: string;
  notes?: string;
  photos?: string[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  issuePhotos?: JobIssue[];
  invoiceId?: string;
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: number;
  paymentLink?: string;
  createdAt: number;
  updatedAt: number;
  notificationSent?: boolean;
  workerId?: string; // UID of the assigned employee
  order?: number; // Position in the run (morning/afternoon)
  // New Quote Fields
  quoteUrl?: string;
  quoteStatus?: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  quoteApprovedAt?: number;
  quoteRejectedAt?: number;
}

export interface SuburbSchedule {
  suburb: string;
  availableDays: number[]; // 0-6 (Sunday-Saturday)
  morningCapacity: number;
  afternoonCapacity: number;
  blockedDates: string[]; // ISO strings
}

export interface PricingRules {
  base: Record<string, number>;
  clientType: Record<string, number>;
  grade: Record<string, number>;
  conditions: {
    timeSinceLastMow: Record<string, number>;
    grassHeight: Record<string, number>;
    thickness: Record<string, number>;
    urgency: Record<string, number>;
  };
  addOns: Record<string, number>;
  addOnDetails?: Record<string, {
    name: string;
    description?: string;
    category?: string;
    active: boolean;
    displayOrder: number;
  }>;
  packageDetails?: Record<string, {
    name: string;
    description?: string;
    category?: string;
    active: boolean;
    displayOrder: number;
    image?: string;
  }>;
}

export interface Testimonial {
  id: string;
  name: string;
  quote: string;
  suburb: string;
}

export interface ImageConfig {
  town_block: string;
  residential_standard: string;
  premium_estate: string;
  acreage: string;
  placeholder: string;
}

export interface PricingVersion {
  id: string;
  version: number;
  rules: PricingRules;
  updatedBy: string;
  updatedAt: number;
  notes: string;
}

export interface RegionalAsset {
  url: string;
}

export interface BusinessSettings {
  businessName: string;
  serviceLocation: string;
  servicePostcode?: string;
  nextClientNotificationEnabled: boolean;
  messageTemplate: string;
  paymentLinkTemplate: string;
  receiptTemplate: string;
  suburbSchedules: SuburbSchedule[];
  stripeConnected: boolean;
  stripeAccountId?: string;
  upfrontPaymentRequired: boolean;
  pricing: PricingRules;
  testimonials: Testimonial[];
  images: ImageConfig;
  assets?: {
    residential_standard?: RegionalAsset;
    premium_estate?: RegionalAsset;
  };
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobId: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  items: InvoiceItem[];
  totalAmount: number;
  pricingSnapshot?: PricingSnapshot;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  paymentLink?: string;
  invoicePdfUrl?: string; // Link to stored PDF
  paymentMethod?: PaymentMethod;
  paidAt?: number;
  dueDate: number;
  createdAt: number;
}

export interface Payment {
  id: string;
  jobId: string;
  amount: number;
  status: 'successful' | 'failed';
  createdAt: number;
}

export type UserRole = 'admin' | 'staff' | 'client';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  clientType?: ClientType;
  businessName?: string;
  agencyId?: string; // UID of the parent agency account
  passcode?: string; // Hashed or encrypted PIN
  passkeyEnabled?: boolean;
  lastActive?: number;
  setupComplete?: boolean;
}
