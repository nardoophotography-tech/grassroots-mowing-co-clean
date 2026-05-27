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

// 1. Add diagnostics page type
if (!code.includes('| "diagnostics"')) {
  replaceOnce(
    '| "automation";',
    '| "diagnostics"\n  | "automation";',
    "diagnostics page type"
  );
}

// 2. Add diagnostics to protected pages
if (!code.includes('"diagnostics",')) {
  replaceOnce(
    '  "settings",\n  "automation",',
    '  "settings",\n  "diagnostics",\n  "automation",',
    "diagnostics protected page"
  );
}

// 3. Add diagnostics nav button
if (!code.includes('goToPage("diagnostics")')) {
  replaceOnce(
    '<button onClick={() => goToPage("automation")}>Automation</button>',
    '<button onClick={() => goToPage("diagnostics")}>Diagnostics</button>\n          <button onClick={() => goToPage("automation")}>Automation</button>',
    "diagnostics nav button"
  );
}

// 4. Add diagnostics page before automation page
if (!code.includes('page === "diagnostics"')) {
  replaceOnce(
    '{page === "automation" && isAdmin && (',
    `{page === "diagnostics" && isAdmin && (
        <section className="card">
          <SectionTitle
            tag="Firebase Diagnostics"
            title="Cloud readiness check"
            text="Use this screen before switching the app fully to Firebase cloud mode."
          />

          <div className="diagnostics-grid">
            <article className="diagnostic-card">
              <span>Data mode</span>
              <strong>{import.meta.env.VITE_GRASSROOTS_DATA_MODE || "local"}</strong>
              <p>{usingFirebaseData() ? "Firestore data mode is active." : "Local browser storage is active."}</p>
            </article>

            <article className="diagnostic-card">
              <span>Cloud status</span>
              <strong>{cloudStatus}</strong>
              <p>{cloudBusy ? "Sync is currently running." : "No cloud sync running right now."}</p>
            </article>

            <article className="diagnostic-card">
              <span>Auth status</span>
              <strong>{authStatus}</strong>
              <p>{firebaseUser ? \`Firebase user: \${firebaseUser.email || "admin"}\` : "No Firebase user signed in."}</p>
            </article>

            <article className="diagnostic-card">
              <span>Admin protection</span>
              <strong>{isAdmin ? "Unlocked" : "Locked"}</strong>
              <p>{isAdmin ? "Business screens are available." : "Business screens are protected."}</p>
            </article>

            <article className="diagnostic-card">
              <span>Public booking</span>
              <strong>{import.meta.env.VITE_GRASSROOTS_PUBLIC_BOOKINGS || "true"}</strong>
              <p>Customers can submit bookings without admin login.</p>
            </article>

            <article className="diagnostic-card">
              <span>Security mode</span>
              <strong>{import.meta.env.VITE_GRASSROOTS_SECURITY_MODE || "admin_only"}</strong>
              <p>Admin-only pages are protected by login.</p>
            </article>
          </div>

          <div className="diagnostic-actions">
            <button className="secondary" onClick={refreshCloudBookings}>Refresh cloud bookings</button>
            <button className="secondary" onClick={exportAllData}>Export JSON backup</button>
            <button className="secondary" onClick={exportBookingsCsv}>Export bookings CSV</button>
          </div>

          <div className="security-note">
            <strong>Before public launch:</strong>
            <span>Deploy Firestore rules, enable Firebase Auth, create an admin user, and test public booking from a different device.</span>
          </div>
        </section>
      )}

      {page === "automation" && isAdmin && (`,
    "diagnostics page block"
  );
}

// 5. Add dashboard quick button
if (!code.includes('goToPage("diagnostics")}>Open diagnostics')) {
  replaceOnce(
    '<button className="secondary" onClick={exportBookingsCsv}>Export CSV</button>',
    '<button className="secondary" onClick={exportBookingsCsv}>Export CSV</button>\n                <button className="secondary" onClick={() => goToPage("diagnostics")}>Open diagnostics</button>',
    "dashboard diagnostics button"
  );
}

fs.writeFileSync(file, code, "utf8");
console.log("Stage 2.4 diagnostics patch complete.");
