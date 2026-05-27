import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !String(firebaseConfig.apiKey).includes("PASTE_") &&
    !String(firebaseConfig.projectId).includes("PASTE_")
  );
}

export const firebaseEnabled =
  import.meta.env.VITE_GRASSROOTS_DATA_MODE === "firebase" && hasFirebaseConfig();

export const firebaseApp = firebaseEnabled
  ? getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig)
  : null;

export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;

export function firebaseModeLabel() {
  if (import.meta.env.VITE_GRASSROOTS_DATA_MODE !== "firebase") {
    return "Local mode";
  }

  if (!hasFirebaseConfig()) {
    return "Firebase mode selected but config is missing";
  }

  return "Firebase configured";
}
