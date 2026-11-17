import { Helmet } from "react-helmet-async";
import { Box, Container, Typography, Stack, Button, Skeleton, Chip, useTheme } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Band from "../../components/brand/Band";
import HeadlineReveal from "../../components/common/HeadlineReveal";
import SectionHeading from "../../components/common/SectionHeading";
import Reveal from "../../components/common/Reveal";
import TestimonialCard from "../../components/common/TestimonialCard";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";
import { siteHref } from "../../brand/brands";

const QUOTE_STEPS = [
  { title: "Choose a service", detail: "Business system, web app, mobile app or IT support" },
  { title: "Describe the project", detail: "Goals, users, timeline and an optional budget" },
  { title: "Contact details", detail: "Only what we need to reply, with a privacy notice" },
];

// Proposed delivery process — editable copy, shown as a real sequence.
const PROCESS = [
  { title: "Discover", body: "A short call to understand the problem, the people who will use the software and what success looks like." },
  { title: "Scope & quote", body: "A written scope with deliverables, milestones and price, so you know what you are agreeing to before work starts." },
  { title: "Build in stages", body: "Working software at each milestone. You review real screens, not status reports." },
  { title: "Launch & support", body: "Deployment, handover and documentation, with support options after launch." },
];

function ServiceRow({ service, index }) {
  const theme = useTheme();
  return (
    <Box
      component="li"
      sx={{
        display: "grid", gap: { xs: 1, sm: 3 }, alignItems: "baseline",
        gridTemplateColumns: { xs: "1fr", sm: "4.5rem 1fr auto" },
        py: { xs: 2.5, md: 3 }, borderBottom: 1, borderColor: "divider",
      }}
    >
      <Box component="span" sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.78rem", color: theme.custom.accentText }}>
        S-{String(index + 1).padStart(2, "0")}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h3">{service.title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: "60ch" }}>{service.description}</Typography>
      </Box>
      <Box component="span" sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.8rem", color: "text.secondary", whiteSpace: "nowrap" }}>
        {service.startingPrice ? `From $${Number(service.startingPrice).toLocaleString()}` : "Custom pricing"}
      </Box>
    </Box>
  );
}

