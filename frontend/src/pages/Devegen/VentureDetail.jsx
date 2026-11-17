import { Helmet } from "react-helmet-async";
import { Box, Container, Typography, Stack, Button, Skeleton, useTheme } from "@mui/material";
import { FiArrowLeft, FiArrowUpRight, FiArrowRight } from "react-icons/fi";
import { NavLink, Navigate, useParams } from "react-router-dom";
import Band from "../../components/brand/Band";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

const STAGE = { IDEA: "Idea", BUILDING: "Building", OPERATING: "Operating", PAUSED: "Paused" };
const VERIFICATION = {
  VERIFIED: "Relationship to Devegen verified",
  PENDING: "Relationship to Devegen being verified",
  UNVERIFIED: "Relationship to Devegen not yet verified",
};

/** Public profile of one published venture (GET /ventures/:slug). */
export default function VentureDetail() {
  const theme = useTheme();
  const band = theme.custom.band;
  const { slug } = useParams();
  const { data: venture, loading, error } = useFetch(() => apiClient.get(`/ventures/${slug}`).then((r) => r.data), [slug]);

  // DevGen Solutions has its own, richer branch of the site.
  if (slug === "devgen-solutions") return <Navigate to="/solutions" replace />;

  if (!loading && (error || !venture)) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3 } }}>
        <Helmet><title>Venture not found</title><meta name="robots" content="noindex" /></Helmet>
        <Typography variant="h2" component="h1">This venture isn't listed.</Typography>
        <Typography color="text.secondary" sx={{ mt: 2, maxWidth: "52ch" }}>
          It may not be published yet, or the link may be wrong. Ventures appear here only once their relationship to Devegen is confirmed.
        </Typography>
        <Button component={NavLink} to="/ventures" startIcon={<FiArrowLeft />} sx={{ mt: 3 }}>All ventures</Button>
      </Container>
    );
  }

  return (
    <>
      {venture && (
        <Helmet>
          <title>{venture.name}</title>
          <meta name="description" content={venture.summary} />
        </Helmet>
      )}

      <Band aria-labelledby="venture-title" sx={{ pt: { xs: 5, md: 9 }, pb: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Button component={NavLink} to="/ventures" startIcon={<FiArrowLeft />} sx={{ color: band.muted, mb: 3, px: 0, "&:hover": { color: band.ink, bgcolor: "transparent" } }}>
            All ventures
          </Button>
          {loading ? (
            <Skeleton variant="text" width="60%" height={80} sx={{ bgcolor: "rgba(255,255,255,.08)" }} />
          ) : (
            <>
              <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.75rem", letterSpacing: "0.14em", color: band.accent, textTransform: "uppercase" }}>
                {STAGE[venture.stage]} venture{venture.brand ? ` · ${venture.brand.name}` : ""}
              </Typography>
              <Typography id="venture-title" component="h1" sx={{ mt: 1.5, fontFamily: theme.custom.fontSerif, fontSize: theme.custom.displayScale.size, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
                {venture.name}
              </Typography>
              <Typography sx={{ mt: 3, maxWidth: "56ch", color: band.muted, fontSize: { xs: "1.02rem", md: "1.12rem" } }}>{venture.summary}</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 4 }}>
                {venture.website && (
                  <Button href={venture.website} target="_blank" rel="noopener noreferrer" endIcon={<FiArrowUpRight />} size="large"
                    sx={{ bgcolor: band.accent, color: "#14243D", "&:hover": { bgcolor: band.accent } }}>
                    Visit website
                  </Button>
                )}
                <Button component={NavLink} to="/contact?type=partnership" variant="outlined" size="large" sx={{ color: band.ink, borderColor: band.line }}>
                  Talk to Devegen
                </Button>
              </Stack>
            </>
          )}
        </Container>
      </Band>

      {venture && (
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 }, px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "grid", gap: { xs: 5, md: 8 }, gridTemplateColumns: { xs: "1fr", md: "1.4fr 0.8fr" } }}>
            <Reveal>
              <Typography variant="h2" sx={{ mb: 2 }}>About {venture.name}</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", color: "text.secondary", maxWidth: "65ch" }}>
                {venture.description || venture.summary}
              </Typography>
            </Reveal>
            <Box component="dl" sx={{ m: 0, borderTop: 2, borderColor: "text.primary", "& > div": { py: 1.75, borderBottom: 1, borderColor: "divider" }, "& dt": { fontFamily: theme.custom.fontMono, fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }, "& dd": { m: "4px 0 0" } }}>
              <div><dt>Stage</dt><dd>{STAGE[venture.stage]}</dd></div>
              <div><dt>Status</dt><dd>{VERIFICATION[venture.verificationStatus]}</dd></div>
              {venture.website && <div><dt>Website</dt><dd><a href={venture.website} target="_blank" rel="noopener noreferrer">{venture.website.replace(/^https?:\/\//, "")}</a></dd></div>}
            </Box>
          </Box>

          {venture.products.length > 0 && (
            <Box sx={{ mt: { xs: 7, md: 10 } }}>
              <Typography variant="h2" sx={{ mb: 3 }}>Products</Typography>
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } }}>
                {venture.products.map((p) => (
                  <Box component="li" key={p.slug} sx={{ border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.lg}px`, p: 2.5, bgcolor: "background.paper", display: "grid", gap: 1, alignContent: "start" }}>
                    <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.68rem", letterSpacing: "0.1em", color: "text.secondary", textTransform: "uppercase" }}>
                      {p.lifecycle || "Product"}{p.ownershipStatus !== "CONFIRMED" ? " · ownership under review" : ""}
                    </Typography>
                    <Typography variant="h4" component="h3">{p.name}</Typography>
                    {p.summary && <Typography variant="body2" color="text.secondary">{p.summary}</Typography>}
                    {p.website && (
                      <Button href={p.website} target="_blank" rel="noopener noreferrer" endIcon={<FiArrowRight />} sx={{ justifySelf: "start", px: 0 }}>Visit</Button>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Container>
      )}
    </>
  );
}
