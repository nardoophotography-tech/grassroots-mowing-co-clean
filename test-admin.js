import admin from "firebase-admin";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
admin.initializeApp({
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
});
const db = admin.firestore();

async function test() {
  try {
    const s = await db.collection("invoices").limit(1).get();
    console.log("Success! size:", s.size);
  } catch(err) {
    console.error("Error:", err.message);
  }
}
test();
