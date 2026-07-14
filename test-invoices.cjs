const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
  // Trying default init
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync('./grassroots-mowing-co-firebase-adminsdk-j6b0q-0d4d5d97f1.json', 'utf8'));
  } catch (e) {
    try {
      // Find any json file that looks like a service account
      const files = fs.readdirSync('.');
      const saFile = files.find(f => f.includes('firebase-adminsdk'));
      if (saFile) serviceAccount = JSON.parse(fs.readFileSync(saFile, 'utf8'));
    } catch (err) {}
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    console.log("No service account found, using default");
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function run() {
  try {
    const snap = await db.collection('invoices').get();
    console.log(`Found ${snap.size} invoices in Firestore`);
    if (snap.size > 0) {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('Sample invoice 0:', data[0]);
    }
  } catch (e) {
    console.error("Error fetching invoices:", e.message);
  }
}

run();
