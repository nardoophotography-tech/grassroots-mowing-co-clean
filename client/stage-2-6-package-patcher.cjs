const fs = require("fs");

const file = "package.json";
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));

pkg.scripts = pkg.scripts || {};
pkg.scripts["check:firebase"] = "node scripts/firebase-setup-check.cjs";
pkg.scripts["health"] = "npm run check:firebase && npm run build";

fs.writeFileSync(file, JSON.stringify(pkg, null, 2), "utf8");
console.log("package.json scripts added: check:firebase, health");
