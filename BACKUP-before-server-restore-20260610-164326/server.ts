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

// Initialize Firebase Admin Configuration Data Vector
let adminAppConfig: any = {};
try {
  if (fs.existsSync("./firebase-applet-config.json")) {
    adminAppConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  }
} catch (err) {
  console.error("🔴 Failed to read firebase-applet-config.json");
}

const getAdminCredential = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return admin.credential.cert(sa);
    } catch (e) {
      console.error("[Firebase]: Failed to parse FIREBASE_SERVICE_ACCOUNT");
    }
  }

  const saPath = path.join(process.cwd(), "service-account.json");
  if (fs.existsSync(saPath)) {
    return admin.credential.cert(saPath);
  }

  return admin.credential.applicationDefault();
};

// Clean Parser Initialization Execution
if (!admin.apps.length) {
  admin.initializeApp({
    credential: getAdminCredential(),
    projectId: adminAppConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: adminAppConfig.storageBucket || process.env.VITE_FIREBASE_STORAGE_BUCKET
  });
}

// Uniform Database Instantiation Context
const targetDbId = adminAppConfig.firestoreDatabaseId || process.env.VITE_FIREBASE_DATABASE_ID;
const db = targetDbId ? getFirestore(admin.app(), targetDbId) : getFirestore(admin.app());

