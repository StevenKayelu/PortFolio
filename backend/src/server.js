import "dotenv/config";
import sharp from "sharp";
import app from "./app.js";
import { scheduleComplianceReminders } from "./services/complianceReminders.service.js";

const PORT = process.env.PORT || 5000;

// On a small shared server, process one image at a time and keep no
// image cache, so uploads can't cause memory spikes (SHARP_LOW_MEMORY=true).
if (process.env.SHARP_LOW_MEMORY === "true") {
  sharp.concurrency(1);
  sharp.cache(false);
}

scheduleComplianceReminders();

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}/api/v1`);
});
