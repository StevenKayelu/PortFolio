import { Box, Container, Typography, Stack, Button, Skeleton, useTheme } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiDownload, FiArrowUpRight, FiGithub } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";
import HeadlineReveal from "../../../components/common/HeadlineReveal";
import { siteHref } from "../../../brand/brands";

/**
 * Profile card built only from live CMS data. Shows Steven's real photo
 * when `identity.photo` is set; otherwise an initials plate, never a
 * stand-in portrait.
 */
function ProfileCard({ identity, about }) {
  const theme = useTheme();
  const edu = about?.education?.[0];
  const rows = [
    ["Role", identity?.role],
    ["Base", identity?.location],
    ["Education", edu && `${edu.degree}, ${edu.institution} (${edu.year})`],
    ["Status", identity?.availability],
  ].filter(([, v]) => v);
  const initials = (identity?.name || "SK").split(" ").map((p) => p[0]).join("").slice(0, 2);

  return (
    <Box
      sx={{
        border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.xl}px`, bgcolor: "background.paper",
        overflow: "hidden", display: "grid", gridTemplateColumns: { xs: "1fr", sm: "180px 1fr", md: "1fr" },
      }}
    >
      <Box
        sx={{
          aspectRatio: { xs: "16 / 9", sm: "4 / 5", md: "16 / 10" }, maxWidth: "100%", position: "relative",
          bgcolor: theme.custom.elevatedBg, display: "grid", placeItems: "center",
          backgroundImage: identity?.photo ? "none" : `repeating-linear-gradient(135deg, transparent 0 12px, ${theme.palette.divider} 12px 13px)`,
        }}
      >
        {identity?.photo ? (
          <Box component="img" src={identity.photo} alt={identity.photoAlt || `Portrait of ${identity.name}`} loading="eager" sx={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
        ) : (
          <Box aria-hidden="true" sx={{ fontFamily: theme.custom.fontSerif, fontSize: "3.5rem", color: "text.secondary", lineHeight: 1 }}>{initials}</Box>
        )}
      </Box>
      <Box component="dl" sx={{ m: 0, p: { xs: 2, sm: 2.5 }, display: "grid", gap: 1.25, alignContent: "start" }}>
        {rows.map(([k, v]) => (
          <Box key={k} sx={{ display: "grid", gridTemplateColumns: "6.5rem 1fr", gap: 1.5, alignItems: "baseline", minWidth: 0 }}>
            <Box component="dt" sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>{k}</Box>
            <Box component="dd" sx={{ m: 0, fontSize: "0.92rem", minWidth: 0, overflowWrap: "anywhere" }}>{v}</Box>
          </Box>
        ))}
        {identity?.github && (
          <Box component="a" href={identity.github} target="_blank" rel="noopener noreferrer" sx={{ mt: 0.5, display: "inline-flex", alignItems: "center", gap: 1, fontFamily: theme.custom.fontMono, fontSize: "0.8rem", color: "primary.main", textDecoration: "none", minHeight: 32, "&:hover": { textDecoration: "underline" } }}>
            <FiGithub aria-hidden="true" /> {identity.github.replace(/^https?:\/\//, "")}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function Hero() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { data: identity, loading } = useFetch(() => apiClient.get("/site-settings/identity").then((r) => r.data), []);
  const { data: about } = useFetch(() => apiClient.get("/site-settings/about").then((r) => r.data), []);
  const fade = (delay) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: theme.custom.motion.easeOut },
  });
  const name = identity?.name || "Steven Kayelu";

  return (
    <Box component="section" aria-labelledby="hero-title" sx={{ position: "relative", pt: { xs: 5, sm: 8, md: 11 }, pb: { xs: 7, md: 12 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "grid", gap: { xs: 5, md: 8 }, gridTemplateColumns: { xs: "1fr", md: "1.35fr 0.9fr" }, alignItems: "end" }}>
          <Box sx={{ minWidth: 0 }}>
            <motion.div {...fade(0)}>
              <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.75rem", letterSpacing: "0.12em", color: theme.custom.accentText, textTransform: "uppercase", mb: { xs: 2.5, md: 3.5 } }}>
                {loading ? " " : [identity?.role, identity?.location?.split(",")[0]].filter(Boolean).join(" · ")}
              </Typography>
            </motion.div>

            <HeadlineReveal
              id="hero-title"
              lines={[
                <>{name}</>,
                <>builds software</>,
                <>people <Box component="em" sx={{ color: theme.custom.accentText }}>trust.</Box></>,
              ]}
              sx={{
                fontFamily: theme.custom.fontSerif, fontWeight: 400,
                fontSize: theme.custom.displayScale.size, lineHeight: theme.custom.displayScale.lineHeight,
                letterSpacing: theme.custom.displayScale.letterSpacing, color: "text.primary",
              }}
            />

            <motion.div {...fade(0.25)}>
              {loading ? (
                <Skeleton variant="text" width="70%" height={32} sx={{ mt: 3 }} />
              ) : (
                <Typography sx={{ mt: { xs: 3, md: 4 }, maxWidth: "52ch", fontSize: { xs: "1.02rem", md: "1.12rem" }, color: "text.secondary" }}>
                  {identity?.tagline}
                </Typography>
              )}
            </motion.div>

            <motion.div {...fade(0.35)}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: { xs: 4, md: 5 } }}>
                <Button component={NavLink} to="/projects" variant="contained" size="large" endIcon={<FiArrowRight />}>
                  View selected work
                </Button>
                <Button component={NavLink} to="/resume" variant="outlined" size="large" endIcon={<FiDownload />} sx={{ borderColor: "divider", color: "text.primary" }}>
                  Résumé
                </Button>
              </Stack>
              <Box
                component="a"
                href={siteHref("devegen")}
                sx={{
                  mt: 3, display: "inline-flex", alignItems: "center", gap: 0.75, minHeight: 44,
                  color: "text.secondary", textDecoration: "none", fontSize: "0.95rem",
                  "& b": { color: theme.custom.accentText, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "4px", textDecorationThickness: "1px" },
                  "&:hover b": { textDecorationThickness: "2px" },
                }}
              >
                Founder of <b>Devegen Ventures</b> <FiArrowUpRight aria-hidden="true" />
              </Box>
            </motion.div>
          </Box>

          <motion.div {...fade(0.3)} style={{ minWidth: 0 }}>
            <ProfileCard identity={identity} about={about} />
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
}
