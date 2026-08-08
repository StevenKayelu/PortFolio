import { Helmet } from "react-helmet-async";
import { Container, Typography, Grid, Card, CardContent, Avatar, Stack, Box, Skeleton, useTheme } from "@mui/material";
import { FiStar } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
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
        <title>Testimonials — Your Name</title>
        <meta name="description" content="What clients and collaborators say." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            TESTIMONIALS
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 5, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Kind words.
          </Typography>
        </Reveal>

        <Grid container spacing={3}>
          {loading && Array.from({ length: 4 }).map((_, i) => <Grid item xs={12} md={6} key={i}><Skeleton variant="rounded" height={160} /></Grid>)}

          {!loading && (testimonials || []).map((t, idx) => (
            <Grid item xs={12} md={6} key={t.id}>
              <Reveal delay={idx * 0.1} style={{ height: "100%" }}>
                <Card elevation={0} sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <FiStar key={i} size={14} color={theme.palette.primary.main} fill={theme.palette.primary.main} />
                      ))}
                    </Stack>
                    <Typography variant="body1" sx={{ mb: 3, fontStyle: "italic" }}>"{t.content}"</Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.main", fontFamily: theme.custom.fontMono }}>{t.clientName.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.clientName}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.clientRole} · {t.clientCompany}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Reveal>
            </Grid>
          ))}

          {!loading && (testimonials || []).length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No testimonials published yet.</Typography></Grid>
          )}
        </Grid>
      </Container>
    </>
  );
}
