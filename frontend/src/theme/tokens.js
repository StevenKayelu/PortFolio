/**
 * Design Token System
 * ---------------------------------------------------------
 * Every theme is a palette + surface swap over ONE shared
 * type scale, spacing scale, radius scale and motion system.
 * This is what makes "instant theme switching" safe: nothing
 * about layout changes, only the token values feeding it.
 *
 * Signature typography (site-wide, all themes):
 *  - Display/body: "Geist", fallback "Inter"
 *  - Mono (nav labels, stats, code, timestamps): "Geist Mono",
 *    fallback "JetBrains Mono" — the recurring "engineer" texture.
 */

export const typography = {
  fontDisplay: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  fontBody: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  fontMono: '"Geist Mono", "JetBrains Mono", "Fira Code", monospace',
  scale: {
    display: { size: "clamp(2.75rem, 5vw, 4.5rem)", weight: 600, lineHeight: 1.05, letterSpacing: "-0.03em" },
    h1: { size: "clamp(2.25rem, 4vw, 3rem)", weight: 600, lineHeight: 1.1, letterSpacing: "-0.02em" },
    h2: { size: "clamp(1.75rem, 3vw, 2.25rem)", weight: 600, lineHeight: 1.15, letterSpacing: "-0.015em" },
    h3: { size: "1.5rem", weight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" },
    h4: { size: "1.25rem", weight: 600, lineHeight: 1.3, letterSpacing: "0" },
    body1: { size: "1rem", weight: 400, lineHeight: 1.6, letterSpacing: "0" },
    body2: { size: "0.9375rem", weight: 400, lineHeight: 1.55, letterSpacing: "0" },
    mono: { size: "0.875rem", weight: 500, lineHeight: 1.5, letterSpacing: "0.01em" },
    caption: { size: "0.8125rem", weight: 500, lineHeight: 1.4, letterSpacing: "0.02em" },
  },
};

export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const motion = {
  fast: 0.15,
  base: 0.25,
  slow: 0.45,
  easeOut: [0.16, 1, 0.3, 1],
  easeInOut: [0.65, 0, 0.35, 1],
};

/**
 * Each theme provides:
 *  mode          - "dark" | "light"
 *  bg            - { default, paper, elevated }
 *  text          - { primary, secondary, disabled }
 *  primary/secondary/accent - brand colors
 *  border        - hairline/divider color
 *  glass         - backdrop for glassmorphism surfaces
 *  gradient      - subtle accent gradient (used sparingly: hero glow only)
 */
export const themes = {
  "elegant-dark": {
    label: "Elegant Dark",
    mode: "dark",
    bg: { default: "#0B0C10", paper: "#111319", elevated: "#171A21" },
    text: { primary: "#F5F6F8", secondary: "#9CA3AF", disabled: "#5B6270" },
    primary: "#4F6EF7",
    secondary: "#8B93A8",
    accent: "#4F6EF7",
    border: "rgba(255,255,255,0.08)",
    glass: "rgba(23,26,33,0.6)",
    gradient: "linear-gradient(135deg, rgba(79,110,247,0.18), rgba(11,12,16,0))",
  },
  "minimal-white": {
    label: "Minimal White",
    mode: "light",
    bg: { default: "#FFFFFF", paper: "#FAFAFB", elevated: "#F2F3F5" },
    text: { primary: "#101114", secondary: "#5B6270", disabled: "#A7ACB8" },
    primary: "#3752E0",
    secondary: "#6B7280",
    accent: "#3752E0",
    border: "rgba(16,17,20,0.08)",
    glass: "rgba(255,255,255,0.7)",
    gradient: "linear-gradient(135deg, rgba(55,82,224,0.08), rgba(255,255,255,0))",
  },
  "ocean-blue": {
    label: "Ocean Blue",
    mode: "dark",
    bg: { default: "#081420", paper: "#0D1E2E", elevated: "#122A3E" },
    text: { primary: "#EAF3FA", secondary: "#8FAAC2", disabled: "#4F6478" },
    primary: "#22B8CF",
    secondary: "#5FA8D3",
    accent: "#22B8CF",
    border: "rgba(255,255,255,0.08)",
    glass: "rgba(13,30,46,0.6)",
    gradient: "linear-gradient(135deg, rgba(34,184,207,0.2), rgba(8,20,32,0))",
  },
  "midnight-purple": {
    label: "Midnight Purple",
    mode: "dark",
    bg: { default: "#0F0B1A", paper: "#161027", elevated: "#1E1633" },
    text: { primary: "#F3F0FA", secondary: "#A79CC2", disabled: "#5E5578" },
    primary: "#8B5CF6",
    secondary: "#A78BFA",
    accent: "#8B5CF6",
    border: "rgba(255,255,255,0.08)",
    glass: "rgba(22,16,39,0.6)",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(15,11,26,0))",
  },
  "cyber-green": {
    label: "Cyber Green",
    mode: "dark",
    bg: { default: "#07120D", paper: "#0C1A13", elevated: "#11241A" },
    text: { primary: "#EAFBF1", secondary: "#8FBFA3", disabled: "#4A6858" },
    primary: "#22D48C",
    secondary: "#5FD9A6",
    accent: "#22D48C",
    border: "rgba(255,255,255,0.08)",
    glass: "rgba(12,26,19,0.6)",
    gradient: "linear-gradient(135deg, rgba(34,212,140,0.18), rgba(7,18,13,0))",
  },
  "luxury-gold": {
    label: "Luxury Gold",
    mode: "dark",
    bg: { default: "#100D08", paper: "#181209", elevated: "#221909" },
    text: { primary: "#F8F3E8", secondary: "#C2AF8C", disabled: "#6B6151" },
    primary: "#D4AF37",
    secondary: "#B8912E",
    accent: "#D4AF37",
    border: "rgba(255,255,255,0.08)",
    glass: "rgba(24,18,9,0.6)",
    gradient: "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(16,13,8,0))",
  },
  "developer-theme": {
    label: "Developer",
    mode: "dark",
    bg: { default: "#0A0E0C", paper: "#0F1512", elevated: "#141C18" },
    text: { primary: "#E8F5EC", secondary: "#7FA88F", disabled: "#425A4C" },
    primary: "#39FF88",
    secondary: "#2BC96C",
    accent: "#39FF88",
    border: "rgba(57,255,136,0.12)",
    glass: "rgba(15,21,18,0.7)",
    gradient: "linear-gradient(135deg, rgba(57,255,136,0.12), rgba(10,14,12,0))",
    monoAccent: true, // signals nav/hero to lean harder into terminal styling
  },
  "corporate-theme": {
    label: "Corporate",
    mode: "light",
    bg: { default: "#F7F8FA", paper: "#FFFFFF", elevated: "#EEF1F5" },
    text: { primary: "#0F172A", secondary: "#475569", disabled: "#94A3B8" },
    primary: "#1D4ED8",
    secondary: "#334155",
    accent: "#1D4ED8",
    border: "rgba(15,23,42,0.08)",
    glass: "rgba(255,255,255,0.75)",
    gradient: "linear-gradient(135deg, rgba(29,78,216,0.08), rgba(247,248,250,0))",
  },
  "modern-gray": {
    label: "Modern Gray",
    mode: "dark",
    bg: { default: "#131417", paper: "#1A1B1F", elevated: "#212226" },
    text: { primary: "#EDEDEF", secondary: "#A1A1AA", disabled: "#57575F" },
    primary: "#71717A",
    secondary: "#D4D4D8",
    accent: "#E4E4E7",
    border: "rgba(255,255,255,0.08)",
    glass: "rgba(26,27,31,0.6)",
    gradient: "linear-gradient(135deg, rgba(228,228,231,0.08), rgba(19,20,23,0))",
  },
  "glass-theme": {
    label: "Glass",
    mode: "dark",
    bg: { default: "#0D0F1A", paper: "rgba(255,255,255,0.04)", elevated: "rgba(255,255,255,0.07)" },
    text: { primary: "#F5F6FA", secondary: "#A9AEC4", disabled: "#5A5F76" },
    primary: "#6E8CFF",
    secondary: "#9FB0FF",
    accent: "#6E8CFF",
    border: "rgba(255,255,255,0.12)",
    glass: "rgba(255,255,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(110,140,255,0.25), rgba(13,15,26,0))",
    heavyGlass: true, // signals surfaces to use stronger backdrop-blur
  },
};

export const themeOrder = [
  "elegant-dark",
  "minimal-white",
  "ocean-blue",
  "midnight-purple",
  "cyber-green",
  "luxury-gold",
  "developer-theme",
  "corporate-theme",
  "modern-gray",
  "glass-theme",
];

export const DEFAULT_THEME = "elegant-dark";
