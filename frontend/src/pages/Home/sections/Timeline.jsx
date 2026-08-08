import { Box, Container, Typography, Stack, Skeleton, useTheme } from "@mui/material";
import Reveal from "../../../components/common/Reveal";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";

export default function Timeline() {
  const theme = useTheme();
  const { data: timeline, loading } = useFetch(
    () => apiClient.get("/site-settings/timeline").then((r) => r.data),
    []
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 8, md: 10 } }}>
      <Reveal>
        <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
          CAREER TIMELINE
        </Typography>
        <Typography variant="h2" sx={{ mt: 1, mb: 5 }}>Where I've been.</Typography>
      </Reveal>

      {loading && <Stack spacing={4}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="text" height={60} />)}</Stack>}

      {!loading && (
        <Box sx={{ position: "relative", pl: 4 }}>
          <Box sx={{ position: "absolute", left: 7, top: 6, bottom: 6, width: "1px", bgcolor: theme.palette.divider }} />
          <Stack spacing={5}>
            {(timeline || []).map((item, idx) => (
              <Reveal key={item.title} delay={idx * 0.1}>
                <Box sx={{ position: "relative" }}>
                  <Box
                    sx={{
                      position: "absolute", left: -33, top: 4, width: 12, height: 12, borderRadius: "50%",
                      bgcolor: "primary.main", border: `3px solid ${theme.palette.background.default}`,
                      boxShadow: `0 0 0 1px ${theme.palette.divider}`,
                    }}
                  />
                  <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "primary.main" }}>
                    {item.year}
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 0.5 }}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.org}</Typography>
                </Box>
              </Reveal>
            ))}
          </Stack>
        </Box>
      )}
    </Container>
  );
}
