import * as React from 'react';
import { toast } from 'react-hot-toast';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  where,
  Timestamp,
  setDoc,
  getDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { UserProfile, Job, Client, Invoice, BusinessSettings, InvoiceItem, AccountStatus, PaymentMethod, PricingRules, Payment, AppNotification } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, TIME_SLOT_LABELS, PRICING_RULES, ADD_ON_LABELS, SUBURBS, DEFAULT_SETTINGS } from '../constants';
import { triggerNotification } from '../services/notificationService';
import { mythosAddDoc, mythosUpdateDoc, Mythos } from '../lib/mythos';

const updateClientAccountStatus = async (clientId: string) => {
  const q = query(collection(db, 'invoices'), where('clientId', '==', clientId), where('status', '!=', 'paid'));
  const snapshot = await getDocs(q);
  const hasUnpaid = !snapshot.empty;
  const isOverdue = snapshot.docs.some(d => (d.data() as Invoice).dueDate < Date.now());

  let status: AccountStatus = 'up-to-date';
  if (isOverdue) status = 'overdue';
  else if (hasUnpaid) status = 'payment-due';

  await mythosUpdateDoc(doc(db, 'clients', clientId), { accountStatus: status }, updateDoc);
};

export function useJobs() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user, profile } = useAuth();

  React.useEffect(() => {
    if (!user) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const path = 'jobs';
    let q = query(collection(db, path), orderBy('scheduledDate', 'desc'));
    
    if (profile?.role === 'client') {
      // Clients only see their own jobs (or their agency's jobs)
      const effectiveClientId = profile.agencyId || user.uid;
      q = query(collection(db, path), where('clientId', '==', effectiveClientId), orderBy('scheduledDate', 'desc'));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile?.role]);

  const addJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
    const path = 'jobs';
    try {
      const now = Date.now();
      const docRef = await mythosAddDoc(collection(db, path), {
        ...jobData,
        paymentStatus: jobData.paymentStatus || 'unpaid',
        createdAt: now,
        updatedAt: now
      }, addDoc);
      
      const newJob = { id: docRef.id, ...jobData, createdAt: now, updatedAt: now, paymentStatus: 'unpaid' } as Job;
      await triggerNotification('booking-confirmed', newJob);
      
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateJob = async (id: string, jobData: Partial<Job>) => {
    const path = `jobs/${id}`;
    try {
      const docRef = doc(db, 'jobs', id);
      const jobSnap = await getDoc(docRef);
      if (!jobSnap.exists()) return;
      const existingJob = { id: jobSnap.id, ...jobSnap.data() } as Job;

      const updatedData = {
        ...jobData,
        updatedAt: Date.now()
      };
      await mythosUpdateDoc(docRef, updatedData, updateDoc);

      const mergedJob = { ...existingJob, ...jobData };

      // Check for notification trigger
      if (jobData.status === 'on-the-way') {
        await triggerNotification('team-en-route', mergedJob);
      } else if (jobData.status === 'in-progress') {
        await triggerNotification('in-progress', mergedJob);
      } else if (jobData.status === 'completed') {
        // Authoritative order: Generate invoice first, then system handles notification
        await generateInvoiceForJob(id);
        await notifyNextClient(id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const reorderJob = async (jobId: string, direction: 'up' | 'down') => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const sameRunJobs = jobs
      .filter(j => j.scheduledDate === job.scheduledDate && j.timeSlot === job.timeSlot)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = sameRunJobs.findIndex(j => j.id === jobId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= sameRunJobs.length) return;

    const otherJob = sameRunJobs[newIndex];
    
    const currentOrder = job.order ?? currentIndex;
    const otherOrder = otherJob.order ?? newIndex;

    await mythosUpdateDoc(doc(db, 'jobs', job.id), { order: otherOrder, updatedAt: Date.now() }, updateDoc);
    await mythosUpdateDoc(doc(db, 'jobs', otherJob.id), { order: currentOrder, updatedAt: Date.now() }, updateDoc);
  };

  const assignWorker = async (jobId: string, workerId: string) => {
    await mythosUpdateDoc(doc(db, 'jobs', jobId), { workerId, updatedAt: Date.now() }, updateDoc);
  };

  const sendQuoteToCustomer = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      console.warn(`[useJobs] sendQuoteToCustomer: Job ${jobId} not found in local state.`);
      return;
    }

    console.log(`[useJobs] sendQuoteToCustomer: Initiating quote delivery for Job ${jobId}`, {
      client: job.clientName,
      price: job.price,
      snapshot: !!job.pricingSnapshot
    });

    const quoteUrl = `${window.location.origin}/quote/${job.id}`;
    
    try {
      // 1. Validation before submission
      let effectiveEmail = job.clientEmail?.trim();
      
      // If email is missing or empty on job, attempt to grab from client record
      if (!effectiveEmail && job.clientId) {
        console.log(`[useJobs] clientEmail missing or empty on job ID ${jobId}, fetching from client doc: ${job.clientId}`);
        try {
          const clientSnap = await getDoc(doc(db, 'clients', job.clientId));
          if (clientSnap.exists()) {
            const clientData = clientSnap.data() as Client;
            effectiveEmail = clientData.email?.trim();
            
            if (effectiveEmail) {
              console.log(`[useJobs] Found email in client doc: ${effectiveEmail}. Updating job record.`);
              // Update the job with the found email to prevent future lookups
              await mythosUpdateDoc(doc(db, 'jobs', jobId), { clientEmail: effectiveEmail }, updateDoc);
            } else {
              console.warn(`[useJobs] Client doc ${job.clientId} exists but has no email address.`);
            }
          } else {
            console.warn(`[useJobs] Client doc ${job.clientId} not found for job ${jobId}`);
          }
        } catch (fetchErr) {
          console.error(`[useJobs] Error fetching client doc ${job.clientId}:`, fetchErr);
        }
      }

      if (!effectiveEmail) {
        const errorMsg = job.clientId 
          ? "Client email is missing from both the job and the client profile. Please update the client record first."
          : "Client email is required to send a quote. Please update the job details first.";
        throw new Error(errorMsg);
      }
      if (typeof job.price !== 'number' || isNaN(job.price) || job.price <= 0) {
        throw new Error(`Invalid pricing detected ($${job.price}). Please verify pricing breakdown before sending.`);
      }

      // 2. Firebase Write
      console.log(`[useJobs] sendQuoteToCustomer: Updating job ${jobId} status to 'sent'...`);
      const updatedJob = {
        ...job,
        clientEmail: effectiveEmail,
        quoteStatus: 'sent' as const,
        quoteUrl
      };

      await mythosUpdateDoc(doc(db, 'jobs', jobId), {
        quoteStatus: 'sent',
        quoteUrl,
        clientEmail: effectiveEmail,
        updatedAt: Date.now()
      }, updateDoc);

      // 3. Notification Dispatch (handles Email/SMS/PDF)
      console.log(`[useJobs] sendQuoteToCustomer: Triggering 'quote-sent' notification...`);
      await triggerNotification('quote-sent', updatedJob);
      
      console.log(`[useJobs] sendQuoteToCustomer: SUCCESS for Job ${jobId}`);
      toast.success('Quote sent to customer via SMS and Email.');
    } catch (err: any) {
      console.error(`[useJobs] sendQuoteToCustomer: FAILED for Job ${jobId}`, err);
      Mythos.error("SEND_QUOTE_FAILED", { jobId, error: err.message });
      toast.error(`Failed to send quote: ${err.message}`);
    }
  };

  const notifyCurrentClient = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const settingsDoc = await getDoc(doc(db, 'settings', 'business'));
    const settings = settingsDoc.exists() ? settingsDoc.data() as BusinessSettings : null;
    if (!settings?.nextClientNotificationEnabled) return;

    const message = `Hi ${job.clientName}, I'm on my way to your property at ${job.suburb} now!`;
    console.log(`[SMS SENT to ${job.clientPhone}]: ${message}`);
    
    await mythosUpdateDoc(doc(db, 'jobs', jobId), { 
      notificationSent: true,
      updatedAt: Date.now()
    }, updateDoc);
  };

  const notifyNextClient = async (currentJobId: string) => {
    const currentJob = jobs.find(j => j.id === currentJobId);
    if (!currentJob) return;

    const settingsDoc = await getDoc(doc(db, 'settings', 'business'));
    const settings = settingsDoc.exists() ? settingsDoc.data() as BusinessSettings : null;
    if (!settings?.nextClientNotificationEnabled) return;

    const sameRunJobs = jobs
      .filter(j => 
        j.scheduledDate === currentJob.scheduledDate && 
        j.timeSlot === currentJob.timeSlot &&
        j.status === 'scheduled' &&
        j.id !== currentJobId
      )
      .sort((a, b) => a.createdAt - b.createdAt);

    const nextJob = sameRunJobs[0];
    if (nextJob && !nextJob.notificationSent) {
      const message = settings.messageTemplate.replace('[Client Name]', nextJob.clientName);
      console.log(`[SMS SENT to ${nextJob.clientPhone}]: ${message}`);
      
      await mythosUpdateDoc(doc(db, 'jobs', nextJob.id), { 
        notificationSent: true,
        updatedAt: Date.now()
      }, updateDoc);
    }
  };

  const generateInvoiceForJob = async (jobId: string) => {
    const jobDoc = await getDoc(doc(db, 'jobs', jobId));
    if (!jobDoc.exists()) return;
    const job = { id: jobDoc.id, ...jobDoc.data() } as Job;
    if (job.invoiceId) return;

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    let items: InvoiceItem[] = [];

    if (job.pricingSnapshot) {
      // Use the authoritative snapshot
      items.push({ 
        description: `Base Service (${job.pricingSnapshot.packageName})`, 
        amount: job.pricingSnapshot.basePrice 
      });
      
      if (job.pricingSnapshot.tierAdjustment !== 0) {
        items.push({ 
          description: `Tier Adjustment (${job.pricingSnapshot.tierName})`, 
          amount: job.pricingSnapshot.tierAdjustment 
        });
      }

      if (job.pricingSnapshot.gradeAdjustment !== 0) {
        items.push({ 
          description: `Grade Adjustment (${job.serviceGrade})`, 
          amount: job.pricingSnapshot.gradeAdjustment 
        });
      }

      if (job.pricingSnapshot.conditionSurcharge !== 0) {
        items.push({ 
          description: 'Condition Surcharges', 
          amount: job.pricingSnapshot.conditionSurcharge 
        });
      }

      if (job.pricingSnapshot.urgencySurcharge > 0) {
        items.push({ 
          description: 'Urgency Surcharge', 
          amount: job.pricingSnapshot.urgencySurcharge 
        });
      }

      job.pricingSnapshot.addOns.forEach(addon => {
        items.push({ description: `Add-on: ${addon.name}`, amount: addon.price });
      });
    } else {
      // Fallback for legacy jobs without snapshot
      items = [
        { description: `Base Service (${job.clientType})`, amount: job.basePrice },
        { description: `Grade Adjustment (${job.serviceGrade})`, amount: job.gradeAdjustment },
        { description: 'Condition Surcharges', amount: job.conditionSurcharge },
      ];

      if (job.urgencySurcharge > 0) {
        items.push({ description: 'Urgency Surcharge', amount: job.urgencySurcharge });
      }

      job.addOns.filter(a => a.selected).forEach(addon => {
        items.push({ description: `Add-on: ${addon.name}`, amount: addon.price });
      });
    }

    // Pre-generate invoice ID
    const invoiceRef = doc(collection(db, 'invoices'));
    const paymentLink = `${window.location.origin}/pay/${invoiceRef.id}`;

    const invoiceData: any = {
      invoiceNumber,
      jobId,
      clientId: job.clientId,
      clientName: job.clientName,
      clientAddress: job.suburb,
      items,
      totalAmount: job.price,
      pricingSnapshot: job.pricingSnapshot || null,
      status: job.paymentStatus === 'paid' ? 'paid' : 'sent',
      paymentMethod: job.paymentMethod || null,
      paidAt: job.paymentDate || null,
      paymentLink,
      dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: Date.now()
    };

    await setDoc(invoiceRef, invoiceData);
    await mythosUpdateDoc(doc(db, 'jobs', jobId), { 
      invoiceId: invoiceRef.id,
      status: 'invoiced_final',
      paymentLink
    }, updateDoc);

    await updateClientAccountStatus(job.clientId);

    // Trigger notification
    await triggerNotification('invoice-sent', job, { 
      amount: job.price, 
      link: paymentLink,
      invoice: { id: invoiceRef.id, ...invoiceData } as Invoice 
    });

    toast.success(`Invoice ${invoiceNumber} sent to client with payment link.`);
  };

  const deleteJob = async (id: string) => {
    const path = `jobs/${id}`;
    const userRole = profile?.role || 'unknown';
    console.log(`[useJobs]: Attempting to delete job ${id}. User role: ${userRole}`);

    try {
      const jobSnap = await getDoc(doc(db, 'jobs', id));
      if (jobSnap.exists()) {
        const job = jobSnap.data() as Job;
        // If there's an invoice, we should consider if we also delete it
        // For now, only deleting the job but checking for invoiceRef
        if (job.invoiceId) {
          console.log(`[useJobs]: Job ${id} has associated invoice ${job.invoiceId}. Deleting both.`);
          await deleteDoc(doc(db, 'invoices', job.invoiceId));
        }
      }

      await deleteDoc(doc(db, 'jobs', id));
      toast.success('Job and associated invoices deleted successfully');
      return true;
    } catch (error: any) {
      console.error(`[useJobs]: Delete failed for job ${id}:`, error);
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        toast.error('Permission Denied: Only administrators can delete jobs.');
      } else {
        toast.error(`Delete failed: ${error.message || 'Unknown error'}`);
      }
      handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  };

  const broadcastDailyStart = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaysJobs = jobs.filter(j => 
      format(j.scheduledDate, 'yyyy-MM-dd') === today && 
      j.status === 'scheduled' && 
      !j.notificationSent
    );

    if (todaysJobs.length === 0) {
      toast.error('No pending jobs found for today.');
      return;
    }

    const path = 'jobs';
    try {
      const message = "The grassRoots crew will be with you shortly please be ready for entry to property";
      
      const batchPromises = todaysJobs.map(job => {
        console.log(`[7AM BATCH SMS SENT to ${job.clientPhone}]: ${message}`);
        return mythosUpdateDoc(doc(db, path, job.id), {
          notificationSent: true,
          updatedAt: Date.now()
        }, updateDoc);
      });

      await Promise.all(batchPromises);
      toast.success(`Morning alerts sent to ${todaysJobs.length} clients.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  return { jobs, loading, addJob, updateJob, reorderJob, assignWorker, deleteJob, broadcastDailyStart, sendQuoteToCustomer };
}

export function useJob(id?: string) {
  const [job, setJob] = React.useState<Job | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'jobs', id);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setJob({ id: snap.id, ...snap.data() } as Job);
      } else {
        setJob(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(`[useJob] Error fetching job ${id}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  return { job, loading };
}

export function useInvoices() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user, profile } = useAuth();

  React.useEffect(() => {
    if (!user) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    const path = 'invoices';
    let q = query(collection(db, path), orderBy('createdAt', 'desc'));

    if (profile?.role === 'client') {
      const effectiveClientId = profile.agencyId || user.uid;
      q = query(collection(db, path), where('clientId', '==', effectiveClientId), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInvoices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Invoice[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, profile?.role]);

  const markAsPaid = async (invoiceId: string, method: PaymentMethod) => {
    const invRef = doc(db, 'invoices', invoiceId);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) return;
    const inv = invSnap.data() as Invoice;

    await mythosUpdateDoc(invRef, {
      status: 'paid',
      paymentMethod: method,
      paidAt: Date.now()
    }, updateDoc);

    await mythosUpdateDoc(doc(db, 'jobs', inv.jobId), {
      status: 'paid',
      paymentStatus: 'successful',
      paymentMethod: method,
      paymentDate: Date.now()
    }, updateDoc);

    await updateClientAccountStatus(inv.clientId);

    // Trigger notification
    const jobSnap = await getDoc(doc(db, 'jobs', inv.jobId));
    if (jobSnap.exists()) {
      await triggerNotification('payment-receipt', { id: jobSnap.id, ...jobSnap.data() } as Job, { 
        amount: inv.totalAmount,
        invoice: inv
      });
    }

    toast.success('Payment recorded and receipt sent');
  };

  const deleteInvoice = async (id: string) => {
    const userRole = profile?.role || 'unknown';
    console.log(`[Firestore]: Attempting to delete invoice with ID: ${id}. User role: ${userRole}`);
    const invoicePath = `invoices/${id}`;
    const jobPath = `jobs/${id}`;
    
    try {
      // 1. Try to find the document in 'invoices' collection
      let docRef = doc(db, 'invoices', id);
      let docSnap = await getDoc(docRef);
      let isInvoiceCollection = true;

      // Fallback: If not found in 'invoices', check 'jobs' collection
      // (User mentioned invoices might be stored in jobs)
      if (!docSnap.exists()) {
        console.warn(`[Firestore]: Document ${id} not found in 'invoices'. Checking 'jobs'...`);
        docRef = doc(db, 'jobs', id);
        docSnap = await getDoc(docRef);
        isInvoiceCollection = false;
      }

      if (!docSnap.exists()) {
        const errorMsg = `Invoice/Job document not found with ID: ${id}`;
        console.error(`[Firestore Delete Error]: ${errorMsg}`);
        toast.error(errorMsg);
        return false;
      }

      const data = docSnap.data();
      console.log(`[Firestore]: Document found in ${isInvoiceCollection ? 'invoices' : 'jobs'}. Data:`, data);

      // 2. If it's an invoice, clean up the associated job
      if (isInvoiceCollection) {
        const invoice = data as Invoice;
        if (invoice.jobId) {
          console.log(`[Firestore]: Checking existence of associated job: ${invoice.jobId}`);
          const jobRef = doc(db, 'jobs', invoice.jobId);
          try {
            const jobSnap = await getDoc(jobRef);
            if (jobSnap.exists()) {
              console.log(`[Firestore]: Job found. Resetting status to 'completed'...`);
              await mythosUpdateDoc(jobRef, {
                status: 'completed' as any,
                invoiceId: null,
                updatedAt: Date.now()
              }, updateDoc);
            } else {
              console.warn(`[Firestore]: Associated job ${invoice.jobId} does not exist. Skipping reset.`);
            }
          } catch (jobErr) {
            // Log but don't block the invoice deletion
            console.error(`[Firestore]: Error during job reset attempt for ${invoice.jobId}:`, jobErr);
          }
        }
      }

      // 3. Delete the document
      console.log(`[Firestore]: Deleting document: ${docRef.path}`);
      await deleteDoc(docRef);
      
      toast.success('Invoice deleted successfully');
      return true;
    } catch (error: any) {
      console.error(`[Firestore]: Delete failed for invoice ${id}:`, error);
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        toast.error('Permission Denied: Only administrators can delete invoices.');
      } else {
        toast.error(`Delete failed: ${error.message || 'Unknown error'}`);
      }
      handleFirestoreError(error, OperationType.DELETE, `invoices_or_jobs/${id}`);
      return false;
    }
  };

  return { invoices, loading, markAsPaid, deleteInvoice };
}

export function useInvoice(id?: string) {
  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'invoices', id);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setInvoice({ id: snap.id, ...snap.data() } as Invoice);
      } else {
        setInvoice(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(`[useInvoice] Error fetching invoice ${id}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  return { invoice, loading };
}

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<BusinessSettings | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const path = 'settings/business';
    const unsubscribe = onSnapshot(doc(db, 'settings', 'business'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          pricing: {
            ...DEFAULT_SETTINGS.pricing,
            ...(data.pricing || {})
          },
          images: {
            ...DEFAULT_SETTINGS.images,
            ...(data.images || {})
          }
        } as BusinessSettings);
      } else {
        // Initialize default settings if not exists
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    const path = 'settings/business';
    try {
      const sanitized = Mythos.sanitize(newSettings);
      await setDoc(doc(db, 'settings', 'business'), sanitized, { merge: true });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return false;
    }
  };

  const savePricingConfig = async (rules: PricingRules, notes?: string) => {
    console.log('[useSettings]: savePricingConfig initiated', { notes, user: user?.email });
    
    if (!user) {
      console.warn('[useSettings]: No user authenticated, aborting publish');
      toast.error('You must be logged in to save pricing configurations');
      return false;
    }

    try {
      // 1. Update current business settings (Live)
      console.log('[useSettings]: Updating business settings...');
      const updateSuccess = await updateSettings({ pricing: rules });
      console.log('[useSettings]: updateSettings result:', updateSuccess);
      if (!updateSuccess) {
        console.error('[useSettings]: updateSettings failed');
        return false;
      }

      // 2. Get latest version number for history
      console.log('[useSettings]: Fetching pricing history to determine next version...');
      const q = query(collection(db, 'pricing_configs'), orderBy('version', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      const latestVersion = snapshot.empty ? 0 : snapshot.docs[0].data().version;
      console.log('[useSettings]: Latest version found:', latestVersion);

      // 3. Save new version to history
      console.log('[useSettings]: Adding new pricing_config document...');
      await mythosAddDoc(collection(db, 'pricing_configs'), {
        version: latestVersion + 1,
        rules,
        updatedBy: user.uid,
        updatedAt: Date.now(),
        notes: notes || `Version ${latestVersion + 1}`
      }, addDoc);

      console.log('[useSettings]: Successfully published pricing config v' + (latestVersion + 1));
      toast.success(`Pricing Version ${latestVersion + 1} published successfully`);
      return true;
    } catch (error: any) {
      console.error('[useSettings]: Fatal error in savePricingConfig:', error);
      toast.error(`Publish failed: ${error.message || 'Unknown error'}`);
      handleFirestoreError(error, OperationType.CREATE, 'pricing_configs');
      return false;
    }
  };

  return { settings, loading, updateSettings, savePricingConfig };
}

export function usePricingHistory() {
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'pricing_configs'), orderBy('version', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { history, loading };
}

export function useClients() {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user, profile } = useAuth();

  React.useEffect(() => {
    if (!user || profile?.role === 'client') {
      setClients([]);
      setLoading(false);
      return;
    }

    const path = 'clients';
    const q = query(collection(db, path), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile?.role]);

  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'accountStatus'>, id?: string) => {
    const path = 'clients';
    try {
      if (id) {
        await setDoc(doc(db, path, id), {
          ...clientData,
          clientType: clientData.clientType || 'one-off',
          accountStatus: 'up-to-date',
          createdAt: Date.now()
        });
        return id;
      }
      const docRef = await mythosAddDoc(collection(db, path), {
        ...clientData,
        clientType: clientData.clientType || 'one-off',
        accountStatus: 'up-to-date',
        createdAt: Date.now()
      }, addDoc);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    const path = `clients/${id}`;
    try {
      await mythosUpdateDoc(doc(db, 'clients', id), {
        ...clientData,
        updatedAt: Date.now()
      }, updateDoc);
      toast.success('Client updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteClient = async (id: string) => {
    const path = `clients/${id}`;
    const userRole = profile?.role || 'unknown';
    console.log(`[useClients]: Attempting to delete client ${id}. User role: ${userRole}`);
    
    try {
      await deleteDoc(doc(db, 'clients', id));
      console.log(`[useClients]: Client ${id} deleted successfully.`);
      toast.success('Client removed from database');
      return true;
    } catch (error: any) {
      console.error(`[useClients]: Delete failed for client ${id}:`, error);
      
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        toast.error('Permission Denied: Only administrators can delete clients.');
      } else {
        toast.error(`Delete failed: ${error.message || 'Unknown error'}`);
      }
      
      handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  };

  return { clients, loading, addClient, updateClient, deleteClient };
}

export function useStaff() {
  const [staff, setStaff] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { staff, loading };
}

export function useAgencyStaff() {
  const [staff, setStaff] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user, profile } = useAuth();

  React.useEffect(() => {
    if (!user || profile?.clientType !== 'real-estate') {
      setStaff([]);
      setLoading(false);
      return;
    }

    const agencyId = profile.agencyId || user.uid;
    const q = query(collection(db, 'users'), where('agencyId', '==', agencyId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, profile]);

  return { staff, loading };
}

export function useAdmin() {
  const [admins, setAdmins] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAdmins(snapshot.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const verifyAdminPasscode = async (passcode: string): Promise<UserProfile | null> => {
    // In a real app, this would be a secure server-side check
    const admin = admins.find(a => a.passcode === passcode);
    return admin || null;
  };

  return { admins, loading, verifyAdminPasscode };
}

export function usePayments() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) {
      setPayments([]);
      setLoading(false);
      return;
    }

    const path = 'payments';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
      setPayments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { payments, loading };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
    await Promise.all(promises);
  };

  return { notifications, loading, markAsRead, markAllAsRead };
}
