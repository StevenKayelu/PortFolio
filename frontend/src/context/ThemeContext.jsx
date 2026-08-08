import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme } from "../theme/createAppTheme";
import { themes, themeOrder, DEFAULT_THEME } from "../theme/tokens";

const STORAGE_KEY = "portfolio.theme";

const ThemeSwitcherContext = createContext(null);

export function ThemeSwitcherProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && themes[stored] ? stored : DEFAULT_THEME;
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, themeName);
  }, [themeName]);

  const setTheme = useCallback((name) => {
    if (themes[name]) setThemeName(name);
  }, []);

  const toggleLightDark = useCallback(() => {
    setThemeName((prev) => (themes[prev].mode === "dark" ? "minimal-white" : "elegant-dark"));
  }, []);

  const muiTheme = useMemo(() => createAppTheme(themeName), [themeName]);

  const value = useMemo(
    () => ({
      themeName,
      setTheme,
      toggleLightDark,
      availableThemes: themeOrder.map((key) => ({ key, label: themes[key].label, mode: themes[key].mode })),
    }),
    [themeName, setTheme, toggleLightDark]
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
