// ========================
// DEBUG (REMOVE LATER IF YOU WANT)
// ========================
console.log("DEPLOY VERSION:", Date.now());

const createError = require("http-errors");
const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const usersRouter = require("./routes/users");

const app = express();

// ========================
// DEBUG CHECK (IMPORTANT)
// ========================
console.log("DIST EXISTS:", fs.existsSync(path.join(__dirname, "dist")));

// ========================
// MIDDLEWARE
// ========================
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ========================
// API ROUTES
// ========================
app.use("/users", usersRouter);

app.get("/api/status", (req, res) => {
  res.json({ status: "ok" });
});

// ========================
// SERVE VITE BUILD (FRONTEND)
// ========================
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback (must be last before error handlers)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ========================
// 404 HANDLER
// ========================
app.use(function (req, res, next) {
  next(createError(404));
});

// ========================
// ERROR HANDLER
// ========================
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    error: err.message,
  });
});

// ========================
// START SERVER (RENDER SAFE)
// ========================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;