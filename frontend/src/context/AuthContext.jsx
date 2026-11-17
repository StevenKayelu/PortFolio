import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import apiClient, { setAccessToken } from "../services/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();
  const attempted = useRef(false);

  // The first time an /admin route is opened, try a silent refresh so a
  // reload doesn't force a re-login while the httpOnly refresh cookie is
  // valid. Public visitors never trigger it (it only ever returned 401).
  useEffect(() => {
    if (attempted.current || !pathname.startsWith("/admin")) return;
    attempted.current = true;
    (async () => {
      try {
        const { data } = await apiClient.post("/auth/refresh");
        setAccessToken(data.accessToken);
        const me = await apiClient.get("/auth/me");
        setUser(me.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [pathname]);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await apiClient.post("/auth/logout").catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
