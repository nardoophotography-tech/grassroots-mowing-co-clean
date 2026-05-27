const fs = require("fs");

const file = "src/App.tsx";

if (!fs.existsSync(file)) {
  console.error("src/App.tsx not found.");
  process.exit(1);
}

let code = fs.readFileSync(file, "utf8");

function replaceOnce(find, replace, label) {
  if (!code.includes(find)) {
    console.warn(`Skipped ${label}: exact text not found.`);
    return false;
  }

  code = code.replace(find, replace);
  console.log(`Patched ${label}`);
  return true;
}

// 1. Upgrade cloudStore import
if (code.includes('from "./cloudStore"')) {
  code = code.replace(
    /import \{[^}]*\} from "\.\/cloudStore";/,
    'import { addRecord, deleteRecord, firebaseStatusText, loadCollection, loadRecord, pingFirestore, saveRecord, usingFirebaseData } from "./cloudStore";'
  );
  console.log("Patched cloudStore imports");
}

// 2. Add cloud sync helper functions before return
if (!code.includes("async function runFirebaseHealthCheck")) {
  const marker = "return (";
  const insert = `async function runFirebaseHealthCheck() {
    setCloudStatus(firebaseStatusText());

    if (!usingFirebaseData()) {
      setNotice("Firebase is not active. The app is still in local mode.");
      return;
    }

    try {
      setCloudBusy(true);
      const result = await pingFirestore();
      setCloudStatus(result.ok ? "Firebase connected" : "Firebase check failed");
      setNotice(result.message);
    } catch (error) {
      console.error(error);
      setCloudStatus("Firebase check failed");
      setNotice("Firebase health check failed.");
    } finally {
      setCloudBusy(false);
    }
  }

  async function uploadLocalDataToCloud() {
    setCloudStatus(firebaseStatusText());

    if (!usingFirebaseData()) {
      setNotice("Firebase is not active. Set VITE_GRASSROOTS_DATA_MODE=firebase first.");
      return;
    }

    if (!window.confirm("Upload local GrassRoots data to Firestore? This will write local data into cloud collections.")) {
      return;
    }

    try {
      setCloudBusy(true);

      await saveRecord("settings", "business", settings as unknown as Record<string, unknown>);
      await saveRecord("pricing", "main", pricing as unknown as Record<string, unknown>);

      for (const booking of bookings) {
        await saveRecord("bookings", booking.id, booking as unknown as Record<string, unknown>);
      }

      for (const item of inventory) {
        await saveRecord("inventory", item.id, item as unknown as Record<string, unknown>);
      }

      for (const item of equipment) {
        await saveRecord("equipment", item.id, item as unknown as Record<string, unknown>);
      }

      for (const record of safetyRecords) {
        await saveRecord("safetyRecords", record.id, record as unknown as Record<string, unknown>);
      }

      setCloudStatus("Firebase connected");
      setNotice("Local data uploaded to Firestore.");
    } catch (error) {
      console.error(error);
      setCloudStatus("Cloud upload failed");
      setNotice("Cloud upload failed. Check Firebase rules, Auth login, and config.");
    } finally {
      setCloudBusy(false);
    }
  }

  async function downloadCloudDataToLocal() {
    setCloudStatus(firebaseStatusText());

    if (!usingFirebaseData()) {
      setNotice("Firebase is not active. Set VITE_GRASSROOTS_DATA_MODE=firebase first.");
      return;
    }

    if (!window.confirm("Download Firestore data into this browser? This will replace local data with cloud data where found.")) {
      return;
    }

    try {
      setCloudBusy(true);

      const cloudBookings = await loadCollection<Booking>("bookings");
      const cloudInventory = await loadCollection<InventoryItem>("inventory");
      const cloudEquipment = await loadCollection<EquipmentItem>("equipment");
      const cloudSafety = await loadCollection<SafetyRecord>("safetyRecords");
      const cloudSettings = await loadRecord<BusinessSettings>("settings", "business");
      const cloudPricing = await loadRecord<PricingSettings>("pricing", "main");

      if (cloudBookings.length) {
        saveBookings(cloudBookings.map((booking) => ({
          ...booking,
          checklist: booking.checklist ?? blankChecklist(),
          beforePhotoNote: booking.beforePhotoNote ?? "",
          afterPhotoNote: booking.afterPhotoNote ?? "",
          completionNotes: booking.completionNotes ?? "",
        })));
      }

      if (cloudInventory.length) saveInventory(cloudInventory);
      if (cloudEquipment.length) saveEquipment(cloudEquipment);
      if (cloudSafety.length) saveSafety(cloudSafety);
      if (cloudSettings) saveSettings({ ...defaultSettings, ...cloudSettings });
      if (cloudPricing) savePricing({ ...defaultPricing, ...cloudPricing });

      setCloudStatus("Firebase connected");
      setNotice("Cloud data downloaded into local app.");
    } catch (error) {
      console.error(error);
      setCloudStatus("Cloud download failed");
      setNotice("Cloud download failed. Check Firebase rules, Auth login, and config.");
    } finally {
      setCloudBusy(false);
    }
  }

  `;
  replaceOnce(marker, insert + marker, "cloud migration helper functions");
}

