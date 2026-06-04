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
app.use(cors({ origin: true, credentials: true }));

const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";

const aiKey = (process.env.GEMINI_API_KEY || "").trim();
const ai = aiKey ? new GoogleGenAI({ apiKey: aiKey }) : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDistPath = __dirname;
const indexHtmlPath = path.join(frontendDistPath, "index.html");
const LEDGER_PATH = path.join(__dirname, "cherry_ledger.json");

function maskKey(key: string) {
  if (!key) return "";
  if (key.length <= 12) return "***masked***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function safeError(error: any) {
  return String(error?.message || error?.error?.message || error || "")
    .replace(aiKey, maskKey(aiKey))
    .slice(0, 700);
}

function isQuotaError(error: any) {
  const message = String(error?.message || error?.error?.message || error || "");
  return error?.status === 429 || error?.code === 429 || /quota|RESOURCE_EXHAUSTED|rate limit/i.test(message);
}

function writeLedger(role: string, text: string) {
  try {
    const history = fs.existsSync(LEDGER_PATH)
      ? JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8") || "[]")
      : [];

    history.push({ role, text, timestamp: new Date().toISOString() });
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(history.slice(-50), null, 2));
  } catch {
    // never crash Cherry because of the ledger
  }
}

function mode() {
  return aiKey ? "local-first-with-optional-gemini" : "local-first-no-gemini-key";
}

function localReply(command: string) {
  return {
    success: true,
    fallback: true,
    quotaExhausted: false,
    reply:
      `LOCAL MODE ACTIVE\n\nDavid, I received:\n${command}\n\nPlain English:\nThis did not use Gemini.\n\nCherry is still working locally.`,
    spokenReply: "Cherry Local Mode is working.",
    audioData: null,
  };
}

async function geminiGenerate(prompt: string) {
  if (!ai) throw new Error("No GEMINI_API_KEY present.");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      maxOutputTokens: 800,
      temperature: 0.3,
    },
  });

  return String(response?.text || "").trim() || "Gemini responded, but no text was returned.";
}

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "cherry-core",
    status: "online",
    mode: mode(),
    ai: aiKey ? "optional-available" : "optional-missing-key",
    localMode: true,
    geminiRequired: false,
    frontend: fs.existsSync(indexHtmlPath) ? "react-build-found" : "missing",
    note: "Cherry works in Local Mode first. Gemini is optional.",
  });
});

app.get("/self-test", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "cherry-core",
    frontend: fs.existsSync(indexHtmlPath) ? "react-build-found" : "react-build-missing",
    backend: "reachable",
    mode: mode(),
    localMode: true,
    geminiRequired: false,
    routes: {
      health: "/health",
      selfTest: "/self-test",
      quotaStatus: "/quota-status",
      execute: "/cherry/execute",
      apiTestSafe: "/cherry/api-test",
    },
  });
});

app.get("/quota-status", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "cherry-core",
    gemini: aiKey ? "optional-key-present-not-tested" : "optional-key-missing",
    localMode: "active",
    quotaBurned: false,
    note: "This route does not call Gemini and does not burn quota.",
  });
});

app.get("/cherry/api-test", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    status: "SAFE",
    summary: "Gemini was not called.",
    detail:
      "Cherry is Local Mode first. To deliberately call Gemini, type ai: before a command.",
    quotaBurned: false,
  });
});

app.post("/cherry/execute", async (req: Request, res: Response) => {
  try {
    const rawCommand = String(req.body?.command || "").trim();

    if (!rawCommand) {
      return res.json(localReply("No command entered."));
    }

    writeLedger("user", rawCommand);

    if (!rawCommand.toLowerCase().startsWith("ai:")) {
      const response = localReply(rawCommand);
      writeLedger("model", response.reply);
      return res.json(response);
    }

    const command = rawCommand.slice(3).trim();

    if (!aiKey || !ai) {
      return res.json({
        success: true,
        fallback: true,
        missingKey: true,
        reply:
          "LOCAL MODE ACTIVE\n\nGemini API key is missing, so Cherry did not call Gemini.\n\nCherry is still working locally.",
        spokenReply: "Gemini is not configured. Local Mode is active.",
        audioData: null,
      });
    }

    const prompt = `
You are Cherry, David Nardoo's local-first AI control centre.

Rules:
- Plain English.
- Keep it short and practical.
- Do not tell David to use developer tools unless needed.
- Do not access accounts, APIs, files, payments, messages, or deployments without David's permission.
- Make clear that Gemini is optional and Local Mode remains active.

David's command:
${command}
`.trim();

    const reply = await geminiGenerate(prompt);

    writeLedger("model", reply);

    return res.json({
      success: true,
      fallback: false,
      reply,
      spokenReply: reply.slice(0, 220),
      audioData: null,
    });
  } catch (error: any) {
    const message = safeError(error);

    if (isQuotaError(error)) {
      return res.status(200).json({
        success: true,
        fallback: true,
        quotaExhausted: true,
        reply:
          "LOCAL MODE ACTIVE\n\nGemini is temporarily over quota.\n\nPlain English:\nCherry is not broken. I will continue working in Local Mode without Gemini.",
        spokenReply: "Gemini is over quota. Cherry Local Mode is still active.",
        audioData: null,
        error: message,
      });
    }

    return res.status(200).json({
      success: true,
      fallback: true,
      reply:
        "LOCAL MODE ACTIVE\n\nGemini did not answer, but Cherry is still working locally.\n\nError:\n" +
        message,
      spokenReply: "Cherry Local Mode is still active.",
      audioData: null,
    });
  }
});

app.use(express.static(frontendDistPath));

app.get("*", (_req: Request, res: Response) => {
  if (fs.existsSync(indexHtmlPath)) return res.sendFile(indexHtmlPath);

  return res.status(500).send(`
    <!doctype html>
    <html>
      <body style="background:#050507;color:#f2f2f4;font-family:Arial;padding:40px;">
        <h1>Cherry frontend build missing</h1>
        <p>The server is running, but dist/index.html was not found.</p>
        <pre>npm run build</pre>
      </body>
    </html>
  `);
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Cherry server listening on port ${PORT}`);
});

server.on("error", (error: any) => {
  console.error("Cherry server failed:", error);
  process.exit(1);
});
