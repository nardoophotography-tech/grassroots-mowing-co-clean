const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const usersRouter = require("./routes/users");

const app = express();

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
// SERVE FRONTEND (VITE BUILD)
// ========================
// IMPORTANT: Render must have `npm run build` producing /dist

app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback (VERY IMPORTANT)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ========================
// ERROR HANDLERS
// ========================
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.json({ error: err.message });
});

// ========================
// START SERVER (RENDER SAFE)
// ========================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;