// 3. Add dashboard cloud buttons if missing
if (!code.includes("Upload local to cloud")) {
  replaceOnce(
    '<button className="secondary" onClick={() => goToPage("diagnostics")}>Open diagnostics</button>',
    '<button className="secondary" onClick={() => goToPage("diagnostics")}>Open diagnostics</button>\n                <button className="secondary" onClick={runFirebaseHealthCheck}>Firebase check</button>\n                <button className="secondary" onClick={uploadLocalDataToCloud}>Upload local to cloud</button>',
    "dashboard cloud migration buttons"
  );
}

// 4. Add migration controls into Diagnostics page if missing
if (!code.includes("Cloud migration controls")) {
  replaceOnce(
    '<div className="diagnostic-actions">',
    `<div className="cloud-migration-box">
            <h2>Cloud migration controls</h2>
            <p>Use these only after Firebase config is added, Auth is enabled, and you are logged in as admin.</p>
            <div className="diagnostic-actions">
              <button className="secondary" onClick={runFirebaseHealthCheck}>Run Firebase health check</button>
              <button className="secondary" onClick={uploadLocalDataToCloud}>Upload local data to Firestore</button>
              <button className="secondary" onClick={downloadCloudDataToLocal}>Download Firestore data to local</button>
            </div>
          </div>

          <div className="diagnostic-actions">`,
    "diagnostics migration controls"
  );
}

// 5. Add Data page migration cards if missing
if (!code.includes("Upload local app data into Firestore")) {
  replaceOnce(
    '<ActionCard title="Clear local data" text="Deletes local test data and restores starter settings." button="Clear data" onClick={clearLocalData} danger />',
    '<ActionCard title="Clear local data" text="Deletes local test data and restores starter settings." button="Clear data" onClick={clearLocalData} danger />\n            <ActionCard title="Firebase health check" text="Checks whether Firestore responds with the current config and rules." button="Run check" onClick={runFirebaseHealthCheck} />\n            <ActionCard title="Upload local app data into Firestore" text="Writes local bookings, settings, pricing, inventory, equipment, and safety records to cloud." button="Upload to cloud" onClick={uploadLocalDataToCloud} />\n            <ActionCard title="Download Firestore data into this browser" text="Pulls cloud data back into the local app for checking and backup." button="Download from cloud" onClick={downloadCloudDataToLocal} />',
    "data page migration cards"
  );
}

// 6. Upgrade Automation page next-step wording
code = code.replace(
  "This local build is now ready for the Firebase step.",
  "This build now has local mode, admin protection, Firebase diagnostics, and cloud migration tools."
);

fs.writeFileSync(file, code, "utf8");
console.log("Stage 2.5 App.tsx patch complete.");
