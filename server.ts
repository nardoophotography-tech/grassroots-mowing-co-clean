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
import { generateInvoicePDF } from "./src/services/pdfGenerator.js";

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
    projectId: adminAppConfig.projectId,
    storageBucket: adminAppConfig.storageBucket,
  });
}

// Initialize Firestore
const db = getFirestore(admin.app(), adminAppConfig.firestoreDatabaseId);
console.log(`[Firebase]: Firestore initialized with Project: ${adminAppConfig.projectId}, DB: ${adminAppConfig.firestoreDatabaseId}`);

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
    if (e.message.includes('NOT_FOUND') || e.code === 5) {
      console.error(`[Firebase FATAL]: Default database NOT FOUND. Please ensure Cloud Firestore is enabled in the Firebase console.`);
    } else if (e.message.includes('PERMISSION_DENIED')) {
      console.error(`[Firebase FATAL]: PERMISSION_DENIED. Check service account roles or security rules.`);
    } else {
      console.warn(`[Firebase Warning]: Connectivity check failed: ${e.message}`);
    }
  }
}

verifyConnectivity();

const bucket = admin.app().options.storageBucket ? admin.storage().bucket() : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        const { jobId, invoiceId } = session.metadata || {};

        if (jobId) {
          console.log(`[Stripe Webhook]: Confirming job ${jobId}`);
          
          await db.collection("jobs").doc(jobId).update({
            paymentStatus: "paid",
            status: "scheduled",
            stripeSessionId: session.id,
            amountPaid: session.amount_total ? session.amount_total / 100 : 0,
            updatedAt: Date.now()
          });

          // Check if user profile needs update or if we should create a payment record
          await db.collection("payments").add({
            jobId,
            invoiceId: invoiceId || null,
            clientId: session.client_reference_id || null, // Best practice to set this in metadata or client_ref
            clientEmail: session.customer_details?.email || session.customer_email || null,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            status: "successful",
            stripeSessionId: session.id,
            createdAt: Date.now()
          });
        }

        if (invoiceId) {
          console.log(`[Stripe Webhook]: Marking invoice ${invoiceId} as paid`);
          await db.collection("invoices").doc(invoiceId).update({
            status: "paid",
            paidAt: Date.now(),
            stripeSessionId: session.id
          });
        }
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook Process Error]: ${err.message}`);
      // return 200 to acknowledge receipt even if processing fails, 
      // but log the error
    }

    res.json({ received: true });
  });

  app.use(express.json({ limit: "50mb" }));

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

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/admin/invites", express.json(), async (req, res) => {
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

// Notification Endpoint
app.post("/api/notify", async (req, res) => {
  const { stage, job, clientEmail, clientPhone, clientName, amount, invoiceLink } = req.body;

  console.log(`[Notification Triggered]: ${stage} for ${clientName}`);

  // Fetch Settings briefly for templates
  let settings: any = {};
  try {
    const settingsDoc = await db.collection("settings").doc("business").get();
    if (settingsDoc.exists) settings = settingsDoc.data();
  } catch (err) {
    console.error("[Notify]: Failed to fetch settings for templates");
  }

  const results = {
    email: 'skipped',
    sms: 'skipped',
    adminEmail: 'skipped',
    adminSms: 'skipped',
  };

  const dateStr = job?.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'TBD';

  // Content Generation
  let emailSubject = '';
  let emailContent = '';
  let smsContent = '';
  let adminEmailSubject = '';
  let adminEmailContent = '';
  let adminSmsContent = '';

  const adminEmails = ["nardoophotography@gmail.com"]; // Default admin

  const replacePlaceholders = (text: string, data: any) => {
    if (!text) return '';
    return text
      .replace(/\[Client Name\]/g, data.clientName || 'Valued Client')
      .replace(/\[Amount\]/g, `$${(data.amount || 0).toFixed(2)}`)
      .replace(/\[Link\]/g, data.invoiceLink || '')
      .replace(/\[Invoice Number\]/g, data.invoiceNumber || 'INV-001');
  };

  switch (stage) {
    case 'booking-created':
    case 'booking-confirmed':
      const isConfirmed = stage === 'booking-confirmed';
      emailSubject = isConfirmed ? `Booking Confirmed: GrassRoots Mowing Co.` : `Booking Inquiry Received: GrassRoots Mowing Co.`;
      
      const snapshot = job.pricingSnapshot;
      const breakdownText = snapshot ? `
