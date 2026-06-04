const fs = require('fs');
const path = require('path');
const express = require('express');
const config = require('./config.json');

const app = express();
const PORT = config.port || 4567;
const APPROVED_ROOT = path.resolve(config.approvedRoot);
const AUDIT_LOG = path.join(__dirname, 'audit-log.json');
const SAFE_EXTENSIONS = new Set(config.allowedExtensions || []);

function logRequest(entry) {
  try {
    const history = fs.existsSync(AUDIT_LOG) ? JSON.parse(fs.readFileSync(AUDIT_LOG, 'utf8')) : [];
    history.push({ timestamp: new Date().toISOString(), ...entry });
    fs.writeFileSync(AUDIT_LOG, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

function isSafePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return false;
  if (path.isAbsolute(inputPath)) return false;
  if (inputPath.includes('..')) return false;
  if (inputPath.includes('\\')) return false;
  const normalized = path.normalize(inputPath).replace(/\\/g, '/');
  if (normalized.startsWith('../') || normalized === '..' || normalized.includes('/../')) return false;
  const baseName = path.basename(normalized).toLowerCase();
  if (baseName.startsWith('.env') || baseName === '.env') return false;
  const ext = path.extname(baseName).toLowerCase();
  return SAFE_EXTENSIONS.has(ext) || SAFE_EXTENSIONS.has(baseName);
}

function resolveApprovedPath(relPath) {
  if (!isSafePath(relPath)) {
    throw new Error('Unsafe path or extension');
  }
  const resolved = path.resolve(APPROVED_ROOT, relPath);
  const rel = path.relative(APPROVED_ROOT, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes approved folder');
  }
  return resolved;
}

function listProjectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listProjectFiles(full));
    } else if (isSafePath(path.relative(APPROVED_ROOT, full))) {
      files.push(path.relative(APPROVED_ROOT, full).replace(/\\/g, '/'));
    }
  }
  return files.sort();
}

app.get('/health', (req, res) => {
  logRequest({ route: '/health', ip: req.ip, ok: true });
  res.json({ status: 'ok', approvedRoot: APPROVED_ROOT, mode: 'read-only' });
});

app.get('/approved-folder', (req, res) => {
  logRequest({ route: '/approved-folder', ip: req.ip, ok: true });
  res.json({ approvedRoot: APPROVED_ROOT });
});

app.get('/list-files', (req, res) => {
  try {
    const files = listProjectFiles(APPROVED_ROOT);
    logRequest({ route: '/list-files', ip: req.ip, count: files.length, ok: true });
    res.json({ files });
  } catch (err) {
    logRequest({ route: '/list-files', ip: req.ip, error: String(err), ok: false });
    res.status(400).json({ error: String(err) });
  }
});

app.get('/read-file', (req, res) => {
  try {
    const rel = req.query.path;
    if (!rel || typeof rel !== 'string') {
      throw new Error('Missing path query parameter');
    }
    const target = resolveApprovedPath(rel);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      throw new Error('File not found');
    }
    const content = fs.readFileSync(target, 'utf8');
    logRequest({ route: '/read-file', ip: req.ip, path: rel, ok: true });
    res.json({ path: rel, content });
  } catch (err) {
    logRequest({ route: '/read-file', ip: req.ip, path: req.query.path || '', error: String(err), ok: false });
    res.status(400).json({ error: String(err) });
  }
});

app.get('/diagnose-basic', (req, res) => {
  try {
    const files = listProjectFiles(APPROVED_ROOT).slice(0, 50);
    const summary = {
      approvedRoot: APPROVED_ROOT,
      totalSafeFiles: files.length,
      sampleFiles: files,
      mode: 'read-only'
    };
    logRequest({ route: '/diagnose-basic', ip: req.ip, ok: true, totalSafeFiles: files.length });
    res.json(summary);
  } catch (err) {
    logRequest({ route: '/diagnose-basic', ip: req.ip, error: String(err), ok: false });
    res.status(400).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Cherry Local Worker Level 1 listening on http://127.0.0.1:${PORT}`);
});
