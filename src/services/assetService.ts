import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  increment
} from 'firebase/firestore';
import { db, storage, auth } from '../firebase';
import { AppAsset } from '../types';
import { Mythos } from '../lib/mythos';

class AssetService {
  /**
   * Upload an asset with metadata
   */
  async uploadAsset(
    file: File, 
    type: AppAsset['type'], 
    category: string = 'general'
  ): Promise<AppAsset | null> {
    try {
      const timestamp = Date.now();
      // Ensure file name is clean to prevent path issues
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `assets/${type}/${timestamp}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      // 1. Upload to Storage
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      // 2. Metadata for Firestore
      const assetData: Omit<AppAsset, 'id'> = {
        type,
        category,
        url,
        thumbnailUrl: url, // In production, this would be a resized version
        storagePath,
        fileName: file.name,
        active: true,
        sortOrder: 0,
        uploadedBy: auth.currentUser?.uid || 'system',
        versionNumber: 1,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const docRef = await addDoc(collection(db, 'assets'), assetData);
      
      const newAsset = { ...assetData, id: docRef.id } as AppAsset;
      Mythos.info("ASSET_UPLOADED", { id: newAsset.id, type, version: 1 });
      
      return newAsset;
    } catch (error) {
      Mythos.error("ASSET_UPLOAD_FAILED", { type, error });
      return null;
    }
  }

  /**
   * Fetch assets by type
   */
  async getAssetsByType(type: AppAsset['type']): Promise<AppAsset[]> {
    try {
      const q = query(
        collection(db, 'assets'), 
        where('type', '==', type),
        orderBy('sortOrder', 'asc'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppAsset));
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      return [];
    }
  }

  /**
   * Reorder or update metadata
   */
  async updateAsset(id: string, data: Partial<AppAsset>) {
    try {
      const timestamp = Date.now();
      const updatePayload = {
        ...data,
        updatedAt: timestamp,
        versionNumber: increment(1)
      };
      
      await updateDoc(doc(db, 'assets', id), updatePayload);
      Mythos.info("ASSET_UPDATED", { id, data });
    } catch (error) {
      console.error('Asset update failed:', error);
    }
  }

  /**
   * Delete asset from storage and db
   */
  async deleteAsset(asset: AppAsset) {
    try {
      // 1. Storage Deletion (Primary Method using storagePath)
      if (asset.storagePath) {
        const storageRef = ref(storage, asset.storagePath);
        await deleteObject(storageRef).catch(e => {
          console.warn('Storage file deletion warning (continuing):', e);
        });
      } else {
        // Fallback: try to derive from URL (Strip query params first)
        // Use rawUrl if provided by the hook, otherwise use the url (split to safety)
        const targetUrl = asset.rawUrl || asset.url;
        const cleanUrl = targetUrl.split('?')[0];
        const storageRef = ref(storage, cleanUrl);
        await deleteObject(storageRef).catch(e => {
          console.warn('Fallback storage deletion failed:', e);
        });
      }

      // 2. Database Deletion (Permanent removal, no soft delete)
      await deleteDoc(doc(db, 'assets', asset.id));
      
      Mythos.info("ASSET_PERMANENTLY_DELETED", { 
        id: asset.id, 
        type: asset.type,
        path: asset.storagePath 
      });
      
      return true;
    } catch (error) {
      Mythos.error("ASSET_DELETION_CRITICAL_FAILURE", { id: asset.id, error });
      throw error;
    }
  }
}

export const assetService = new AssetService();
