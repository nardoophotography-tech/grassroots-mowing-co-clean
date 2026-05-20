import { db, handleFirestoreError, OperationType } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  getCountFromServer
} from 'firebase/firestore';
import { ClientType, UserProfile } from '@/types';
import { Mythos } from '@/lib/mythos';

class ClientTriageService {
  /**
   * Evaluates a user's status and updates their client tier if necessary
   */
  async evaluateTier(uid: string, currentType: ClientType): Promise<ClientType> {
    try {
      // 1. Check for Subscription (Premium)
      // For this demo, let's assume we check a 'membershipStatus' field
      // but in real app we'd check Stripe subscriptions
      
      // 2. Check Job History (Returning)
      const jobsQuery = query(collection(db, 'jobs'), where('clientId', '==', uid), where('status', '==', 'completed'));
      const snapshot = await getCountFromServer(jobsQuery);
      const completedJobs = snapshot.data().count;

      // 3. Check for Organisation (Asset Management)
      // Usually set by Admin or during signup
      if (currentType === 'asset_management') return 'asset_management';

      let newType: ClientType = currentType;

      if (completedJobs >= 5) {
        newType = 'premium'; // Upgrade to premium if they have 5+ jobs? (Example logic)
      } else if (completedJobs >= 1) {
        newType = 'returning';
      }

      if (newType !== currentType) {
        await updateDoc(doc(db, 'users', uid), {
          clientType: newType,
          updatedAt: Date.now()
        });
        Mythos.info("CLIENT_TIER_UPGRADED", { uid, from: currentType, to: newType });
      }

      return newType;
    } catch (error) {
      Mythos.error("TIER_EVALUATION_FAILED", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
      return currentType;
    }
  }

  /**
   * Manual override or bulk triage
   */
  async setTier(uid: string, type: ClientType) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        clientType: type,
        updatedAt: Date.now()
      });
    } catch (error) {
      Mythos.error("TIER_SET_FAILED", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  }
}

export const clientTriageService = new ClientTriageService();
