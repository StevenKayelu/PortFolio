import { Fab, Tooltip } from "@mui/material";
import { FaWhatsapp } from "react-icons/fa";
import { useBrand } from "../../context/BrandContext";
import { useFetch } from "../../hooks/useFetch";
import apiClient from "../../services/apiClient";

/**
 * "Chat on WhatsApp" button (wa.me click-to-chat). Opens the visitor's own
 * WhatsApp with a short greeting; nothing passes through our servers.
 * Uses the WhatsApp number from Site content, or the phone number if none
 * is set. Hidden when neither is a valid number.
 */

/** "+260 964 626 286" or "0964 626 286" → "260964626286" (Zambia +260 assumed for local numbers). */
export function toWhatsAppNumber(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `260${digits.slice(1)}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export default function WhatsAppButton() {
  const { brandName } = useBrand();
  const { data: identity } = useFetch(() => apiClient.get("/site-settings/identity").then((r) => r.data).catch(() => null), []);
  const number = toWhatsAppNumber(identity?.whatsapp || identity?.phone);
  if (!number) return null;

  const text = `Hello ${brandName}, I found you on ${window.location.hostname} and would like to ask about `;
  return (
    <Tooltip title="Chat on WhatsApp" placement="left">
      <Fab
        component="a"
        href={`https://wa.me/${number}?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with ${brandName} on WhatsApp (opens WhatsApp)`}
        sx={{
          position: "fixed", zIndex: 1200,
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          right: "calc(20px + env(safe-area-inset-right, 0px))",
          bgcolor: "#25D366", color: "#fff", boxShadow: 3,
          "&:hover": { bgcolor: "#1EBE5A" },
          "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: 3 },
          "@media print": { display: "none" },
        }}
      >
        <FaWhatsapp size={30} aria-hidden="true" />
      </Fab>
    </Tooltip>
  );
}
