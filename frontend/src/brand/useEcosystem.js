import { useMemo } from "react";
import apiClient from "../services/apiClient";
import { useFetch } from "../hooks/useFetch";
import { buildEcosystem } from "./ecosystem";

/** Ecosystem nodes/links from the API, with the static structure as fallback. */
export function useEcosystem() {
  const { data, loading, error } = useFetch(() => apiClient.get("/ecosystem").then((r) => r.data), []);
  const graph = useMemo(() => buildEcosystem(data), [data]);
  return { ...graph, data, loading, error, live: Boolean(data) };
}
