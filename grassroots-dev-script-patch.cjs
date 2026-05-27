const fs = require("fs");
const path = require("path");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function exists(file) {
  return fs.existsSync(file);
}

const rootPkgPath = path.join(process.cwd(), "package.json");

if (!exists(rootPkgPath)) {
  console.error("No package.json found in current folder. Open the correct project folder first.");
  process.exit(1);
}

const rootPkg = readJson(rootPkgPath);
rootPkg.scripts = rootPkg.scripts || {};

const possibleFrontendFolders = ["client", "frontend", "app", "web"];
let frontendFolder = null;

for (const folder of possibleFrontendFolders) {
  const pkgPath = path.join(process.cwd(), folder, "package.json");
  if (exists(pkgPath)) {
    const pkg = readJson(pkgPath);
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {})
    };

    if (allDeps.vite || pkg.scripts?.dev || pkg.scripts?.build) {
      frontendFolder = folder;
      break;
    }
  }
}

const rootDeps = {
  ...(rootPkg.dependencies || {}),
  ...(rootPkg.devDependencies || {})
};

if (frontendFolder) {
  const frontendPkgPath = path.join(process.cwd(), frontendFolder, "package.json");
  const frontendPkg = readJson(frontendPkgPath);
  frontendPkg.scripts = frontendPkg.scripts || {};

  if (!frontendPkg.scripts.dev) {
    frontendPkg.scripts.dev = "vite --host 0.0.0.0";
  }

  if (!frontendPkg.scripts.build) {
    frontendPkg.scripts.build = "vite build";
  }

  if (!frontendPkg.scripts.preview) {
    frontendPkg.scripts.preview = "vite preview --host 0.0.0.0";
  }

  writeJson(frontendPkgPath, frontendPkg);

  rootPkg.scripts.dev = `cd ${frontendFolder} && npm run dev`;
  rootPkg.scripts.build = rootPkg.scripts.build || `cd ${frontendFolder} && npm run build`;
  rootPkg.scripts.preview = `cd ${frontendFolder} && npm run preview`;

  writeJson(rootPkgPath, rootPkg);

  console.log(`Frontend detected in ./${frontendFolder}`);
  console.log("Root scripts updated:");
  console.log("  npm run dev");
  console.log("  npm run build");
  console.log("  npm run preview");
} else {
  if (rootDeps.vite || exists(path.join(process.cwd(), "index.html")) || exists(path.join(process.cwd(), "src"))) {
    rootPkg.scripts.dev = rootPkg.scripts.dev || "vite --host 0.0.0.0";
    rootPkg.scripts.build = rootPkg.scripts.build || "vite build";
    rootPkg.scripts.preview = rootPkg.scripts.preview || "vite preview --host 0.0.0.0";
  }

  if (exists(path.join(process.cwd(), "dist", "server.js"))) {
    rootPkg.scripts.start = rootPkg.scripts.start || "node dist/server.js";
  }

  writeJson(rootPkgPath, rootPkg);

  console.log("Frontend appears to be in the root folder.");
  console.log("Root scripts updated:");
  console.log("  npm run dev");
  console.log("  npm run build");
  console.log("  npm run preview");
}

console.log("Patch complete.");
