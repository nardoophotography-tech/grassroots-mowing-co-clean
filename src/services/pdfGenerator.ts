import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Job, BusinessSettings } from "../types";

export async function generateInvoicePDF(invoice: Invoice, job: Job, settings: BusinessSettings): Promise<Uint8Array> {
  const doc = new jsPDF();
  const snapshot = invoice.pricingSnapshot || job.pricingSnapshot;

  const bizName = settings.businessName || "GrassRoots Mowing Co.";
  const location = settings.serviceLocation || "Mount Isa";

  // Header
  doc.setFontSize(22);
  doc.setTextColor(139, 0, 0); // Deep Red
  doc.text(bizName, 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(184, 134, 11); // Ochre
  doc.text(`${location.toUpperCase()} REGION'S LOCAL LAWN CARE`, 105, 27, { align: "center" });

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

  // Total
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL AMOUNT: $${(invoice.totalAmount || 0).toFixed(2)}`, 190, finalY + 15, { align: "right" });

  // Payment Info
  if (invoice.status === 'paid') {
     doc.setTextColor(0, 128, 0);
     doc.text("PAID", 190, finalY + 25, { align: "right" });
  } else {
     doc.setFontSize(10);
     doc.setTextColor(139, 0, 0);
     doc.text(`Link: ${invoice.paymentLink}`, 20, finalY + 35);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Thank you for your business! ${bizName} - ${location}`, 105, 285, { align: "center" });

  return new Uint8Array(doc.output('arraybuffer'));
}

export async function generateQuotePDF(job: Job, settings: BusinessSettings): Promise<Uint8Array> {
  const doc = new jsPDF();
  const snapshot = job.pricingSnapshot;
  const bizName = settings.businessName || "GrassRoots Mowing Co.";
  const location = settings.serviceLocation || "Mount Isa";

  // Header
  doc.setFontSize(22);
  doc.setTextColor(139, 0, 0); 
  doc.text(bizName, 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(184, 134, 11);
  doc.text("SERVICE QUOTE", 105, 27, { align: "center" });

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
  doc.text(`Subtotal: $${(snapshot?.subtotal || (job.price / 1.1) || 0).toFixed(2)}`, 190, finalY, { align: "right" });
  doc.text(`GST (10%): $${(snapshot?.gst || (job.price - (job.price / 1.1)) || 0).toFixed(2)}`, 190, finalY + 6, { align: "right" });

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL PRICE: $${(snapshot?.total || job.price || 0).toFixed(2)}`, 190, finalY + 15, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("NOTES: This quote is subject to on-site verification. Prices include GST.", 20, 270);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 275);

  return new Uint8Array(doc.output('arraybuffer'));
}

export async function generateBookingPDF(job: Job, settings: BusinessSettings): Promise<Uint8Array> {
  const doc = new jsPDF();
  const bizName = settings.businessName || "GrassRoots Mowing Co.";

  doc.setFontSize(22);
  doc.setTextColor(139, 0, 0);
  doc.text("BOOKING CONFIRMED", 105, 20, { align: "center" });

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
    [`Extras: ${job.addOns.map(a => a.name).join(', ') || 'None'}`]
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

  doc.setTextColor(0, 100, 0); // Dark Green for completion
  doc.setFontSize(22);
  doc.text("SERVICE REPORT", 105, 20, { align: "center" });

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

  doc.setFontSize(22);
  doc.setTextColor(0, 128, 0);
  doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Receipt #: REC-${invoice.invoiceNumber}`, 20, 45);
  doc.text(`Date Paid: ${new Date(invoice.paidAt || Date.now()).toLocaleDateString()}`, 20, 52);
  doc.text(`Source: ${invoice.paymentMethod?.toUpperCase() || 'Stripe'}`, 20, 59);

  doc.setFontSize(16);
  doc.text(`AMOUNT PAID: $${(invoice.totalAmount || 0).toFixed(2)}`, 190, 80, { align: "right" });

  doc.setFontSize(10);
  doc.text("This document serves as proof of payment for services rendered.", 20, 100);

  return new Uint8Array(doc.output('arraybuffer'));
}
