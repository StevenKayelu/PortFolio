import { prisma } from "../config/prisma.js";
import { sendMail } from "./mail.service.js";

/**
 * Emails super admins 60 and 30 days before a registration or licence
 * expires (once per stage; renewing resets it). Runs on a timer in the API
 * process; idempotent, so multiple runs a day are harmless.
 */

const DAY = 86400000;
const adminUrl = () => (process.env.ADMIN_URL || "https://stevenkayelu.online").replace(/\/$/, "");

export async function runComplianceReminders(now = new Date()) {
  const due = await prisma.organizationCredential.findMany({
    where: {
      expiresAt: { not: null, lte: new Date(now.getTime() + 60 * DAY) },
      OR: [{ reminder60SentAt: null }, { reminder30SentAt: null }],
    },
    include: { organization: { select: { legalName: true } } },
  });
  if (!due.length) return { sent: 0 };

  const recipients = (await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", isActive: true, deletedAt: null }, select: { email: true },
  })).map((u) => u.email);

  let sent = 0;
  for (const c of due) {
    const daysLeft = Math.ceil((c.expiresAt - now) / DAY);
    const stage = daysLeft <= 30 ? 30 : 60;
    if (stage === 30 ? c.reminder30SentAt : c.reminder60SentAt) continue;

    const when = daysLeft < 0 ? `expired ${-daysLeft} day(s) ago` : daysLeft === 0 ? "expires today" : `expires in ${daysLeft} day(s)`;
    if (recipients.length) {
      await sendMail({
        to: recipients,
        subject: `Renewal due: ${c.title} (${c.organization.legalName}) ${when}`,
        text: [
          `${c.title} for ${c.organization.legalName} ${when} (${c.expiresAt.toDateString()}).`,
          `Issued by ${c.authority}, reference ${c.referenceNumber}.`,
          "",
          "Once renewed, update the expiry date in Admin → Legal & compliance. Expired items are hidden from the website automatically.",
          `${adminUrl()}/admin/compliance`,
        ].join("\n"),
      }).catch((err) => console.error("Compliance reminder failed:", err.message));
    }
    await prisma.organizationCredential.update({
      where: { id: c.id },
      // Reaching the 30-day stage also covers the 60-day one.
      data: stage === 30 ? { reminder30SentAt: now, reminder60SentAt: c.reminder60SentAt ?? now } : { reminder60SentAt: now },
    });
    sent += 1;
  }
  return { sent };
}

/** Starts the reminder timer (not in tests). */
export function scheduleComplianceReminders() {
  if (process.env.NODE_ENV === "test") return;
  const run = () => runComplianceReminders().catch((err) => console.error("Compliance reminders failed:", err.message));
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, 12 * 60 * 60 * 1000).unref();
}
