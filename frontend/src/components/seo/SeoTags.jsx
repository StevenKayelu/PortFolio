import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";
import { useBrand } from "../../context/BrandContext";
import { SITES, isProductionHost } from "../../brand/brands";

/**
 * Brand-level SEO (report §03). Defaults below apply to every page of a
 * brand; pages can set their own <title>/description; and a SeoMeta row
 * from the admin (/admin/seo) overrides both for one path.
 *
 * Structured data states only verified facts: the founder link is
 * confirmed, the DevGen Ventures ↔ DevGen Solutions relationship is not, so no
 * parentOrganization is claimed.
 */

const DEFAULTS = {
  steven: {
    description: "Steven Kayelu is a full-stack software engineer in Kitwe, Zambia, and the founder of DevGen Ventures.",
    jsonLd: (url) => ({
      "@context": "https://schema.org", "@type": "Person", name: "Steven Kayelu", url,
      jobTitle: "Software engineer", sameAs: ["https://github.com/StevenKayelu"],
    }),
  },
  devegen: {
    description: "DevGen Ventures is an umbrella brand for technology services, products and future ventures, founded by Steven Kayelu.",
    jsonLd: (url) => ({
      "@context": "https://schema.org", "@type": "Organization", name: "DevGen Ventures", url,
      founder: { "@type": "Person", name: "Steven Kayelu", url: `https://${SITES.steven.domain}` },
    }),
  },
  solutions: {
    description: "DevGen Solutions LTD builds business systems, web and mobile applications and provides IT support. Request a quote.",
    jsonLd: (url) => ({ "@context": "https://schema.org", "@type": "Organization", name: "DevGen Solutions LTD", url }),
  },
};

function canonicalFor(siteKey, pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return `https://${SITES[siteKey].domain}${path}`;
}

/** Brand defaults: render before the page so page-level tags win. */
export function SeoDefaults() {
  const { siteKey, brandKey, brandName } = useBrand();
  const { pathname } = useLocation();
  const d = DEFAULTS[brandKey];
  const url = canonicalFor(siteKey, pathname);
  const brandRoot = brandKey === "solutions" ? `https://${SITES.devegen.domain}/solutions` : `https://${SITES[siteKey].domain}`;

  return (
    <Helmet>
      <meta name="description" content={d.description} />
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={brandName} />
      <meta property="og:type" content={brandKey === "steven" ? "profile" : "website"} />
      <meta property="og:url" content={url} />
      <meta property="og:description" content={d.description} />
      <meta name="twitter:card" content="summary_large_image" />
      {/* Preview and staging hosts must never compete with the real domains. */}
      {!isProductionHost() && <meta name="robots" content="noindex, nofollow" />}
      <script type="application/ld+json">{JSON.stringify(d.jsonLd(brandRoot))}</script>
    </Helmet>
  );
}

/** Admin overrides for this path: render after the page so they win. */
export function SeoOverrides() {
  const { siteKey } = useBrand();
  const { pathname } = useLocation();
  const { data } = useFetch(
    () => apiClient.get("/seo", { params: { site: siteKey, path: pathname } }).then((r) => (r.status === 204 ? null : r.data)).catch(() => null),
    [siteKey, pathname]
  );
  if (!data) return null;
  return (
    <Helmet>
      <title>{data.title}</title>
      <meta name="description" content={data.description} />
      <meta property="og:title" content={data.title} />
      <meta property="og:description" content={data.description} />
      {data.keywords && <meta name="keywords" content={data.keywords} />}
      {data.ogImage && <meta property="og:image" content={data.ogImage} />}
      {data.canonicalUrl && <link rel="canonical" href={data.canonicalUrl} />}
      {data.noIndex && <meta name="robots" content="noindex" />}
      {data.structuredData && <script type="application/ld+json">{JSON.stringify(data.structuredData)}</script>}
    </Helmet>
  );
}
