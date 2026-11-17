import { createContext, useContext, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { SITES, SOLUTIONS_NAV, resolveSiteKey } from "../brand/brands";

const BrandContext = createContext(null);

/**
 * Exposes the current site (steven | devegen) and the active brand
 * preset. On the DevGen Ventures site, any /solutions route switches the
 * preset and navigation to DevGen Solutions.
 */
export function BrandProvider({ children }) {
  const [siteKey] = useState(resolveSiteKey);
  const { pathname } = useLocation();
  const inSolutions = siteKey === "devegen" && pathname.startsWith("/solutions");

  const value = useMemo(() => {
    const site = SITES[siteKey];
    return {
      siteKey,
      site,
      brandKey: inSolutions ? "solutions" : siteKey,
      brandName: inSolutions ? "DevGen Solutions" : site.name,
      nav: inSolutions ? SOLUTIONS_NAV.nav : site.nav,
      cta: inSolutions ? SOLUTIONS_NAV.cta : site.cta,
      footer: site.footer,
    };
  }, [siteKey, inSolutions]);

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within BrandProvider");
  return ctx;
}
