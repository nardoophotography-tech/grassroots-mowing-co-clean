import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();

app.use(express.json({ limit: "25mb" }));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";

const CHERRY_TEST_MODE = process.env.CHERRY_TEST_MODE === "true";
const FORCE_QUOTA_EXHAUSTED =
  process.env.CHERRY_FORCE_QUOTA_EXHAUSTED === "true";

const aiKey = (process.env.GEMINI_API_KEY || "").trim();
const ai = aiKey ? new GoogleGenAI({ apiKey: aiKey }) : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEDGER_PATH = path.join(__dirname, "cherry_ledger.json");
const WORKSPACE_DIR = __dirname;

const frontendDistPath = __dirname;
const indexHtmlPath = path.join(frontendDistPath, "index.html");

type LedgerItem = {
  role: string;
  text: string;
  timestamp: string;
};

function maskKey(key: string) {
  if (!key) return "";
  if (key.length <= 12) return "***masked***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function safeError(error: any) {
  return String(error?.message || error?.error?.message || error || "")
    .replace(aiKey, maskKey(aiKey))
    .slice(0, 500);
}

function writeToLedger(role: string, text: string) {
  try {
    let history: LedgerItem[] = [];

    if (fs.existsSync(LEDGER_PATH)) {
      history = JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8") || "[]");
    }

    history.push({
      role,
      text,
      timestamp: new Date().toISOString(),
    });

    fs.writeFileSync(LEDGER_PATH, JSON.stringify(history, null, 2));
  } catch {
    // Ledger failure must not crash Cherry.
  }
}

function loadLedgerHistory() {
  try {
    if (fs.existsSync(LEDGER_PATH)) {
      const raw = JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8") || "[]");

      return raw
        .map((item: LedgerItem) => ({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.text }],
        }))
        .slice(-10);
    }
  } catch {
    // Ignore damaged ledger.
  }

  return [];
}

function isQuotaExhaustedError(error: any): boolean {
  const message = String(
    error?.message || error?.error?.message || error || ""
  );

  return (
    error?.status === 429 ||
    error?.code === 429 ||
    /RESOURCE_EXHAUSTED|quota|rate limit/i.test(message)
  );
}

function isInvalidKeyError(error: any): boolean {
  const message = String(
    error?.message || error?.error?.message || error || ""
  );

  return /API key|invalid key|authentication|unauthorized|permission|403|401/i.test(
    message
  );
}

function createLocalFallbackResponse(command: string) {
  return {
    success: true,
    reply:
      "Cherry core is online. Gemini is unavailable or test mode is active, but interface, routing, and command handling are working.",
    spokenReply:
      "Cherry core is online. Interface and command handling are working.",
    audioData: null,
    fallback: true,
    quotaExhausted: FORCE_QUOTA_EXHAUSTED,
    command,
  };
}

function executeWorkspaceAction(
  actionType: string,
  fileName: string,
  fileContent: string
): string {
  try {
    const safeFileName = fileName.replace(/^[/\\]+/, "");
    const targetPath = path.resolve(WORKSPACE_DIR, safeFileName);

    if (!targetPath.startsWith(WORKSPACE_DIR)) {
      return "Security Violation: Path directory out of bounds.";
    }

    if (actionType === "CREATE_OR_UPDATE") {
      fs.writeFileSync(targetPath, fileContent, "utf8");
      return `Successfully built and saved file: ${safeFileName}`;
    }

    if (actionType === "READ") {
      if (!fs.existsSync(targetPath)) {
        return `File not found: ${safeFileName}`;
      }

      return fs.readFileSync(targetPath, "utf8");
    }

    return "Action directive unmapped.";
  } catch (err: any) {
    return `Driver fault: ${err?.message || String(err)}`;
  }
}

function getEnvironmentMode() {
  if (FORCE_QUOTA_EXHAUSTED) return "quota-forced";
  if (CHERRY_TEST_MODE) return "manual-test-mode";
  return aiKey ? "live-gemini" : "no-gemini-key";
}

function healthPayload() {
  return {
    ok: true,
    service: "cherry-core",
    status: "online",
    port: PORT,
    mode: getEnvironmentMode(),
    ai: CHERRY_TEST_MODE
      ? "limited-test-mode"
      : aiKey
      ? "available"
      : "missing-key",
    quotaExhausted: FORCE_QUOTA_EXHAUSTED,
    frontend: fs.existsSync(indexHtmlPath) ? "react-build-found" : "missing",
    frontendPath: indexHtmlPath,
    deployedUrl:
      "https://cherry-core-1004272046304.australia-southeast1.run.app",
  };
}

