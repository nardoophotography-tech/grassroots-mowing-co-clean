const fs = require("fs");
const path = require("path");

const requiredEnv = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_GRASSROOTS_DATA_MODE",
  "VITE_GRASSROOTS_ADMIN_PIN",
];

const recommendedFiles = [
  "src/App.tsx",
  "src/App.css",
  "src/firebase.ts",
  "src/cloudStore.ts",
  ".env.local",
  ".env.example",
  "firebase.json",
  "firestore.rules",
  "firestore.indexes.json",
];

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const values = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();

    values[key] = value;
  }

  return values;
}

function isPlaceholder(value) {
  if (!value) return true;
  return value.includes("PASTE_") || value.includes("_HERE") || value === "value";
}

function passFail(condition) {
  return condition ? "PASS" : "FAIL";
}

const env = readEnvFile(".env.local");
const report = [];

report.push("GrassRoots Mowing Co - Stage 2.6 Firebase Setup Report");
report.push(`Generated: ${new Date().toLocaleString("en-AU")}`);
report.push("");
report.push("=== FILE CHECK ===");

for (const file of recommendedFiles) {
  report.push(`${passFail(fs.existsSync(file))} ${file}`);
}

report.push("");
report.push("=== ENV CHECK ===");

for (const key of requiredEnv) {
  const value = env[key];
  const ok = Boolean(value) && !isPlaceholder(value);

  if (key === "VITE_GRASSROOTS_DATA_MODE") {
    report.push(`${passFail(value === "local" || value === "firebase")} ${key}=${value || "MISSING"}`);
  } else {
    report.push(`${passFail(ok)} ${key}=${value ? value.replace(/.(?=.{4})/g, "*") : "MISSING"}`);
  }
}

report.push("");
report.push("=== CURRENT MODE ===");
report.push(`Data mode: ${env.VITE_GRASSROOTS_DATA_MODE || "MISSING"}`);

if (env.VITE_GRASSROOTS_DATA_MODE === "firebase") {
  report.push("Firebase mode is selected.");
  report.push("Make sure Firebase Auth is enabled and Firestore rules are deployed.");
} else {
  report.push("Local mode is selected.");
  report.push("This is safe. The app should keep using browser storage.");
}

report.push("");
report.push("=== NEXT ACTION ===");

const missingFirebase = requiredEnv
  .filter((key) => key.startsWith("VITE_FIREBASE_"))
  .filter((key) => !env[key] || isPlaceholder(env[key]));

if (missingFirebase.length) {
  report.push("Firebase is NOT ready yet. Missing or placeholder values:");
  for (const key of missingFirebase) report.push(`- ${key}`);
  report.push("");
  report.push("Keep VITE_GRASSROOTS_DATA_MODE=local until these are filled.");
} else {
  report.push("Firebase config values appear to be filled.");
  report.push("Next: enable Firebase Auth, create admin user, deploy Firestore rules, then test firebase mode.");
}

report.push("");
report.push("=== PUBLIC LAUNCH WARNING ===");
report.push("Do not public-launch Firebase mode until:");
report.push("- Firestore rules are deployed");
report.push("- Firebase Auth email/password is enabled");
report.push("- Only your admin account exists");
report.push("- Public booking create works");
report.push("- Admin read/update/delete works after login");

const output = report.join("\n");
const outFile = `grassroots-stage-2-6-firebase-report-${Date.now()}.txt`;

fs.writeFileSync(outFile, output, "utf8");

console.log(output);
console.log("");
console.log(`Report saved to: ${outFile}`);
