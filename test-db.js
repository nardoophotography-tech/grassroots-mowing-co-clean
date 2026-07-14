import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config();
const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
});
const db = getFirestore(app);
async function run() {
  const snap = await getDoc(doc(db, 'settings', 'business'));
  const currentPricing = snap.data().pricing;
  console.log("OLD BASE PRICES IN FIRESTORE:", JSON.stringify(currentPricing.base, null, 2));
  
  // Enforce new base prices
  const newBase = {
    'town_block': 90,
    'standard_yard': 100,
    'corner_blocks': 110,
    'large_lot_acreage': 150,
    'ultimate_property_gold': 170,
    'custom_quote': 0
  };
  
  await updateDoc(doc(db, 'settings', 'business'), {
    'pricing.base': newBase
  });
  
  console.log("UPDATED BASE PRICES IN FIRESTORE TO:", JSON.stringify(newBase, null, 2));
  process.exit(0);
}
run();
