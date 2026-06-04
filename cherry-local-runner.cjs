const http = require("http");
const { exec } = require("child_process");
const path = require("path");

const PORT = 4570;
const ROOT = process.cwd();

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Private-Network": "true"
  });
  res.end(json);
}

function run(command) {
  return new Promise((resolve) => {
    exec(command, { cwd: ROOT, shell: "powershell.exe", timeout: 120000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        command,
        output: `${stdout || ""}${stderr || ""}`.trim(),
        error: error ? String(error.message || error) : ""
      });
    });
  });
}

async function handleAction(action) {
  if (action === "health") {
    return {
      ok: true,
      message: "Complete. Cherry Local Runner is online.",
      output: `Project folder: ${ROOT}`
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

  if (action === "savePush") {
    const result = await run('git add .; git commit -m "Cherry local runner update"; git push');
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

  if (action === "diagnose") {
    const build = await run("npm run build");
    const git = await run("git status --short");
    return {
      ok: build.ok,
      message: build.ok ? "Complete. Diagnosis passed." : "Diagnosis found a build problem.",
      output: `BUILD:\n${build.output || build.error}\n\nGIT:\n${git.output || "No changed files."}`
    };
  }

  return {
    ok: false,
    message: "Unknown local runner action.",
    output: action
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 200, { ok: true });

  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, {
      ok: true,
      message: "Complete. Cherry Local Runner is online.",
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
        const result = await handleAction(body.action);
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
  console.log(`Cherry Local Runner online: http://127.0.0.1:${PORT}`);
  console.log(`Project folder: ${ROOT}`);
});
