import { Helmet } from "react-helmet-async";
import { Box, Container, Typography, Stack, Button, useTheme } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiArrowUpRight, FiArrowDown } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Band from "../../components/brand/Band";
import EcosystemMap from "../../components/brand/EcosystemMap";
import HeadlineReveal from "../../components/common/HeadlineReveal";
import SectionHeading from "../../components/common/SectionHeading";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";
import { siteHref } from "../../brand/brands";

// Hero index: a summary of the directory, not a live record list.
const INDEX = [
  { id: "ds", name: "DevGen Solutions LTD", detail: "Technology services brand", label: "Operating" },
  { id: "products", name: "Products", detail: "Listed after ownership review", label: "Under review" },
  { id: "fv", name: "Future ventures", detail: "Configurable venture profiles", label: "Open" },
];

/** Faint static constellation behind the hero; decorative only. */
function Constellation() {
  const theme = useTheme();
  const pts = [[60, 80], [210, 40], [330, 150], [470, 70], [560, 210], [400, 300], [230, 250], [120, 330], [520, 360]];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 4], [2, 6], [6, 7], [5, 8]];
  return (
    <Box component="svg" viewBox="0 0 620 400" aria-hidden="true" sx={{ position: "absolute", right: { xs: "-30%", md: "-4%" }, top: { xs: "-4%", md: "-12%" }, width: { xs: "110%", md: "52%" }, opacity: { xs: 0.12, md: 0.16 }, pointerEvents: "none" }}>
      {edges.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke={theme.custom.band.muted} strokeWidth="1" />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 2 ? 7 : 3.5} fill={i === 2 ? theme.custom.copper : theme.custom.band.ink} />
      ))}
    </Box>
  );
}

const STORY = [
  {
    title: "Ideas, given a structure",
    body: "DevGen Ventures is the umbrella name under which service brands, products and new businesses are presented together, each with its own identity.",
  },
  {
    title: "Technology at the core",
    body: "The first operating brand, DevGen Solutions, builds software for businesses, schools, students and entrepreneurs in Zambia and beyond.",
  },
  {
    title: "Verified before listed",
    body: "A venture or product appears here only once its ownership and relationship to DevGen Ventures are confirmed. Work in progress is labelled as such.",
  },
];

