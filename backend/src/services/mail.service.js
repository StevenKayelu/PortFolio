import nodemailer from "nodemailer";
import { prisma } from "../config/prisma.js";

/**
 * Outgoing email (report §06 "SMTP integration"). Configure with either
 *   SMTP_URL=smtps://user:pass@smtp.example.com:465
 * or SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS, plus MAIL_FROM.
 * MAIL_TRANSPORT=memory keeps messages in an in-process outbox (tests).
 * With nothing configured, mail is skipped and the API keeps working.
 *
 * Only staff are emailed. The API never sends mail to addresses typed
 * into public forms, so it can't be used to spam third parties.
 */

let transport;
let warned = false;
const outbox = [];

function getTransport() {
  if (transport !== undefined) return transport;
  const { SMTP_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TRANSPORT } = process.env;
  if (MAIL_TRANSPORT === "memory") {
    transport = nodemailer.createTransport({ jsonTransport: true });
  } else if (SMTP_URL) {
    transport = nodemailer.createTransport(SMTP_URL);
  } else if (SMTP_HOST) {
    const port = Number(SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: SMTP_HOST, port, secure: port === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  } else {
    transport = null;
  }
  return transport;
}

/** Test helper: messages "sent" with MAIL_TRANSPORT=memory. */
export function getOutbox() {
  return outbox;
}

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sendMail({ to, subject, text, html, replyTo }) {
  const t = getTransport();
  if (!t) {
    if (!warned) console.warn("Mail is not configured (set SMTP_URL or SMTP_HOST); skipping notifications.");
    warned = true;
    return false;
  }
  const message = { from: process.env.MAIL_FROM || "DevGen Ventures <no-reply@devgenventures.com>", to, subject, text, html, replyTo };
  await t.sendMail(message);
  if (process.env.MAIL_TRANSPORT === "memory") outbox.push(message);
  return true;
}

/** Active staff who handle leads for a brand: super admins + brand ADMIN/LEAD_MANAGER. */
async function leadRecipients(brandId) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [{ role: "SUPER_ADMIN" }, { brandRoles: { some: { brandId, scope: { in: ["ADMIN", "LEAD_MANAGER"] } } } }],
    },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

const adminUrl = () => (process.env.ADMIN_URL || "https://stevenkayelu.online").replace(/\/$/, "");
const TYPE_LABEL = { CAREER: "Career", COLLABORATION: "Collaboration", QUOTE: "Quote request", PARTNERSHIP: "Partnership", GENERAL: "General enquiry" };

/** Fire-and-forget: a mail failure is logged, never surfaced to the visitor. */
export function notifyNewLead(lead, brand) {
  (async () => {
    const to = await leadRecipients(brand.id);
    if (!to.length) return;
    const details = Object.entries(lead.details || {}).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)}: ${v}`);
    const lines = [
      `${TYPE_LABEL[lead.type]} for ${brand.name}`,
      `Reference: ${lead.reference}`,
      `From: ${lead.name} <${lead.email}>${lead.organization ? `, ${lead.organization}` : ""}`,
      ...details,
      "",
      lead.message,
      "",
      `Open in admin: ${adminUrl()}/admin/leads`,
    ];
    await sendMail({
      to,
      replyTo: lead.email, // validated address; replying goes straight to the sender
      subject: `[${brand.name}] ${TYPE_LABEL[lead.type]} from ${lead.name} (${lead.reference})`,
      text: lines.join("\n"),
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#14243D">
        <p style="margin:0 0 4px;color:#58677B;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(TYPE_LABEL[lead.type])} · ${escapeHtml(brand.name)} · ${escapeHtml(lead.reference)}</p>
        <h2 style="margin:0 0 12px;font-weight:600">${escapeHtml(lead.name)}${lead.organization ? ` <span style="color:#58677B;font-weight:400">· ${escapeHtml(lead.organization)}</span>` : ""}</h2>
        ${details.length ? `<p style="margin:0 0 12px">${details.map(escapeHtml).join("<br>")}</p>` : ""}
        <p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(lead.message)}</p>
        <p style="margin:0"><a href="${escapeHtml(adminUrl())}/admin/leads" style="color:#2769B6">Open in admin</a> · Reply to this email to answer ${escapeHtml(lead.name)}.</p>
      </div>`,
    });
  })().catch((err) => console.error("Lead notification failed:", err.message));
}

export function notifyAssignment(lead, assignee, assignedBy) {
  if (!assignee?.email || assignee.id === assignedBy) return;
  sendMail({
    to: assignee.email,
    subject: `Lead assigned to you: ${lead.name} (${lead.reference})`,
    text: `You've been assigned the lead ${lead.reference} from ${lead.name}.\n\nOpen in admin: ${adminUrl()}/admin/leads`,
  }).catch((err) => console.error("Assignment notification failed:", err.message));
}
