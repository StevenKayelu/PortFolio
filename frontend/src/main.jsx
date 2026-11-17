import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { BrandProvider } from "./context/BrandContext";
import { ThemeSwitcherProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <BrandProvider>
          <ThemeSwitcherProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeSwitcherProvider>
        </BrandProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
