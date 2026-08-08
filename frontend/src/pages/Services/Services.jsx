import { Helmet } from "react-helmet-async";
import { Container, Typography, Grid, Card, CardContent, Button, Stack, Skeleton, useTheme } from "@mui/material";
import { FiArrowRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function Services() {
  const theme = useTheme();
  const { data, loading } = useFetch(() => apiClient.get("/services").then((r) => r.data), []);
  const services = data?.items || [];

  return (
    <>
      <Helmet>
        <title>Services — Your Name</title>
        <meta name="description" content="Web development, software development, API design, and consultation services." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            SERVICES
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 2, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Ways to work together.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mb: 6 }}>
            Fixed-scope engagements or ongoing consultation — pricing below is a starting point, scoped precisely after a short discovery call.
          </Typography>
        </Reveal>

        <Grid container spacing={3}>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} key={i}><Skeleton variant="rounded" height={180} /></Grid>
            ))}

          {!loading &&
            services.map((service, idx) => (
              <Grid item xs={12} sm={6} key={service.slug}>
                <Reveal delay={idx * 0.06} style={{ height: "100%" }}>
                  <Card elevation={0} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <Typography variant="h4" sx={{ mb: 1 }}>{service.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flex: 1 }}>{service.description}</Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontFamily: theme.custom.fontMono, color: "primary.main" }}>
                          {service.startingPrice ? `From $${Number(service.startingPrice).toLocaleString()}` : "Custom pricing"}
                        </Typography>
                        <Button component={NavLink} to="/contact" endIcon={<FiArrowRight />} size="small">
                          Inquire
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
            ))}
        </Grid>
      </Container>
    </>
  );
}
