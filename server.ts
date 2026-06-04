import express from "express";
import cors from "cors";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const PORT = Number(process.env.PORT || 3001);
const HOST = "0.0.0.0";

app.use(cors());
app.use(express.json());

// Render/esbuild runs this from dist/server.mjs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite builds index.html into dist/
const frontendDistPath = __dirname;
const indexHtmlPath = path.join(frontendDistPath, "index.html");

// Initialize Native Node SQLite Database
const db = new DatabaseSync("./grassroots.db");

// Build the Core Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT,
    address TEXT,
    service_type TEXT,
    status TEXT DEFAULT 'Pending',
    weather_status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fleet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_name TEXT,
    current_hours INTEGER,
    maintenance_interval INTEGER
  );
`);

// Seed Fleet Data if empty
const fleetCount = db.prepare("SELECT COUNT(*) as count FROM fleet").get() as { count: number };

if (fleetCount.count === 0) {
  db.exec(`
    INSERT INTO fleet (asset_name, current_hours, maintenance_interval) VALUES 
    ('LandCruiser 79 Series', 12000, 10000),
    ('Bushranger Spartan Shield', 45, 50),
    ('BRC40 Chipper', 20, 100);
  `);
}

// Health check
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "grassroots-mowing-co",
    frontend: fs.existsSync(indexHtmlPath) ? "found" : "missing",
    indexHtmlPath,
  });
});

// API ENDPOINTS
app.get("/api/jobs", (_req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
  res.json(jobs);
});

app.get("/api/fleet", (_req, res) => {
  const fleet = db.prepare("SELECT * FROM fleet").all();
  res.json(fleet);
});

app.post("/api/bookings", (req, res) => {
  const { name, address, service } = req.body;
  const insert = db.prepare("INSERT INTO jobs (client_name, address, service_type) VALUES (?, ?, ?)");
  const result = insert.run(name, address, service);
  const newJob = db.prepare("SELECT * FROM jobs WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(newJob);
});

app.post("/api/jobs/:id/weather", (req, res) => {
  const { id } = req.params;
  const isRaining = Math.random() < 0.2;
  const weatherStatus = isRaining ? "Rain Detected - Hold" : "Clear Skies";

  db.prepare("UPDATE jobs SET weather_status = ? WHERE id = ?").run(weatherStatus, id);
  res.json({ id, weatherStatus });
});

app.post("/api/jobs/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.prepare("UPDATE jobs SET status = ? WHERE id = ?").run(status, id);

  if (status === "Completed") {
    db.prepare("UPDATE fleet SET current_hours = current_hours + 3 WHERE asset_name = ?").run("Bushranger Spartan Shield");
  }

  res.json({ success: true, status });
});

// Serve frontend
app.use(express.static(frontendDistPath));

function sendFrontend(_req: express.Request, res: express.Response) {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }

  return res.status(500).send(`
    <!doctype html>
    <html>
      <body style="font-family:Arial;padding:40px;">
        <h1>GrassRoots frontend build missing</h1>
        <p>The server is running, but index.html was not found.</p>
        <pre>${indexHtmlPath}</pre>
      </body>
    </html>
  `);
}

// This fixes Cannot GET /
app.get("/", sendFrontend);

// This fixes direct page links
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/health") return next();
  return sendFrontend(req, res);
});

app.listen(PORT, HOST, () => {
  console.log(`GrassRoots Mowing Co running on ${HOST}:${PORT}`);
})