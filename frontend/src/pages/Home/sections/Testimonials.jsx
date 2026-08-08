import { Box, Container, Typography, Grid, Card, CardContent, Avatar, Stack, Skeleton, useTheme } from "@mui/material";
import { FiStar } from "react-icons/fi";
import Reveal from "../../../components/common/Reveal";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";

export default function Testimonials() {
  const theme = useTheme();
  const { data: testimonials, loading } = useFetch(
    () => apiClient.get("/testimonials", { params: { featuredOnly: "true" } }).then((r) => r.data),
    []
  );

  return (
    <Box sx={{ bgcolor: "background.paper", py: { xs: 6, sm: 8, md: 10 } }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
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
                  <Card elevation={0} sx={{ height: "100%" }}>
                    <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                      <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <FiStar key={i} size={14} color={theme.palette.primary.main} fill={theme.palette.primary.main} />
                        ))}
                      </Stack>
                      <Typography
                        variant="body1"
                        sx={{
                          mb: 3,
                          fontStyle: "italic",
                          fontSize: { xs: "0.9375rem", sm: "1rem" },
                          lineHeight: 1.6,
                          overflowWrap: "break-word",
                        }}
                      >
                        "{t.content}"
                      </Typography>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: "primary.main", fontFamily: theme.custom.fontMono, flexShrink: 0 }}>
                          {t.clientName.charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                            {t.clientName}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", overflowWrap: "break-word" }}
                          >
                            {t.clientRole} · {t.clientCompany}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
            ))}
        </Grid>
      </Container>
    </Box>
  );
}