export default function SolutionsHome() {
  const theme = useTheme();
  const band = theme.custom.band;
  const reduceMotion = useReducedMotion();
  const { data: services, loading: loadingServices, error: servicesError } = useFetch(() => apiClient.get("/services").then((r) => r.data), []);
  const { data: testimonials } = useFetch(() => apiClient.get("/testimonials", { params: { brand: "solutions" } }).then((r) => r.data), []);
  const { data: projects } = useFetch(() => apiClient.get("/projects", { params: { featuredOnly: "true", pageSize: 3 } }).then((r) => r.data), []);
  const fade = (delay) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: theme.custom.motion.easeOut },
  });

  return (
    <>
      <Helmet titleTemplate="%s">
        <title>DevGen Solutions — Software that runs your operations</title>
        <meta name="description" content="DevGen Solutions LTD builds business systems, web and mobile applications and provides IT support. Request a quote." />
      </Helmet>

      {/* HERO */}
      <Band grid aria-labelledby="ds-hero" sx={{ pt: { xs: 6, md: 11 }, pb: { xs: 7, md: 11 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "grid", gap: { xs: 5, md: 8 }, gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.9fr" }, alignItems: "center" }}>
            <Box sx={{ minWidth: 0 }}>
              <motion.div {...fade(0)}>
                <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.75rem", letterSpacing: "0.14em", color: band.accent, mb: { xs: 2.5, md: 3.5 } }}>
                  DEVGEN SOLUTIONS LTD · TECHNOLOGY SERVICES
                </Typography>
              </motion.div>
              <HeadlineReveal
                id="ds-hero"
                lines={["Software that runs", "your operations."]}
                sx={{ fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.02, fontSize: "clamp(2.4rem, 1.5rem + 4.2vw, 4.6rem)" }}
              />
              <motion.div {...fade(0.25)}>
                <Typography sx={{ mt: { xs: 3, md: 4 }, maxWidth: "50ch", color: band.muted, fontSize: { xs: "1.02rem", md: "1.12rem" } }}>
                  Business systems, web and mobile applications and IT support, scoped clearly and delivered in visible stages.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: { xs: 4, md: 5 } }}>
                  <Button component={NavLink} to="/contact?type=quote" size="large" endIcon={<FiArrowRight />} sx={{ bgcolor: "#FFFFFF", color: "#0F3566", "&:hover": { bgcolor: "#FFFFFF", boxShadow: "0 0 0 4px rgba(255,255,255,.2)" } }}>
                    Request a quote
                  </Button>
                  <Button href="#process" size="large" variant="outlined" sx={{ color: band.ink, borderColor: "rgba(255,255,255,.35)", "&:hover": { borderColor: band.ink } }}>
                    How we work
                  </Button>
                </Stack>
              </motion.div>
            </Box>

            <motion.div {...fade(0.35)} style={{ minWidth: 0 }}>
              <Box sx={{ border: "1px solid rgba(255,255,255,.28)", borderRadius: 1.5, bgcolor: "rgba(8,30,60,.6)", backdropFilter: "blur(2px)" }}>
                <Stack direction="row" justifyContent="space-between" gap={1} sx={{ px: 2, py: 1.5, borderBottom: "1px dashed rgba(255,255,255,.25)", fontFamily: theme.custom.fontMono, fontSize: "0.7rem", letterSpacing: "0.08em", color: band.muted }}>
                  <span>QUOTE REQUEST</span><span>3 STEPS</span>
                </Stack>
                <Box component="ol" sx={{ listStyle: "none", m: 0, px: 2, py: 0.5 }}>
                  {QUOTE_STEPS.map((s, i) => (
                    <Box component="li" key={s.title} sx={{ display: "grid", gridTemplateColumns: "2rem 1fr", gap: 1, py: 1.5, borderBottom: "1px dashed rgba(255,255,255,.14)", "&:last-child": { borderBottom: 0 } }}>
                      <Box component="span" sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.78rem", color: band.accent, pt: 0.2 }}>0{i + 1}</Box>
                      <span>
                        {s.title}
                        <Box component="span" sx={{ display: "block", color: band.muted, fontSize: "0.84rem" }}>{s.detail}</Box>
                      </span>
                    </Box>
                  ))}
                </Box>
              </Box>
            </motion.div>
          </Box>
        </Container>
      </Band>

      {/* SERVICES */}
      <Container maxWidth="lg" component="section" id="services" aria-labelledby="ds-services" sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3 } }}>
        <SectionHeading id="ds-services" eyebrow="Service catalogue" title="What we build and support." lede="Prices are starting points. Every engagement is scoped in writing before work begins." />
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, borderTop: 2, borderColor: "text.primary" }}>
          {loadingServices && Array.from({ length: 4 }).map((_, i) => (
            <Box component="li" key={i} sx={{ py: 3, borderBottom: 1, borderColor: "divider" }}><Skeleton width="40%" height={28} /><Skeleton width="70%" /></Box>
          ))}
          {servicesError && (
            <Box component="li" sx={{ py: 3, color: "text.secondary" }}>
              Services could not be loaded right now. Refresh the page, or <NavLink to="/contact?type=quote">ask us directly</NavLink>.
            </Box>
          )}
          {(services?.items || []).map((s, i) => <ServiceRow key={s.id} service={s} index={i} />)}
        </Box>
        <Button component={NavLink} to="/solutions/services" endIcon={<FiArrowRight />} sx={{ mt: 3, px: 0, "&:hover": { bgcolor: "transparent" } }}>
          Service details
        </Button>
      </Container>

      {/* PROCESS */}
      <Box component="section" id="process" aria-labelledby="ds-process" sx={{ bgcolor: theme.custom.elevatedBg, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <SectionHeading id="ds-process" eyebrow="Delivery process" title="Four stages, each with something you can see." />
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: { xs: 0, md: 3 }, gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, position: "relative" }}>
            {PROCESS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.07}>
                <Box component="li" sx={{ position: "relative", pl: { xs: 4, md: 0 }, pt: { md: 4 }, pb: { xs: 3.5, md: 0 } }}>
                  {/* connector: vertical on phones, horizontal on desktop */}
                  <Box aria-hidden="true" sx={{
                    position: "absolute", bgcolor: "divider",
                    left: { xs: 7, md: 0 }, top: { xs: 18, md: 7 },
                    width: { xs: 2, md: "calc(100% + 24px)" }, height: { xs: "100%", md: 2 },
                    display: i === PROCESS.length - 1 ? { xs: "none", md: "none" } : "block",
                  }} />
                  <Box aria-hidden="true" sx={{ position: "absolute", left: 0, top: { xs: 4, md: 0 }, width: 16, height: 16, borderRadius: "50%", border: 2, borderColor: "primary.main", bgcolor: theme.custom.elevatedBg }} />
                  <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.72rem", color: theme.custom.accentText, letterSpacing: "0.1em" }}>STAGE {i + 1}</Typography>
                  <Typography variant="h4" component="h3" sx={{ mt: 0.5, mb: 1 }}>{p.title}</Typography>
                  <Typography color="text.secondary" variant="body2">{p.body}</Typography>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* WORK */}
      <Container maxWidth="lg" component="section" aria-labelledby="ds-work" sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3 } }}>
        <SectionHeading
          id="ds-work"
          eyebrow="Selected work"
          title="Built by our founder."
          lede="These projects were built by Steven Kayelu. Company case studies will be added here once client permission and project ownership are confirmed."
        />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
          {(projects?.items || []).map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.07}>
              <Box
                component={NavLink}
                to={`/solutions/work/${p.slug}`}
                sx={{
                  display: "grid", gap: 1.25, height: "100%", p: 2.5, textDecoration: "none", color: "text.primary",
                  border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.lg}px`, bgcolor: "background.paper",
                  transition: "border-color 150ms, transform 220ms",
                  "&:hover": { borderColor: "primary.main", transform: { sm: "translateY(-3px)" } },
                  "&:hover .arrow": { transform: "translate(2px,-2px)" },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.68rem", letterSpacing: "0.1em", color: "text.secondary" }}>
                    {(p.category?.name || "Project").toUpperCase()} · {p.status?.replace("_", " ")}
                  </Typography>
                  <Box component={FiArrowUpRight} className="arrow" aria-hidden="true" sx={{ transition: "transform 150ms" }} />
                </Stack>
                <Typography variant="h4" component="h3">{p.title}</Typography>
                <Typography variant="body2" color="text.secondary">{p.summary}</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.5 }}>
                  {(p.technologies || []).slice(0, 4).map(({ technology }) => (
                    <Chip key={technology.name} label={technology.name} size="small" variant="outlined" sx={{ fontSize: "0.68rem" }} />
                  ))}
                </Stack>
              </Box>
            </Reveal>
          ))}
        </Box>
        <Button component="a" href={siteHref("steven", "/projects")} endIcon={<FiArrowUpRight />} sx={{ mt: 3, px: 0, "&:hover": { bgcolor: "transparent" } }}>
          Full portfolio on stevenkayelu.online
        </Button>
      </Container>

      {/* CLIENT TESTIMONIALS: verified, consented; hidden until there are any */}
      {testimonials?.length > 0 && (
        <Container maxWidth="lg" component="section" aria-labelledby="ds-clients" sx={{ pb: { xs: 8, md: 12 }, px: { xs: 2, sm: 3 } }}>
          <SectionHeading id="ds-clients" eyebrow="From our clients" title="In their words." lede="Every testimonial comes from a client we worked with and is published with their consent." />
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
            {testimonials.slice(0, 4).map((t, i) => (
              <Reveal key={t.id} delay={i * 0.07} style={{ height: "100%" }}><TestimonialCard t={t} projectBase="/solutions/work" /></Reveal>
            ))}
          </Box>
        </Container>
      )}

      {/* QUOTE CTA */}
      <Band grid aria-labelledby="ds-cta" sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1.3fr auto" }, alignItems: "end" }}>
          <Box>
            <Typography id="ds-cta" component="h2" sx={{ fontWeight: 700, letterSpacing: "-0.03em", fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 3rem)", lineHeight: 1.08, maxWidth: "20ch" }}>
              Tell us what you need built.
            </Typography>
            <Typography sx={{ mt: 2, color: band.muted, maxWidth: "52ch" }}>
              A quote request takes a few minutes. You will hear back with questions or a scoped proposal.
            </Typography>
          </Box>
          <Button component={NavLink} to="/contact?type=quote" size="large" endIcon={<FiArrowRight />} sx={{ justifySelf: { md: "end" }, bgcolor: "#FFFFFF", color: "#0F3566", "&:hover": { bgcolor: "#FFFFFF", boxShadow: "0 0 0 4px rgba(255,255,255,.2)" } }}>
            Request a quote
          </Button>
        </Container>
      </Band>
    </>
  );
}
