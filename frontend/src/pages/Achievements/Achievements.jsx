import { Helmet } from "react-helmet-async";
import { Container, Typography, Stack, Card, CardContent, Box, Skeleton, useTheme } from "@mui/material";
import { FiAward } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function Achievements() {
  const theme = useTheme();
  const { data, loading } = useFetch(
    () => apiClient.get("/achievements", { params: { pageSize: 50 } }).then((r) => r.data),
    []
  );
  const achievements = data?.items || [];

  return (
    <>
      <Helmet>
        <title>Achievements — Your Name</title>
        <meta name="description" content="Awards, recognitions, and milestones." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            ACHIEVEMENTS
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 5, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Milestones.
          </Typography>
        </Reveal>

        {loading && <Stack spacing={2}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={90} />)}</Stack>}

        <Stack spacing={2}>
          {!loading && achievements.map((a, idx) => (
            <Reveal key={a.id} delay={idx * 0.08}>
              <Card elevation={0}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ p: 1.25, borderRadius: `${theme.custom.radii.sm}px`, bgcolor: "background.paper", color: "primary.main" }}>
                      <FiAward size={20} />
                    </Box>
                    <Box>
                      <Typography variant="h4">{a.title}</Typography>
                      <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
                        {new Date(a.date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{a.description}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </Stack>
      </Container>
    </>
  );
}
