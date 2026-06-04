import express, { Request, Response } from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(cors());

const PORT = 4570;
const HOST = "127.0.0.1";

const PROJECT_ROOT = process.cwd();
const ACCESS_RULES_FILE = path.join(PROJECT_ROOT, "CHERRY_ACCESS_RULES.md");

const WRITE_APPROVAL_CODE = "DAVID_APPROVED_WRITE";
const BUILD_APPROVAL_CODE = "DAVID_APPROVED_BUILD";
const DEPLOY_APPROVAL_CODE = "DAVID_APPROVED_DEPLOY";

const PROTECTED_FOLDERS = [
  "node_modules",
  ".git",
  "dist",
  "dist-local-runner",
];

const ALLOWED_WRITE_EXTENSIONS = [
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".md",
  ".txt",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".example",
];

function timestamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    "-" +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function isInsideProject(targetPath: string) {
  const root = path.resolve(PROJECT_ROOT);
  const target = path.resolve(targetPath);

  return target === root || target.startsWith(root + path.sep);
}

function resolveSafeProjectPath(inputPath: string) {
  const safeInput = String(inputPath || "").replace(/^[/\\]+/, "");
  const fullPath = path.resolve(PROJECT_ROOT, safeInput);

  if (!isInsideProject(fullPath)) {
    throw new Error("Blocked: path is outside approved project folder.");
  }

  const relative = path.relative(PROJECT_ROOT, fullPath);
  const parts = relative.split(path.sep);

  if (parts.some((part) => PROTECTED_FOLDERS.includes(part))) {
    throw new Error("Blocked: protected folder cannot be accessed.");
  }

  return fullPath;
}

function isAllowedWriteFile(filePath: string) {
  const ext = path.extname(filePath);
  return ALLOWED_WRITE_EXTENSIONS.includes(ext);
}

function createBackup(files: string[]) {
  const backupFolderName = `BACKUP-BEFORE-CHERRY-FIX-${timestamp()}`;
  const backupFolder = path.join(PROJECT_ROOT, backupFolderName);

  fs.mkdirSync(backupFolder, { recursive: true });

  const copied = [];

  for (const file of files) {
    const fullPath = resolveSafeProjectPath(String(file));

    if (!fs.existsSync(fullPath)) {
      copied.push({
        file,
        status: "SKIPPED",
        reason: "File does not exist yet.",
      });
      continue;
    }

    if (!fs.statSync(fullPath).isFile()) {
      copied.push({
        file,
        status: "SKIPPED",
        reason: "Path is not a file.",
      });
      continue;
    }

    const relativePath = path.relative(PROJECT_ROOT, fullPath);
    const backupTarget = path.join(backupFolder, relativePath);
    const backupTargetFolder = path.dirname(backupTarget);

    fs.mkdirSync(backupTargetFolder, { recursive: true });
    fs.copyFileSync(fullPath, backupTarget);

    copied.push({
      file,
      status: "BACKED_UP",
      source: fullPath,
      backup: backupTarget,
    });
  }

  const report = {
    createdAt: new Date().toISOString(),
    backupFolder,
    files: copied,
  };

  fs.writeFileSync(
    path.join(backupFolder, "backup-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  return {
    backupFolderName,
    backupFolder,
    copied,
  };
}

function extractUsefulErrors(logText: string) {
  return logText
    .split(/\r?\n/)
    .filter((line) =>
      /error TS|ERROR|Error:|Cannot|failed|not found|npm ERR|Build failed|SyntaxError|TypeError/i.test(
        line
      )
    )
    .slice(0, 80);
}

function runCommand(command: string): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  combined: string;
}> {
  return new Promise((resolve) => {
    exec(
      command,
      {
        cwd: PROJECT_ROOT,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 10,
      },
      (error, stdout, stderr) => {
        resolve({
          exitCode: error && typeof (error as any).code === "number" ? (error as any).code : 0,
          stdout: stdout || "",
          stderr: stderr || "",
          combined: `${stdout || ""}\n${stderr || ""}`,
        });
      }
    );
  });
}

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "cherry-local-runner",
    status: "online",
    port: PORT,
    host: HOST,
    projectRoot: PROJECT_ROOT,
    accessRulesFound: fs.existsSync(ACCESS_RULES_FILE),
    message: "Cherry Local Runner is running safely.",
  });
});

app.get("/access-rules", (_req: Request, res: Response) => {
  if (!fs.existsSync(ACCESS_RULES_FILE)) {
    return res.status(404).json({
      ok: false,
      error: "CHERRY_ACCESS_RULES.md not found.",
    });
  }

  res.json({
    ok: true,
    file: ACCESS_RULES_FILE,
    content: fs.readFileSync(ACCESS_RULES_FILE, "utf8"),
  });
});

app.get("/project/status", (_req: Request, res: Response) => {
  const files = [
    "package.json",
    "Dockerfile",
    "cherry-server.ts",
    "cherry-local-runner.ts",
    "CHERRY_ACCESS_RULES.md",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.cherry.json",
    ".env",
    ".env.example",
    "CHERRY_BUILD_RUNNER_LOG.txt",
  ];

  res.json({
    ok: true,
    projectRoot: PROJECT_ROOT,
    files: files.map((file) => ({
      file,
      exists: fs.existsSync(path.join(PROJECT_ROOT, file)),
    })),
  });
});

