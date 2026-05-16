import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, Job } from '../types';

export const triggerNotification = async (stage: string, job: Job, extra?: any) => {
  try {
    // Get client email/phone if not in job
    let email = job.clientId; // Fallback
    let phone = job.clientPhone;
    let name = job.clientName;

    // Try to find the real client data for accurate notifications
    const clientDoc = await getDoc(doc(db, 'clients', job.clientId));
    if (clientDoc.exists()) {
      const client = clientDoc.data() as Client;
      email = client.email || email;
      phone = client.phone || phone;
      name = client.name || name;
    }

    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        job: {
          id: job.id,
          address: job.address,
          suburb: job.suburb,
          servicePackage: job.servicePackage,
          price: job.price,
          status: job.status,
          scheduledDate: job.scheduledDate,
          timeSlot: job.timeSlot,
        },
        clientEmail: email,
        clientPhone: phone,
        clientName: name,
        amount: extra?.amount || job.price,
        invoiceLink: extra?.link || job.paymentLink
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to trigger notification:', error);
    return { error: 'Network error' };
  }
};
