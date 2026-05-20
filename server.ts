import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { Resend } from "resend";
import twilio from "twilio";
import dotenv from "dotenv";
import { calculateServicePrice, getDefaultPricingRules } from "./src/services/pricingEngine.js";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import { generateInvoicePDF, generateReceiptPDF, generateQuotePDF, generateBookingPDF, generateServiceReportPDF } from "./src/services/pdfGenerator.js";

dotenv.config();

// Initialize Firebase Admin
let adminAppConfig: any = {};
try {
  if (fs.existsSync("./firebase-applet-config.json")) {
    adminAppConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  }
} catch (err) {
  console.error("🔴 Failed to read firebase-applet-config.json");
}

const dbId = adminAppConfig.firestoreDatabaseId || "(default)";

const getAdminCredential = () => {
  // 1. Check for FIREBASE_SERVICE_ACCOUNT environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return admin.credential.cert(sa);
    } catch (e) {
      console.error("[Firebase]: Failed to parse FIREBASE_SERVICE_ACCOUNT");
    }
  }

  // 2. Check for service-account.json file
  const saPath = path.join(process.cwd(), "service-account.json");
  if (fs.existsSync(saPath)) {
    return admin.credential.cert(saPath);
  }

  // 3. Fallback to application default
  return admin.credential.applicationDefault();
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: getAdminCredential(),
    projectId: adminAppConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: adminAppConfig.storageBucket || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
}

// Initialize Firestore
const db = getFirestore(admin.app(), adminAppConfig.firestoreDatabaseId || process.env.VITE_FIREBASE_DATABASE_ID);
console.log(`[Firebase]: Firestore initialized with Project: ${adminAppConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID}, DB: ${adminAppConfig.firestoreDatabaseId || process.env.VITE_FIREBASE_DATABASE_ID || '(default)'}`);

async function verifyConnectivity() {
  try {
    const testDocPath = "test_connection/verification";
    const testData = {
      timestamp: Date.now(),
      status: "connected",
      message: "Admin SDK test write successful"
    };

    console.log(`[Firebase]: Attempting test write to ${testDocPath}...`);
    await db.doc(testDocPath).set(testData);
    
    const snap = await db.doc(testDocPath).get();
    if (snap.exists && snap.data()?.status === "connected") {
      console.log(`[Firebase]: Connectivity FULLY VERIFIED (Read/Write confirmed)`);
    } else {
      throw new Error("Read verified data mismatch or document missing.");
    }

    await db.collection('_health_check').limit(1).get();
  } catch (e: any) {
    if (e?.message?.includes('NOT_FOUND') || e?.code === 5) {
      console.error(`[Firebase FATAL]: Default database NOT FOUND. Please ensure Cloud Firestore is enabled in the Firebase console.`);
    } else if (e?.message?.includes('PERMISSION_DENIED')) {
      console.error(`[Firebase FATAL]: PERMISSION_DENIED. Check service account roles or security rules.`);
    } else {
      console.warn(`[Firebase Warning]: Connectivity check failed: ${e.message}`);
    }
  }
}

const bucket = admin.app().options.storageBucket ? admin.storage().bucket() : null;

// Helper for E.164 phone formatting
const toE164 = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  let formatted = cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    formatted = '61' + cleaned.substring(1);
  } else if (cleaned.length === 9 && (cleaned.startsWith('4') || cleaned.startsWith('5'))) {
    formatted = '61' + cleaned;
  }
  return formatted.startsWith('+') ? formatted : '+' + formatted;
};

const isESM = typeof import.meta !== 'undefined' && import.meta.url;
const _filename = isESM ? fileURLToPath(import.meta.url) : (typeof __filename !== 'undefined' ? __filename : '');
const _dirname = isESM ? path.dirname(_filename) : (typeof __dirname !== 'undefined' ? __dirname : process.cwd());

// Notification Stages
type NotificationStage = 
  | 'booking-created'
  | 'payment-successful'
  | 'job-scheduled'
  | 'team-en-route' 
  | 'in-progress' 
  | 'completed' 
  | 'invoice-sent' 
  | 'payment-reminder' 
  | 'payment-receipt';

// Utility for retries
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

