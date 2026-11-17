import apiClient from "../services/apiClient";
import { useFetch } from "../hooks/useFetch";

/** Public registration & compliance facts (GET /compliance). */
export function useCompliance() {
  const { data, loading, error } = useFetch(() => apiClient.get("/compliance").then((r) => r.data).catch(() => ({ organizations: [] })), []);
  return { organizations: data?.organizations || [], loading, error };
}

/** The organisation behind a brand key, if it has published facts. */
export function organizationForBrand(organizations, brandKey) {
  return organizations.find((o) => o.brands.some((b) => b.key === brandKey)) || null;
}
