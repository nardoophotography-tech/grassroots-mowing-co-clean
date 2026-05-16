const express = require("express");
const path = require("path");
const twilio = require("twilio");

const app = express();

app.use(express.json());

// Twilio setup
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Serve frontend
app.use(express.static(path.join(__dirname, "dist")));

// Payment route
app.get("/pay/:id", (req, res) => {
  const payId = req.params.id;

  if (twilioClient) {
    twilioClient.messages
      .create({
        body: `Payment successful: ${payId}`,
        from: "+17623713671",
        to: "+61404231448"
      })
      .then(msg => console.log("SMS SENT:", msg.sid))
      .catch(err => console.log("SMS FAILED:", err));
  } else {
    console.log("Twilio not configured");
  }

  res.send(`
    <h1>Payment Successful ✔</h1>
    <p>Payment ID: ${payId}</p>
    <a href="/">Back to Home</a>
  `);
});

// React fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("running on port " + PORT);
});
