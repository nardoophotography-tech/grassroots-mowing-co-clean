const fs = require("fs");

const file = "package.json";

if (!fs.existsSync(file)) {
  console.log("No root package.json found.");
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(file, "utf8"));

pkg.scripts = pkg.scripts || {};

const oldScripts = { ...pkg.scripts };

// Preserve old backend-ish commands under backend names
if (oldScripts.start && !pkg.scripts["backend:start:old"]) {
  pkg.scripts["backend:start:old"] = oldScripts.start;
}

if (oldScripts.dev && !pkg.scripts["backend:dev:old"]) {
  pkg.scripts["backend:dev:old"] = oldScripts.dev;
}

// Make root commands safe by default
pkg.scripts.start = "cd client && npm run dev -- --port 5173 --host 127.0.0.1";
pkg.scripts.dev = "cd client && npm run dev -- --port 5173 --host 127.0.0.1";
pkg.scripts.build = "cd client && npm run build";

pkg.scripts.frontend = "cd client && npm run dev -- --port 5173 --host 127.0.0.1";
pkg.scripts["frontend:5174"] = "cd client && npm run dev -- --port 5174 --host 127.0.0.1";
pkg.scripts["frontend:build"] = "cd client && npm run build";
pkg.scripts["frontend:install"] = "cd client && npm install";
pkg.scripts["frontend:health"] = "cd client && npm install && npm run build";

// Leave backend available, but not default
pkg.scripts["backend:note"] = "node -e \"console.log('Backend is isolated. Do not run until sqlite/port 8080 is fixed separately.')\"";

// Remove direct sqlite deps from ROOT only, because they are causing Windows node-gyp loops
const removed = [];

for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
  if (!pkg[section]) continue;

  for (const dep of ["sqlite3", "better-sqlite3"]) {
    if (pkg[section][dep]) {
      removed.push(`${section}.${dep}`);
      delete pkg[section][dep];
    }
  }

  if (Object.keys(pkg[section]).length === 0) {
    delete pkg[section];
  }
}

fs.writeFileSync(file, JSON.stringify(pkg, null, 2), "utf8");

console.log("Root package.json repaired.");
console.log("Default npm start/dev now launches frontend only.");
console.log("Old backend commands preserved as backend:start:old / backend:dev:old where found.");

if (removed.length) {
  console.log("Removed direct root sqlite dependencies:");
  for (const item of removed) console.log("- " + item);
} else {
  console.log("No direct root sqlite dependencies found.");
}
