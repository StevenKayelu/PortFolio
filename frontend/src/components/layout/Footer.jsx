import { Box, Container, Grid, Stack, Typography, IconButton, useTheme } from "@mui/material";
import { FiGithub, FiFacebook, FiLinkedin, FiMail, FiPhone, FiArrowUpRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";
import { useBrand } from "../../context/BrandContext";
import { siteHref } from "../../brand/brands";
import Wordmark from "../brand/Wordmark";
import { useCompliance } from "../../brand/useCompliance";
import { usePublicBrands } from "../../brand/usePublicBrands";

// Contact details and links come only from Admin → Site content, so a
// detail removed there disappears here too. Names are the only fallback.
const FALLBACK_NAME = { steven: "Steven Kayelu", devegen: "DevGen Ventures", solutions: "DevGen Solutions LTD" };

function Label({ children }) {
  const theme = useTheme();
  return (
    <Typography component="h2" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.7rem", fontWeight: 500 }}>
      {children}
    </Typography>
  );
}

/** e.g. "DevGen Solutions LTD · Private limited company registered with PACRA, No. 123" */
function RegistrationLine() {
  const { organizations } = useCompliance();
  const lines = organizations.flatMap((o) => o.credentials
    .filter((c) => c.type === "PACRA_REGISTRATION")
    .map((c) => `${o.legalName} · ${o.registrationType ? `${o.registrationType} registered` : "Registered"} with PACRA, No. ${c.referenceNumber}`));
  if (!lines.length) return null;
  return (
    <Box component={NavLink} to="/compliance" sx={{ display: "block", color: "text.secondary", fontSize: "0.8125rem", mt: 1, "&:hover": { color: "text.primary" } }}>
      {lines.join(" · ")}
    </Box>
  );
}

export default function Footer() {
  const theme = useTheme();
  const { siteKey, brandKey, footer } = useBrand();
  const { data } = useFetch(() => apiClient.get("/site-settings/identity").then((r) => r.data), []);
  const identity = data || {};
  const brands = usePublicBrands();
  const brandLine = brandKey === "steven" ? identity.tagline : brands?.[brandKey]?.tagline;

  const socials = [
    { icon: FiGithub, href: identity.github, label: "GitHub", external: true },
    { icon: FiLinkedin, href: identity.linkedin, label: "LinkedIn", external: true },
    { icon: FiFacebook, href: identity.facebook, label: "Facebook", external: true },
    { icon: FiMail, href: identity.email && `mailto:${identity.email}`, label: "Email" },
    { icon: FiPhone, href: identity.phone && `tel:${identity.phone.replace(/\s/g, "")}`, label: "Phone" },
  ].filter((s) => s.href);

  const linkSx = {
    color: "text.secondary", textDecoration: "none", fontSize: "0.9rem", minHeight: 32,
    display: "inline-flex", alignItems: "center", width: "fit-content",
    "&:hover": { color: "text.primary" },
  };

  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: "divider", mt: { xs: 10, md: 14 } }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={{ xs: 4, md: 5 }}>
          <Grid item xs={12} md={4}>
            <Wordmark brandKey={brandKey} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 340 }}>
              {brandLine}
            </Typography>
            {siteKey === "steven" && identity.location && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: theme.custom.fontMono, fontSize: "0.78rem" }}>
                {identity.location}
              </Typography>
            )}
            <Stack direction="row" spacing={0.5} sx={{ mt: 2, ml: -1.25 }}>
              {socials.map(({ icon: Icon, href, label, external }) => (
                <IconButton
                  key={label}
                  component="a"
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  aria-label={label}
                  sx={{ width: 44, height: 44, color: "text.secondary", "&:hover": { color: "primary.main" } }}
                >
                  <Icon size={18} />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {footer.map((col) => (
            <Grid item xs={6} sm={4} md={2} key={col.title} component="nav" aria-label={col.title}>
              <Label>{col.title.toUpperCase()}</Label>
              <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                {col.links.map((link) => (
                  <Box key={link.to} component={NavLink} to={link.to} sx={linkSx}>
                    {link.label}
                  </Box>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        {/* Ecosystem strip: each site points to the other, as the report's cross-linking rules require */}
        <Box
          component="a"
          href={siteKey === "steven" ? siteHref("devegen") : siteHref("steven")}
          sx={{
            mt: { xs: 5, md: 7 }, p: { xs: 2, sm: 2.5 }, display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 2, textDecoration: "none", color: "text.primary",
            border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.lg}px`,
            transition: "border-color 150ms",
            "&:hover": { borderColor: "primary.main" },
            "&:hover svg": { transform: "translate(2px,-2px)" },
            "& svg": { transition: "transform 150ms", flexShrink: 0 },
          }}
        >
          <span>
            <Box component="span" sx={{ display: "block", fontFamily: theme.custom.fontMono, fontSize: "0.68rem", letterSpacing: "0.12em", color: theme.custom.accentText }}>
              {siteKey === "steven" ? "FOUNDER OF" : "FOUNDED BY"}
            </Box>
            <Box component="span" sx={{ fontFamily: theme.custom.fontSerif, fontSize: "1.25rem" }}>
              {siteKey === "steven" ? "DevGen Ventures" : "Steven Kayelu, software engineer"}
            </Box>
          </span>
          <FiArrowUpRight size={20} aria-hidden="true" />
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider", fontSize: "0.8125rem" }}
        >
          © {new Date().getFullYear()} {siteKey === "steven" ? identity.name || FALLBACK_NAME.steven : brands?.devegen?.name || FALLBACK_NAME.devegen}. All rights reserved.
        </Typography>
        {siteKey === "devegen" && <RegistrationLine />}
      </Container>
    </Box>
  );
}
