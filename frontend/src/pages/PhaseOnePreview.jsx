import { useEffect, useState } from "react";
import { Box, Container, Stack, Typography, Card, CardContent, Chip, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import ThemeSwitcher from "../components/ui/ThemeSwitcher";

const COMMAND = "whoami";
const RESOLVED = "Full-Stack Engineer · Available for select projects";

/** Types out `$ whoami` then resolves into the identity line — the
 * hero's signature moment, tying the terminal motif to the brand
 * without leaning on a generic gradient blob. */
function TerminalHero() {
  const theme = useTheme();
  const [typed, setTyped] = useState("");
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(COMMAND.slice(0, i));
      if (i === COMMAND.length) {
        clearInterval(interval);
        setTimeout(() => setResolved(true), 400);
      }
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        fontFamily: theme.custom.fontMono,
        fontSize: "1.05rem",
        color: theme.palette.text.secondary,
        display: "flex",
        alignItems: "center",
        gap: 1,
        minHeight: 32,
      }}
    >
      <span style={{ color: theme.palette.primary.main }}>$</span>
      <span>{typed}</span>
      {!resolved && <BlinkCursor />}
      {resolved && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: theme.custom.motion.base }}
          style={{ color: theme.palette.text.primary }}
        >
          → {RESOLVED}
        </motion.span>
      )}
    </Box>
  );
}

function BlinkCursor() {
  const theme = useTheme();
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
      style={{ width: 8, height: 18, background: theme.palette.primary.main, display: "inline-block" }}
    />
  );
}

const sampleCards = [
  { label: "Projects", value: "24", detail: "shipped to production" },
  { label: "Articles", value: "56", detail: "published on the blog" },
  { label: "Uptime", value: "99.98%", detail: "across client systems" },
];

export default function PhaseOnePreview() {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", transition: "background-color .3s" }}>
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 8 }}>
          <Chip
            label={theme.custom.label}
            size="small"
            sx={{ fontFamily: theme.custom.fontMono, bgcolor: "background.paper", border: `1px solid ${theme.palette.divider}` }}
          />
          <ThemeSwitcher />
        </Stack>

        <Box
          sx={{
            position: "relative",
            borderRadius: `${theme.custom.radii.xl}px`,
            p: { xs: 4, md: 8 },
            background: `${theme.custom.gradient}, ${theme.palette.background.paper}`,
            border: `1px solid ${theme.palette.divider}`,
            overflow: "hidden",
          }}
        >
          <TerminalHero />
          <Typography variant="h1" sx={{ mt: 3, mb: 2 }}>
            Design system online.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520 }}>
            This is Phase 1 — architecture, database schema, and the theme engine. Switch themes
            above; typography, color, cards, and the terminal accent all respond instantly, with
            nothing in the layout re-flowing.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4 }}>
          {sampleCards.map((c) => (
            <Card key={c.label} sx={{ flex: 1 }} elevation={0}>
              <CardContent>
                <Typography sx={{ fontFamily: theme.custom.fontMono }} color="text.secondary" variant="caption">
                  {c.label.toUpperCase()}
                </Typography>
                <Typography variant="h2" sx={{ my: 0.5 }}>
                  {c.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {c.detail}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
