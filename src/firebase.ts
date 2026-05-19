/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { FirestoreError, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import baseConfig from '../firebase-applet-config.json';

const app = initializeApp(baseConfig);

export const db = baseConfig.firestoreDatabaseId
  ? getFirestore(app, baseConfig.firestoreDatabaseId)
  : getFirestore(app);
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

export function getFirestoreErrorMessage(error: unknown) {
  if (error instanceof FirestoreError) {
    if (error.code === 'permission-denied') {
      return 'Firestore permission denied. Check Firebase Authentication and Firestore rules.';
    }
    if (error.code === 'unavailable') {
      return 'Firestore is unavailable. Check the network connection and Firebase project status.';
    }
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const message = getFirestoreErrorMessage(error);
  console.error('[Firestore]', { operationType, path, message, error });
  throw new Error(message);
}
