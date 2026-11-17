import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Box, Container, Typography, Stack, Button, ToggleButton, ToggleButtonGroup, useTheme } from "@mui/material";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import SectionHeading from "../../components/common/SectionHeading";
import { useEcosystem } from "../../brand/useEcosystem";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "ok", label: "Operating", test: (n) => n.kind === "service" && n.status.tone !== "open" },
  { key: "pending", label: "Under review", test: (n) => n.kind === "product" },
  { key: "open", label: "Open slots", test: (n) => n.kind === "slot" },
];

export default function Ventures() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState("all");
  const { nodes } = useEcosystem();
  const ENTRIES = nodes.filter((n) => n.id !== "sk" && n.id !== "dv");
  const visible = ENTRIES.filter(FILTERS.find((f) => f.key === filter).test);
  const toneColor = { ok: theme.palette.success.main, pending: theme.palette.warning.main, open: theme.palette.primary.main };

  return (
    <>
      <Helmet>
        <title>Ventures — Devegen Ventures</title>
        <meta name="description" content="The businesses and products presented under the Devegen Ventures umbrella, with their verification status." />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, sm: 3 } }}>
        <SectionHeading
          eyebrow="Venture directory"
          title="The businesses under the Devegen umbrella."
          lede="Each entry shows its current status. Products stay under review until their ownership and display permission are confirmed."
        />

        <ToggleButtonGroup
          exclusive
          value={filter}
          onChange={(_, v) => v && setFilter(v)}
          aria-label="Filter ventures by status"
          sx={{ display: { xs: "grid", sm: "inline-flex" }, gridTemplateColumns: "repeat(2, 1fr)", width: { xs: "100%", sm: "auto" }, mb: 4, "& .MuiToggleButton-root": { px: 2, minHeight: 44, textTransform: "none", fontWeight: 600, borderLeft: { xs: 1, sm: undefined }, borderColor: "divider", ml: { xs: "0 !important", sm: undefined } } }}
        >
          {FILTERS.map((f) => <ToggleButton key={f.key} value={f.key}>{f.label}</ToggleButton>)}
        </ToggleButtonGroup>

        <Box component="ul" aria-live="polite" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((n) => (
              <Box
                component={motion.li}
                layout={!reduceMotion}
                key={n.id}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                sx={{
                  border: 1, borderColor: "divider", borderStyle: n.kind === "slot" ? "dashed" : "solid",
                  borderRadius: `${theme.custom.radii.lg}px`, bgcolor: n.kind === "slot" ? "transparent" : "background.paper",
                  p: 2.5, display: "grid", gap: 1.25, alignContent: "start",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.68rem", letterSpacing: "0.1em", color: "text.secondary", textTransform: "uppercase" }}>
                    {n.short}
                  </Typography>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontFamily: theme.custom.fontMono, fontSize: "0.68rem", color: toneColor[n.status.tone] }}>
                    <Box component="span" aria-hidden="true" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "currentColor" }} />
                    {n.status.label}
                  </Box>
                </Stack>
                <Typography variant="h3" component="h2" sx={{ fontSize: "1.45rem" }}>{n.name}</Typography>
                <Typography color="text.secondary" variant="body2">{n.visit}</Typography>
                {n.link?.site === "devegen" && (
                  <Button component={NavLink} to={n.link.path} endIcon={<FiArrowRight />} sx={{ justifySelf: "start", px: 0, mt: 0.5, "&:hover": { bgcolor: "transparent" } }}>
                    {n.link.label}
                  </Button>
                )}
              </Box>
            ))}
          </AnimatePresence>
        </Box>
        {visible.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4 }}>Nothing in this category yet.</Typography>
        )}
      </Container>
    </>
  );
}
