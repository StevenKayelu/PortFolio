import { Box, Container, Typography, Grid, Skeleton, useTheme } from "@mui/material";
import Reveal from "../../../components/common/Reveal";
import TestimonialCard from "../../../components/common/TestimonialCard";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";

export default function Testimonials() {
  const theme = useTheme();
  const { data: testimonials, loading } = useFetch(
    () => apiClient.get("/testimonials", { params: { featuredOnly: "true" } }).then((r) => r.data),
    []
  );

  // An empty section reads as a broken page; hide it until real testimonials exist.
  if (!loading && !(testimonials || []).length) return null;

  return (
    <Box sx={{ bgcolor: "background.paper", py: { xs: 6, sm: 8, md: 10 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Reveal>
          <Typography
            variant="caption"
            sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1, fontSize: "0.75rem" }}
          >
            TESTIMONIALS
          </Typography>
          <Typography
            variant="h2"
            sx={{
              mt: 1,
              mb: { xs: 3, sm: 4 },
              fontSize: "clamp(1.375rem, 4vw + 0.5rem, 2.5rem)",
              lineHeight: 1.25,
            }}
          >
            What people say.
          </Typography>
        </Reveal>

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {loading &&
            Array.from({ length: 2 }).map((_, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Skeleton variant="rounded" height={160} />
              </Grid>
            ))}

          {!loading &&
            (testimonials || []).map((t, idx) => (
              <Grid item xs={12} md={6} key={t.id}>
                <Reveal delay={idx * 0.1} style={{ height: "100%" }}>
                  <TestimonialCard t={t} />
                </Reveal>
              </Grid>
            ))}
        </Grid>
      </Container>
    </Box>
  );
}
