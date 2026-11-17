import { Helmet } from "react-helmet-async";
import { Container, Typography, Grid, Skeleton, Button, useTheme } from "@mui/material";
import Reveal from "../../components/common/Reveal";
import TestimonialCard from "../../components/common/TestimonialCard";
import EmptyState from "../../components/common/EmptyState";
import { NavLink } from "react-router-dom";
import { FiMessageSquare, FiArrowRight } from "react-icons/fi";
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
            <Grid item xs={12}>
              <EmptyState
                icon={FiMessageSquare}
                title="Client testimonials will appear here."
                actions={[
                  <Button key="work" component={NavLink} to="/projects" variant="contained" endIcon={<FiArrowRight />}>See selected work</Button>,
                  <Button key="contact" component={NavLink} to="/contact" variant="outlined">Get in touch</Button>,
                ]}
              >
                <Typography>
                  Every testimonial here comes from someone we actually worked with and is published only with their written consent,
                  so they're added as clients respond rather than all at once.
                </Typography>
              </EmptyState>
            </Grid>
          )}
        </Grid>
      </Container>
    </>
  );
}