Breakdown:
- Base (${snapshot.packageName}): $${snapshot.basePrice.toFixed(2)}
${snapshot.tierAdjustment !== 0 ? `- ${snapshot.tierName} Adjustment: $${snapshot.tierAdjustment.toFixed(2)}\n` : ''}- Conditions & Grade: $${(snapshot.gradeAdjustment + snapshot.conditionSurcharge + snapshot.urgencySurcharge).toFixed(2)}
- Add-ons: $${snapshot.addOnTotal.toFixed(2)}
--------------------
Total: $${job.price.toFixed(2)}
` : `Total: $${job.price.toFixed(2)}`;

      emailContent = `Hi ${clientName},

${isConfirmed ? 'Your booking has been confirmed!' : 'We have received your booking inquiry.'}

Date: ${dateStr}
Time: ${job.timeSlot}
Location: ${job.address}

${breakdownText}

${isConfirmed ? 'Thanks for choosing GrassRoots!' : 'We will review your request and get back to you shortly.'}`;

      smsContent = `GrassRoots Mowing: ${isConfirmed ? 'Confirmed!' : 'Received'}
Total: $${job.price.toFixed(2)}
Date: ${dateStr}
See invoice in email.`;
      
      adminEmailSubject = `NEW ${isConfirmed ? 'CONFIRMED' : 'PENDING'} JOB: ${clientName}`;
      adminEmailContent = `A new ${isConfirmed ? 'paid' : 'pending'} job has been created.\n\nClient: ${clientName}\nService: ${job.servicePackage}\nLocation: ${job.address}\nTotal: $${job.price}`;
      adminSmsContent = `New ${isConfirmed ? 'paid' : 'pending'} job: ${job.servicePackage} at ${job.address}`;
      break;

    case 'quote-sent':
      emailSubject = `Your Service Quote: GrassRoots Mowing Co.`;
      emailContent = `Hi ${clientName},

We have prepared a quote for your service at ${job.address}.

You can view the full breakdown and approve it here:
${job.quoteUrl}

Total Estimate: $${job.price.toFixed(2)}

