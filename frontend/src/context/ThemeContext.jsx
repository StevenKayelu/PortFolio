import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import { createAppTheme } from "../theme/createAppTheme";
import { useBrand } from "./BrandContext";

const STORAGE_KEY = "devegen.color-mode";
const PREFERENCES = ["system", "light", "dark"];

const ThemeSwitcherContext = createContext(null);

function readPreference() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return PREFERENCES.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/**
 * Brand preset comes from BrandContext; the visitor only chooses
 * light, dark or "follow my device".
 */
export function ThemeSwitcherProvider({ children }) {
  const { brandKey } = useBrand();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)", { noSsr: true });
  const [preference, setPreference] = useState(readPreference);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, preference); } catch { /* storage unavailable */ }
  }, [preference]);

  const mode = preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  const cyclePreference = useCallback(() => {
    setPreference((prev) => PREFERENCES[(PREFERENCES.indexOf(prev) + 1) % PREFERENCES.length]);
  }, []);

  const muiTheme = useMemo(() => createAppTheme(brandKey, mode), [brandKey, mode]);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", muiTheme.palette.background.default);
  }, [muiTheme]);

  const value = useMemo(
    () => ({ mode, preference, setPreference, cyclePreference }),
    [mode, preference, cyclePreference]
  );

  return (
    <ThemeSwitcherContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeSwitcherContext.Provider>
  );
}

export function useThemeSwitcher() {
  const ctx = useContext(ThemeSwitcherContext);
  if (!ctx) throw new Error("useThemeSwitcher must be used within ThemeSwitcherProvider");
  return ctx;
}
