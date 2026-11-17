import { useEffect, useState } from "react";
import apiClient from "../services/apiClient";

let promise = null;
/** Published brands keyed by brand key, fetched once per page load. */
export function usePublicBrands() {
  const [brands, setBrands] = useState(null);
  useEffect(() => {
    let alive = true;
    promise ??= apiClient.get("/brands/public")
      .then((r) => Object.fromEntries(r.data.map((b) => [b.key, b])))
      .catch(() => ({}));
    promise.then((b) => alive && setBrands(b));
    return () => { alive = false; };
  }, []);
  return brands;
}
