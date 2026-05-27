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

function replaceRegex(pattern, replace, label) {
  if (!pattern.test(code)) {
    console.warn(`Skipped ${label}: pattern not found.`);
    return false;
  }

  code = code.replace(pattern, replace);
  console.log(`Patched ${label}`);
  return true;
}

// 1. Add cloud imports
if (!code.includes('from "./cloudStore"')) {
  replaceOnce(
    'import "./App.css";',
    'import "./App.css";\nimport { addRecord, deleteRecord, firebaseStatusText, loadCollection, saveRecord, usingFirebaseData } from "./cloudStore";',
    "cloud imports"
  );
}

// 2. Add cloud state after notice state
if (!code.includes("const [cloudStatus")) {
  replaceOnce(
    'const [notice, setNotice] = useState("");',
    'const [notice, setNotice] = useState("");\n  const [cloudStatus, setCloudStatus] = useState("Local mode");\n  const [cloudBusy, setCloudBusy] = useState(false);',
    "cloud status state"
  );
}

// 3. Add cloud load helper before saveBookings
if (!code.includes("async function refreshCloudBookings")) {
  const marker = "function saveBookings(next: Booking[])";
  const insert = `async function refreshCloudBookings() {
    setCloudStatus(firebaseStatusText());

    if (!usingFirebaseData()) return;

    try {
      setCloudBusy(true);
      const cloudBookings = await loadCollection<Booking>("bookings");

      if (cloudBookings.length) {
        setBookings(cloudBookings.map((booking) => ({
          ...booking,
          checklist: booking.checklist ?? blankChecklist(),
          beforePhotoNote: booking.beforePhotoNote ?? "",
          afterPhotoNote: booking.afterPhotoNote ?? "",
          completionNotes: booking.completionNotes ?? "",
        })));

        saveItem(BOOKINGS_KEY, cloudBookings);
        setNotice("Cloud bookings loaded from Firebase.");
      } else {
        setNotice("Firebase connected. No cloud bookings yet.");
      }
    } catch (error) {
      console.error(error);
      setNotice("Firebase load failed. Local data is still available.");
    } finally {
      setCloudBusy(false);
    }
  }

  `;
  replaceOnce(marker, insert + marker, "refreshCloudBookings helper");
}

// 4. Add cloud boot effect after existing useEffect block
if (!code.includes("refreshCloudBookings();")) {
  replaceRegex(
    /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/,
    (match) => `${match}

  useEffect(() => {
    refreshCloudBookings();
  }, []);`,
    "cloud boot effect"
  );
}

// 5. Make submitBooking async
replaceOnce(
  "function submitBooking(event: React.FormEvent<HTMLFormElement>) {",
  "async function submitBooking(event: React.FormEvent<HTMLFormElement>) {",
  "submitBooking async"
);

// 6. Add Firestore add inside submitBooking before local save
if (!code.includes('await addRecord("bookings"')) {
  replaceOnce(
    'saveBookings([booking, ...bookings]);',
    `if (usingFirebaseData()) {
      try {
        setCloudBusy(true);
        const saved = await addRecord("bookings", booking as unknown as Record<string, unknown>);
        booking.id = saved.id;
        setCloudStatus("Firebase connected");
      } catch (error) {
        console.error(error);
        setNotice("Firebase save failed. Booking saved locally instead.");
      } finally {
        setCloudBusy(false);
      }
    }

    saveBookings([booking, ...bookings]);`,
    "cloud add booking"
  );
}

// 7. Make updateBooking async and save to cloud
replaceOnce(
  "function updateBooking(id: string, updates: Partial<Booking>) {",
  "async function updateBooking(id: string, updates: Partial<Booking>) {",
  "updateBooking async"
);

if (!code.includes('await saveRecord("bookings"')) {
  replaceOnce(
    "saveBookings(bookings.map((booking) => booking.id === id ? { ...booking, ...updates } : booking));",
    `const nextBookings = bookings.map((booking) => booking.id === id ? { ...booking, ...updates } : booking);
    saveBookings(nextBookings);

    if (usingFirebaseData()) {
      try {
        const updatedBooking = nextBookings.find((booking) => booking.id === id);
        if (updatedBooking) {
          await saveRecord("bookings", id, updatedBooking as unknown as Record<string, unknown>);
          setCloudStatus("Firebase connected");
        }
      } catch (error) {
        console.error(error);
        setNotice("Firebase update failed. Local update was kept.");
      }
    }`,
    "cloud update booking"
  );
}

// 8. Make deleteBooking async and delete from cloud
replaceOnce(
  "function deleteBooking(id: string) {",
  "async function deleteBooking(id: string) {",
  "deleteBooking async"
);

if (!code.includes('await deleteRecord("bookings"')) {
  replaceOnce(
    'saveBookings(bookings.filter((booking) => booking.id !== id));',
    `saveBookings(bookings.filter((booking) => booking.id !== id));

    if (usingFirebaseData()) {
      try {
        await deleteRecord("bookings", id);
        setCloudStatus("Firebase connected");
      } catch (error) {
        console.error(error);
        setNotice("Firebase delete failed. Local delete was kept.");
      }
    }`,
    "cloud delete booking"
  );
}

// 9. Add cloud status panel in dashboard hero actions
if (!code.includes("Cloud data status")) {
  replaceOnce(
    '<div className="hero-actions">',
    `<div className="cloud-panel">
                <span>Cloud data status</span>
                <strong>{cloudStatus}</strong>
                <small>{cloudBusy ? "Syncing..." : usingFirebaseData() ? "Firebase mode active" : "Local browser storage active"}</small>
              </div>

              <div className="hero-actions">`,
    "cloud status panel"
  );
}

// 10. Add manual cloud refresh button if not already
if (!code.includes("Refresh cloud bookings")) {
  replaceOnce(
    '<button className="primary" onClick={() => setPage("book")}>Create booking</button>',
    '<button className="primary" onClick={() => setPage("book")}>Create booking</button>\n                <button className="secondary" onClick={refreshCloudBookings}>Refresh cloud bookings</button>',
    "refresh button"
  );
}

fs.writeFileSync(file, code, "utf8");
console.log("App.tsx patch complete.");