app.get("/file/read", (req: Request, res: Response) => {
  try {
    const requestedPath = String(req.query.path || "");

    if (!requestedPath) {
      return res.status(400).json({
        ok: false,
        error: "Missing path. Example: /file/read?path=package.json",
      });
    }

    const fullPath = resolveSafeProjectPath(requestedPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        ok: false,
        error: "File not found.",
        requestedPath,
      });
    }

    if (!fs.statSync(fullPath).isFile()) {
      return res.status(400).json({
        ok: false,
        error: "Path is not a file.",
        requestedPath,
      });
    }

    res.json({
      ok: true,
      requestedPath,
      fullPath,
      content: fs.readFileSync(fullPath, "utf8"),
    });
  } catch (error: any) {
    res.status(403).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
});

app.post("/backup/create", (req: Request, res: Response) => {
  try {
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

    if (files.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "No files supplied. Example body: { \"files\": [\"package.json\"] }",
      });
    }

    const backup = createBackup(files);

    res.json({
      ok: true,
      message: "Backup created successfully.",
      ...backup,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
});

app.get("/backups/list", (_req: Request, res: Response) => {
  try {
    const entries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true });

    const backups = entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          entry.name.startsWith("BACKUP-BEFORE-CHERRY-FIX-")
      )
      .map((entry) => {
        const folderPath = path.join(PROJECT_ROOT, entry.name);
        const reportPath = path.join(folderPath, "backup-report.json");

        return {
          name: entry.name,
          path: folderPath,
          reportExists: fs.existsSync(reportPath),
        };
      })
      .sort((a, b) => b.name.localeCompare(a.name));

    res.json({
      ok: true,
      count: backups.length,
      backups,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
});

app.post("/file/write", (req: Request, res: Response) => {
  try {
    const requestedPath = String(req.body?.path || "");
    const content = String(req.body?.content ?? "");
    const approvalCode = String(req.body?.approvalCode || "");

    if (approvalCode !== WRITE_APPROVAL_CODE) {
      return res.status(403).json({
        ok: false,
        blocked: true,
        error: "Write blocked. Missing David approval code.",
        requiredApprovalCode: WRITE_APPROVAL_CODE,
      });
    }

    if (!requestedPath) {
      return res.status(400).json({
        ok: false,
        error: "Missing file path.",
      });
    }

    const fullPath = resolveSafeProjectPath(requestedPath);

    if (!isAllowedWriteFile(fullPath)) {
      return res.status(403).json({
        ok: false,
        error: "Blocked: this file type is not approved for writing.",
        requestedPath,
      });
    }

    const backup = createBackup([requestedPath]);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");

    res.json({
      ok: true,
      message: "File written successfully after approval and backup.",
      requestedPath,
      fullPath,
      backup,
      sizeBytes: Buffer.byteLength(content, "utf8"),
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
});

app.post("/build/run", async (req: Request, res: Response) => {
  try {
    const approvalCode = String(req.body?.approvalCode || "");

    if (approvalCode !== BUILD_APPROVAL_CODE) {
      return res.status(403).json({
        ok: false,
        blocked: true,
        error: "Build blocked. Missing David build approval code.",
        requiredApprovalCode: BUILD_APPROVAL_CODE,
      });
    }

    const startedAt = new Date().toISOString();
    const result = await runCommand("npm run build");
    const finishedAt = new Date().toISOString();

    const logPath = path.join(PROJECT_ROOT, "CHERRY_BUILD_RUNNER_LOG.txt");

    const fullLog = [
      "CHERRY BUILD RUNNER LOG",
      `Started: ${startedAt}`,
      `Finished: ${finishedAt}`,
      `Command: npm run build`,
      `Exit code: ${result.exitCode}`,
      "",
      "----- OUTPUT -----",
      result.combined,
    ].join("\n");

    fs.writeFileSync(logPath, fullLog, "utf8");

    const usefulErrors = extractUsefulErrors(result.combined);
    const passed = result.exitCode === 0;

    res.json({
      ok: passed,
      status: passed ? "PASS" : "FAIL",
      command: "npm run build",
      exitCode: result.exitCode,
      logFile: logPath,
      usefulErrors,
      summary: passed
        ? "Build passed."
        : "Build failed. Useful errors extracted from log.",
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      status: "FAIL",
      error: error?.message || String(error),
    });
  }
});

app.get("/build/log", (_req: Request, res: Response) => {
  const logPath = path.join(PROJECT_ROOT, "CHERRY_BUILD_RUNNER_LOG.txt");

  if (!fs.existsSync(logPath)) {
    return res.status(404).json({
      ok: false,
      error: "No build log found yet. Run /build/run first.",
    });
  }

  const content = fs.readFileSync(logPath, "utf8");

  res.json({
    ok: true,
    logFile: logPath,
    sizeBytes: Buffer.byteLength(content, "utf8"),
    usefulErrors: extractUsefulErrors(content),
    content,
  });
});


app.get("/logs/list", (_req: Request, res: Response) => {
  try {
    const logFiles = fs
      .readdirSync(PROJECT_ROOT)
      .filter((file) =>
        /log|report|diagnose|error|build|deploy/i.test(file)
      )
      .filter((file) => fs.statSync(path.join(PROJECT_ROOT, file)).isFile())
      .map((file) => {
        const fullPath = path.join(PROJECT_ROOT, file);
        const stat = fs.statSync(fullPath);

        return {
          file,
          fullPath,
          sizeBytes: stat.size,
          modified: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));

    res.json({
      ok: true,
      count: logFiles.length,
      logFiles,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
});

app.get("/logs/read", (req: Request, res: Response) => {
  try {
    const requestedPath = String(req.query.path || "");

    if (!requestedPath) {
      return res.status(400).json({
        ok: false,
        error: "Missing path. Example: /logs/read?path=CHERRY_BUILD_RUNNER_LOG.txt",
      });
    }

    const fullPath = resolveSafeProjectPath(requestedPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        ok: false,
        error: "Log file not found.",
        requestedPath,
      });
    }

    const content = fs.readFileSync(fullPath, "utf8");

    res.json({
      ok: true,
      requestedPath,
      fullPath,
      sizeBytes: Buffer.byteLength(content, "utf8"),
      usefulErrors: extractUsefulErrors(content),
      content,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
});

app.get("/logs/errors", (req: Request, res: Response) => {
  try {
    const requestedPath = String(req.query.path || "CHERRY_BUILD_RUNNER_LOG.txt");
    const fullPath = resolveSafeProjectPath(requestedPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        ok: false,
        error: "Log file not found.",
        requestedPath,
      });
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const usefulErrors = extractUsefulErrors(content);

    res.json({
      ok: true,
      requestedPath,
      fullPath,
      errorCount: usefulErrors.length,
      usefulErrors,
      summary:
        usefulErrors.length === 0
          ? "No useful error lines found."
          : "Useful error lines extracted.",
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || String(error),
    });
  }
});


app.post("/deploy/run", async (req: Request, res: Response) => {
  try {
    const approvalCode = String(req.body?.approvalCode || "");

    if (approvalCode !== DEPLOY_APPROVAL_CODE) {
      return res.status(403).json({
        ok: false,
        blocked: true,
        error: "Deploy blocked. Missing David deploy approval code.",
        requiredApprovalCode: DEPLOY_APPROVAL_CODE,
      });
    }

    const startedAt = new Date().toISOString();

    const gcloudPath =
      '"C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd"';

    const command =
      `${gcloudPath} run deploy cherry-core --source . --region australia-southeast1 --allow-unauthenticated`;

    const result = await runCommand(command);
    const finishedAt = new Date().toISOString();

    const logPath = path.join(PROJECT_ROOT, "CHERRY_DEPLOY_RUNNER_LOG.txt");

    const fullLog = [
      "CHERRY DEPLOY RUNNER LOG",
      `Started: ${startedAt}`,
      `Finished: ${finishedAt}`,
      `Command: ${command}`,
      `Exit code: ${result.exitCode}`,
      "",
      "----- OUTPUT -----",
      result.combined,
    ].join("\n");

    fs.writeFileSync(logPath, fullLog, "utf8");

    const usefulErrors = extractUsefulErrors(result.combined);
    const passed = result.exitCode === 0;

    res.json({
      ok: passed,
      status: passed ? "PASS" : "FAIL",
      command,
      exitCode: result.exitCode,
      logFile: logPath,
      usefulErrors,
      summary: passed
        ? "Deploy command completed."
        : "Deploy failed. Useful errors extracted from log.",
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      status: "FAIL",
      error: error?.message || String(error),
    });
  }
});

app.get("/deploy/log", (_req: Request, res: Response) => {
  const logPath = path.join(PROJECT_ROOT, "CHERRY_DEPLOY_RUNNER_LOG.txt");

  if (!fs.existsSync(logPath)) {
    return res.status(404).json({
      ok: false,
      error: "No deploy log found yet. Run /deploy/run first.",
    });
  }

  const content = fs.readFileSync(logPath, "utf8");

  res.json({
    ok: true,
    logFile: logPath,
    sizeBytes: Buffer.byteLength(content, "utf8"),
    usefulErrors: extractUsefulErrors(content),
    content,
  });
});

app.get("/tools", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    availableTools: [
      "health check",
      "read access rules",
      "project status",
      "read safe project files",
      "create backup",
      "list backups",
      "write file with David approval code",
      "run build with David build approval code",
      "read build log",
    ],
    notYetEnabled: [
      "general terminal commands",
      "deploy runner",
      "Cloud Build log reader",
    ],
    safety:
      "Cherry can now run npm run build only when David build approval code is supplied. Build output is saved to CHERRY_BUILD_RUNNER_LOG.txt.",
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Cherry Local Runner listening on http://${HOST}:${PORT}`);
});


