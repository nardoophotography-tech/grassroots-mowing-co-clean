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
import { db, OperationType, handleFirestoreError, safeOnSnapshot } from '../firebase';
import { UserProfile, Job, Client, Invoice, BusinessSettings, InvoiceItem, AccountStatus, PaymentMethod, PricingRules, Payment, AppNotification, BookingSettings } from '../types';
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
  const [firestoreError, setFirestoreError] = React.useState<string | null>(null);
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
      const effectiveClientId = profile.agencyId || user.uid;
      q = query(collection(db, path), where('clientId', '==', effectiveClientId), orderBy('scheduledDate', 'desc'));
    }
        
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      setJobs(jobsData);
      setFirestoreError(null);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setFirestoreError(error.message || 'Firestore read failed — check browser console for details');
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
      // Fire-and-forget: notification failure must never block the booking save
      triggerNotification('booking-confirmed', newJob).catch((err) => {
        console.warn('[addJob] Notification failed (non-blocking):', err);
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
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

      try {
        if (jobData.status === 'on-the-way') {
          await triggerNotification('team-en-route', mergedJob);
        } else if (jobData.status === 'in-progress') {
          await triggerNotification('in-progress', mergedJob);
        } else if (jobData.status === 'completed') {
          await generateInvoiceForJob(id);
          await notifyNextClient(id);
        }
      } catch (notificationError) {
        console.warn('[useJobs.updateJob] Job status updated, but follow-up notification failed:', notificationError);
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
    if (!job) return;

    const quoteUrl = `${window.location.origin}/quote/${job.id}`;
        
    try {
      let effectiveEmail = job.clientEmail?.trim();
            
      if (!effectiveEmail && job.clientId) {
        try {
          const clientSnap = await getDoc(doc(db, 'clients', job.clientId));
          if (clientSnap.exists()) {
            const clientData = clientSnap.data() as Client;
            effectiveEmail = clientData.email?.trim();
                        
            if (effectiveEmail) {
              await mythosUpdateDoc(doc(db, 'jobs', jobId), { clientEmail: effectiveEmail }, updateDoc);
            }
          }
        } catch (fetchErr) {
          console.error(fetchErr);
        }
      }

      if (!effectiveEmail) {
        throw new Error("Client email is required to send a quote.");
      }

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

      await triggerNotification('quote-sent', updatedJob);
      toast.success('Quote sent to customer.');
    } catch (err: any) {
      toast.error(`Failed to send quote: ${err.message}`);
    }
  };

  const notifyCurrentClient = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const settingsDoc = await getDoc(doc(db, 'settings', 'business'));
    const settings = settingsDoc.exists() ? settingsDoc.data() as BusinessSettings : null;
    if (!settings?.nextClientNotificationEnabled) return;

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
      (job.pricingSnapshot.addOns ?? []).forEach(addon => {
        items.push({ description: `Add-on: ${addon.name}`, amount: addon.price });
      });
    } else {
      items = [
        { description: `Base Service (${job.clientType})`, amount: job.basePrice },
        { description: `Grade Adjustment (${job.serviceGrade})`, amount: job.gradeAdjustment },
        { description: 'Condition Surcharges', amount: job.conditionSurcharge },
      ];
      if (job.urgencySurcharge > 0) {
        items.push({ description: 'Urgency Surcharge', amount: job.urgencySurcharge });
      }
      (job.addOns ?? []).filter(a => a.selected).forEach(addon => {
        items.push({ description: `Add-on: ${addon.name}`, amount: addon.price });
      });
    }

    const invoiceRef = doc(collection(db, 'invoices'));
    const paymentLink = `${window.location.origin}/pay/${invoiceRef.id}`;

    const invoiceData: any = {
      invoiceNumber,
      jobId,
      clientId: job.clientId,
      clientName: job.clientName,
      clientEmail: job.clientEmail || null,
      clientPhone: job.clientPhone || null,
      clientAddress: job.suburb,
      items,
      totalAmount: job.price,
      pricingSnapshot: job.pricingSnapshot || null,
      status: job.paymentStatus === 'paid' ? 'paid' : 'draft',
      paymentMethod: job.paymentMethod || null,
      paidAt: job.paymentDate || null,
      paymentLink,
      dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
      createdAt: Date.now()
    };

    await setDoc(invoiceRef, invoiceData);
    await mythosUpdateDoc(doc(db, 'jobs', jobId), {
      invoiceId: invoiceRef.id,
      status: 'invoiced_final',
      paymentLink
    }, updateDoc);

    await updateClientAccountStatus(job.clientId);

    // Trigger notification (email + SMS). Update invoice status to 'sent' only after dispatch.
    try {
      await triggerNotification('invoice-sent', job, {
        amount: job.price,
        link: paymentLink,
        invoice: { id: invoiceRef.id, ...invoiceData } as Invoice
      });
      await updateDoc(invoiceRef, { status: 'sent', sentAt: Date.now() });
    } catch (notifyErr) {
      console.error('[createInvoice] Notification failed — invoice left as draft:', notifyErr);
    }

    toast.success(`Invoice ${invoiceNumber} issued.`);
  };

  const deleteJob = async (id: string) => {
    try {
      const jobSnap = await getDoc(doc(db, 'jobs', id));
      if (jobSnap.exists()) {
        const job = jobSnap.data() as Job;
        if (job.invoiceId) {
          await deleteDoc(doc(db, 'invoices', job.invoiceId));
        }
      }
      await deleteDoc(doc(db, 'jobs', id));
      toast.success('Job removed.');
      return true;
    } catch (error: any) {
      toast.error('Deletion failure.');
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

    if (todaysJobs.length === 0) return;

    try {
      const batchPromises = todaysJobs.map(job => {
        return mythosUpdateDoc(doc(db, 'jobs', job.id), {
          notificationSent: true,
          updatedAt: Date.now()
        }, updateDoc);
      });
      await Promise.all(batchPromises);
      toast.success('Morning route notices sent.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'jobs');
    }
  };

  return { jobs, loading, firestoreError, addJob, updateJob, reorderJob, assignWorker, deleteJob, broadcastDailyStart, sendQuoteToCustomer };
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
    const unsubscribe = safeOnSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setJob({ id: snap.id, ...snap.data() } as Job);
      } else {
        setJob(null);
      }
      setLoading(false);
    }, (error) => {
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

    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
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

    const jobSnap = await getDoc(doc(db, 'jobs', inv.jobId));
    if (jobSnap.exists()) {
      await triggerNotification('payment-receipt', { id: jobSnap.id, ...jobSnap.data() } as Job, { 
        amount: inv.totalAmount,
        invoice: inv
      });
    }

    toast.success('Payment settled.');
  };

  const deleteInvoice = async (id: string) => {
    try {
      let docRef = doc(db, 'invoices', id);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        docRef = doc(db, 'jobs', id);
        docSnap = await getDoc(docRef);
      }

      if (!docSnap.exists()) return false;

      const data = docSnap.data();
      if (data && 'jobId' in data) {
        const invoice = data as Invoice;
        if (invoice.jobId) {
          const jobRef = doc(db, 'jobs', invoice.jobId);
          const jobSnap = await getDoc(jobRef);
          if (jobSnap.exists()) {
            await mythosUpdateDoc(jobRef, {
              status: 'completed' as any,
              invoiceId: null,
              updatedAt: Date.now()
            }, updateDoc);
          }
        }
      }

      await deleteDoc(docRef);
      toast.success('Invoice archived.');
      return true;
    } catch (error: any) {
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
    const unsubscribe = safeOnSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setInvoice({ id: snap.id, ...snap.data() } as Invoice);
      } else {
        setInvoice(null);
      }
      setLoading(false);
    }, (error) => {
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
    const unsubscribe = safeOnSnapshot(doc(db, 'settings', 'business'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          pricing: { ...DEFAULT_SETTINGS.pricing, ...(data.pricing || {}) },
          images: { ...DEFAULT_SETTINGS.images, ...(data.images || {}) }
        } as BusinessSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    try {
      const sanitized = Mythos.sanitize(newSettings);
      await setDoc(doc(db, 'settings', 'business'), sanitized, { merge: true });
      return true;
    } catch (error) {
      return false;
    }
  };

  const savePricingConfig = async (rules: PricingRules, notes?: string) => {
    if (!user) return false;
    try {
      const updateSuccess = await updateSettings({ pricing: rules });
      if (!updateSuccess) return false;

      const q = query(collection(db, 'pricing_configs'), orderBy('version', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      const latestVersion = snapshot.empty ? 0 : snapshot.docs[0].data().version;

      await mythosAddDoc(collection(db, 'pricing_configs'), {
        version: latestVersion + 1,
        rules,
        updatedBy: user.uid,
        updatedAt: Date.now(),
        notes: notes || `Version ${latestVersion + 1}`
      }, addDoc);

      toast.success(`Pricing rules v${latestVersion + 1} live.`);
      return true;
    } catch (error: any) {
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
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
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
        
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
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
      throw error;
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      await mythosUpdateDoc(doc(db, 'clients', id), {
        ...clientData,
        updatedAt: Date.now()
      }, updateDoc);
      toast.success('Profile saved.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
      toast.success('Record deleted.');
      return true;
    } catch (error: any) {
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
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
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
        
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
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
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
      setAdmins(snapshot.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const verifyAdminPasscode = async (passcode: string): Promise<UserProfile | null> => {
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
        
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
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

    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppNotification[]);
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

 
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('[useNotifications] markAsRead failed:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter(n => !n.read)
          .map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }))
      );
    } catch (err) {
      console.error('[useNotifications] markAllAsRead failed:', err);
    }
  };

  return { notifications, loading, markAsRead, markAllAsRead };
}

// ─── Booking Availability Settings ───────────────────────────────────────────

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  bookingIntakeOpenDate: '2026-06-26',
  firstAvailableServiceDate: '2026-06-29',
  maxBookingsPerDay: 6,
  workingDays: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  },
  timeSlots: [
    { id: 'morning', label: 'Morning Run', time: '08:00', enabled: true, maxBookings: 3 },
    { id: 'afternoon', label: 'Afternoon Run', time: '13:00', enabled: true, maxBookings: 3 },
  ],
  blockedDates: [],
  blockedSlots: [],
};

export function useBookingSettings() {
  const [bookingSettings, setBookingSettings] = React.useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = safeOnSnapshot(
      doc(db, 'bookingSettings', 'main'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setBookingSettings({
            ...DEFAULT_BOOKING_SETTINGS,
            ...data,
            workingDays: { ...DEFAULT_BOOKING_SETTINGS.workingDays, ...(data.workingDays || {}) },
            timeSlots: Array.isArray(data.timeSlots) && data.timeSlots.length > 0
              ? data.timeSlots
              : DEFAULT_BOOKING_SETTINGS.timeSlots,
            blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
            blockedSlots: Array.isArray(data.blockedSlots) ? data.blockedSlots : [],
          });
        } else {
          setBookingSettings(DEFAULT_BOOKING_SETTINGS);
        }
        setLoading(false);
      },
      () => {
        setBookingSettings(DEFAULT_BOOKING_SETTINGS);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const updateBookingSettings = async (data: Partial<BookingSettings>): Promise<boolean> => {
    try {
      await setDoc(doc(db, 'bookingSettings', 'main'), data, { merge: true });
      return true;
    } catch (e) {
      console.error('[useBookingSettings] save failed:', e);
      return false;
    }
  };

  return { bookingSettings, loading, updateBookingSettings };
}
