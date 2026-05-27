const fs = require("fs");

const file = "package.json";

if (!fs.existsSync(file)) {
  console.log("No root package.json found.");
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
pkg.scripts = pkg.scripts || {};

if (pkg.scripts.start && !pkg.scripts["backend:start:old"]) {
  pkg.scripts["backend:start:old"] = pkg.scripts.start;
}

if (pkg.scripts.dev && !pkg.scripts["backend:dev:old"]) {
  pkg.scripts["backend:dev:old"] = pkg.scripts.dev;
}

pkg.scripts.start = "cd client && npm run dev -- --port 5173 --host 127.0.0.1";
pkg.scripts.dev = "cd client && npm run dev -- --port 5173 --host 127.0.0.1";
pkg.scripts.build = "cd client && npm run build";

pkg.scripts.frontend = "cd client && npm run dev -- --port 5173 --host 127.0.0.1";
pkg.scripts["frontend:fresh"] = "cd client && npm run dev -- --port 5174 --host 127.0.0.1";
pkg.scripts["frontend:build"] = "cd client && npm run build";
pkg.scripts["frontend:health"] = "cd client && npm install && npm run build";

pkg.scripts["backend:hold"] = "node -e \"console.log('Backend is isolated. Fix sqlite/8080 separately later.')\"";

for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
  if (!pkg[section]) continue;

  delete pkg[section].sqlite3;
  delete pkg[section]["better-sqlite3"];

  if (Object.keys(pkg[section]).length === 0) {
    delete pkg[section];
  }
}

fs.writeFileSync(file, JSON.stringify(pkg, null, 2), "utf8");
console.log("Root package.json now defaults to frontend only.");
