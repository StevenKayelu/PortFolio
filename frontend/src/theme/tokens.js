/**
 * Design Token System — DevGen Ventures ecosystem
 * ---------------------------------------------------------
 * One shared type scale, spacing, radius and motion system.
 * Each brand preset (Steven Kayelu, DevGen Ventures, DevGen
 * Solutions) swaps only palette, display treatment and its
 * signature "band" (the hero ground), in a light and dark mode.
 *
 * Core palette comes from the Digital Ecosystem report (§04):
 *   Deep navy #14243D · Royal blue #2769B6 · Copper gold #D4A648
 *   Slate #58677B · Off-white #F6F8FB
 * #D4A648 fails AA as text on light grounds (~2:1), so text uses
 * copperText (#8C6A1F) there and the raw copper only for fills or
 * text on navy (~7:1).
 */

export const palette = {
  navy: "#14243D",
  royal: "#2769B6",
  copper: "#D4A648",
  copperText: "#8C6A1F",
  slate: "#58677B",
  offWhite: "#F6F8FB",
  blueprint: "#0F3566",
};

export const typography = {
  fontSerif: '"Newsreader", "Iowan Old Style", Georgia, serif',
  fontBody: '"Hanken Grotesk", "Segoe UI", system-ui, -apple-system, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, Consolas, monospace',
  scale: {
    display: { size: "clamp(2.5rem, 1.6rem + 4.4vw, 5rem)", lineHeight: 1.02, letterSpacing: "-0.025em" },
    h1: { size: "clamp(2.1rem, 1.5rem + 2.8vw, 3.4rem)", lineHeight: 1.08, letterSpacing: "-0.02em" },
    h2: { size: "clamp(1.75rem, 1.35rem + 1.9vw, 2.6rem)", lineHeight: 1.12, letterSpacing: "-0.015em" },
    h3: { size: "1.5rem", lineHeight: 1.25, letterSpacing: "-0.01em" },
    h4: { size: "1.2rem", lineHeight: 1.3, letterSpacing: "0" },
    body1: { size: "1rem", weight: 400, lineHeight: 1.65, letterSpacing: "0" },
    body2: { size: "0.9375rem", weight: 400, lineHeight: 1.6, letterSpacing: "0" },
    mono: { size: "0.8125rem", weight: 500, lineHeight: 1.5, letterSpacing: "0.02em" },
    caption: { size: "0.8125rem", weight: 500, lineHeight: 1.4, letterSpacing: "0.02em" },
  },
};

export const radii = { sm: 6, md: 8, lg: 12, xl: 18, pill: 999 };

export const motion = {
  fast: 0.15,
  base: 0.22,
  slow: 0.42,
  stagger: 0.07,
  easeOut: [0.2, 0.8, 0.2, 1],
  easeInOut: [0.65, 0, 0.35, 1],
};

/**
 * Brand presets. Each mode provides:
 *  bg            - { default, paper, elevated }
 *  text          - { primary, secondary, disabled }
 *  primary       - main interactive color (+ contrastText)
 *  accentText    - copper that passes AA on this mode's background
 *  border        - hairline/divider color
 *  band          - the brand's signature hero ground (fixed per brand)
 *  display       - "serif" (editorial) or "grotesk" (engineering)
 */
const band = {
  steven: null, // Steven's hero follows the page ground
  devegen: { bg: palette.navy, ink: "#F3EFE6", muted: "#A9B4C4", line: "#2B3D5C", accent: palette.copper },
  solutions: { bg: palette.blueprint, ink: "#EEF4FC", muted: "#A8C1E2", line: "rgba(255,255,255,0.16)", accent: palette.copper, grid: "rgba(255,255,255,0.07)" },
};

const lightBase = {
  mode: "light",
  bg: { default: palette.offWhite, paper: "#FFFFFF", elevated: "#EAF0F8" },
  text: { primary: palette.navy, secondary: palette.slate, disabled: "#9AA6B6" },
  accentText: palette.copperText,
  border: "rgba(20,36,61,0.12)",
};

const darkBase = {
  mode: "dark",
  bg: { default: "#0B1524", paper: "#111F35", elevated: "#172843" },
  text: { primary: "#E7ECF3", secondary: "#9AA8BA", disabled: "#5D6B80" },
  accentText: "#D9B260",
  border: "rgba(231,236,243,0.10)",
};

export const brandThemes = {
  steven: {
    label: "Steven Kayelu",
    display: "serif",
    light: { ...lightBase, primary: palette.royal, contrastText: "#FFFFFF", secondary: palette.slate, band: band.steven },
    dark: { ...darkBase, primary: "#79AAE6", contrastText: "#0B1524", secondary: "#9AA8BA", band: band.steven },
  },
  devegen: {
    label: "DevGen Ventures",
    display: "serif",
    light: { ...lightBase, primary: palette.navy, contrastText: "#FFFFFF", secondary: palette.copperText, band: band.devegen },
    dark: { ...darkBase, primary: palette.copper, contrastText: palette.navy, secondary: "#9AA8BA", band: band.devegen },
  },
  solutions: {
    label: "DevGen Solutions",
    display: "grotesk",
    light: { ...lightBase, bg: { ...lightBase.bg, default: "#F4F7FB" }, primary: palette.royal, contrastText: "#FFFFFF", secondary: palette.slate, band: band.solutions },
    dark: { ...darkBase, primary: "#79AAE6", contrastText: "#0B1524", secondary: "#9AA8BA", band: band.solutions },
  },
};

export const DEFAULT_BRAND = "steven";
