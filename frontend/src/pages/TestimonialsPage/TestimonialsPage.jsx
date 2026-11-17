import { Helmet } from "react-helmet-async";
import { Container, Typography, Grid, Skeleton, useTheme } from "@mui/material";
import Reveal from "../../components/common/Reveal";
import TestimonialCard from "../../components/common/TestimonialCard";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function TestimonialsPage() {
  const theme = useTheme();
  const { data: testimonials, loading } = useFetch(
    () => apiClient.get("/testimonials").then((r) => r.data),
    []
  );

  return (
    <>
      <Helmet>
        <title>Testimonials</title>
        <meta name="description" content="Verified testimonials from clients, employers and collaborators, published with their consent." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            TESTIMONIALS
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 5, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            What people say.
          </Typography>
        </Reveal>

        <Grid container spacing={3}>
          {loading && Array.from({ length: 4 }).map((_, i) => <Grid item xs={12} md={6} key={i}><Skeleton variant="rounded" height={160} /></Grid>)}

          {!loading && (testimonials || []).map((t, idx) => (
            <Grid item xs={12} md={6} key={t.id}>
              <Reveal delay={idx * 0.1} style={{ height: "100%" }}>
                <TestimonialCard t={t} />
              </Reveal>
            </Grid>
          ))}

          {!loading && (testimonials || []).length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No testimonials published yet. Every testimonial here comes from someone we worked with and is published with their consent.</Typography></Grid>
          )}
        </Grid>
      </Container>
    </>
  );
}
