const fs = require("fs");

const file = "package.json";

if (!fs.existsSync(file)) {
  console.log("No root package.json found. Skipping.");
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(file, "utf8"));

pkg.scripts = pkg.scripts || {};

pkg.scripts["frontend"] = "cd client && npm run dev";
pkg.scripts["frontend:build"] = "cd client && npm run build";
pkg.scripts["frontend:install"] = "cd client && npm install";
pkg.scripts["frontend:health"] = "cd client && npm install && npm run build";
pkg.scripts["start:frontend"] = "cd client && npm run dev";

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

console.log("Root package.json patched with safe frontend scripts.");

if (removed.length) {
  console.log("Removed direct sqlite dependency entries from root package.json:");
  for (const item of removed) console.log("- " + item);
} else {
  console.log("No direct sqlite3/better-sqlite3 dependency found in root package.json.");
}