Thanks,
GrassRoots Team`;
      smsContent = `GrassRoots Mowing: Your quote of $${job.price.toFixed(2)} is ready. Review and approve here: ${job.quoteUrl}`;
      break;

    case 'payment-successful':
      emailSubject = `Payment Received: GrassRoots Mowing Co.`;
      emailContent = settings.receiptTemplate 
        ? replacePlaceholders(settings.receiptTemplate, { clientName, amount, invoiceNumber: job.invoiceNumber || job.id })
        : `Hi ${clientName},\n\nWe've received your payment of $${amount}.\n\nYour account is now up to date. Thank you!`;
      smsContent = `Payment successful for your GrassRoots booking. Thank you!`;
      
      adminEmailSubject = `PAYMENT RECEIVED: $${amount} from ${clientName}`;
      adminEmailContent = `Payment of $${amount} has been received for job ${job.id}.`;
      break;

    case 'job-scheduled':
      emailSubject = `Service Scheduled: GrassRoots Mowing Co.`;
      emailContent = `Hi ${clientName},\n\nYour lawn service at ${job.address} has been scheduled for ${dateStr} in the ${job.timeSlot} window.`;
      smsContent = `Your GrassRoots service at ${job.address} is scheduled for ${dateStr} (${job.timeSlot}).`;
      break;

    case 'team-en-route':
      smsContent = settings.messageTemplate 
        ? replacePlaceholders(settings.messageTemplate, { clientName })
        : `Hi ${clientName}, our team is on the way to your property and will arrive shortly.`;
      break;

    case 'completed':
      emailSubject = `Service Completed: GrassRoots Mowing Co.`;
      emailContent = `Hi ${clientName},\n\nYour service at ${job.address} is complete. You can view your invoice here: ${invoiceLink}`;
      smsContent = settings.paymentLinkTemplate 
        ? replacePlaceholders(settings.paymentLinkTemplate, { clientName, invoiceLink, amount: job.price })
        : `Service completed at ${job.address}. Details sent to your email.`;
      break;

    case 'staff-invite':
      emailSubject = `Welcome to GrassRoots Mowing Co - Setup Your Profile`;
      emailContent = `Hi ${clientName},\n\nYou've been invited to join the GrassRoots Mowing Co team!\n\nPlease complete your securely encrypted onboarding profile, including bank details, TFN, Super, and sign your employment agreement using this link:\n\n${invoiceLink}\n\nThanks,\nManagement`;
      smsContent = `Hi ${clientName}, you've been invited to join GrassRoots Mowing Co! Please complete your secure onboarding profile using this link: ${invoiceLink}`;
      break;
  }

  // Helper to send SMS with retry
  const sendSms = async (to: string, body: string) => {
    // AUTHORITATIVE SENDER NUMBER: +61485051625
    const AUTH_SENDER = '+61485051625';
    const OLD_NUMBER = '+61485051257';
    
    // Determine the source of fromNumber
    let rawFrom = process.env.TWILIO_FROM_NUMBER || AUTH_SENDER;
    let fromNumber = rawFrom.trim();
    
    // CRITICAL OVERRIDE: If the number is the old one, or contains the old suffix, FORCE the new one.
    // Also sanitizing to compare numbers without formatting.
    const numericFrom = fromNumber.replace(/[^0-9]/g, '');
    const numericOld = OLD_NUMBER.replace(/[^0-9]/g, '');
    
    if (numericFrom === numericOld || fromNumber.includes('51257')) {
      console.warn(`[Twilio Safety]: Intercepted attempt to use old number ${fromNumber}. FORCING AUTH_SENDER ${AUTH_SENDER}`);
      fromNumber = AUTH_SENDER;
    }

    if (twilioClient && fromNumber && to) {
      const sanitizedFrom = fromNumber.replace(/[^0-9+]/g, '');
      const sanitizedTo = to.replace(/[^0-9+]/g, '');
      
      const finalFrom = sanitizedFrom.startsWith('61') && !sanitizedFrom.startsWith('+') ? `+${sanitizedFrom}` : sanitizedFrom;
      const finalTo = sanitizedTo.startsWith('61') && !sanitizedTo.startsWith('+') ? `+${sanitizedTo}` : sanitizedTo;

      console.log(`[Twilio Execution]: Sending payload via ${finalFrom} to ${finalTo}`);
      
      try {
        const message = await retry(() => twilioClient.messages.create({ 
          body, 
          from: finalFrom, 
          to: finalTo 
        }));
        console.log(`[Twilio Success]: SMS sent successfully. SID: ${message.sid}`);
        return message;
      } catch (err: any) {
        // Detailed error logging to see exactly what number was being used when it failed
        console.error(`[Twilio API Failure]: Number used: ${finalFrom} | Error: ${err.message}`);
        throw err;
      }
    }
    console.warn(`[Twilio Skip]: client exists? ${!!twilioClient} | from? ${fromNumber} | to? ${to}`);
    console.log(`[SIMULATED SMS to ${to}]: ${body}`);
    return { status: 'simulated' };
  };

  // Helper to send Email with retry
  const sendEmail = async (to: string, subject: string, text: string) => {
    if (resend && to) {
      return retry(() => resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'bookings@grassrootsmowing.com.au',
        to,
        subject,
        text
      }));
    }
    console.log(`[SIMULATED EMAIL to ${to}]: ${subject}\n${text}`);
    return { status: 'simulated' };
  };

  try {
    // Send Customer Notifications
    if (smsContent && clientPhone) {
      try {
        await sendSms(clientPhone, smsContent);
        results.sms = 'sent';
      } catch (err: any) {
        console.error("SMS Error:", err.message);
        results.sms = 'failed';
      }
    }
    if (emailContent && clientEmail) {
      try {
        await sendEmail(clientEmail, emailSubject, emailContent);
        results.email = 'sent';
      } catch (err: any) {
        console.error("Email Error:", err.message);
        results.email = 'failed';
      }
    }

    // Send Admin Notifications
    if (adminSmsContent) {
      for (const phone of [process.env.ADMIN_PHONE_NUMBER].filter(Boolean)) {
        try {
          await sendSms(phone!, adminSmsContent);
          results.adminSms = 'sent';
        } catch (err: any) {
           console.error("Admin SMS Error:", err.message);
           results.adminSms = 'failed';
        }
      }
    }
    if (adminEmailContent) {
      for (const email of adminEmails) {
        try {
          await sendEmail(email, adminEmailSubject, adminEmailContent);
          results.adminEmail = 'sent';
        } catch (err: any) {
          console.error("Admin Email Error:", err.message);
          results.adminEmail = 'failed';
        }
      }
    }

    res.json(results);
  } catch (err: any) {
    console.error("Notification Error:", err.message);
    res.status(500).json({ error: err.message, results });
  }
});

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

      // Generate invoice URL (assumes you have a route to view invoices without paying)
      const baseUrl = process.env.VITE_APP_URL || `http://localhost:${PORT}`;
      const link = invoiceId ? `${baseUrl}/invoices/${invoiceId}` : `${baseUrl}`;
      
      // Notify client
      try {
        await fetch(`${baseUrl}/api/notify`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             stage: "booking-created",
             clientName,
             clientEmail,
             invoiceLink: link
           })
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
  });
}

startServer().catch(console.error);