export default function DevegenHome() {
  const theme = useTheme();
  const band = theme.custom.band;
  const reduceMotion = useReducedMotion();
  const { data: services } = useFetch(() => apiClient.get("/services").then((r) => r.data), []);
  const { data: identity } = useFetch(() => apiClient.get("/site-settings/identity").then((r) => r.data), []);
  const { data: about } = useFetch(() => apiClient.get("/site-settings/about").then((r) => r.data), []);
  const fade = (delay) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: theme.custom.motion.easeOut },
  });

  return (
    <>
      <Helmet titleTemplate="%s">
        <title>DevGen Ventures — Building ideas into meaningful ventures</title>
        <meta name="description" content="DevGen Ventures is an umbrella business brand for technology services, products and future ventures, founded by Steven Kayelu." />
      </Helmet>

      {/* HERO */}
      <Band aria-labelledby="dv-hero" sx={{ pt: { xs: 6, md: 11 }, pb: { xs: 7, md: 11 } }}>
        <Constellation />
        <Container maxWidth="lg" sx={{ position: "relative", px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "grid", gap: { xs: 5, md: 8 }, gridTemplateColumns: { xs: "1fr", md: "1.25fr 0.85fr" }, alignItems: "end" }}>
            <Box sx={{ minWidth: 0 }}>
              <motion.div {...fade(0)}>
                <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.75rem", letterSpacing: "0.14em", color: band.accent, mb: { xs: 2.5, md: 3.5 } }}>
                  UMBRELLA BUSINESS BRAND
                </Typography>
              </motion.div>
              <HeadlineReveal
                id="dv-hero"
                lines={["Building ideas", <>into <Box component="em" sx={{ color: band.accent }}>meaningful</Box></>, "ventures."]}
                sx={{ fontFamily: theme.custom.fontSerif, fontWeight: 400, fontSize: theme.custom.displayScale.size, lineHeight: theme.custom.displayScale.lineHeight, letterSpacing: theme.custom.displayScale.letterSpacing }}
              />
              <motion.div {...fade(0.25)}>
                <Typography sx={{ mt: { xs: 3, md: 4 }, maxWidth: "50ch", color: band.muted, fontSize: { xs: "1.02rem", md: "1.12rem" } }}>
                  An umbrella for technology services, products and future businesses. Each one is listed only once its relationship to DevGen Ventures is verified.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: { xs: 4, md: 5 } }}>
                  <Button href="#ecosystem" size="large" endIcon={<FiArrowDown />} sx={{ bgcolor: band.accent, color: "#14243D", "&:hover": { bgcolor: band.accent, boxShadow: `0 0 0 4px ${band.accent}40` } }}>
                    Explore the ecosystem
                  </Button>
                  <Button component={NavLink} to="/contact?type=partnership" size="large" variant="outlined" sx={{ color: band.ink, borderColor: band.line, "&:hover": { borderColor: band.ink } }}>
                    Partner with us
                  </Button>
                </Stack>
              </motion.div>
            </Box>

            <motion.div {...fade(0.35)} style={{ minWidth: 0 }}>
              <Box component="ol" aria-label="Venture index" sx={{ listStyle: "none", m: 0, p: 0, borderTop: `1px solid ${band.line}` }}>
                {INDEX.map((n) => (
                  <Box component="li" key={n.id} sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 2, py: 1.75, borderBottom: `1px solid ${band.line}` }}>
                    <span>
                      <Box component="b" sx={{ display: "block", fontWeight: 600 }}>{n.name}</Box>
                      <Box component="span" sx={{ color: band.muted, fontSize: "0.88rem" }}>
                        {n.detail}
                      </Box>
                    </span>
                    <Box component="small" sx={{ alignSelf: "center", fontFamily: theme.custom.fontMono, fontSize: "0.7rem", letterSpacing: "0.08em", color: band.muted, textTransform: "uppercase" }}>
                      {n.label}
                    </Box>
                  </Box>
                ))}
              </Box>
            </motion.div>
          </Box>
        </Container>
      </Band>

      {/* STORY */}
      <Container maxWidth="lg" component="section" aria-labelledby="dv-story" sx={{ py: { xs: 8, md: 13 }, px: { xs: 2, sm: 3 } }}>
        <SectionHeading id="dv-story" eyebrow="What DevGen Ventures represents" title="One name for the businesses an idea can grow into." />
        <Box sx={{ display: "grid", gap: { xs: 0, md: 5 }, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
          {STORY.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.07}>
              <Box sx={{ borderTop: 2, borderColor: "text.primary", pt: 2, pb: { xs: 3.5, md: 0 } }}>
                <Typography variant="h4" component="h3" sx={{ mb: 1 }}>{s.title}</Typography>
                <Typography color="text.secondary">{s.body}</Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>

      {/* ECOSYSTEM */}
      <Box component="section" id="ecosystem" aria-labelledby="dv-eco" sx={{ bgcolor: theme.custom.elevatedBg, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <SectionHeading
            id="dv-eco"
            eyebrow="The ecosystem"
            title="How the businesses connect."
            lede="Select any organisation to see what it is, where it lives and how its relationship is verified. Line styles show the difference: solid is verified, dashed is the founder link, dotted is awaiting confirmation."
          />
          <Reveal><EcosystemMap /></Reveal>
        </Container>
      </Box>

      {/* DEVGEN SOLUTIONS FEATURE */}
      <Container maxWidth="lg" component="section" aria-labelledby="dv-ds" sx={{ py: { xs: 8, md: 13 }, px: { xs: 2, sm: 3 } }}>
        <Reveal>
          <Box
            sx={{
              borderRadius: `${theme.custom.radii.xl}px`, overflow: "hidden", color: "#EEF4FC", bgcolor: "#0F3566",
              backgroundImage: "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)",
              backgroundSize: "28px 28px", p: { xs: 3, sm: 4, md: 6 },
              display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, alignItems: "center",
            }}
          >
            <Box>
              <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.72rem", letterSpacing: "0.14em", color: theme.custom.copper }}>OPERATING BRAND</Typography>
              <Typography id="dv-ds" component="h2" sx={{ mt: 1.5, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 3rem)" }}>
                DevGen Solutions LTD
              </Typography>
              <Typography sx={{ mt: 2, color: "#A8C1E2", maxWidth: "46ch" }}>
                Business systems, web and mobile applications and IT support, scoped clearly and delivered in visible stages.
              </Typography>
              <Button component={NavLink} to="/solutions" endIcon={<FiArrowRight />} size="large" sx={{ mt: 3.5, bgcolor: "#FFFFFF", color: "#0F3566", "&:hover": { bgcolor: "#FFFFFF", boxShadow: "0 0 0 4px rgba(255,255,255,.2)" } }}>
                Visit DevGen Solutions
              </Button>
            </Box>
            <Box component="ul" aria-label="Services" sx={{ listStyle: "none", m: 0, p: 0, border: "1px solid rgba(255,255,255,.25)", borderRadius: 1.5, bgcolor: "rgba(8,30,60,.5)" }}>
              {(services?.items || []).slice(0, 5).map((s, i) => (
                <Box component="li" key={s.id} sx={{ display: "grid", gridTemplateColumns: "2.5rem 1fr", gap: 1, px: 2, py: 1.5, borderBottom: "1px dashed rgba(255,255,255,.16)", "&:last-child": { borderBottom: 0 } }}>
                  <Box component="span" sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.75rem", color: theme.custom.copper, pt: 0.25 }}>S-{String(i + 1).padStart(2, "0")}</Box>
                  <span>{s.title}</span>
                </Box>
              ))}
              {!services && <Box component="li" sx={{ p: 2, color: "#A8C1E2" }}>Loading services…</Box>}
            </Box>
          </Box>
        </Reveal>
      </Container>

      {/* FOUNDER */}
      <Container maxWidth="lg" component="section" aria-labelledby="dv-founder" sx={{ pb: { xs: 8, md: 12 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "grid", gap: { xs: 3, md: 8 }, gridTemplateColumns: { xs: "1fr", md: "0.8fr 1.2fr" }, borderTop: 1, borderColor: "divider", pt: { xs: 5, md: 8 } }}>
          <SectionHeading id="dv-founder" eyebrow="Founder" title={identity?.name || "Steven Kayelu"} sx={{ mb: 0 }} />
          <Reveal>
            {about?.mission && (
              <Typography component="blockquote" sx={{ m: 0, fontFamily: theme.custom.fontSerif, fontSize: { xs: "1.35rem", md: "1.7rem" }, lineHeight: 1.35 }}>
                “{about.mission}”
              </Typography>
            )}
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              {[identity?.role, identity?.location].filter(Boolean).join(" · ")}
            </Typography>
            <Button component="a" href={siteHref("steven")} endIcon={<FiArrowUpRight />} variant="outlined" sx={{ mt: 3 }}>
              Steven's portfolio
            </Button>
          </Reveal>
        </Box>
      </Container>

      {/* PARTNERSHIP CTA */}
      <Band aria-labelledby="dv-cta" sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1.3fr auto" }, alignItems: "end" }}>
          <Box>
            <Typography id="dv-cta" component="h2" sx={{ fontFamily: theme.custom.fontSerif, fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 3rem)", lineHeight: 1.1, maxWidth: "20ch" }}>
              Have an idea worth building together?
            </Typography>
            <Typography sx={{ mt: 2, color: band.muted, maxWidth: "52ch" }}>
              DevGen Ventures welcomes partnership, collaboration and venture conversations. Tell us what you have in mind.
            </Typography>
          </Box>
          <Button component={NavLink} to="/contact?type=partnership" size="large" endIcon={<FiArrowRight />} sx={{ bgcolor: band.accent, color: "#14243D", justifySelf: { md: "end" }, "&:hover": { bgcolor: band.accent, boxShadow: `0 0 0 4px ${band.accent}40` } }}>
            Start a conversation
          </Button>
        </Container>
      </Band>
    </>
  );
}
