import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db, firebaseEnabled, hasFirebaseConfig } from "./firebase";

export type GrassrootsCollection =
  | "bookings"
  | "inventory"
  | "equipment"
  | "safetyRecords"
  | "settings"
  | "pricing";

export function usingFirebaseData() {
  return firebaseEnabled && Boolean(db);
}

export function firebaseStatusText() {
  if (import.meta.env.VITE_GRASSROOTS_DATA_MODE !== "firebase") {
    return "Local mode";
  }

  if (!hasFirebaseConfig()) {
    return "Firebase mode selected but config is missing";
  }

  if (!db) {
    return "Firebase unavailable";
  }

  return "Firebase connected";
}

export async function loadCollection<T>(name: GrassrootsCollection): Promise<T[]> {
  if (!db) return [];

  try {
    const snapshot = await getDocs(query(collection(db, name), orderBy("createdAt", "desc")));

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as T[];
  } catch {
    const snapshot = await getDocs(collection(db, name));

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as T[];
  }
}

export async function loadRecord<T>(name: GrassrootsCollection, id: string): Promise<T | null> {
  if (!db) return null;

  const snapshot = await getDoc(doc(db, name, id));

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as T;
}

export async function addRecord<T extends Record<string, unknown>>(
  name: GrassrootsCollection,
  data: T
) {
  if (!db) throw new Error("Firebase is not configured.");
  return addDoc(collection(db, name), data);
}

export async function saveRecord<T extends Record<string, unknown>>(
  name: GrassrootsCollection,
  id: string,
  data: T
) {
  if (!db) throw new Error("Firebase is not configured.");
  return setDoc(doc(db, name, id), data, { merge: true });
}

export async function deleteRecord(name: GrassrootsCollection, id: string) {
  if (!db) throw new Error("Firebase is not configured.");
  return deleteDoc(doc(db, name, id));
}

export async function pingFirestore() {
  if (!db) {
    return {
      ok: false,
      message: "Firestore is not configured.",
    };
  }

  try {
    await getDocs(collection(db, "bookings"));

    return {
      ok: true,
      message: "Firestore responded successfully.",
    };
  } catch (error) {
    console.error(error);

    return {
      ok: false,
      message: "Firestore request failed. Check config, Auth, and rules.",
    };
  }
}
