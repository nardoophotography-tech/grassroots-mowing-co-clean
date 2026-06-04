const http = require("http");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 4570;
const ROOT = process.cwd();

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Private-Network": "true"
  });
  res.end(JSON.stringify(body));
}

function safePath(relativePath) {
  const clean = String(relativePath || "").replace(/^["']|["']$/g, "");
  const full = path.resolve(ROOT, clean);

  if (!full.startsWith(ROOT)) {
    throw new Error("Blocked: file is outside the Cherry project folder.");
  }

  if (full.includes(`${path.sep}.git${path.sep}`) || full.includes(`${path.sep}node_modules${path.sep}`)) {
    throw new Error("Blocked: protected folder.");
  }

  return full;
}

function blockDangerousPowerShell(command) {
  const c = String(command || "").toLowerCase();

  const blocked = [
    "format-volume",
    "clear-disk",
    "remove-partition",
    "delete partition",
    "cipher /w",
    "shutdown",
    "restart-computer",
    "stop-computer",
    "remove-item c:\\",
    "rm c:\\",
    "rmdir c:\\",
    "del c:\\",
    "rd /s c:\\",
    "set-executionpolicy unrestricted"
  ];

  for (const item of blocked) {
    if (c.includes(item)) {
      throw new Error(`Blocked dangerous command: ${item}`);
    }
  }
}

function run(command, timeout = 300000) {
  return new Promise((resolve) => {
    blockDangerousPowerShell(command);

    const wrapped = `Set-Location -LiteralPath "${ROOT}"; ${command}`;

    exec(
      wrapped,
      {
        cwd: ROOT,
        shell: "powershell.exe",
        timeout,
        maxBuffer: 1024 * 1024 * 20
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          command,
          output: `${stdout || ""}${stderr || ""}`.trim(),
          error: error ? String(error.message || error) : ""
        });
      }
    );
  });
}

function scanFiles() {
  const results = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(ROOT, full);

      if (
        rel.startsWith(".git") ||
        rel.startsWith("node_modules") ||
        rel.startsWith("dist") ||
        rel.startsWith("BACKUP-")
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(full);
      } else {
        results.push(rel);
      }
    }
  }

  walk(ROOT);
  return results.slice(0, 500);
}

function backupFile(fullPath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rel = path.relative(ROOT, fullPath).replace(/[\\/]/g, "__");
  const backupDir = path.join(ROOT, `BACKUP-CHERRY-FILE-EDIT-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  if (fs.existsSync(fullPath)) {
    fs.copyFileSync(fullPath, path.join(backupDir, `${rel}.bak`));
  }

  return backupDir;
}

async function handleAction(body) {
  const action = body.action;

  if (action === "health") {
    return {
      ok: true,
      message: "Complete. Local Runner is online.",
      output: `Project folder: ${ROOT}`
    };
  }

  if (action === "scanFiles") {
    return {
      ok: true,
      message: "Complete. Project scanned.",
      output: scanFiles().join("\n")
    };
  }

  if (action === "readFile") {
    const full = safePath(body.path);
    const text = fs.readFileSync(full, "utf8");

    return {
      ok: true,
      message: "Complete. File read.",
      output: text
    };
  }

  if (action === "writeFile") {
    const full = safePath(body.path);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    const backupDir = backupFile(full);
    fs.writeFileSync(full, String(body.content || ""), "utf8");

    return {
      ok: true,
      message: "Complete. File changed.",
      output: `Changed: ${path.relative(ROOT, full)}\nBackup: ${backupDir}`
    };
  }

  if (action === "powershell") {
    const result = await run(String(body.command || ""));

    return {
      ok: result.ok,
      message: result.ok ? "Complete. Command finished." : "Command failed.",
      output: result.output || result.error
    };
  }

  if (action === "gitStatus") {
    const result = await run("git status --short");

    return {
      ok: result.ok,
      message: result.ok ? "Complete. Git status checked." : "Git status failed.",
      output: result.output || "No changed files."
    };
  }

  if (action === "build") {
    const result = await run("npm run build");

    return {
      ok: result.ok,
      message: result.ok ? "Complete. Build passed." : "Build failed.",
      output: result.output || result.error
    };
  }

  if (action === "diagnose") {
    const build = await run("npm run build");
    const git = await run("git status --short");

    return {
      ok: build.ok,
      message: build.ok ? "Complete. Diagnosis passed." : "Build problem found.",
      output: `BUILD:\n${build.output || build.error}\n\nGIT:\n${git.output || "No changed files."}`
    };
  }

  if (action === "savePush") {
    const result = await run('git add .; git commit -m "Cherry self repair update"; git push');

    return {
      ok: result.ok,
      message: result.ok ? "Complete. Changes saved and pushed." : "Save or push needs attention.",
      output: result.output || result.error
    };
  }

  if (action === "deploy") {
    const result = await run("gcloud run deploy cherry-app --source . --region us-central1 --allow-unauthenticated");

    return {
      ok: result.ok,
      message: result.ok ? "Complete. Cherry deployed live." : "Deploy failed.",
      output: result.output || result.error
    };
  }

  return {
    ok: false,
    message: "Unknown action.",
    output: String(action || "")
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 200, { ok: true });

  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, {
      ok: true,
      message: "Complete. Local Runner is online.",
      output: `Project folder: ${ROOT}`
    });
  }

  if (req.method === "POST" && req.url === "/run") {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", async () => {
      try {
        const body = raw ? JSON.parse(raw) : {};
        const result = await handleAction(body);
        send(res, result.ok ? 200 : 500, result);
      } catch (error) {
        send(res, 500, {
          ok: false,
          message: "Local Runner error.",
          output: String(error?.message || error)
        });
      }
    });

    return;
  }

  send(res, 404, {
    ok: false,
    message: "Not found.",
    output: req.url
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Cherry Local Runner v2 online: http://127.0.0.1:${PORT}`);
  console.log(`Project folder: ${ROOT}`);
});
