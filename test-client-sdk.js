import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    // try to get an exact known invoice or job? I don't know an ID...
    console.log("Initialization successful with client SDK!");
  } catch(err) {
    console.error("Error:", err.message);
  }
}
test();