async function directGeminiRestTest() {
  if (!aiKey) {
    return {
      status: "SKIPPED",
      error: "No GEMINI_API_KEY present.",
    };
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": aiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: "Reply with exactly: API_OK" }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 8,
          },
        }),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return {
        status: "FAIL",
        httpStatus: response.status,
        error: text.slice(0, 500),
      };
    }

    return {
      status: "PASS",
      httpStatus: response.status,
      result: text.includes("API_OK")
        ? "API_OK"
        : "Gemini returned HTTP 200.",
      rawPreview: text.slice(0, 200),
    };
  } catch (error: any) {
    return {
      status: "FAIL",
      error: safeError(error),
    };
  }
}

async function directGeminiGenerate(prompt: string) {
  if (!aiKey) {
    throw new Error("No GEMINI_API_KEY present.");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": aiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.4,
        },
      }),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text.slice(0, 500));
  }

  const data = JSON.parse(text);
  const reply =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text || "")
      .join("")
      .trim() || "";

  return reply || "Cherry received a Gemini response, but no text was returned.";
}

async function sdkGeminiTest() {
  if (!ai) {
    return {
      status: "SKIPPED",
      error: "GoogleGenAI client not created.",
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Reply with exactly: API_OK",
      config: { maxOutputTokens: 8 },
    });

    const text = String(response?.text || "").trim();

    return {
      status: text ? "PASS" : "WARNING",
      result: text || "SDK returned HTTP 200 but no clean text.",
    };
  } catch (error: any) {
    return {
      status: "FAIL",
      error: safeError(error),
    };
  }
}

// -------------------------
// API ROUTES
// -------------------------

app.get("/health", (_req: Request, res: Response) => {
  res.json(healthPayload());
});

app.get("/debug/gemini-env", async (_req: Request, res: Response) => {
  const directRestTest = await directGeminiRestTest();
  const sdkTest = await sdkGeminiTest();

  res.json({
    ok: true,
    hasGeminiKey: Boolean(aiKey),
    keyPrefix: aiKey ? aiKey.slice(0, 6) : "",
    keySuffix: aiKey ? aiKey.slice(-4) : "",
    keyMasked: maskKey(aiKey),
    keyLength: aiKey.length,
    keyLooksValid: /^AIza/.test(aiKey),
    testMode: CHERRY_TEST_MODE,
    forceQuotaExhausted: FORCE_QUOTA_EXHAUSTED,
    nodeEnv: process.env.NODE_ENV || "",
    mode: getEnvironmentMode(),
    directRestTest,
    sdkTest,
  });
});

app.get("/self-test", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "cherry-core",
    frontend: fs.existsSync(indexHtmlPath)
      ? "react-build-found"
      : "react-build-missing",
    backend: "reachable",
    deployedUrl:
      "https://cherry-core-1004272046304.australia-southeast1.run.app",
    mode: getEnvironmentMode(),
    geminiKeyPresent: Boolean(aiKey),
    geminiKeyMasked: maskKey(aiKey),
    quotaStatus: FORCE_QUOTA_EXHAUSTED
      ? "exhausted"
      : CHERRY_TEST_MODE
      ? "limited-test-mode"
      : aiKey
      ? "available-or-unknown"
      : "missing-key",
    microphone: "manual-diagnostic-mode",
    speaker: "manual-diagnostic-mode",
    routes: {
      health: "/health",
      debugGeminiEnv: "/debug/gemini-env",
      selfTest: "/self-test",
      quotaStatus: "/quota-status",
      apiTest: "/cherry/api-test",
      execute: "/cherry/execute",
    },
  });
});

app.get("/quota-status", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "cherry-core",
    gemini: FORCE_QUOTA_EXHAUSTED
      ? "quota-exhausted"
      : CHERRY_TEST_MODE
      ? "limited-test-mode"
      : aiKey
      ? "available-or-unknown"
      : "missing-key",
    quotaExhausted: FORCE_QUOTA_EXHAUSTED,
    note:
      "This route does not burn Gemini quota. Use /cherry/api-test only when you deliberately want to test Gemini.",
  });
});

