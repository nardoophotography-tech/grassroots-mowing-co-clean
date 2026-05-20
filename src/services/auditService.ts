import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type AuditAction = 
  | 'ASSET_UPLOAD' | 'ASSET_DELETE' | 'ASSET_UPDATE'
  | 'PRICING_PUBLISH' | 'PRICING_ROLLBACK'
  | 'SETTINGS_UPDATE'
  | 'STAFF_INVITE' | 'STAFF_DELETE' | 'STAFF_UPDATE'
  | 'CLIENT_DELETE' | 'JOB_DELETE';

export interface AuditLog {
  userId: string;
  userEmail: string;
  action: AuditAction;
  details: string;
  metadata?: any;
  timestamp: any;
}

export const auditService = {
  log: async (user: { uid: string, email: string }, action: AuditAction, details: string, metadata?: any) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        userId: user.uid,
        userEmail: user.email,
        action,
        details,
        metadata: metadata || {},
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Audit Log failed:', error);
    }
  }
};
