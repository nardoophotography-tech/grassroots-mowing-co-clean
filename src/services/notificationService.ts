import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc,
  limit,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { AppNotification, UserRole, Job, BusinessSettings, Invoice } from '@/types';
import { Mythos } from '@/lib/mythos';
import { documentationService } from './documentationService';
import { getDoc } from 'firebase/firestore';

class NotificationService {
  /**
   * Helper to fetch business settings
   */
  private async getSettings(): Promise<BusinessSettings | null> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'business'));
      return snap.exists() ? snap.data() as BusinessSettings : null;
    } catch (error) {
      console.error('Failed to fetch settings for notification:', error);
      return null;
    }
  }

  /**
   * Request browser permission for notifications
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') return true;

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.sendLocalNotification('Notifications Enabled', {
            body: 'You will now receive alerts for job updates and bookings.',
            tag: 'permission-granted'
          });
        }
        return permission === 'granted';
      } catch (err) {
        console.error('Error requesting notification permission:', err);
        return false;
      }
    }

    return false;
  }

  /**
   * Send a local browser notification (System Push)
   */
  sendLocalNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          silent: false,
          requireInteraction: false,
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (err) {
        console.error('Failed to send local notification:', err);
      }
    }
  }

  /**
   * Create a persistent notification in Firestore
   */
  async notify(notification: Omit<AppNotification, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: Date.now()
      });
      
      Mythos.info("NOTIFICATION_CREATED", { userId: notification.userId });
      
      // Also trigger a system push if permission is granted
      this.sendLocalNotification(notification.title, {
        body: notification.message,
        tag: docRef.id
      });

      return docRef.id;
    } catch (error) {
      Mythos.error("FAILED_TO_CREATE_NOTIFICATION", error);
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
      return null;
    }
  }

  /**
   * Notify all users with a specific role
   */
  async notifyRole(role: UserRole, title: string, message: string, link?: string, type: AppNotification['type'] = 'info') {
    try {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const snapshot = await getDocs(q);
      
      const promises = snapshot.docs.map(userDoc => 
        this.notify({
          userId: userDoc.id,
          title,
          message,
          type,
          link,
          read: false,
          createdAt: Date.now()
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      Mythos.error("FAILED_TO_NOTIFY_ROLE", error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  }

  /**
   * Internal helper to call the backend notification API
   */
  private async triggerExternalNotification(stage: string, job: Job, extra?: any) {
    try {
      console.log(`[NotificationService] Triggering external notification for stage: ${stage}`, { jobId: job.id, client: job.clientName });
      
      const payload = {
        stage,
        job,
        clientEmail: job.clientEmail,
        clientPhone: job.clientPhone,
        clientName: job.clientName,
        amount: extra?.amount || job.price,
        invoiceNumber: extra?.invoice?.invoiceNumber || job.invoiceId || job.id,
        invoiceLink: extra?.link || job.paymentLink || job.quoteUrl
      };

      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        console.error(`[NotificationService] API Error: Status ${response.status}`, { contentType });
        const text = await response.text();
        console.error(`[NotificationService] Error Body Fragment: ${text.substring(0, 200)}`);
        throw new Error(`External notification API failed with status: ${response.status}`);
      }

      if (!contentType || !contentType.includes('application/json')) {
        console.error(`[NotificationService] Unexpected Content-Type: ${contentType}`);
        const text = await response.text();
        console.error(`[NotificationService] Response Body Fragment: ${text.substring(0, 200)}`);
        throw new Error('API returned non-JSON response. Check server logs.');
      }

      const results = await response.json();
      console.log(`[NotificationService] External notification SUCCESS:`, results);
      return results;
    } catch (error) {
      console.error(`[NotificationService] External notification FAILED:`, error);
      Mythos.error("EXTERNAL_NOTIFICATION_FAILED", { stage, jobId: job.id, error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Universal trigger for user milestones with automated documentation
   */
  async triggerNotification(type: string, data: any, extra?: any) {
    Mythos.info("TRIGGER_NOTIFICATION", { type, dataId: data.id });
    const job = data as Job;
    
    // 1. Trigger external notification (SMS/Email) via backend
    // The backend now authoritative handling for:
    // - Email/SMS for client/admin
    // - Document generation (PDFs)
    // - Database notifications for admins/clients
    await this.triggerExternalNotification(type, job, extra);

    // 2. Client-side local feedback (optional/legacy)
    // Most complexity is now server-side to prevent permission errors and ensure reliable delivery
    console.log(`[NotificationService] Notification lifecycle initiated: ${type}`);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      Mythos.error("FAILED_TO_MARK_READ", error);
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  }

  /**
   * Mark all for a user as read
   */
  async markAllAsRead(userId: string, unreadNotifications: AppNotification[]) {
    try {
      const promises = unreadNotifications.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      );
      await Promise.all(promises);
    } catch (error) {
      Mythos.error("FAILED_TO_MARK_ALL_READ", error);
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  }

  /**
   * Listen to current user's notifications
   */
  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AppNotification));
      callback(notifications);
    });
  }

  /**
   * Utility: Send notification to all admins
   */
  async notifyAdmins(title: string, message: string, link?: string) {
    return this.notifyRole('admin', title, message, link);
  }
}

export const notificationService = new NotificationService();

export async function triggerNotification(type: string, data: any, extra?: any) {
  return notificationService.triggerNotification(type, data, extra);
}