app.get("/cherry/api-test", async (_req: Request, res: Response) => {
  const directRestTest = await directGeminiRestTest();

  if (directRestTest.status === "PASS") {
    return res.json({
      ok: true,
      status: "PASS",
      summary: "Gemini API responded successfully through direct REST.",
      detail: directRestTest.result || "Gemini returned HTTP 200.",
    });
  }

  return res.json({
    ok: false,
    status: "FAIL",
    summary: "Gemini direct REST test failed.",
    detail: directRestTest.error || directRestTest,
  });
});
app.post("/cherry/execute", async (req: Request, res: Response) => {
  try {
    const rawCommand = String(req.body?.command || "");
    const trimmed = rawCommand.trim();
    const aiCommand = trimmed.startsWith("ai:");
    const command = aiCommand ? trimmed.slice(3).trim() : trimmed;

    if (!trimmed) {
      return res.json({
        success: true,
        reply: "No command entered.",
        audioData: null,
      });
    }

    writeToLedger("user", rawCommand);

    if (!aiCommand) {
      const localResponse = {
        success: true,
        reply: `Command received: ${rawCommand}\n\nCherry frontend is working. This command did not need Gemini.`,
        spokenReply: "Cherry frontend is working.",
        audioData: null,
        fallback: true,
        quotaExhausted: false,
        command: rawCommand,
      };

      writeToLedger("model", localResponse.reply);
      return res.json(localResponse);
    }

    if (CHERRY_TEST_MODE) {
      const localResponse = createLocalFallbackResponse(rawCommand);
      writeToLedger("model", localResponse.reply);
      return res.json(localResponse);
    }

    if (FORCE_QUOTA_EXHAUSTED) {
      const quotaResponse = {
        success: true,
        reply:
          "Gemini daily quota is exhausted. Cherry is running, but the AI model is temporarily unavailable.",
        spokenReply: "Gemini quota is exhausted.",
        audioData: null,
        fallback: true,
        quotaExhausted: true,
      };

      writeToLedger("model", quotaResponse.reply);
      return res.status(429).json(quotaResponse);
    }

    if (!aiKey) {
      const missingKeyResponse = {
        success: false,
        reply:
          "Gemini API key is missing on the server. Cherry core is online, but AI commands cannot run yet.",
        audioData: null,
        missingKey: true,
      };

      writeToLedger("model", missingKeyResponse.reply);
      return res.status(500).json(missingKeyResponse);
    }

    const history = loadLedgerHistory()
      .map((item: any) => {
        const role = item.role === "user" ? "User" : "Cherry";
        const text = item.parts?.[0]?.text || "";
        return `${role}: ${text}`;
      })
      .join("\n");

    const prompt = `
You are Cherry, David Nardoo's standalone personal AI control centre.

Rules:
- Be concise, practical, and direct.
- Do not access external accounts, APIs, files, or services unless David explicitly authorises it.
- If David asks for a code patch, provide a clean copy/paste patch.
- If the request is a simple connection test, confirm Cherry is connected and operational.

Recent context:
${history}

David's command:
${command}
`.trim();

    const reply = await directGeminiGenerate(prompt);

    writeToLedger("model", reply);

    return res.json({
      success: true,
      reply,
      spokenReply: reply.slice(0, 200),
      audioData: null,
    });
  } catch (error: any) {
    const message = safeError(error);

    if (isQuotaExhaustedError(error)) {
      const quotaResponse = {
        success: true,
        reply:
          "Gemini daily quota is exhausted. Cherry is running, but the AI model is temporarily unavailable.",
        spokenReply: "Gemini quota is exhausted.",
        audioData: null,
        fallback: true,
        quotaExhausted: true,
        error: message,
      };

      writeToLedger("model", quotaResponse.reply);
      return res.status(429).json(quotaResponse);
    }

    if (isInvalidKeyError(error)) {
      return res.status(401).json({
        success: false,
        reply: "Gemini API key appears invalid or unauthorized.",
        audioData: null,
        error: message,
      });
    }

    return res.status(500).json({
      success: false,
      reply: "Core Interface Exception: " + message,
      audioData: null,
    });
  }
});

// -------------------------
// FRONTEND ROUTES
// -------------------------

app.use(express.static(frontendDistPath));

app.get("*", (_req: Request, res: Response) => {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }

  return res.status(500).send(`
    <!doctype html>
    <html>
      <head>
        <title>Cherry Build Missing</title>
        <style>
          body {
            background: #050507;
            color: #f2f2f4;
            font-family: Arial, sans-serif;
            padding: 40px;
          }
          code {
            background: #15151d;
            padding: 3px 6px;
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <h1>Cherry frontend build missing</h1>
        <p>The server is running, but <code>dist/index.html</code> was not found.</p>
        <p>Run:</p>
        <pre>npm run build</pre>
        <p>Then restart:</p>
        <pre>npm run cherry:start</pre>
      </body>
    </html>
  `);
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Cherry server listening on http://127.0.0.1:${PORT}`);
});

server.on("error", (error: any) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Run: netstat -ano | findstr :${PORT}`
    );
  } else {
    console.error("Cherry server failed:", error);
  }

  process.exit(1);
});