console.log(`[Firebase]: Firestore initialized with Project: ${admin.app().options.projectId}, DB: ${targetDbId || '(default)'}`);

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
    
    const docRef = await db.collection("documents").add({
      jobId, type, url: publicUrl, name: `${type.toUpperCase()} - ${jobData.address}`, createdAt: Date.now()
    });

    const updateData: any = { [`${type}PdfUrl`]: publicUrl };
    updateData.documents = admin.firestore.FieldValue.arrayUnion({
      id: docRef.id, jobId, type, url: publicUrl, name: `${type.toUpperCase()} - ${jobData.address}`, createdAt: Date.now()
    });

    await db.collection("jobs").doc(jobId).update(updateData);

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

  let stripe: Stripe | null = null;
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
  } catch (err: any) {
    console.error("🔴 Failed to initialize Stripe client:", err.message);
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

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

    let settings: any = {};
    try {
      const settingsDoc = await db.collection("settings").doc("business").get();
      if (settingsDoc.exists) settings = settingsDoc.data();
    } catch (err) {
      console.error("[handleNotification]: Failed to fetch settings for templates");
    }

    const results = { email: 'skipped', sms: 'skipped', adminEmail: 'skipped', adminSms: 'skipped' };
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

    if (['booking-confirmed', 'booking-created', 'quote-sent', 'payment-successful', 'completed', 'invoice-sent', 'payment-receipt', 'lead-captured'].includes(stage)) {
       try {
         console.log(`[handleNotification]: Step 1 - Initiating Document Generation for ${stage}`);
         if (job?.id) {
           const docTypes: ('invoice' | 'receipt' | 'quote' | 'booking' | 'report')[] = [];

           if (stage === 'quote-sent' || stage === 'lead-captured') {
             docTypes.push('quote');
           } else if (stage === 'booking-confirmed' || stage === 'booking-created') {
             docTypes.push('booking');
             docTypes.push('quote');
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
               pdfUrl = url; 
             }
           }
         }
       } catch (docErr) {
         console.error("[handleNotification] Doc generation failure (Non-blocking):", docErr);
       }
    }

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
        emailContent = `Hi ${clientName},\n\nYou've been invited to join the GrassRoots Mowing Co team!\n\nPlease complete your profile using this link:\n\n${paymentLink}\n\nThanks,\nManagement`;
        smsContent = `Hi ${clientName}, you've been invited to join GrassRoots Mowing Co! Please complete your secure onboarding profile using this link: ${paymentLink}`;
        break;
    }

    const sendSms = async (to: string, body: string) => {
      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (twilioClient && (messagingServiceSid || fromNumber) && to) {
        const finalTo = toE164(to);
        try {
          const params: any = { body, to: finalTo };
          if (messagingServiceSid) params.messagingServiceSid = messagingServiceSid;
          else params.from = fromNumber;

          return await retry(() => twilioClient.messages.create(params));
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
      if (['booking-confirmed', 'booking-created', 'payment-successful', 'completed', 'quote-sent', 'invoice-sent'].includes(stage)) {
        const adminsSnap = await db.collection("users").where("role", "==", "admin").get();
        for (const adminDoc of adminsSnap.docs) {
          await createDbNotification(adminDoc.id, adminEmailSubject || emailSubject, adminEmailContent || emailContent, 'info', `/jobs/${job?.id || ''}`);
        }
      }

      if (job?.clientId) {
        await createDbNotification(job.clientId, emailSubject, emailContent, 'info', `/jobs/${job?.id || ''}`);
      }

      if (emailContent && clientEmail) {
        try { 
          await sendEmail(clientEmail, emailSubject, emailContent); 
          results.email = 'sent'; 
        } catch (err) { 
          results.email = 'failed'; 
          console.error("[Email Failure] Client:", clientEmail, err);
        }
      }

      if (smsContent && clientPhone) {
        try { 
          await sendSms(clientPhone, smsContent); 
          results.sms = 'sent'; 
        } catch (err) { 
          results.sms = 'failed'; 
          console.error("[SMS Failure] Client:", clientPhone, err);
        }
      }

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

  app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) return res.status(500).send("Stripe not configured");
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      if (endpointSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } else {
        console.warn("[Stripe Webhook]: No secret provided. Parsing payload.");
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook Error]: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const { jobId, invoiceId, flowType } = session.metadata || {};

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

        if (invoiceId) {
          const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || `http://localhost:${PORT}`;
          fetch(`${baseUrl}/api/generate-invoice-pdf/${invoiceId}`, { method: 'POST' }).catch(err => {
            console.error(`[Stripe Webhook PDF Error]: ${err.message}`);
          });
        }

        if (jobId || invoiceId) {
          const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || "http://localhost:3000";
          const notifyPayload = {
            stage: "payment-successful",
            job: jobId ? { id: jobId, ...jobData } : { id: invoiceId, address: "Site Service" },
            clientEmail: clientEmail,
            clientName: clientName,
            amount: amount,
            invoiceNumber: session.metadata?.invoiceNumber || invoiceId || (jobData?.invoiceId ? jobData.invoiceId : jobId),
            invoiceLink: `${baseUrl}/pay/${invoiceId || jobId}`
          };

          try {
            await handleNotification(notifyPayload);
          } catch (notifyErr: any) {
            console.error(`[Stripe Webhook Notification Error]:`, notifyErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook Process Error]: ${err.message}`);
    }

    res.json({ received: true });
  });

  app.use(express.json({ limit: "50mb" }));
  
  app.post("/api/notify", async (req, res) => {
    try {
      const results = await handleNotification(req.body);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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

      const pdfBuffer = await generateInvoicePDF(invoiceData, jobData, settings as any);
      const filePath = `invoices/${invoiceId}.pdf`;
      const file = bucket.file(filePath);

      await file.save(pdfBuffer, { metadata: { contentType: "application/pdf" } });
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      await db.collection("invoices").doc(invoiceId).update({
        invoicePdfUrl: publicUrl,
        updatedAt: Date.now()
      });

      res.json({ success: true, url: publicUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/quotes/approve/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const jobDoc = await db.collection("jobs").doc(jobId).get();
      if (!jobDoc.exists) return res.status(404).json({ error: "Job not found" });
      
      const job = jobDoc.data() as any;
      if (job.quoteStatus === 'approved') return res.json({ success: true, jobId });

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

  app.post("/api/jobs/:jobId/complete", async (req, res) => {
    try {
      const { jobId } = req.params;
      const jobRef = db.collection("jobs").doc(jobId);
      const jobSnap = await jobRef.get();
      if (!jobSnap.exists) return res.status(404).json({ error: "Job not found" });
      const job = jobSnap.data() as any;

      if (job.finalActionProcessed) {
        return res.json({ 
          success: true, 
          status: job.status, 
          invoiceId: job.invoiceId,
          paymentLink: job.paymentLink,
          alreadyProcessed: true
        });
      }

      const finalPrice = job.price || 0;
      const amountInCents = Math.round(finalPrice * 100);
      let paymentLink = job.paymentLink;

      if (stripe && amountInCents > 0) {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "aud",
              product_data: {
                name: `Professional Mowing - Final Invoice (${job.address})`,
                description: `Service breakdown: ${job.servicePackage}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          }],
          mode: "payment",
          success_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/booking-success?jobId=${jobId}`,
          cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/jobs/${jobId}`,
          metadata: { jobId, flowType: 'final_invoice', clientEmail: job.clientEmail || '', clientName: job.clientName || '' },
        });
        paymentLink = session.url;
      }

      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const invoiceRef = await db.collection("invoices").add({
        invoiceNumber, jobId, clientId: job.clientId || null, clientName: job.clientName, clientAddress: job.address,
        items: [{ description: `Standard Mowing Service (${job.servicePackage})`, amount: job.basePrice || 0 }],
        totalAmount: finalPrice, pricingSnapshot: job.pricingSnapshot || null, status: 'sent', paymentLink: paymentLink || '',
        createdAt: Date.now(), updatedAt: Date.now()
      });

      await jobRef.update({
        status: 'invoiced_final', completedAt: Date.now(), invoiceId: invoiceRef.id, paymentLink: paymentLink || '',
        finalActionProcessed: true, updatedAt: Date.now()
      });

      await handleNotification({
        stage: 'invoice-sent', job: { ...job, id: jobId, paymentLink, invoiceId: invoiceRef.id },
        clientEmail: job.clientEmail, clientPhone: job.clientPhone, clientName: job.clientName,
        amount: finalPrice.toFixed(2), invoiceNumber: invoiceNumber, invoiceLink: paymentLink 
      });

      res.json({ success: true, status: 'invoiced_final', invoiceId: invoiceRef.id, paymentLink });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/health", (req, res) => { res.json({ status: "ok" }); });

  app.post("/api/admin/invites", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing admin token" });
      const token = authHeader.split("Bearer ")[1];
      const decodedUser = await admin.auth().verifyIdToken(token);
      
      const userDoc = await db.collection("users").doc(decodedUser.uid).get();
      const isDbAdmin = userDoc.exists && userDoc.data()?.role === "admin";
      const isHardCodedAdmin = decodedUser.email && ["nardoophotography@gmail.com", "jacka4687@gmail.com"].includes(decodedUser.email as string);

      if (!isDbAdmin && !isHardCodedAdmin) return res.status(403).json({ error: "Forbidden" });

      const { staffId, email, name } = req.body;
      const newToken = Math.random().toString(36).substring(2, 15);
      const batch = db.batch();
      
      batch.set(db.collection("onboarding_links").doc(newToken), {
        staffId, email, name, createdAt: Date.now(), expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), used: false
      });
      batch.update(db.collection("staff_profiles").doc(staffId), { inviteSentAt: Date.now(), onboardingStatus: 'invite-sent' });
      await batch.commit();

      res.json({ success: true, token: newToken, link: `${req.protocol}://${req.get('host')}/onboarding/${newToken}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/onboarding/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const linkDoc = await db.collection("onboarding_links").doc(token).get();
      if (!linkDoc.exists) return res.status(404).json({ error: "Invalid link" });
      const linkData = linkDoc.data() as any;
      if (linkData.used || linkData.expiresAt < Date.now()) return res.status(400).json({ error: "Link expired" });
      res.json({ session: linkData });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/onboarding/submit", async (req, res) => {
    try {
      const { token, data } = req.body;
      const linkRef = db.collection("onboarding_links").doc(token);
      const linkDoc = await linkRef.get();
      if (!linkDoc.exists) return res.status(404).json({ error: "Invalid link" });
      const linkData = linkDoc.data() as any;

      const batch = db.batch();
      batch.update(db.collection("staff_profiles").doc(linkData.staffId), { secureData: data, onboardingStatus: 'completed', onboardingCompletedAt: Date.now() });
      batch.update(linkRef, { used: true, completedAt: Date.now(), signedAgreement: true });
      await batch.commit();

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/confirm-cash-payment", async (req, res) => {
    try {
      const { jobId, invoiceId, clientName, clientEmail, pricingSnapshot } = req.body;
      let total = pricingSnapshot?.total ? Number(pricingSnapshot.total) : 0;
      
      if (invoiceId) {
        const invoiceRef = db.collection('invoices').doc(invoiceId);
        const invSnap = await invoiceRef.get();
        if(invSnap.exists) {
          const data = invSnap.data();
          total = data?.totalAmount ? Number(data.totalAmount) : total;
          await invoiceRef.update({ paymentMethod: 'cash', status: 'pending-cash', amountDue: total });
          if (data?.jobId) await db.collection('jobs').doc(data.jobId).update({ paymentMethod: 'cash', paymentStatus: 'pending-cash' });
        }
      } else if (jobId) {
        await db.collection('jobs').doc(jobId).update({ paymentMethod: 'cash', paymentStatus: 'pending-cash', status: 'scheduled' });
      }

      const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || `http://localhost:${PORT}`;
      const link = invoiceId ? `${baseUrl}/pay/${invoiceId}` : `${baseUrl}`;
      
      res.json({ success: true, url: link });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
    try {
      const { jobId, invoiceId, clientId, clientName, clientEmail, serviceType, clientType, serviceGrade, conditionFactors, addOns, pricingSnapshot, total: bodyTotal } = req.body;
      let total = pricingSnapshot?.total ? Number(pricingSnapshot.total) : 0;
      let description = "GrassRoots Service";
      let metadata: any = { jobId: jobId || "", invoiceId: invoiceId || "", clientName: clientName || "Guest" };

      if (invoiceId) {
        const invoiceDoc = await db.collection("invoices").doc(invoiceId).get();
        const data = invoiceDoc.data();
        total = Number(data?.totalAmount || 0);
        description = `Invoice ${data?.invoiceNumber || invoiceId}`;
      }

      if (total <= 0 && bodyTotal) total = Number(bodyTotal);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: { currency: "aud", product_data: { name: description }, unit_amount: Math.round(total * 100) },
          quantity: 1,
        }],
        mode: "payment",
        customer_email: clientEmail || undefined,
        success_url: `${process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000'}/booking-success?jobId=${jobId || ''}`,
        cancel_url: `${process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000'}/booking',
        metadata,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
    try {
      const { amount, clientEmail, clientName, metadata } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), currency: "aud", receipt_email: clientEmail || undefined,
        automatic_payment_methods: { enabled: true }, metadata
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/firebase-health", async (req, res) => {
    try {
      const testDoc = await db.collection("settings").doc("business").get();
      res.json({ status: "ok", firestore: "connected", settingsExists: testDoc.exists });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Missing API Key" });
    try {
      const { messages, userMessage } = req.body;
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const chat = model.startChat({
        history: messages.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      });
      const result = await chat.sendMessage(userMessage);
      res.json({ text: (await result.response).text() });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  console.log(`[Server]: Initializing middleware and routes...`);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server]: READY. Listening on http://localhost:${PORT}`);
    verifyConnectivity().catch(err => console.warn("[Firebase Check Failed]:", err.message));
  });
}

startServer().catch(console.error);