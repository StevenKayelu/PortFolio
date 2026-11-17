import { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";

const STORAGE_KEY = "devegen.admin-brand";
const AdminBrandContext = createContext({ brands: [], brandKey: "", setBrandKey: () => {} });

/**
 * The admin brand switcher (report §06 "one secure origin; brand
 * switcher"). It only filters what admin pages ask for; the API still
 * enforces which brands the signed-in user may see.
 */
export function AdminBrandProvider({ children }) {
  const [brands, setBrands] = useState([]);
  const [brandKey, setBrandKeyState] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });

  useEffect(() => {
    apiClient.get("/admin/brands").then((r) => setBrands(r.data)).catch(() => setBrands([]));
  }, []);

  // Drop a remembered brand the user no longer has access to.
  useEffect(() => {
    if (brandKey && brands.length && !brands.some((b) => b.key === brandKey)) setBrandKeyState("");
  }, [brands, brandKey]);

  const value = useMemo(() => ({
    brands,
    brandKey,
    setBrandKey: (key) => {
      setBrandKeyState(key);
      try { window.localStorage.setItem(STORAGE_KEY, key); } catch { /* storage unavailable */ }
    },
  }), [brands, brandKey]);

  return <AdminBrandContext.Provider value={value}>{children}</AdminBrandContext.Provider>;
}

export const useAdminBrand = () => useContext(AdminBrandContext);
