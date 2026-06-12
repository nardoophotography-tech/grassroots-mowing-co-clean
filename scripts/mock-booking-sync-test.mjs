import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import fs from "fs";

function loadEnv() {
  const env = {};
  if (fs.existsSync(".env")) {
    const lines = fs.readFileSync(".env", "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = value;
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnv();

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID
};

const missing = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error("FAILED: Missing Firebase config values:", missing.join(", "));
  console.error("Check your .env file has VITE_FIREBASE_* values.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const testId = `MOCK-BOOKING-${Date.now()}`;

const mockBooking = {
  testId,

  // Main dashboard fields
  customerName: "Test Client - Dashboard Sync",
  phone: "0400 000 156",
  email: "test.client@example.com",
  address: "123 Mock Street, Mount Isa QLD",
  suburb: "Mount Isa",
  serviceType: "Residential Standard Lawn Mow",
  yardSize: "Town block",
  preferredDate: new Date().toISOString().slice(0, 10),
  preferredDay: "Monday",
  notes: "MOCK TEST BOOKING - safe to delete after dashboard sync test.",

  // Compatibility fields in case dashboard uses older names
  name: "Test Client - Dashboard Sync",
  clientName: "Test Client - Dashboard Sync",
  phoneNumber: "0400 000 156",
  service: "Residential Standard Lawn Mow",
  jobType: "Residential Standard Lawn Mow",
  location: "123 Mock Street, Mount Isa QLD",

  // Required job tracking fields
  status: "new",
  source: "website_booking",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),

  // Pricing/test fields
  estimatedPrice: 150,
  price: 150,
  currency: "AUD",

  // Admin flags
  isMockTest: true,
  visibleInDashboard: true
};

console.log("Creating mock booking inside Firestore collection: jobs");

const created = await addDoc(collection(db, "jobs"), mockBooking);

console.log("Created mock job ID:", created.id);

const savedSnap = await getDoc(doc(db, "jobs", created.id));

if (!savedSnap.exists()) {
  console.error("FAILED: Mock booking was not found after saving.");
  process.exit(1);
}

console.log("Read-back test passed. Mock booking exists in jobs collection.");

const statusQuery = query(
  collection(db, "jobs"),
  where("status", "==", "new")
);

const statusSnap = await getDocs(statusQuery);

const found = statusSnap.docs.some((jobDoc) => jobDoc.id === created.id);

if (!found) {
  console.error("FAILED: Mock booking exists, but was not found by status == new query.");
  process.exit(1);
}

console.log("");
console.log("SYNC TEST PASSED");
console.log("The mock client booking is saved in collection: jobs");
console.log("Status: new");
console.log("Source: website_booking");
console.log("Admin dashboard should see it if the dashboard reads from jobs and does not hide status new.");
console.log("");
console.log("Mock Job ID:");
console.log(created.id);
