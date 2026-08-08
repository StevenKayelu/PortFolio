import { useEffect, useRef, useState } from "react";
import { Box, Container, Grid, Typography, Skeleton, useTheme } from "@mui/material";
import { motion, useInView } from "framer-motion";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";

function Counter({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  const numericMatch = value.match(/[\d.]+/);
  const numeric = numericMatch ? parseFloat(numericMatch[0]) : null;
  const suffix = numeric !== null ? value.replace(numericMatch[0], "") : "";

  useEffect(() => {
    if (!inView || numeric === null) {
      if (inView) setDisplay(value);
      return;
    }
    let frame;
    const duration = 1200;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(`${(numeric * progress).toFixed(numeric % 1 !== 0 ? 2 : 0)}${suffix}`);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, numeric, suffix, value]);

  return <span ref={ref}>{display}</span>;
}

export default function Stats() {
  const theme = useTheme();
  const { data: stats, loading } = useFetch(
    () => apiClient.get("/site-settings/stats").then((r) => r.data),
    []
  );

  return (
    <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
        <Grid container spacing={3}>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Skeleton variant="text" height={48} width="60%" />
                <Skeleton variant="text" height={20} width="80%" />
              </Grid>
            ))}
          {!loading &&
            (stats || []).map((s, idx) => (
              <Grid item xs={6} md={3} key={s.label}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                >
                  <Typography variant="h2" sx={{ fontFamily: theme.custom.fontMono, color: "primary.main" }}>
                    <Counter value={s.value} />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                </motion.div>
              </Grid>
            ))}
        </Grid>
      </Container>
    </Box>
  );
}
