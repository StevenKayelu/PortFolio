import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import apiClient from "../../services/apiClient";

/**
 * The DevGen Ventures umbrella mark: a copper canopy over three diamonds
 * (the brands it brings together). Used in headers and as the favicon.
 * An uploaded logo/favicon (Admin → Site content → Logo & favicon)
 * replaces the built-in versions.
 */

let brandingPromise = null;
/** Fetched once per page load; missing settings mean "use the built-in mark". */
export function loadBranding({ fresh = false } = {}) {
  if (fresh || !brandingPromise) {
    brandingPromise = apiClient.get("/site-settings/branding").then((r) => r.data || {}).catch(() => ({}));
  }
  return brandingPromise;
}

export function useBranding() {
  const [branding, setBranding] = useState(null);
  useEffect(() => {
    let alive = true;
    loadBranding().then((b) => alive && setBranding(b));
    return () => { alive = false; };
  }, []);
  return branding;
}

/** Inline SVG so it inherits the theme: the centre diamond follows the text colour. */
export function DefaultMark({ size = 28, title, color = "text.primary" }) {
  return (
    <Box
      component="svg" viewBox="0 0 64 64" width={size} height={size}
      role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      sx={{ display: "block", flexShrink: 0, color }}
    >
      <path d="M10.5 35a21.5 21.5 0 0 1 43 0" fill="none" stroke="#D4A648" strokeWidth="7" strokeLinecap="round" />
      <path d="M32 33.5l8.5 8.5-8.5 8.5-8.5-8.5z" fill="currentColor" />
      <path d="M17 39l5 5-5 5-5-5zM47 39l5 5-5 5-5-5z" fill="#D4A648" />
    </Box>
  );
}

export default function BrandMark({ size = 28, title }) {
  const branding = useBranding();
  if (branding?.logo) {
    return (
      <Box
        component="img" src={branding.logo} alt={title || ""} aria-hidden={title ? undefined : true}
        sx={{ height: size, width: "auto", maxWidth: size * 3, objectFit: "contain", display: "block", flexShrink: 0 }}
      />
    );
  }
  return <DefaultMark size={size} title={title} />;
}

/** Swaps in the uploaded favicon set on every page that renders it. */
export function FaviconLinks() {
  const branding = useBranding();
  useEffect(() => {
    if (!branding?.favicon32) return;
    const head = document.head;
    // Replace the built-in icons so browsers can't keep preferring them.
    head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((el) => el.remove());
    [
      { rel: "icon", href: branding.favicon32, sizes: "32x32", type: "image/png" },
      { rel: "icon", href: branding.favicon192 || branding.favicon32, sizes: "192x192", type: "image/png" },
      { rel: "apple-touch-icon", href: branding.favicon180 || branding.favicon192 || branding.favicon32 },
    ].forEach((attrs) => {
      const link = document.createElement("link");
      Object.entries(attrs).forEach(([k, v]) => v && link.setAttribute(k, v));
      head.appendChild(link);
    });
  }, [branding]);
  return null;
}
