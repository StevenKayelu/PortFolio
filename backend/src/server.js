import "dotenv/config";
import app from "./app.js";
import { scheduleComplianceReminders } from "./services/complianceReminders.service.js";

const PORT = process.env.PORT || 5000;

scheduleComplianceReminders();

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}/api/v1`);
});
