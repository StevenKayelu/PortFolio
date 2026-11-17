import { createTheme } from "@mui/material/styles";
import { typography, radii, motion, palette, brandThemes, DEFAULT_BRAND } from "./tokens";

/**
 * Builds a complete MUI theme for one brand preset in one mode.
 * Component overrides live here so every brand automatically
 * restyles buttons, cards, navbar, footer and inputs — never
 * touched per-component in feature code.
 */
export function createAppTheme(brandKey, mode = "light") {
  const preset = brandThemes[brandKey] ?? brandThemes[DEFAULT_BRAND];
  const t = preset[mode] ?? preset.light;
  const serif = preset.display === "serif";
  const fontDisplay = serif ? typography.fontSerif : typography.fontBody;
  const headingWeight = serif ? 400 : 700;
  const heading = (s) => ({
    fontFamily: fontDisplay,
    fontWeight: headingWeight,
    fontSize: s.size,
    lineHeight: s.lineHeight,
    letterSpacing: serif ? s.letterSpacing : `calc(${s.letterSpacing} - 0.01em)`,
    textWrap: "balance",
  });
  const focusRing = { outline: `2px solid ${t.primary}`, outlineOffset: 3 };

  return createTheme({
    palette: {
      mode: t.mode,
      primary: { main: t.primary, contrastText: t.contrastText },
      secondary: { main: t.secondary },
      background: { default: t.bg.default, paper: t.bg.paper },
      text: { primary: t.text.primary, secondary: t.text.secondary, disabled: t.text.disabled },
      divider: t.border,
    },
    shape: { borderRadius: radii.md },
    typography: {
      fontFamily: typography.fontBody,
      h1: heading(typography.scale.h1),
      h2: heading(typography.scale.h2),
      h3: heading(typography.scale.h3),
      h4: { ...heading(typography.scale.h4), fontFamily: typography.fontBody, fontWeight: 600 },
      body1: typography.scale.body1,
      body2: typography.scale.body2,
      caption: typography.scale.caption,
      button: { textTransform: "none", fontWeight: 600, letterSpacing: "0" },
    },
    // Custom tokens namespaced under `custom` so components can reach
    // things MUI's palette has no concept of (band, copper, fonts, motion).
    custom: {
      name: brandKey,
      label: preset.label,
      display: preset.display,
      fontMono: typography.fontMono,
      fontSerif: typography.fontSerif,
      fontDisplay,
      displayScale: typography.scale.display,
      headingWeight,
      accentText: t.accentText,
      copper: palette.copper,
      band: t.band,
      glass: t.mode === "dark" ? "rgba(11,21,36,0.78)" : "rgba(246,248,251,0.82)",
      gradient: `linear-gradient(135deg, ${t.bg.elevated}, ${t.bg.paper})`,
      elevatedBg: t.bg.elevated,
      radii,
      motion,
    },
    shadows: buildShadowScale(t.mode),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { scrollPaddingTop: 88 },
          body: {
            backgroundColor: t.bg.default,
            WebkitFontSmoothing: "antialiased",
            overflowX: "clip",
          },
          "::selection": { backgroundColor: t.primary, color: t.contrastText },
          ":focus-visible": focusRing,
          // Plain links in running text (not MUI-styled components)
          "a:not([class*='Mui'])": { color: t.primary, textUnderlineOffset: "3px", textDecorationThickness: "1px" },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animationDuration: "1ms !important",
              animationIterationCount: "1 !important",
              transitionDuration: "1ms !important",
              scrollBehavior: "auto !important",
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: t.mode === "dark" ? "rgba(11,21,36,0.82)" : "rgba(246,248,251,0.86)",
            backdropFilter: "blur(14px) saturate(140%)",
            boxShadow: "none",
            borderBottom: `1px solid ${t.border}`,
            color: t.text.primary,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.paper,
            border: `1px solid ${t.border}`,
            borderRadius: radii.lg,
            transition: `transform ${motion.base}s cubic-bezier(${motion.easeOut.join(",")}), border-color ${motion.fast}s, box-shadow ${motion.base}s`,
          },
        },
      },
      MuiButtonBase: {
        defaultProps: { disableRipple: false },
        styleOverrides: { root: { "&.Mui-focusVisible": focusRing } },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: radii.md,
            paddingInline: "1.25rem",
            paddingBlock: "0.7rem",
            minHeight: 44,
            transition: `transform ${motion.fast}s cubic-bezier(${motion.easeOut.join(",")}), background-color ${motion.fast}s, box-shadow ${motion.fast}s`,
            "&:active": { transform: "scale(0.98)" },
            "& .MuiButton-endIcon": { transition: `transform ${motion.fast}s` },
            "&:hover .MuiButton-endIcon": { transform: "translateX(3px)" },
          },
          containedPrimary: {
            boxShadow: "none",
            "&:hover": { boxShadow: `0 0 0 4px ${t.primary}26` },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: radii.pill, fontFamily: typography.fontMono, fontWeight: 500 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: radii.md, transition: `box-shadow ${motion.fast}s`, "&.Mui-focused": { boxShadow: `0 0 0 3px ${t.primary}22` } },
        },
      },
    },
  });
}

function buildShadowScale(mode) {
  const base = mode === "dark" ? "0,0,0" : "20,36,61";
  const shadows = ["none"];
  for (let i = 1; i < 25; i += 1) {
    const blur = 4 + i * 3;
    const alpha = Math.min(0.03 + i * 0.01, 0.3);
    shadows.push(`0 ${Math.round(i * 1.2)}px ${blur}px rgba(${base},${alpha.toFixed(3)})`);
  }
  return shadows;
}
