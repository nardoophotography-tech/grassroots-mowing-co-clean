// ============================================================================
// Bushranger equipment purchase — Atlas Motorsport Tax Invoice #149281
// Source: "Bushrange invoice equiptment.PDF" (17/02/2026).
// NOTE: the supplier's bank BSB/account numbers from the PDF are deliberately
// NOT included here — account numbers should not appear on a display page.
// ============================================================================

export interface InvoiceLineItem {
  stockCode: string;
  description: string;
  qty: number;
  unitPrice: number;
  gst: number;
  amount: number;
}

export interface EquipmentInvoice {
  supplier: string;
  abn: string;
  address: string;
  phone: string;
  email: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentTerms: string;
  jobDescription: string;
  customer: string;
  items: InvoiceLineItem[];
  subtotal: number;
  gstTotal: number;
  total: number;
}

export const BUSHRANGER_INVOICE: EquipmentInvoice = {
  supplier: 'Atlas Motorsport',
  abn: '25-092-763-972',
  address: '5 Simpson Street, Mount Isa QLD 4825',
  phone: '07 4743 4343',
  email: 'atlasmotorsport@westnet.com.au',
  invoiceNumber: '149281',
  invoiceDate: '17/02/2026',
  paymentTerms: 'C.O.D.',
  jobDescription: 'General Work',
  customer: 'Nardoo David',
  items: [
    { stockCode: 'BRUBR8600', description: 'Backpack Blower', qty: 1, unitPrice: 1099.0, gst: 99.91, amount: 1099.0 },
    { stockCode: 'BRUAHT261', description: 'Hedge Trimmer', qty: 1, unitPrice: 1199.0, gst: 109.0, amount: 1199.0 },
    { stockCode: 'BRUZCS5610', description: 'Bushranger Chainsaw CS5610', qty: 1, unitPrice: 529.0, gst: 48.09, amount: 529.0 },
    { stockCode: 'BRUTPS261', description: 'Bushranger Telescopic Pole Saw', qty: 1, unitPrice: 1499.0, gst: 136.27, amount: 1499.0 },
    { stockCode: 'BUSHBRC40', description: 'Bushranger BRC40 Chipper', qty: 1, unitPrice: 2399.0, gst: 218.09, amount: 2399.0 },
    { stockCode: 'BRUBP451', description: 'Backpack Brushcutter', qty: 1, unitPrice: 1329.0, gst: 120.82, amount: 1329.0 },
    { stockCode: 'BRUSHELD54', description: 'Bushranger Spartan Shield 54" Zero Turn', qty: 1, unitPrice: 10999.0, gst: 999.91, amount: 10999.0 },
  ],
  subtotal: 17320.91,
  gstTotal: 1732.09,
  total: 19053.0,
};
