/**
 * Zambian display conventions, used across the sites and the admin:
 * Kwacha (ZMW, written "K 1,500"), day-first dates and 24-hour times in
 * Lusaka time (CAT, UTC+2), regardless of the viewer's device settings.
 */

const TZ = "Africa/Lusaka";
const LOCALE = "en-GB"; // day-month-year, the order used in Zambia

const kwacha = new Intl.NumberFormat("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 1500 → "K 1,500"; 1500.5 → "K 1,500.50"; empty → "" */
export function formatKwacha(amount) {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  const text = kwacha.format(n);
  return `K ${/\.\d$/.test(text) ? `${text}0` : text}`;
}

const valid = (d) => d && !Number.isNaN(new Date(d).getTime());

/** "17 Nov 2026" */
export const formatDate = (d) => (valid(d) ? new Date(d).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: TZ }) : "—");

/** "17 November 2026" */
export const formatDateLong = (d) => (valid(d) ? new Date(d).toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: TZ }) : "—");

/** "November 2026" */
export const formatMonthYear = (d) => (valid(d) ? new Date(d).toLocaleDateString(LOCALE, { month: "long", year: "numeric", timeZone: TZ }) : "—");

/** "17 Nov 2026, 14:05" (Lusaka time) */
export const formatDateTime = (d) => (valid(d)
  ? new Date(d).toLocaleString(LOCALE, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ })
  : "—");

/** Value for an <input type="date"> from an API date ("2026-11-17T00:00:00Z" → "2026-11-17"). */
export const toDateInput = (d) => (valid(d) ? new Date(d).toISOString().slice(0, 10) : "");

/** Whole numbers with thousands separators: 12500 → "12,500" */
export const formatCount = (n) => Number(n || 0).toLocaleString("en-ZM");
