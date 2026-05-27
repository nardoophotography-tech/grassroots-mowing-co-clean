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

// 1. Add login page type
code = code.replace(
  /type Page =\s*\| "dashboard"/,
  'type Page =\n  | "login"\n  | "dashboard"'
);

// 2. Add admin helper constants after initialSafetyForm or another stable marker
if (!code.includes("const ADMIN_SESSION_KEY")) {
  const marker = "function loadItem<T>(key: string, fallback: T): T {";
  const insert = `const ADMIN_SESSION_KEY = "grassroots_admin_session_v1";

function getAdminPin() {
  return import.meta.env.VITE_GRASSROOTS_ADMIN_PIN || "4176";
}

const protectedPages = new Set<Page>([
  "dashboard",
  "bookings",
  "field",
  "schedule",
  "clients",
  "quotes",
  "invoices",
  "reports",
  "messages",
  "pricing",
  "equipment",
  "inventory",
  "safety",
  "data",
  "settings",
  "automation",
]);

function isProtectedPage(page: Page) {
  return protectedPages.has(page);
}

  `;
  replaceOnce(marker, insert + marker, "admin helper constants");
}

// 3. Add admin states
if (!code.includes("const [isAdmin")) {
  replaceOnce(
    'const [notice, setNotice] = useState("");',
    'const [notice, setNotice] = useState("");\n  const [isAdmin, setIsAdmin] = useState(false);\n  const [pinInput, setPinInput] = useState("");',
    "admin state"
  );
}

// 4. Add admin session load effect after main load useEffect
if (!code.includes("localStorage.getItem(ADMIN_SESSION_KEY)")) {
  replaceRegex(
    /useEffect\(\(\) => \{[\s\S]*?setPricing\(loadItem<PricingSettings>\(PRICING_KEY, defaultPricing\)\);\s*\}, \[\]\);/,
    (match) => `${match}

  useEffect(() => {
    setIsAdmin(localStorage.getItem(ADMIN_SESSION_KEY) === "active");
  }, []);`,
    "admin session load effect"
  );
}

// 5. Add admin functions before return
if (!code.includes("function adminLogin")) {
  const marker = "return (";
  const insert = `function adminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pinInput.trim() === getAdminPin()) {
      localStorage.setItem(ADMIN_SESSION_KEY, "active");
      setIsAdmin(true);
      setPinInput("");
      setNotice("Admin unlocked.");
      setPage("dashboard");
      return;
    }

    setNotice("Wrong admin PIN.");
  }

  function adminLogout() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdmin(false);
    setNotice("Admin locked.");
    setPage("book");
  }

  function goToPage(nextPage: Page) {
    if (isProtectedPage(nextPage) && !isAdmin) {
      setPage("login");
      setNotice("Admin login required.");
      return;
    }

    setPage(nextPage);
  }

  `;
  replaceOnce(marker, insert + marker, "admin functions");
}

// 6. Replace direct nav setPage calls with goToPage where possible
const navReplacements = [
  ['onClick={() => setPage("dashboard")}', 'onClick={() => goToPage("dashboard")}'],
  ['onClick={() => setPage("bookings")}', 'onClick={() => goToPage("bookings")}'],
  ['onClick={() => setPage("field")}', 'onClick={() => goToPage("field")}'],
  ['onClick={() => setPage("schedule")}', 'onClick={() => goToPage("schedule")}'],
  ['onClick={() => setPage("clients")}', 'onClick={() => goToPage("clients")}'],
  ['onClick={() => setPage("quotes")}', 'onClick={() => goToPage("quotes")}'],
  ['onClick={() => setPage("invoices")}', 'onClick={() => goToPage("invoices")}'],
  ['onClick={() => setPage("reports")}', 'onClick={() => goToPage("reports")}'],
  ['onClick={() => setPage("messages")}', 'onClick={() => goToPage("messages")}'],
  ['onClick={() => setPage("pricing")}', 'onClick={() => goToPage("pricing")}'],
  ['onClick={() => setPage("equipment")}', 'onClick={() => goToPage("equipment")}'],
  ['onClick={() => setPage("inventory")}', 'onClick={() => goToPage("inventory")}'],
  ['onClick={() => setPage("safety")}', 'onClick={() => goToPage("safety")}'],
  ['onClick={() => setPage("data")}', 'onClick={() => goToPage("data")}'],
  ['onClick={() => setPage("settings")}', 'onClick={() => goToPage("settings")}'],
  ['onClick={() => setPage("automation")}', 'onClick={() => goToPage("automation")}'],
];

for (const [find, replace] of navReplacements) {
  code = code.split(find).join(replace);
}

// 7. Keep Book public
code = code.split('onClick={() => goToPage("book")}').join('onClick={() => setPage("book")}');

// 8. Add login/logout buttons to nav
if (!code.includes("{isAdmin ?")) {
  replaceOnce(
    '<button onClick={() => goToPage("automation")}>Automation</button>',
    '<button onClick={() => goToPage("automation")}>Automation</button>\n          {isAdmin ? (\n            <button className="admin-lock-button" onClick={adminLogout}>Lock Admin</button>\n          ) : (\n            <button className="admin-lock-button" onClick={() => setPage("login")}>Admin Login</button>\n          )}',
    "admin nav button"
  );
}

// 9. Add locked banner after notice
if (!code.includes("admin-mode-banner")) {
  replaceOnce(
    '{notice && <div className="notice">{notice}</div>}',
    '{notice && <div className="notice">{notice}</div>}\n\n      <div className={isAdmin ? "admin-mode-banner unlocked" : "admin-mode-banner locked"}>\n        <strong>{isAdmin ? "Admin mode unlocked" : "Public booking mode"}</strong>\n        <span>{isAdmin ? "Business tools are available." : "Only customer booking is open until admin login."}</span>\n      </div>',
    "admin banner"
  );
}

// 10. Add login page block before dashboard block
if (!code.includes('page === "login"')) {
  replaceOnce(
    '{page === "dashboard" && (',
    `{page === "login" && (
        <section className="card login-card">
          <div className="section-title">
            <p className="tag">Admin Security</p>
            <h1>Admin login</h1>
            <p>Enter your GrassRoots admin PIN to unlock the business dashboard.</p>
          </div>

          <form className="login-form" onSubmit={adminLogin}>
            <label>
              Admin PIN
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter admin PIN"
                autoFocus
              />
            </label>

            <button className="primary" type="submit">Unlock admin</button>
            <button className="secondary" type="button" onClick={() => setPage("book")}>Back to public booking</button>
          </form>

          <div className="security-note">
            <strong>Temporary protection:</strong>
            <span>This is a local admin lock. Firebase Auth should replace this before public launch.</span>
          </div>
        </section>
      )}

      {page === "dashboard" && (`,
    "login page block"
  );
}

// 11. Add page guard for protected sections by wrapping condition checks
const protectedChecks = [
  "dashboard",
  "bookings",
  "field",
  "schedule",
  "clients",
  "quotes",
  "invoices",
  "reports",
  "messages",
  "pricing",
  "equipment",
  "inventory",
  "safety",
  "data",
  "settings",
  "automation"
];

for (const page of protectedChecks) {
  const find = `{page === "${page}" && (`;
  const replace = `{page === "${page}" && isAdmin && (`;
  code = code.split(find).join(replace);
}

// Fix accidental guarding of inserted login's dashboard marker if needed already okay.

fs.writeFileSync(file, code, "utf8");
console.log("Stage 2.2 App.tsx patch complete.");
