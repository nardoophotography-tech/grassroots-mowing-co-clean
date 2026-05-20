/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import baseConfig from '../firebase-applet-config.json';

// Simple Firebase initialization using the provided config
const app = initializeApp(baseConfig);

// Initialize Firestore with specific settings to handle connectivity issues in containerized environments
// Enabling long-polling as a fallback for WebSocket restrictions
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, baseConfig.firestoreDatabaseId);

/**
 * CRITICAL: Test connection to Firestore on boot
 */
async function testConnection() {
  try {
    // Attempting a server-side get to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info("Firestore Connection: Established");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
        console.error("Firestore Error: The client is offline or backend is unavailable. Check configuration.");
      } else if (error.message.includes('Quota exceeded')) {
        console.error("Firestore Error: Quota exceeded. Please wait for reset.");
      } else {
        console.error("Firestore Connection Failed:", error.message);
      }
    }
  }
}

testConnection();

export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Custom safe stringify to avoid circular structures, DOM nodes and React Fiber nodes
  const safeJson = (() => {
    try {
      // Use a more robust sanitization approach similar to Mythos
      const cache = new Set();
      const sanitizeSafe = (val: any): any => {
        if (val === null || typeof val === 'undefined') return val;
        if (typeof val !== 'object') return typeof val === 'function' ? '[Function]' : val;
        if (cache.has(val)) return '[Circular]';
        cache.add(val);

        if (typeof Node !== 'undefined' && val instanceof Node) return `[DOM Node: ${val.nodeName}]`;
        
        const constructorName = val.constructor?.name;
        if (constructorName && (constructorName.includes('Element') || constructorName.includes('Fiber') || constructorName.includes('React'))) {
          return `[Protected Object: ${constructorName}]`;
        }

        if (Array.isArray(val)) return val.map(v => sanitizeSafe(v));
        
        const res: any = {};
        for (const key in val) {
          if (Object.prototype.hasOwnProperty.call(val, key)) {
            if (key.startsWith('__react') || key.startsWith('__fiber')) {
               res[key] = '[React Internal]';
            } else {
               res[key] = sanitizeSafe(val[key]);
            }
          }
        }
        return res;
      };

      const info = {
        error: errorMessage,
        operationType,
        path,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
          isAnonymous: auth.currentUser?.isAnonymous,
          tenantId: auth.currentUser?.tenantId,
        },
        rawError: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
          code: (error as any).code
        } : sanitizeSafe(error)
      };

      return JSON.stringify(info, null, 2);
    } catch (e) {
      return JSON.stringify({ 
        error: errorMessage, 
        operationType, 
        path, 
        note: 'Fallback: Safe stringification failed' 
      });
    }
  })();

  console.error('Firestore Error Status:', safeJson);
  throw new Error(safeJson);
}
