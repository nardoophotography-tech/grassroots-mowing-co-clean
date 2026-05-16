const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const usersRouter = require("./routes/users");

const app = express();

// ========================
// VIEW ENGINE (optional)
// ========================
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// ========================
// MIDDLEWARE
// ========================
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ========================
// STATIC FILES
// ========================
app.use(express.static(path.join(__dirname, "public")));

// ========================
// ROUTES
// ========================
app.use("/users", usersRouter);

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

// ========================
// START SERVER (FIXED FOR RENDER)
// ========================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;