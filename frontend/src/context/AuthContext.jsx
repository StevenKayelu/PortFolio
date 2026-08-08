import { createContext, useContext, useState, useCallback, useEffect } from "react";
import apiClient, { setAccessToken } from "../services/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try a silent refresh so a page reload doesn't force a
  // re-login as long as the httpOnly refresh cookie is still valid.
  useEffect(() => {
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
  }, []);

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
