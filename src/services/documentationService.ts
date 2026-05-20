import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, collection, addDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { Job, Invoice, BusinessSettings, AppDocument } from '../types';
import * as pdfGen from './pdfGenerator';
import { Mythos } from '../lib/mythos';

class DocumentationService {
  /**
   * Universal document generator and uploader
   */
  private async createDoc(
    jobId: string, 
    type: AppDocument['type'], 
    buffer: Uint8Array, 
    name: string
  ): Promise<string | null> {
    try {
      const storagePath = `jobs/${jobId}/docs/${type}_${Date.now()}.pdf`;
      const storageRef = ref(storage, storagePath);
      
      // Upload
      await uploadBytes(storageRef, buffer, { contentType: 'application/pdf' });
      const url = await getDownloadURL(storageRef);

      // Record in job
      const jobRef = doc(db, 'jobs', jobId);
      const docEntry: Omit<AppDocument, 'id'> = {
        jobId,
        type,
        name,
        url,
        createdAt: Date.now()
      };

      // Add to master documents collection for easy global retrieval
      const docRef = await addDoc(collection(db, 'documents'), docEntry);
      
      // Link to job
      const updateData: any = {
        [`${type}PdfUrl`]: url,
        documents: arrayUnion({ ...docEntry, id: docRef.id })
      };
      
      await updateDoc(jobRef, updateData);

      Mythos.info("DOCUMENT_GENERATED", { jobId, type, url });
      return url;
    } catch (error) {
      Mythos.error("DOCUMENT_GENERATION_FAILED", { jobId, type, error });
      return null;
    }
  }

  async generateQuote(job: Job, settings: BusinessSettings) {
    try {
      console.log(`[DocumentationService] Generating Quote PDF for job: ${job.id}`);
      const buffer = await pdfGen.generateQuotePDF(job, settings);
      const url = await this.createDoc(job.id, 'quote', buffer, `Quote - ${job.address}`);
      if (!url) {
        console.error(`[DocumentationService] Quote PDF generation succeeded but upload failed for job: ${job.id}`);
      }
      return url;
    } catch (error) {
      console.error(`[DocumentationService] Quote PDF generation FAILED for job: ${job.id}`, error);
      Mythos.error("QUOTE_PDF_GENERATION_FAILED", { jobId: job.id, error });
      return null;
    }
  }

  async generateBooking(job: Job, settings: BusinessSettings) {
    const buffer = await pdfGen.generateBookingPDF(job, settings);
    return this.createDoc(job.id, 'booking', buffer, `Booking Confirmation - ${job.address}`);
  }

  async generateServiceReport(job: Job, settings: BusinessSettings) {
    const buffer = await pdfGen.generateServiceReportPDF(job, settings);
    return this.createDoc(job.id, 'report', buffer, `Service Report - ${job.address}`);
  }

  async generateInvoice(invoice: Invoice, job: Job, settings: BusinessSettings) {
    const buffer = await pdfGen.generateInvoicePDF(invoice, job, settings);
    const url = await this.createDoc(job.id, 'invoice', buffer, `Invoice - ${invoice.invoiceNumber}`);
    
    // Also update invoice directly
    if (url) {
      await updateDoc(doc(db, 'invoices', invoice.id), { invoicePdfUrl: url });
    }
    return url;
  }

  async generateReceipt(invoice: Invoice, job: Job, settings: BusinessSettings) {
    const buffer = await pdfGen.generateReceiptPDF(invoice, job, settings);
    const url = await this.createDoc(job.id, 'receipt', buffer, `Receipt - ${invoice.invoiceNumber}`);
    
    // Update invoice if needed
    if (url) {
      await updateDoc(doc(db, 'invoices', invoice.id), { receiptPdfUrl: url });
    }
    return url;
  }
}

export const documentationService = new DocumentationService();
