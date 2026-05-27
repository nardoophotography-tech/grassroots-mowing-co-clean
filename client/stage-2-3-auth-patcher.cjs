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

// 1. Add Firebase Auth imports
if (!code.includes('from "firebase/auth"')) {
  replaceOnce(
    'import "./App.css";',
    'import "./App.css";\nimport { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";\nimport { auth, firebaseEnabled, firebaseModeLabel } from "./firebase";',
    "Firebase Auth imports"
  );
}

// 2. Make sure duplicated firebase import is not added twice if rerun
code = code.replace(
  /import \{ auth, firebaseEnabled, firebaseModeLabel \} from "\.\/firebase";\nimport \{ auth, firebaseEnabled, firebaseModeLabel \} from "\.\/firebase";/g,
  'import { auth, firebaseEnabled, firebaseModeLabel } from "./firebase";'
);

// 3. Add Firebase Auth state after admin PIN states
if (!code.includes("const [firebaseUser")) {
  replaceOnce(
    'const [pinInput, setPinInput] = useState("");',
    'const [pinInput, setPinInput] = useState("");\n  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);\n  const [authEmail, setAuthEmail] = useState("");\n  const [authPassword, setAuthPassword] = useState("");\n  const [authStatus, setAuthStatus] = useState("PIN fallback active");',
    "Firebase Auth state"
  );
}

// 4. Add Firebase Auth listener
if (!code.includes("onAuthStateChanged(auth")) {
  const marker = "function saveBookings(next: Booking[])";
  const insert = `useEffect(() => {
    setAuthStatus(firebaseModeLabel());

    if (!firebaseEnabled || !auth) {
      setAuthStatus("PIN fallback active");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      if (user) {
        localStorage.setItem(ADMIN_SESSION_KEY, "active");
        setIsAdmin(true);
        setAuthStatus(\`Firebase admin signed in: \${user.email || "admin"}\`);
      } else {
        setAuthStatus("Firebase Auth ready. Admin not signed in.");
      }
    });

    return () => unsubscribe();
  }, []);

  `;
  replaceOnce(marker, insert + marker, "Firebase Auth listener");
}

// 5. Replace adminLogin with async Firebase Auth + PIN fallback
replaceRegex(
  /function adminLogin\(event: React\.FormEvent<HTMLFormElement>\) \{[\s\S]*?setNotice\("Wrong admin PIN\."\);\s*\}/,
  `async function adminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = authEmail.trim();
    const password = authPassword;

    if (firebaseEnabled && auth && email && password) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem(ADMIN_SESSION_KEY, "active");
        setIsAdmin(true);
        setPinInput("");
        setAuthEmail("");
        setAuthPassword("");
        setNotice("Firebase admin login successful.");
        setPage("dashboard");
        return;
      } catch (error) {
        console.error(error);
        setNotice("Firebase login failed. You can still use the local PIN fallback.");
      }
    }

    if (pinInput.trim() === getAdminPin()) {
      localStorage.setItem(ADMIN_SESSION_KEY, "active");
      setIsAdmin(true);
      setPinInput("");
      setNotice("Admin unlocked with local PIN.");
      setPage("dashboard");
      return;
    }

    setNotice("Wrong admin PIN or Firebase login failed.");
  }`,
  "adminLogin Firebase replacement"
);

// 6. Replace adminLogout with Firebase signOut + local logout
replaceRegex(
  /function adminLogout\(\) \{[\s\S]*?setPage\("book"\);\s*\}/,
  `async function adminLogout() {
    try {
      if (auth && firebaseUser) {
        await signOut(auth);
      }
    } catch (error) {
      console.error(error);
    }

    localStorage.removeItem(ADMIN_SESSION_KEY);
    setFirebaseUser(null);
    setIsAdmin(false);
    setNotice("Admin locked.");
    setPage("book");
  }`,
  "adminLogout Firebase replacement"
);

// 7. Upgrade login page UI
if (!code.includes("Firebase email/password login")) {
  replaceRegex(
    /<form className="login-form" onSubmit=\{adminLogin\}>[\s\S]*?<\/form>/,
    `<form className="login-form" onSubmit={adminLogin}>
            <div className="auth-status-box">
              <span>Authentication status</span>
              <strong>{authStatus}</strong>
              <small>{firebaseUser ? \`Signed in as \${firebaseUser.email || "Firebase admin"}\` : "Use Firebase login when configured, or local PIN fallback."}</small>
            </div>

            <div className="login-split">
              <div className="login-method-card">
                <h2>Firebase email/password login</h2>
                <p>Use this after Firebase Auth is enabled and an admin user is created.</p>

                <label>
                  Admin email
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </label>

                <label>
                  Admin password
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Firebase password"
                  />
                </label>
              </div>

              <div className="login-method-card">
                <h2>Local PIN fallback</h2>
                <p>This keeps the app usable while Firebase Auth is being set up.</p>

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
              </div>
            </div>

            <button className="primary" type="submit">Unlock admin</button>
            <button className="secondary" type="button" onClick={() => setPage("book")}>Back to public booking</button>
          </form>`,
    "login UI upgrade"
  );
}

// 8. Upgrade admin banner text
if (!code.includes("Firebase user:")) {
  code = code.replace(
    '<span>{isAdmin ? "Business tools are available." : "Only customer booking is open until admin login."}</span>',
    '<span>{isAdmin ? (firebaseUser ? `Firebase user: ${firebaseUser.email || "admin"}` : "Business tools are available with local PIN.") : "Only customer booking is open until admin login."}</span>'
  );
  console.log("Patched admin banner auth text");
}

// 9. Add auth panel to dashboard if missing
if (!code.includes("Auth protection status")) {
  replaceOnce(
    '<div className="cloud-panel">',
    `<div className="cloud-panel auth-panel">
                <span>Auth protection status</span>
                <strong>{isAdmin ? "Admin unlocked" : "Admin locked"}</strong>
                <small>{firebaseUser ? \`Firebase admin: \${firebaseUser.email || "signed in"}\` : "Local PIN fallback available"}</small>
              </div>

              <div className="cloud-panel">`,
    "dashboard auth panel"
  );
}

// 10. Add Login button wording if needed
code = code.replace(
  /<button className="admin-lock-button" onClick=\{\(\) => setPage\("login"\)\}>Admin Login<\/button>/g,
  '<button className="admin-lock-button" onClick={() => setPage("login")}>Admin Login</button>'
);

fs.writeFileSync(file, code, "utf8");
console.log("Stage 2.3 Firebase Auth scaffold patch complete.");
