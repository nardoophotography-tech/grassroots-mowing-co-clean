import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Invoice, Job, BusinessSettings } from "../types";

export async function generateInvoicePDF(invoice: Invoice, job: Job, settings: BusinessSettings): Promise<Buffer> {
  const doc = new jsPDF() as any;
  const snapshot = invoice.pricingSnapshot || job.pricingSnapshot;

  const bizName = settings.businessName || "GrassRoots Mowing Co.";
  const location = settings.serviceLocation || "Mount Isa";

  // Header
  doc.setFontSize(22);
  doc.setTextColor(139, 0, 0); // Deep Red
  doc.text(bizName, 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(184, 134, 11); // Ochre
  doc.text(`${location.toUpperCase()} REGION'S PREMIUM LAWN CARE`, 105, 27, { align: "center" });

  // Invoice Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 45);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 52);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 59);

  // Customer Details
  doc.setFontSize(14);
  doc.text("Billed To:", 130, 45);
  doc.setFontSize(10);
  doc.text(`${invoice.clientName}`, 130, 52);
  doc.text(`${invoice.clientAddress}`, 130, 57);
  if (job.clientPhone) doc.text(`${job.clientPhone}`, 130, 62);

  // Items Table
  const tableData = invoice.items.map(item => [item.description, `$${item.amount.toFixed(2)}`]);
  
  (doc as any).autoTable({
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
    doc.text(`- Base Package (${snapshot.packageName}): $${snapshot.basePrice.toFixed(2)}`, 25, currentY);
    currentY += 5;
    if (snapshot.tierAdjustment !== 0) {
      doc.text(`- Tier Adjustment (${snapshot.tierName}): $${snapshot.tierAdjustment.toFixed(2)}`, 25, currentY);
      currentY += 5;
    }
    if (snapshot.gradeAdjustment !== 0 || snapshot.conditionSurcharge !== 0) {
      doc.text(`- Condition / Grade Adjustments: $${(snapshot.gradeAdjustment + snapshot.conditionSurcharge).toFixed(2)}`, 25, currentY);
      currentY += 5;
    }
    if (snapshot.addOnTotal > 0) {
      doc.text(`- Add-on Total: $${snapshot.addOnTotal.toFixed(2)}`, 25, currentY);
      currentY += 5;
    }
  }

  // Total
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL AMOUNT: $${invoice.totalAmount.toFixed(2)}`, 190, finalY + 15, { align: "right" });

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

  return Buffer.from(doc.output('arraybuffer'));
}
