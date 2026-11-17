/**
 * Site + brand configuration
 * ---------------------------------------------------------
 * One React app serves two public sites (Digital Ecosystem report §03):
 *   stevenkayelu.online   -> "steven"  (personal profile)
 *   devegenventures.com   -> "devegen" (umbrella brand)
 * and the /solutions branch of devegenventures.com uses the
 * "solutions" preset (DevGen Solutions LTD).
 *
 * This is frontend presentation config only. Brand selection here is
 * NOT access control — the API must authorize admin actions itself.
 */

export const SITES = {
  steven: {
    key: "steven",
    name: "Steven Kayelu",
    domain: "stevenkayelu.online",
    nav: [
      { label: "Work", to: "/projects" },
      { label: "About", to: "/about" },
      { label: "Experience", to: "/experience" },
      { label: "Resume", to: "/resume" },
      { label: "Writing", to: "/blog" },
    ],
    cta: { label: "Get in touch", to: "/contact" },
    footer: [
      { title: "Portfolio", links: [
        { label: "Projects", to: "/projects" },
        { label: "Experience", to: "/experience" },
        { label: "Resume", to: "/resume" },
        { label: "Certificates", to: "/certificates" },
      ] },
      { title: "More", links: [
        { label: "About", to: "/about" },
        { label: "Writing", to: "/blog" },
        { label: "Achievements", to: "/achievements" },
        { label: "Testimonials", to: "/testimonials" },
      ] },
      { title: "Contact", links: [
        { label: "Contact", to: "/contact" },
        { label: "FAQ", to: "/faq" },
        { label: "Privacy policy", to: "/privacy-policy" },
      ] },
    ],
  },
  devegen: {
    key: "devegen",
    name: "Devegen Ventures",
    domain: "devegenventures.com",
    nav: [
      { label: "Ventures", to: "/ventures" },
      { label: "DevGen Solutions", to: "/solutions" },
      { label: "Ecosystem", to: "/#ecosystem" },
    ],
    cta: { label: "Partner with us", to: "/contact?type=partnership" },
    footer: [
      { title: "Devegen", links: [
        { label: "Ventures", to: "/ventures" },
        { label: "Ecosystem", to: "/#ecosystem" },
        { label: "Partnerships", to: "/contact?type=partnership" },
      ] },
      { title: "DevGen Solutions", links: [
        { label: "Overview", to: "/solutions" },
        { label: "Services", to: "/solutions/services" },
        { label: "Work", to: "/solutions/work" },
        { label: "Request a quote", to: "/contact?type=quote" },
      ] },
      { title: "Legal", links: [
        { label: "Privacy policy", to: "/privacy-policy" },
        { label: "FAQ", to: "/faq" },
      ] },
    ],
  },
};

/** Navigation used while inside the /solutions branch. */
export const SOLUTIONS_NAV = {
  nav: [
    { label: "Overview", to: "/solutions", end: true },
    { label: "Services", to: "/solutions/services" },
    { label: "Work", to: "/solutions/work" },
    { label: "Devegen Ventures", to: "/" , end: true },
  ],
  cta: { label: "Request a quote", to: "/contact?type=quote" },
};

const PRODUCTION_HOSTS = {
  "stevenkayelu.online": "steven",
  "www.stevenkayelu.online": "steven",
  "devegenventures.com": "devegen",
  "www.devegenventures.com": "devegen",
};

const OVERRIDE_KEY = "devegen.site-override";

function isProductionHost() {
  return typeof window !== "undefined" && Boolean(PRODUCTION_HOSTS[window.location.hostname.toLowerCase()]);
}

/**
 * Resolves which site to render. Production hostnames always win; on
 * any other host (localhost, previews, staging) `?site=devegen` selects
 * a site for the tab session so both experiences can be reviewed.
 */
export function resolveSiteKey() {
  if (typeof window === "undefined") return "steven";
  const host = window.location.hostname.toLowerCase();
  if (PRODUCTION_HOSTS[host]) return PRODUCTION_HOSTS[host];

  const requested = new URLSearchParams(window.location.search).get("site");
  if (requested && SITES[requested]) {
    try { window.sessionStorage.setItem(OVERRIDE_KEY, requested); } catch { /* storage unavailable */ }
    return requested;
  }
  try {
    const stored = window.sessionStorage.getItem(OVERRIDE_KEY);
    if (stored && SITES[stored]) return stored;
  } catch { /* storage unavailable */ }

  const fallback = import.meta.env.VITE_DEFAULT_SITE;
  return SITES[fallback] ? fallback : "steven";
}

/** Absolute link to another site in the ecosystem (full page load). */
export function siteHref(siteKey, path = "/") {
  if (isProductionHost()) return `https://${SITES[siteKey].domain}${path}`;
  const [pathname, hash] = path.split("#");
  return `${pathname}${pathname.includes("?") ? "&" : "?"}site=${siteKey}${hash ? `#${hash}` : ""}`;
}