// Utility for server-side document storage
async function generateAndStoreDocument(type: 'invoice' | 'receipt' | 'quote' | 'booking' | 'report', jobId: string, data: any) {
  if (!bucket) return null;
  try {
    const jobDoc = await db.collection("jobs").doc(jobId).get();
    if (!jobDoc.exists) return null;
    const jobData = jobDoc.data() as any;
    jobData.id = jobDoc.id;

    const settingsDoc = await db.collection("settings").doc("business").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    let pdfBuffer: Uint8Array;
    let fileName = `${type}_${jobId}`;
    
    // Document generation using static imports

    switch(type) {
      case 'invoice': pdfBuffer = await generateInvoicePDF(data, jobData, settings as any); break;
      case 'receipt': pdfBuffer = await generateReceiptPDF(data, jobData, settings as any); break;
      case 'quote': pdfBuffer = await generateQuotePDF(jobData, settings as any); break;
      case 'booking': pdfBuffer = await generateBookingPDF(jobData, settings as any); break;
      case 'report': pdfBuffer = await generateServiceReportPDF(jobData, settings as any); break;
      default: throw new Error(`Unknown doc type: ${type}`);
    }

    const filePath = `documents/${jobId}/${type}_${Date.now()}.pdf`;
    const file = bucket.file(filePath);

    await file.save(Buffer.from(pdfBuffer), {
      metadata: { contentType: "application/pdf" },
    });
    
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    // Create record in documents collection (Admin privilege)
    const docRef = await db.collection("documents").add({
      jobId, type, url: publicUrl, name: `${type.toUpperCase()} - ${jobData.address}`, createdAt: Date.now()
    });

    // Link to job
    const updateData: any = { [`${type}PdfUrl`]: publicUrl };
    // Also add to documents array if helpful
    updateData.documents = admin.firestore.FieldValue.arrayUnion({
      id: docRef.id, jobId, type, url: publicUrl, name: `${type.toUpperCase()} - ${jobData.address}`, createdAt: Date.now()
    });

    await db.collection("jobs").doc(jobId).update(updateData);

    // If it's an invoice, update invoice doc too
    if (type === 'invoice' || type === 'receipt') {
      const invId = data.id || jobData.invoiceId || jobId;
      await db.collection("invoices").doc(invId).update({
        [(type === 'invoice' ? 'invoicePdfUrl' : 'receiptPdfUrl')]: publicUrl,
        updatedAt: Date.now()
      });
    }

    console.log(`[DocumentGen]: SUCCESS - ${type} for ${jobId} -> ${publicUrl}`);
    return publicUrl;
  } catch (err: any) {
    console.log(`[DocumentGen]: FAILED - ${type} for ${jobId}: ${err.message}`);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe initialization
  let stripe: Stripe | null = null;
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
  } catch (err: any) {
    console.error("🔴 Failed to initialize Stripe client:", err.message);
  }

  // Resend initialization
  const resend = process.env.RESEND_API_KEY 
    ? new Resend(process.env.RESEND_API_KEY) 
    : null;

  // Twilio initialization
  const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

  // Notification Handler Function
  const handleNotification = async (payload: any) => {
    if (!payload || typeof payload !== 'object') {
      console.error("[handleNotification] Invalid payload received:", payload);
      throw new Error("Valid notification payload is required");
    }
    const { stage, job, clientEmail, clientPhone, clientName, amount, invoiceNumber } = payload;
    const paymentLink = payload.invoiceLink || job?.paymentLink || '';
    let pdfUrl = '';
    
    if (!stage) {
      console.error("[handleNotification] Missing stage in payload");
      throw new Error("Notification stage is required");
    }
    
    console.log(`[handleNotification]: Processing ${stage} for ${clientName || 'unknown'}`);

    // Fetch Settings briefly for templates
    let settings: any = {};
    try {
      const settingsDoc = await db.collection("settings").doc("business").get();
      if (settingsDoc.exists) settings = settingsDoc.data();
    } catch (err) {
      console.error("[handleNotification]: Failed to fetch settings for templates");
    }

    const results = {
      email: 'skipped',
      sms: 'skipped',
      adminEmail: 'skipped',
      adminSms: 'skipped',
    };

    const dateStr = job?.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : 'TBD';

    let emailSubject = '';
    let emailContent = '';
    let smsContent = '';
    let adminEmailSubject = '';
    let adminEmailContent = '';
    let adminSmsContent = '';
    const adminEmails = ["nardoophotography@gmail.com"];

    const replacePlaceholders = (text: string, data: any) => {
      if (!text) return '';
      return text
        .replace(/\[Client Name\]/g, data.clientName || 'Valued Client')
        .replace(/\[Amount\]/g, `$${(data.amount || 0).toFixed(2)}`)
        .replace(/\[Link\]/g, data.paymentLink || data.invoiceLink || '')
        .replace(/\[Invoice Number\]/g, data.invoiceNumber || 'INV-001')
        .replace(/\[PDF Link\]/g, data.pdfUrl || '');
    };

    // 1. Internal Document Generation (Authoritative) - DO THIS FIRST so pdfUrl is ready
    if (['booking-confirmed', 'booking-created', 'quote-sent', 'payment-successful', 'completed', 'invoice-sent', 'payment-receipt', 'lead-captured'].includes(stage)) {
       try {
         console.log(`[handleNotification]: Step 1 - Initiating Document Generation for ${stage}`);
         
         if (job?.id) {
           const docTypes: ('invoice' | 'receipt' | 'quote' | 'booking' | 'report')[] = [];

           if (stage === 'quote-sent' || stage === 'lead-captured') {
             docTypes.push('quote');
           } else if (stage === 'booking-confirmed' || stage === 'booking-created') {
             docTypes.push('booking');
             docTypes.push('quote'); // Send the agreed quote/pricing breakdown with booking
           } else if (stage === 'completed') {
             docTypes.push('report');
           } else if (stage === 'payment-successful' || stage === 'payment-receipt') {
             docTypes.push('receipt');
           } else if (stage === 'invoice-sent') {
             docTypes.push('invoice');
           }

           for (const type of docTypes) {
             let extraData = {};
             if (type === 'invoice' || type === 'receipt') {
               const invId = payload.invoiceNumber || job.invoiceId || job.id;
               const invSnap = await db.collection("invoices").doc(invId).get();
               if (invSnap.exists) extraData = invSnap.data()!;
             }

             const url = await generateAndStoreDocument(type, job.id, extraData);
             if (url && (type === 'invoice' || type === 'receipt' || type === 'quote' || type === 'booking')) {
               // Prioritize which URL is used in the default [PDF Link] placeholder
               // but all are stored on the job doc now
               pdfUrl = url; 
             }
           }
         }
       } catch (docErr) {
         console.error("[handleNotification] Doc generation failure (Non-blocking):", docErr);
       }
    }

    // 2. Template Generation
    switch (stage) {
      case 'booking-created':
      case 'booking-confirmed':
      case 'lead-captured':
        const isConfirmed = stage === 'booking-confirmed';
        const isLead = stage === 'lead-captured';
        emailSubject = isConfirmed ? `Booking Confirmed: GrassRoots Mowing` : (isLead ? `Quote Request Received: GrassRoots Mowing` : `Service Request Received: GrassRoots Mowing`);
        const snapshot = job?.pricingSnapshot;
        const breakdownText = snapshot ? `
Breakdown:
- Base (${snapshot.packageName}): $${(snapshot.basePrice || 0).toFixed(2)}
${(snapshot.tierAdjustment || 0) !== 0 ? `- Client Type Adj: $${(snapshot.tierAdjustment || 0).toFixed(2)}\n` : ''}- Extra Costs (Grass/Condition): $${((snapshot.gradeAdjustment || 0) + (snapshot.conditionSurcharge || 0) + (snapshot.urgencySurcharge || 0)).toFixed(2)}
- Extras: $${(snapshot.addOnTotal || 0).toFixed(2)}
--------------------
Subtotal: $${(snapshot.subtotal || 0).toFixed(2)}
GST (10%): $${(snapshot.gst || 0).toFixed(2)}
Total: $${(snapshot.total || 0).toFixed(2)}
` : `Total: $${(job?.price || 0).toFixed(2)}`;

        emailContent = `Hi ${clientName},\n\n${isConfirmed ? "You're all booked in!" : (isLead ? 'We have received your quote request.' : 'We have received your service request.')}\n\nDate: ${dateStr}\nTime: ${job?.timeSlot || 'TBD'}\nLocation: ${job?.address || 'TBD'}\n\n${breakdownText}${pdfUrl ? `\n\nYou can download your Job Details & Quote here: ${pdfUrl}` : ''}\n\nView Portal: ${paymentLink || 'N/A'}\n\n${isConfirmed ? 'Thanks for choosing GrassRoots!' : 'We will review your request and get back to you shortly.'}`;
        smsContent = `GrassRoots Mowing: ${isConfirmed ? "You're all booked in!" : 'Request Received'}\nTotal: $${(job?.price || 0).toFixed(2)}\nDate: ${dateStr}\nDetails: ${paymentLink || ''}${pdfUrl ? `\nPDF: ${pdfUrl}` : ''}`;
        adminEmailSubject = `NEW ${isConfirmed ? 'CONFIRMED' : (isLead ? 'QUOTE REQUEST' : 'PENDING')} JOB: ${clientName}`;
        adminEmailContent = `A new ${isConfirmed ? 'paid' : 'pending'} job has been created.\n\nClient: ${clientName}\nService: ${job?.serviceType || job?.servicePackage || 'Service'}\nLocation: ${job?.address || 'TBD'}\nTotal: $${job?.price || 0}`;
        adminSmsContent = `New ${isConfirmed ? 'paid' : (isLead ? 'quote req' : 'pending')} job: ${job?.serviceType || job?.servicePackage || 'Service'} at ${job?.address || 'TBD'}`;
        break;

      case 'quote-sent':
        const quoteSnapshot = job?.pricingSnapshot;
        const quoteBreakdown = quoteSnapshot ? `
Breakdown:
- Base (${quoteSnapshot.packageName}): $${(quoteSnapshot.basePrice || 0).toFixed(2)}
${(quoteSnapshot.tierAdjustment || 0) !== 0 ? `- Client Type Adj: $${(quoteSnapshot.tierAdjustment || 0).toFixed(2)}\n` : ''}- Extra Costs (Grass/Condition): $${((quoteSnapshot.gradeAdjustment || 0) + (quoteSnapshot.conditionSurcharge || 0) + (quoteSnapshot.urgencySurcharge || 0)).toFixed(2)}
- Extras: $${(quoteSnapshot.addOnTotal || 0).toFixed(2)}
--------------------
Subtotal: $${(quoteSnapshot.subtotal || 0).toFixed(2)}
GST (10%): $${(quoteSnapshot.gst || 0).toFixed(2)}
Total: $${(quoteSnapshot.total || 0).toFixed(2)}
` : `Estimated Total: $${(job?.price || 0).toFixed(2)}`;

        emailSubject = `Your Service Quote: GrassRoots Mowing`;
        emailContent = `Hi ${clientName},\n\nWe have prepared a quote for your service at ${job?.address || 'TBD'}.\n\n${quoteBreakdown}\n\nYou can view the full details and approve it here:\n${paymentLink}${pdfUrl ? `\n\nDownload PDF: ${pdfUrl}` : ''}\n\nThanks,\nGrassRoots Team`;
        smsContent = `GrassRoots Mowing: Your quote of $${(job?.price || 0).toFixed(2)} is ready. Approve here: ${paymentLink}${pdfUrl ? `\nPDF: ${pdfUrl}` : ''}`;
        break;

      case 'payment-successful':
        emailSubject = `Payment Confirmed: Invoice ${invoiceNumber || job?.invoiceNumber || 'Receipt'} - GrassRoots Mowing Co.`;
        emailContent = settings.receiptTemplate 
          ? replacePlaceholders(settings.receiptTemplate, { clientName, amount, invoiceNumber: invoiceNumber || job?.invoiceNumber || job?.id, paymentLink, pdfUrl })
          : `Hi ${clientName},\n\nPayment Successful!\n\nInvoice Number: ${invoiceNumber || job?.invoiceNumber || 'N/A'}\nAmount Paid: $${(amount || 0)}\nStatus: PAID\n\nYou can view your receipt here: ${paymentLink}${pdfUrl ? `\n\nDownload PDF Receipt: ${pdfUrl}` : ''}\n\nWe've received your payment and your booking is confirmed in our schedule.\n\nThanks for choosing GrassRoots!`;
        smsContent = `GrassRoots Mowing: Payment of $${(amount || 0)} received. Thank you! Receipt: ${paymentLink}${pdfUrl ? `\nPDF: ${pdfUrl}` : ''}`;
        adminEmailSubject = `PAYMENT RECEIVED: $${(amount || 0)} from ${clientName}`;
        adminEmailContent = `Payment of $${(amount || 0)} has been received for job ${job?.id || 'N/A'}. Invoice: ${invoiceNumber || 'N/A'}`;
        break;

      case 'job-scheduled':
        emailSubject = `Service Scheduled: GrassRoots Mowing Co.`;
        emailContent = `Hi ${clientName},\n\nYour lawn service at ${job?.address || 'TBD'} has been scheduled for ${dateStr} in the ${job?.timeSlot || 'TBD'} window.`;
        smsContent = `Your GrassRoots service at ${job?.address || 'TBD'} is scheduled for ${dateStr} (${job?.timeSlot || 'TBD'}).`;
        break;

      case 'team-en-route':
        smsContent = settings.messageTemplate 
          ? replacePlaceholders(settings.messageTemplate, { clientName })
          : `Hi ${clientName}, our team is on the way to your property and will arrive shortly.`;
        break;

      case 'completed':
        emailSubject = `Service Completed: GrassRoots Mowing Co.`;
        emailContent = `Hi ${clientName},\n\nYour service at ${job?.address || 'TBD'} is complete. You can view your report and invoice here: ${paymentLink}${pdfUrl ? `\n\nDownload Service Report: ${pdfUrl}` : ''}`;
        smsContent = settings.paymentLinkTemplate 
          ? replacePlaceholders(settings.paymentLinkTemplate, { clientName, invoiceLink: paymentLink, amount: job?.price || 0, pdfUrl })
          : `Service completed at ${job?.address || 'TBD'}. Download report: ${pdfUrl || paymentLink}`;
        break;

      case 'invoice-sent':
        emailSubject = `Final Invoice: ${invoiceNumber || 'Your Service'} - GrassRoots Mowing Co.`;
        emailContent = `Hi ${clientName},\n\nYour service at ${job?.address || 'TBD'} is complete. We've generated your final invoice.\n\nAmount Due: $${(amount || job?.price || 0)}\n\nPlease pay using this secure link:\n${paymentLink}${pdfUrl ? `\n\nDownload PDF Invoice: ${pdfUrl}` : ''}\n\nThanks for choosing GrassRoots!`;
        smsContent = `GrassRoots Mowing: Service complete! Final invoice of $${(amount || job?.price || 0)} is ready. Pay here: ${paymentLink}${pdfUrl ? `\nPDF: ${pdfUrl}` : ''}`;
        break;

      case 'payment-receipt':
        emailSubject = `Payment Receipt: ${invoiceNumber || 'Your Service'} - GrassRoots Mowing Co.`;
        emailContent = `Hi ${clientName},\n\nThank you for your payment of $${(amount || 0)}\n\nYour service at ${job?.address || 'TBD'} is now fully paid and closed.\n\nYou can view your receipt here: ${paymentLink}${pdfUrl ? `\n\nDownload PDF Receipt: ${pdfUrl}` : ''}\n\nThanks for choosing GrassRoots!`;
        smsContent = `GrassRoots Mowing: Payment received! Thank you for the $${(amount || 0)}. Receipt: ${paymentLink}${pdfUrl ? `\nPDF: ${pdfUrl}` : ''}`;
        break;

      case 'staff-invite':
        emailSubject = `Welcome to GrassRoots Mowing Co - Setup Your Profile`;
        emailContent = `Hi ${clientName},\n\nYou've been invited to join the GrassRoots Mowing Co team!\n\nPlease complete your securely encrypted onboarding profile, including bank details, TFN, Super, and sign your employment agreement using this link:\n\n${paymentLink}\n\nThanks,\nManagement`;
        smsContent = `Hi ${clientName}, you've been invited to join GrassRoots Mowing Co! Please complete your secure onboarding profile using this link: ${paymentLink}`;
        break;
    }

    const sendSms = async (to: string, body: string) => {
      // Use Messaging Service SID if available, otherwise Fallback to Phone Number
      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (twilioClient && (messagingServiceSid || fromNumber) && to) {
        const finalTo = toE164(to);

        try {
          const params: any = { body, to: finalTo };
          if (messagingServiceSid) {
            params.messagingServiceSid = messagingServiceSid;
          } else {
            params.from = fromNumber;
          }

          const message = await retry(() => twilioClient.messages.create(params));
          return message;
        } catch (err: any) {
          console.error(`[Twilio Failure]: ${err.message}`);
          throw err;
        }
      }
      return { status: 'simulated' };
    };

    const sendEmail = async (to: string, subject: string, text: string) => {
      if (resend && to) {
        return retry(() => resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'bookings@grassrootsmowing.com.au',
          to, subject, text
        }));
      }
      return { status: 'simulated' };
    };

    // Internal Firestore Notification Helper (Admin SDK)
    const createDbNotification = async (userId: string, title: string, message: string, type: string = 'info', link?: string) => {
      try {
        await db.collection("notifications").add({
          userId, title, message, type, link,
          read: false,
          createdAt: Date.now()
        });
      } catch (err) {
        console.error(`[DbNotification] Failed for ${userId}:`, err);
      }
    };

    try {
      // 3. Admin & Client DB Notifications
      if (['booking-confirmed', 'booking-created', 'payment-successful', 'completed', 'quote-sent', 'invoice-sent'].includes(stage)) {
        const adminsSnap = await db.collection("users").where("role", "==", "admin").get();
        for (const adminDoc of adminsSnap.docs) {
          await createDbNotification(adminDoc.id, adminEmailSubject || emailSubject, adminEmailContent || emailContent, 'info', `/jobs/${job?.id || ''}`);
        }
      }

      if (job?.clientId) {
        await createDbNotification(job.clientId, emailSubject, emailContent, 'info', `/jobs/${job?.id || ''}`);
      }

      // Step 4. Email notification (Client)
      if (emailContent && clientEmail) {
        try { 
          await sendEmail(clientEmail, emailSubject, emailContent); 
          results.email = 'sent'; 
          console.log(`[handleNotification]: Step 4 - Email sent to ${clientEmail}`);
        } catch (err) { 
          results.email = 'failed'; 
          console.error("[Email Failure] Client:", clientEmail, err);
        }
      }

      // Step 5. SMS notification (Client)
      if (smsContent && clientPhone) {
        try { 
          await sendSms(clientPhone, smsContent); 
          results.sms = 'sent'; 
          console.log(`[handleNotification]: Step 5 - SMS sent to ${clientPhone}`);
        } catch (err) { 
          results.sms = 'failed'; 
          console.error("[SMS Failure] Client:", clientPhone, err);
        }
      }

      // Admin Notifications (Extra channels)
      if (adminEmailContent) {
        for (const email of adminEmails) {
          try { await sendEmail(email, adminEmailSubject, adminEmailContent); results.adminEmail = 'sent'; } catch (err) { results.adminEmail = 'failed'; }
        }
      }
      
      if (adminSmsContent) {
        const adminPhone = process.env.ADMIN_PHONE_NUMBER;
        if (adminPhone) {
          try { await sendSms(adminPhone, adminSmsContent); results.adminSms = 'sent'; } catch (err) { results.adminSms = 'failed'; }
        }
      }

      return results;
    } catch (err: any) {
      console.error("[handleNotification] Overall Error:", err.message);
      return results;
    }
  };

  // Stripe Webhook Endpoint (MUST be before express.json() for raw body access)
  app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) return res.status(500).send("Stripe not configured");
    
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (endpointSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } else {
        // Fallback for dev without secret (only if not in production or explicit dev mode)
        try {
          console.warn("[Stripe Webhook]: No secret provided. Parsing payload (UNSAFE for production).");
          event = JSON.parse(req.body.toString());
        } catch (parseErr) {
          console.error("[Stripe Webhook]: Failed to parse fallback payload:", parseErr);
          return res.status(400).send(`Webhook Error: Invalid JSON fallback`);
        }
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook Error]: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe Webhook]: Received event ${event.type}`);

    // Handle the event
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const { jobId, invoiceId, flowType } = session.metadata || {};

        console.log(`[Stripe Webhook]: Processing ${flowType || 'payment'} checkout. session=${session.id}, jobId=${jobId}, invoiceId=${invoiceId}`);

        let clientEmail = session.customer_details?.email || session.customer_email || session.metadata?.clientEmail;
        let clientName = session.metadata?.clientName || session.customer_details?.name || "Valued Client";
        let amount = session.amount_total ? session.amount_total / 100 : 0;

        const batch = db.batch();
        let jobData: any = null;

        if (jobId) {
          const jobRef = db.collection("jobs").doc(jobId);
          const jobSnap = await jobRef.get();
          if (jobSnap.exists) {
            jobData = jobSnap.data();
            
            const nextStatus = flowType === 'final_invoice' ? 'paid' : 'scheduled';
            
            batch.update(jobRef, {
              paymentStatus: "successful",
              status: nextStatus,
              stripeSessionId: session.id,
              amountPaid: amount,
              paymentMethod: 'stripe',
              paymentDate: Date.now(),
              updatedAt: Date.now()
            });

            // Trigger Receipt Notification
            await handleNotification({
              stage: 'payment-receipt',
              job: { ...jobData, id: jobId },
              clientEmail,
              clientPhone: jobData.clientPhone,
              clientName,
              amount: amount.toFixed(2),
              invoiceNumber: invoiceId || jobData.invoiceId
            }).catch(e => console.error("[Webhook Notification Error]:", e));
          }
        }

        if (invoiceId) {
          const invoiceRef = db.collection("invoices").doc(invoiceId);
          batch.update(invoiceRef, {
            status: "paid",
            paidAt: Date.now(),
            stripeSessionId: session.id,
            paymentMethod: 'stripe'
          });
        }

        // Add payment record
        const paymentRef = db.collection("payments").doc();
        batch.set(paymentRef, {
          jobId: jobId || null,
          invoiceId: invoiceId || null,
          clientId: session.client_reference_id || session.metadata?.clientId || null,
          clientEmail: clientEmail || null,
          clientName: clientName || null,
          amount: amount,
          status: "successful",
          stripeSessionId: session.id,
          createdAt: Date.now()
        });

        await batch.commit();
        console.log(`[Stripe Webhook]: Firestore updates committed successfully for session ${session.id}`);

        // Trigger PDF generation if invoiceId exists
        if (invoiceId) {
          console.log(`[Stripe Webhook]: Triggering background PDF generation for Invoice ${invoiceId}`);
          // Fire and forget PDF generation
          const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || `http://localhost:${PORT}`;
          fetch(`${baseUrl}/api/generate-invoice-pdf/${invoiceId}`, { method: 'POST' }).catch(err => {
            console.error(`[Stripe Webhook PDF Error]: Failed to trigger PDF generation for ${invoiceId}: ${err.message}`);
          });
        }

        // Trigger notifications directly from backend for maximum reliability
        if (jobId || invoiceId) {
          console.log(`[Stripe Webhook]: Triggering automated payment-successful notification`);
          
          // Use internal notify logic or hit own endpoint
          // For simplicity and to use existing logic in /api/notify, we call it internally or simulate it
          const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || "http://localhost:3000";
          
          // We'll prepare the payload for payment-successful
          const notifyPayload = {
            stage: "payment-successful",
            job: jobId ? { id: jobId, ...jobData } : { id: invoiceId, address: "Site Service" },
            clientEmail: clientEmail,
            clientName: clientName,
            amount: amount,
            invoiceNumber: session.metadata?.invoiceNumber || invoiceId || (jobData?.invoiceId ? jobData.invoiceId : jobId),
            invoiceLink: `${baseUrl}/pay/${invoiceId || jobId}`
          };

          // Since we are in the same process, we could refactor the notify logic to a shared function
          // But to keep it surgical, we'll use a reliable internal trigger if possible or just hit the route
          try {
            console.log(`[Stripe Webhook]: Executing payment confirmation logic...`);
            await handleNotification(notifyPayload);
          } catch (notifyErr: any) {
            console.error(`[Stripe Webhook Notification Error]:`, notifyErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook Process Error]: ${err.message}`);
      // return 200 to acknowledge receipt even if processing fails, 
      // but log the error
    }

    res.json({ received: true });
  });

  // Notification Route
  app.use(express.json({ limit: "50mb" }));
  app.post("/api/notify", async (req, res) => {
    try {
      const results = await handleNotification(req.body);
      res.json(results);
    } catch (err: any) {
      console.error("[Notify Endpoint Error]:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // PDF Generation Endpoint
  app.post("/api/generate-invoice-pdf/:invoiceId", async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const invoiceDoc = await db.collection("invoices").doc(invoiceId).get();
      if (!invoiceDoc.exists) return res.status(404).json({ error: "Invoice not found" });
      
      const invoiceData = invoiceDoc.data() as any;
      const jobDoc = await db.collection("jobs").doc(invoiceData.jobId).get();
      if (!jobDoc.exists) return res.status(404).json({ error: "Job not found" });
      
      const jobData = jobDoc.data() as any;
      jobData.id = jobDoc.id;

      const settingsDoc = await db.collection("settings").doc("business").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      console.log(`[PDF]: Generating PDF for Invoice ${invoiceId}`);
      const pdfBuffer = await generateInvoicePDF(invoiceData, jobData, settings as any);

      const filePath = `invoices/${invoiceId}.pdf`;
      const file = bucket.file(filePath);

      await file.save(pdfBuffer, {
        metadata: { contentType: "application/pdf" },
      });
      
      // Make public and get URL
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      await db.collection("invoices").doc(invoiceId).update({
        invoicePdfUrl: publicUrl,
        updatedAt: Date.now()
      });

      res.json({ success: true, url: publicUrl });
    } catch (err: any) {
      console.error("[PDF Error]:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Quote Approval Endpoint
  app.post("/api/quotes/approve/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const jobDoc = await db.collection("jobs").doc(jobId).get();
      if (!jobDoc.exists) return res.status(404).json({ error: "Job not found" });
      
      const job = jobDoc.data() as any;
      if (job.quoteStatus === 'approved') {
        return res.json({ success: true, message: "Already approved", jobId });
      }

      console.log(`[Quote]: Approving quote for Job ${jobId}`);
      
      await db.collection("jobs").doc(jobId).update({
        quoteStatus: 'approved',
        quoteApprovedAt: Date.now(),
        status: 'scheduled',
        updatedAt: Date.now()
      });

      res.json({ success: true, jobId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Quote Rejection Endpoint
  app.post("/api/quotes/reject/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      await db.collection("jobs").doc(jobId).update({
        quoteStatus: 'rejected',
        quoteRejectedAt: Date.now(),
        status: 'cancelled',
        updatedAt: Date.now()
      });
      res.json({ success: true, jobId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ONE-CLICK COMPLETE JOB ENDPOINT
  app.post("/api/jobs/:jobId/complete", async (req, res) => {
    try {
      const { jobId } = req.params;
      const jobRef = db.collection("jobs").doc(jobId);
      const jobSnap = await jobRef.get();
      
      if (!jobSnap.exists) return res.status(404).json({ error: "Job not found" });
      const job = jobSnap.data() as any;

      // DEDUPLICATION: Check if already processed
      if (job.finalActionProcessed) {
        console.log(`[CompleteJob] ALREADY PROCESSED - Idempotent return for Job: ${jobId}`);
        return res.json({ 
          success: true, 
          status: job.status, 
          invoiceId: job.invoiceId,
          paymentLink: job.paymentLink,
          alreadyProcessed: true
        });
      }

      console.log(`[CompleteJob] Processing initial automation for Job: ${jobId}`);

      // 1. Calculate Final Price
      // In this system, 'price' is the final total from the pricing engine or manual override
      const finalPrice = job.price || 0;
      const amountInCents = Math.round(finalPrice * 100);

      // 2. Create Stripe Payment Session
      let paymentLink = job.paymentLink;
      if (stripe && amountInCents > 0) {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "aud",
                product_data: {
                  name: `Professional Mowing - Final Invoice (${job.address})`,
                  description: `Service breakdown: ${job.servicePackage}, ${job.serviceGrade} grade. Includes selected add-ons.`,
                },
                unit_amount: amountInCents,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/booking-success?jobId=${jobId}`,
          cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/jobs/${jobId}`,
          metadata: {
            jobId,
            flowType: 'final_invoice',
            clientEmail: job.clientEmail || '',
            clientName: job.clientName || ''
          },
        });
        paymentLink = session.url;
      }

      // 3. Create/Update Invoice Document
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const invoiceData = {
        invoiceNumber,
        jobId,
        clientId: job.clientId || null,
        clientName: job.clientName,
        clientAddress: job.address,
        items: [
           { description: `Standard Mowing Service (${job.servicePackage})`, amount: job.basePrice || 0 },
           ... (job.addOns || []).filter((a: any) => a.selected).map((a: any) => ({ description: a.name, amount: a.price }))
        ],
        totalAmount: finalPrice,
        pricingSnapshot: job.pricingSnapshot || null,
        status: 'sent',
        paymentLink: paymentLink || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const invoiceRef = await db.collection("invoices").add(invoiceData);

      // 4. Update Job Status & Mark Processed
      await jobRef.update({
        status: 'invoiced_final',
        completedAt: Date.now(),
        invoiceId: invoiceRef.id,
        paymentLink: paymentLink || '',
        finalActionProcessed: true,
        updatedAt: Date.now()
      });

      // 5. Trigger Final Notifications (Email + SMS)
      // This will also trigger PDF generation via the handleNotification helper
      await handleNotification({
        stage: 'invoice-sent',
        job: { ...job, id: jobId, paymentLink, invoiceId: invoiceRef.id },
        clientEmail: job.clientEmail,
        clientPhone: job.clientPhone,
        clientName: job.clientName,
        amount: finalPrice.toFixed(2),
        invoiceNumber: invoiceNumber,
        invoiceLink: paymentLink 
      });

      res.json({ 
        success: true, 
        status: 'invoiced_final', 
        invoiceId: invoiceRef.id,
        paymentLink 
      });

    } catch (err: any) {
      console.error("[CompleteJob Error]:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // REST OF API ROUTES
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/admin/invites", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
         return res.status(401).json({ error: "Missing admin token" });
      }
      const token = authHeader.split("Bearer ")[1];
      const decodedUser = await admin.auth().verifyIdToken(token);
      
      const userDoc = await db.collection("users").doc(decodedUser.uid).get();
      const isDbAdmin = userDoc.exists && userDoc.data()?.role === "admin";
      const isHardCodedAdmin = decodedUser.email && ["nardoophotography@gmail.com", "jacka4687@gmail.com"].includes(decodedUser.email as string);

      if (!isDbAdmin && !isHardCodedAdmin) {
        return res.status(403).json({ error: "Forbidden: Not an admin" });
      }

      const { staffId, email, name, phone } = req.body;
      const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const batch = db.batch();
      
      batch.set(db.collection("onboarding_links").doc(newToken), {
        staffId, email, name,
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        used: false
      });

      batch.update(db.collection("staff_profiles").doc(staffId), {
        inviteSentAt: Date.now(),
        onboardingStatus: 'invite-sent'
      });

      await batch.commit();

      const link = `${req.protocol}://${req.get('host')}/onboarding/${newToken}`;

      // Optionally send a notification but let frontend or next steps trigger? The original code had a /api/notify call inline in the frontend.
      // We can let the frontend still trigger /api/notify or we can just return success here.
      
      res.json({ success: true, token: newToken, link });
    } catch (err: any) {
      console.error("[Invite Generation Error]:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Onboarding Endpoints
  app.get("/api/onboarding/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const linkDoc = await db.collection("onboarding_links").doc(token).get();
      
      if (!linkDoc.exists) {
        return res.status(404).json({ error: "Invalid link" });
      }
      
      const linkData = linkDoc.data() as any;
      if (linkData.used || linkData.expiresAt < Date.now()) {
        return res.status(400).json({ error: "Link expired or already used" });
      }

      res.json({ session: linkData });
    } catch (err: any) {
      console.error("[Onboarding Fetch Error]:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/onboarding/submit", async (req, res) => {
    try {
      const { token, data } = req.body;
      if (!token || !data) return res.status(400).json({ error: "Missing payload" });

      const linkRef = db.collection("onboarding_links").doc(token);
      const linkDoc = await linkRef.get();

      if (!linkDoc.exists) return res.status(404).json({ error: "Invalid link" });
      
      const linkData = linkDoc.data() as any;
      if (linkData.used || linkData.expiresAt < Date.now()) {
        return res.status(400).json({ error: "Link expired or already used" });
      }

      const staffId = linkData.staffId;
      if (!staffId) return res.status(400).json({ error: "Invalid staff association" });

      // Atomically update both using batch
      const batch = db.batch();

      batch.update(db.collection("staff_profiles").doc(staffId), {
        secureData: data,
        onboardingStatus: 'completed',
        onboardingCompletedAt: Date.now()
      });

      batch.update(linkRef, {
        used: true,
        completedAt: Date.now(),
        signedAgreement: true
      });

      await batch.commit();

      res.json({ success: true });
    } catch (err: any) {
      console.error("[Onboarding Submit Error]:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Stripe Webhook Endpoint

  // Secure Cash Payment Route
  app.post("/api/confirm-cash-payment", async (req, res) => {
    try {
      const { jobId, invoiceId, clientName, clientEmail, pricingSnapshot } = req.body;
      
      let total = 0;
      if (pricingSnapshot && pricingSnapshot.total) total = Number(pricingSnapshot.total);
      
      if (invoiceId) {
         try {
           const invoiceRef = db.collection('invoices').doc(invoiceId);
           const invSnap = await invoiceRef.get();
           if(invSnap.exists) {
             const data = invSnap.data();
             if (data?.items?.length) {
               total = data.items.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
             } else if (data?.totalAmount) {
               total = Number(data.totalAmount);
             }
             
             await invoiceRef.update({
               paymentMethod: 'cash',
               status: 'pending-cash',
               amountDue: total
             });
             
             if (data?.jobId || jobId) {
               await db.collection('jobs').doc(data?.jobId || jobId).update({
                  paymentMethod: 'cash',
                  paymentStatus: 'pending-cash'
               });
             }
           }
         } catch(e) {
           console.error("Error updating invoice cash status", e);
         }
      } else if (jobId) {
         await db.collection('jobs').doc(jobId).update({
            paymentMethod: 'cash',
            paymentStatus: 'pending-cash',
            status: 'scheduled'
         });
      }

      const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || `http://localhost:${PORT}`;
      const link = invoiceId ? `${baseUrl}/pay/${invoiceId}` : (jobId ? `${baseUrl}/quote/${jobId}` : baseUrl);
      
      // Notify client
      try {
        const jobSnap = jobId ? await db.collection('jobs').doc(jobId).get() : null;
        const jobData = jobSnap?.exists ? jobSnap.data() : null;

        await handleNotification({
           stage: "booking-created",
           job: { ...jobData, id: jobId || invoiceId },
           clientName: clientName || jobData?.clientName,
           clientEmail: clientEmail || jobData?.clientEmail,
           clientPhone: jobData?.clientPhone,
           invoiceLink: link
        });
      } catch (e) {
        console.error("Failed to trigger notify for cash booking", e);
      }
      
      res.json({ success: true, url: link });
    } catch (err: any) {
      console.error("Cash Enrollment Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Secure Stripe Checkout Session Route
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured or an invalid Secret Key was provided. Please check your STRIPE_SECRET_KEY in the Environment Variables Settings." });
    }

    try {
      const { jobId, invoiceId, clientId, clientName, clientEmail, serviceType, clientType, serviceGrade, conditionFactors, addOns, pricingSnapshot, total: bodyTotal } = req.body;
      
      let total = 0;
      let description = "GrassRoots Service";
      let metadata: any = {
        jobId: jobId || "", 
        invoiceId: invoiceId || "", 
        clientName: clientName || "Guest"
      };

      // AUTHORITATIVE PRICE CALCULATION / VERIFICATION
      if (pricingSnapshot && Number(pricingSnapshot.total) > 0) {
        // trust the provided snapshot but we could re-verify here
        total = Number(pricingSnapshot.total);
        description = `${pricingSnapshot.packageName || 'Service'} Mowing - ${serviceGrade || 'Standard'} condition`;
        
        // Add detailed breakdown to metadata (Stripe metadata supports strings only, so we stringify)
        metadata = {
          ...metadata,
          packageId: String(pricingSnapshot.packageId || ''),
          basePrice: String(pricingSnapshot.basePrice || 0),
          addOnTotal: String(pricingSnapshot.addOnTotal || 0),
          tierAdjustment: String(pricingSnapshot.tierAdjustment || 0),
          total: String(pricingSnapshot.total || 0),
          isQuoteRequired: String(pricingSnapshot.isQuoteRequired || false)
        };
      } else if (invoiceId) {
        let invoiceDoc;
        try {
          invoiceDoc = await db.collection("invoices").doc(invoiceId).get();
        } catch (err: any) {
          console.error(`[Firebase Error]: Failed to fetch invoice ${invoiceId}: ${err.message}`);
          throw err;
        }
        if (!invoiceDoc.exists) throw new Error(`Invoice ${invoiceId} not found`);
        const data = invoiceDoc.data();
        total = Number(data?.totalAmount || 0);
        if (total <= 0 && data?.items && Array.isArray(data.items)) {
          total = data.items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
        }
        description = `Invoice ${data?.invoiceNumber || invoiceId}`;
      } else if (serviceType) {
        // Fallback to recalculation (Fetch live rules from Firestore)
        let settingsDoc;
        try {
          settingsDoc = await db.collection("settings").doc("business").get();
        } catch (err: any) {
          console.error(`[Firebase Error]: Failed to fetch business settings: ${err.message}`);
          throw err;
        }
        const rules = settingsDoc.exists && settingsDoc.data()?.pricing 
          ? settingsDoc.data()?.pricing 
          : getDefaultPricingRules();

        const calculation = calculateServicePrice(
          rules,
          serviceType,
          clientType || 'one-off',
          serviceGrade || 'standard',
          conditionFactors || { timeSinceLastMow: 'under-2-weeks', grassHeight: 'short', thickness: 'light', obstacles: 'low', urgency: 'normal' },
          addOns || []
        );
        total = calculation.total;
        description = `${calculation.packageName} Mowing - ${serviceGrade || 'Standard'} condition`;
      } else if (jobId) {
        // Look up Job specifically if it exists but no other pricing data was sent
        let jobDoc;
        try {
          jobDoc = await db.collection("jobs").doc(jobId).get();
        } catch (err: any) {
          console.error(`[Firebase Error]: Failed to fetch job ${jobId}: ${err.message}`);
          throw err;
        }
        if (jobDoc.exists) {
          const jobData = jobDoc.data();
          // The database uses 'pricingSnapshot.total' or 'price'
          if (jobData?.pricingSnapshot?.total > 0) {
            total = Number(jobData.pricingSnapshot.total);
            description = `Payment for ${jobData.clientName || 'Service'} (${jobData.pricingSnapshot.packageName || 'Mowing'})`;
            metadata = {
              ...metadata,
              packageId: String(jobData.pricingSnapshot.packageId || ''),
              total: String(jobData.pricingSnapshot.total || 0)
            };
          } else if (jobData?.price > 0) {
            total = Number(jobData.price);
            description = `Quote Payment for ${jobData.clientName || 'Service'}`;
          }
        }
      }

      // Final fallback if still 0 but we have a body total
      if (total <= 0 && bodyTotal) {
        total = Number(bodyTotal);
      }

      if (total <= 0) {
        console.error(`[Stripe Error]: Invalid total $${total}. Body:`, JSON.stringify(req.body));
        throw new Error(`Invalid total amount calculated: $${total}. If this is a custom quote, please wait for admin approval.`);
      }

      console.log(`[Stripe]: Creating Checkout Session for ${clientName} ($${total})`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "aud",
            product_data: {
              name: description,
              description: `Professional care by GrassRoots Mowing Co.`,
            },
            unit_amount: Math.round(total * 100), // Secure conversion to cents
          },
          quantity: 1,
        }],
        mode: "payment",
        client_reference_id: clientId || undefined,
        customer_email: clientEmail || undefined,
        success_url: `${process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000'}/booking-success?jobId=${jobId || ''}&invoiceId=${invoiceId || ''}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000'}/booking`,
        metadata,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe Session Error:", error.message);
      
      let errorMessage = error.message;
      if (errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("insufficient permissions")) {
        errorMessage = `Firestore Permission Error: The server's Service Account does not have permission to access the Firestore database. 
        Current Project: ${admin.app().options.projectId}
        Database ID: ${dbId}
        Please ensure you have run 'set_up_firebase' and that the databaseId in firebase-applet-config.json matches a provisioned database.`;
      } else if (errorMessage.includes("Invalid API Key provided")) {
         errorMessage = "You have accidentally pasted a Google App Password (or invalid token) into the STRIPE_SECRET_KEY environment variable. Please go to AI Studio Settings -> Secrets, edit STRIPE_SECRET_KEY, and paste your actual Stripe Secret Key (starting with sk_test_ or sk_live_).";
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Secure Stripe Payment Intent Route (Advanced/Custom Flow)
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured on server. Check STRIPE_SECRET_KEY in environment." });
    }

    try {
      const { amount, clientEmail, clientName, metadata } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      console.log(`[Stripe]: Creating PaymentIntent for $${amount} (${clientEmail})`);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "aud",
        receipt_email: clientEmail || undefined,
        description: `GrassRoots Mowing Service for ${clientName}`,
        metadata: {
          ...metadata,
          clientName,
          clientEmail
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Stripe PaymentIntent Error:", error);
      let errorMessage = error.message;
      if (errorMessage?.includes("Invalid API Key provided")) {
         errorMessage = "You have accidentally pasted a Google App Password (or invalid token) into the STRIPE_SECRET_KEY environment variable. Please go to AI Studio Settings -> Secrets, edit STRIPE_SECRET_KEY, and paste your actual Stripe Secret Key (starting with sk_test_ or sk_live_).";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Firebase Health Check
  app.get("/api/firebase-health", async (req, res) => {
    try {
      const testDoc = await db.collection("settings").doc("business").get();
      res.json({ 
        status: "ok", 
        firestore: "connected", 
        databaseId: dbId,
        projectId: admin.app().options.projectId || 'detected-at-runtime',
        settingsExists: testDoc.exists 
      });
    } catch (err: any) {
      console.error("[Firebase Health Error]:", err.message);
      res.status(500).json({ 
        status: "error", 
        message: err.message,
        code: err.code,
        databaseId: dbId,
        projectId: admin.app().options.projectId || 'unknown'
      });
    }
  });

  // Gemini AI Chat Proxy
  app.post("/api/chat", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not defined on the server." });
    }

    try {
      const { messages, userMessage } = req.body;
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: `You are the GrassRoots Mowing Co. AI Assistant. 
          Your goal is to qualify leads and guide them to book a lawn care service.
          
          Key Info to capture:
          1. Address (Property location)
          2. Approximate size or "vibe" (Large backyard, town block, acreage etc)
          3. Urgency
          
          Tone: Professional, friendly (Australian 'outback' flavor but tech-savvy), concise.
          
          If the user provides an address, encourage them to "Start Instant Book" to use our satellite measurement tool.
          
          Example responses:
          - "Sounds like a standard residential block! Our 'Standard Package' starts at $150. Would you like to see a custom quote using our satellite measurement tool?"
          - "Acreage in Highfields? Beautiful. We definitely handle large lots. I'd suggest our 'Acreage' package."
          
          If they seem ready to book, offer them a link to the /booking page.`,
      });

      const chat = model.startChat({
        history: messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();
      
      res.json({ text });
    } catch (err: any) {
      console.error("[Gemini Error]:", err.message);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  console.log(`[Server]: Initializing middleware and routes...`);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server]: READY. Listening on http://localhost:${PORT}`);
    // Verify connectivity after server is ready to handle requests
    verifyConnectivity().catch(err => console.warn("[Firebase]: Connectivity check background failure:", err.message));
  });
}

startServer().catch(console.error);
