import { createTheme } from "@mui/material/styles";
import { typography, radii, motion, themes } from "./tokens";

/**
 * Builds a complete MUI theme object from a named token set.
 * Component overrides live here so every theme automatically
 * restyles buttons, cards, navbar, footer, charts and code
 * blocks — never touched per-component in feature code.
 */
export function createAppTheme(themeName) {
  const t = themes[themeName] ?? themes["elegant-dark"];

  const theme = createTheme({
    palette: {
      mode: t.mode,
      primary: { main: t.primary },
      secondary: { main: t.secondary },
      background: { default: t.bg.default, paper: t.bg.paper },
      text: { primary: t.text.primary, secondary: t.text.secondary, disabled: t.text.disabled },
      divider: t.border,
    },
    shape: { borderRadius: radii.md },
    typography: {
      fontFamily: typography.fontBody,
      h1: { fontFamily: typography.fontDisplay, ...typography.scale.h1 },
      h2: { fontFamily: typography.fontDisplay, ...typography.scale.h2 },
      h3: { fontFamily: typography.fontDisplay, ...typography.scale.h3 },
      h4: { fontFamily: typography.fontDisplay, ...typography.scale.h4 },
      body1: typography.scale.body1,
      body2: typography.scale.body2,
      caption: typography.scale.caption,
      button: { textTransform: "none", fontWeight: 600, letterSpacing: "0" },
    },
    // Custom tokens namespaced under `custom` so components can reach
    // things MUI's palette has no concept of (glass, gradient, mono font).
    custom: {
      name: themeName,
      label: t.label,
      fontMono: typography.fontMono,
      glass: t.glass,
      gradient: t.gradient,
      elevatedBg: t.bg.elevated,
      radii,
      motion,
      monoAccent: Boolean(t.monoAccent),
      heavyGlass: Boolean(t.heavyGlass),
    },
    shadows: buildShadowScale(t.mode),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.bg.default,
            transition: "background-color 0.3s ease",
          },
          "::selection": { backgroundColor: t.primary, color: t.mode === "dark" ? "#0B0C10" : "#FFFFFF" },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: t.heavyGlass ? t.glass : `${t.bg.default}CC`,
            backdropFilter: "blur(16px) saturate(150%)",
            boxShadow: "none",
            borderBottom: `1px solid ${t.border}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: t.heavyGlass ? t.glass : t.bg.paper,
            backdropFilter: t.heavyGlass ? "blur(20px)" : "none",
            border: `1px solid ${t.border}`,
            borderRadius: radii.lg,
            transition: `transform ${motion.base}s ${motion.easeOut.join(",")}, box-shadow ${motion.base}s`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: radii.pill, paddingInline: "1.5rem", paddingBlock: "0.65rem" },
          containedPrimary: {
            boxShadow: "none",
            "&:hover": { boxShadow: `0 8px 24px -8px ${t.primary}66` },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: radii.pill, fontFamily: typography.fontMono, fontWeight: 500 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
    },
  });

  return theme;
}

function buildShadowScale(mode) {
  const base = mode === "dark" ? "0,0,0" : "16,17,20";
  const shadows = ["none"];
  for (let i = 1; i < 25; i += 1) {
    const blur = 4 + i * 3;
    const alpha = Math.min(0.04 + i * 0.012, 0.4);
    shadows.push(`0 ${Math.round(i * 1.2)}px ${blur}px rgba(${base},${alpha.toFixed(3)})`);
  }
  return shadows;
}
