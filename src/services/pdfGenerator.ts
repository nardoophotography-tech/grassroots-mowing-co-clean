import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Job, BusinessSettings } from "../types";
import { deriveGstFromInclusive } from "../utils/money";
import { getPaymentOptions } from "../constants";

export async function generateInvoicePDF(invoice: Invoice, job: Job, settings: BusinessSettings): Promise<Uint8Array> {
  const doc = new jsPDF();
  const snapshot = invoice.pricingSnapshot || job.pricingSnapshot;

  const bizName = settings.businessName || "GrassRoots Mowing Co.";
  const location = settings.serviceLocation || "Mount Isa";

  // ── Header: GrassRoots Mowing Co. ──
  doc.setFontSize(20);
  doc.setTextColor(31, 77, 58); // Primary green
  doc.text(bizName, 105, 17, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(107, 74, 45); // Secondary brown

  doc.setFontSize(7.5);
  doc.setTextColor(184, 134, 11); // Ochre
  doc.text(`${location.toUpperCase()} REGION — ABORIGINAL-LED COMMUNITY SERVICE`, 105, 30, { align: "center" });

  // Invoice Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 45);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 52);
  doc.text(`Status: ${(invoice.status || 'pending').toUpperCase()}`, 20, 59);

  // Customer Details
  doc.setFontSize(14);
  doc.text("Billed To:", 130, 45);
  doc.setFontSize(10);
  doc.text(`${invoice.clientName}`, 130, 52);
  doc.text(`${invoice.clientAddress}`, 130, 57);
  if (job.clientPhone) doc.text(`${job.clientPhone}`, 130, 62);

  // Items Table
  const tableData = (invoice.items || []).map(item => [item.description, `$${(item.amount || 0).toFixed(2)}`]);
  
  autoTable(doc, {
    startY: 75,
    head: [['Description', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [139, 0, 0] },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 30, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Pricing Breakdown (Authoritative)
  if (snapshot) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Detailed Breakdown:", 20, finalY);
    
    let currentY = finalY + 7;
    doc.setFontSize(9);
    doc.text(`- Base Package (${snapshot.packageName}): $${(snapshot.basePrice || 0).toFixed(2)}`, 25, currentY);
    currentY += 5;
    if (snapshot.tierAdjustment && snapshot.tierAdjustment !== 0) {
      doc.text(`- Tier Adjustment (${snapshot.tierName}): $${snapshot.tierAdjustment.toFixed(2)}`, 25, currentY);
      currentY += 5;
    }
    if ((snapshot.gradeAdjustment || 0) !== 0 || (snapshot.conditionSurcharge || 0) !== 0) {
      doc.text(`- Condition / Grade Adjustments: $${((snapshot.gradeAdjustment || 0) + (snapshot.conditionSurcharge || 0)).toFixed(2)}`, 25, currentY);
      currentY += 5;
    }
    if (snapshot.addOnTotal && snapshot.addOnTotal > 0) {
      doc.text(`- Add-on Total: $${snapshot.addOnTotal.toFixed(2)}`, 25, currentY);
      currentY += 5;
    }
  }

  // Totals - always show Subtotal + GST (10%) + GST-inclusive total.
  // Prices are stored GST-inclusive; derive the split for the tax summary.
  const invTotal = (invoice as any).totalIncludingGst ?? invoice.totalAmount ?? snapshot?.total ?? 0;
  const invSubtotal = (invoice as any).subtotal ?? snapshot?.subtotal ?? deriveGstFromInclusive(invTotal).subtotal;
  const invGst = (invoice as any).gstAmount ?? snapshot?.gst ?? deriveGstFromInclusive(invTotal).gstAmount;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Subtotal (excl. GST): $${invSubtotal.toFixed(2)}`, 190, finalY + 5, { align: "right" });
  doc.text(`GST (10%): $${invGst.toFixed(2)}`, 190, finalY + 11, { align: "right" });
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL AMOUNT (inc. GST): $${invTotal.toFixed(2)}`, 190, finalY + 22, { align: "right" });

  // Payment Info
  if (invoice.status === 'paid') {
     doc.setTextColor(0, 128, 0);
     doc.text("PAID", 190, finalY + 25, { align: "right" });
  } else {
     // Preferred method: PayID (from Firebase settings). Shown above the
     // existing payment link, which is unchanged.
     const payOpts = getPaymentOptions(settings);
     doc.setFontSize(10);
     doc.setTextColor(0, 0, 0);
     doc.text(payOpts.heading, 20, finalY + 32);
     doc.setFontSize(9);
     doc.text(payOpts.instruction, 20, finalY + 38, { maxWidth: 170 });
     doc.setFontSize(11);
     doc.text(payOpts.phone, 20, finalY + 44);
     doc.setFontSize(8);
     doc.setTextColor(90, 90, 90);
     doc.text(payOpts.alternatives, 20, finalY + 50, { maxWidth: 170 });

     doc.setFontSize(10);
     doc.setTextColor(139, 0, 0);
     doc.text(`Link: ${invoice.paymentLink}`, 20, finalY + 58);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Thank you for choosing ${bizName} | ${location}`, 105, 285, { align: "center" });

  return new Uint8Array(doc.output('arraybuffer'));
}

export async function generateQuotePDF(job: Job, settings: BusinessSettings): Promise<Uint8Array> {
  const doc = new jsPDF();
  const snapshot = job.pricingSnapshot;
  const bizName = settings.businessName || "GrassRoots Mowing Co.";
  const location = settings.serviceLocation || "Mount Isa";

  // ── Header: GrassRoots Mowing Co. ──
  doc.setFontSize(20);
  doc.setTextColor(31, 77, 58); // Primary green
  doc.text(bizName, 105, 17, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(107, 74, 45); // Secondary brown

  doc.setFontSize(10);
  doc.setTextColor(184, 134, 11); // Ochre
  doc.text("SERVICE QUOTE", 105, 31, { align: "center" });

  // Quote Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Quote ID: Q-${job.id.substring(0, 8).toUpperCase()}`, 20, 45);
  doc.text(`Valid Until: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 20, 52);

  // Client
  doc.setFontSize(14);
  doc.text("Bill To:", 130, 45);
  doc.setFontSize(10);
  doc.text(`${job.clientName}`, 130, 52);
  doc.text(`${job.address}`, 130, 57);

  // Table
  const items = [
    [job.servicePackage?.replace('_', ' ') || 'Standard Mowing', `$${(snapshot?.basePrice || job.basePrice || 0).toFixed(2)}`],
    ['Extra Costs (Client Type)', `$${(snapshot?.tierAdjustment || 0).toFixed(2)}`],
    ['Extra Costs (Grass/Condition)', `$${((snapshot?.gradeAdjustment || job.gradeAdjustment || 0) + (snapshot?.conditionSurcharge || job.conditionSurcharge || 0)).toFixed(2)}`],
    ['Extras', `$${(snapshot?.addOnTotal || job.addOnTotal || 0).toFixed(2)}`]
  ];

  autoTable(doc, {
    startY: 75,
    head: [['Service Details', 'Estimate']],
    body: items,
    theme: 'grid',
    headStyles: { fillColor: [139, 0, 0] }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(10);
  const qSubtotal = snapshot?.subtotal ?? deriveGstFromInclusive(job.price || 0).subtotal;
  const qGst = snapshot?.gst ?? deriveGstFromInclusive(job.price || 0).gstAmount;
  doc.text(`Subtotal: $${qSubtotal.toFixed(2)}`, 190, finalY, { align: "right" });
  doc.text(`GST (10%): $${qGst.toFixed(2)}`, 190, finalY + 6, { align: "right" });

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL PRICE: $${(snapshot?.total || job.price || 0).toFixed(2)}`, 190, finalY + 15, { align: "right" });

  // Preferred method: PayID (from Firebase settings).
  // Display only — the payment link and cash remain available.
  const qPayOpts = getPaymentOptions(settings);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(qPayOpts.heading, 20, finalY + 28);
  doc.setFontSize(9);
  doc.text(qPayOpts.instruction, 20, finalY + 34, { maxWidth: 170 });
  doc.setFontSize(11);
  doc.text(qPayOpts.phone, 20, finalY + 40);
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(qPayOpts.alternatives, 20, finalY + 46, { maxWidth: 170 });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("NOTES: This quote is subject to on-site verification. Prices include GST.", 20, 270);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 275);

  return new Uint8Array(doc.output('arraybuffer'));
}

export async function generateBookingPDF(job: Job, settings: BusinessSettings): Promise<Uint8Array> {
  const doc = new jsPDF();
  const bizName = settings.businessName || "GrassRoots Mowing Co.";

  // ── Header: GrassRoots Mowing Co. ──
  doc.setFontSize(20);
  doc.setTextColor(31, 77, 58); // Primary green
  doc.text(bizName, 105, 15, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(107, 74, 45); // Secondary brown

  doc.setFontSize(14);
  doc.setTextColor(139, 0, 0);
  doc.text("BOOKING CONFIRMED", 105, 30, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Job Date: ${new Date(job.scheduledDate).toLocaleDateString()}`, 20, 45);
  doc.text(`Time Window: ${(job.timeSlot || 'anytime').toUpperCase()}`, 20, 55);

  doc.text("Property Address:", 20, 75);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(job.address, 20, 82);
  doc.setFont("helvetica", "normal");
  doc.text(job.suburb, 20, 89);

  doc.text("What's Included:", 20, 110);
  const inclusions = [
    [`Package: ${job.servicePackage?.toUpperCase() || 'STANDARD'}`],
    [`Condition: ${job.serviceGrade?.toUpperCase() || 'MEDIUM'}`],
    [`Extras: ${(job.addOns ?? []).map(a => a.name).join(', ') || 'None'}`]
  ];

  autoTable(doc, {
    startY: 115,
    body: inclusions,
    theme: 'plain'
  });

  doc.setFontSize(10);
  doc.text("INSTRUCTIONS: Please ensure all gates are unlocked and pets are secured.", 20, 250);
  doc.text(`Ref: ${job.id}`, 20, 255);

  return new Uint8Array(doc.output('arraybuffer'));
}

export async function generateServiceReportPDF(job: Job, settings: BusinessSettings): Promise<Uint8Array> {
  const doc = new jsPDF();
  const bizName = settings.businessName || "GrassRoots Mowing Co.";

  // ── Header: GrassRoots Mowing Co. ──
  doc.setFontSize(20);
  doc.setTextColor(31, 77, 58); // Primary green
  doc.text(bizName, 105, 15, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(107, 74, 45); // Secondary brown

  doc.setFontSize(14);
  doc.setTextColor(0, 100, 0); // Dark Green for completion
  doc.text("SERVICE REPORT", 105, 30, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Property: ${job.address}`, 20, 40);
  doc.text(`Date Completed: ${new Date(job.updatedAt || Date.now()).toLocaleDateString()}`, 20, 47);

  doc.setFontSize(14);
  doc.text("Team Notes:", 20, 65);
  doc.setFontSize(10);
  doc.text(job.notes || "Standard maintenance performed. Property left secure.", 20, 75, { maxWidth: 170 });

  if (job.afterPhotos && job.afterPhotos.length > 0) {
    doc.text("Photos are available on the client portal.", 20, 100);
  }

  doc.text("GrassRoots recommends fortnightly visits for a healthy lawn.", 20, 120);

  return new Uint8Array(doc.output('arraybuffer'));
}

export async function generateReceiptPDF(invoice: Invoice, job: Job, settings: BusinessSettings): Promise<Uint8Array> {
  const doc = new jsPDF();
  const bizName = settings.businessName || "GrassRoots Mowing Co.";

  // ── Header: GrassRoots Mowing Co. ──
  doc.setFontSize(20);
  doc.setTextColor(31, 77, 58); // Primary green
  doc.text(bizName, 105, 15, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(107, 74, 45); // Secondary brown

  doc.setFontSize(14);
  doc.setTextColor(0, 128, 0);
  doc.text("PAYMENT RECEIPT", 105, 30, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Receipt #: REC-${invoice.invoiceNumber}`, 20, 45);
  doc.text(`Date Paid: ${new Date(invoice.paidAt || Date.now()).toLocaleDateString()}`, 20, 52);
  doc.text(`Source: ${invoice.paymentMethod?.toUpperCase() || 'Stripe'}`, 20, 59);

  // GST breakdown on the receipt (amount paid is GST-inclusive).
  const recTotal = (invoice as any).totalIncludingGst ?? invoice.totalAmount ?? 0;
  const recSubtotal = (invoice as any).subtotal ?? deriveGstFromInclusive(recTotal).subtotal;
  const recGst = (invoice as any).gstAmount ?? deriveGstFromInclusive(recTotal).gstAmount;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Subtotal (excl. GST): $${recSubtotal.toFixed(2)}`, 190, 70, { align: "right" });
  doc.text(`GST (10%): $${recGst.toFixed(2)}`, 190, 76, { align: "right" });
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`AMOUNT PAID (inc. GST): $${recTotal.toFixed(2)}`, 190, 86, { align: "right" });

  doc.setFontSize(10);
  doc.text("This document serves as proof of payment for services rendered.", 20, 100);

  return new Uint8Array(doc.output('arraybuffer'));
}