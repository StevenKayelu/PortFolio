import { Helmet } from "react-helmet-async";
import { Container, Typography, Box, Stack, Chip, Skeleton, useTheme } from "@mui/material";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

const typeLabels = {
  EMPLOYMENT: "Employment", INTERNSHIP: "Internship", FREELANCE: "Freelance",
  LEADERSHIP: "Leadership", VOLUNTEER: "Volunteer", INTERNET_CAFE: "Early Experience",
};

export default function Experience() {
  const theme = useTheme();
  const { data, loading } = useFetch(
    () => apiClient.get("/experience", { params: { pageSize: 50 } }).then((r) => r.data),
    []
  );
  const experience = data?.items || [];

  return (
    <>
      <Helmet>
        <title>Experience — Your Name</title>
        <meta name="description" content="Employment history, freelance work, and how it all started." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            EXPERIENCE
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 6, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            The full path.
          </Typography>
        </Reveal>

        {loading && <Stack spacing={4}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="text" height={90} />)}</Stack>}

        {!loading && (
          <Box sx={{ position: "relative", pl: 4 }}>
            <Box sx={{ position: "absolute", left: 7, top: 6, bottom: 6, width: "1px", bgcolor: theme.palette.divider }} />
            <Stack spacing={5}>
              {experience.map((e, idx) => (
                <Reveal key={e.id} delay={idx * 0.08}>
                  <Box sx={{ position: "relative" }}>
                    <Box
                      sx={{
                        position: "absolute", left: -33, top: 4, width: 12, height: 12, borderRadius: "50%",
                        bgcolor: "primary.main", border: `3px solid ${theme.palette.background.default}`,
                        boxShadow: `0 0 0 1px ${theme.palette.divider}`,
                      }}
                    />
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip label={typeLabels[e.type] || e.type} size="small" sx={{ fontFamily: theme.custom.fontMono }} />
                      <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
                        {new Date(e.startDate).getFullYear()} — {e.endDate ? new Date(e.endDate).getFullYear() : "Present"}
                      </Typography>
                    </Stack>
                    <Typography variant="h4">{e.title}</Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }} color="text.secondary">{e.organization}</Typography>
                    <Typography variant="body2" color="text.secondary">{e.description}</Typography>
                  </Box>
                </Reveal>
              ))}
            </Stack>
          </Box>
        )}
      </Container>
    </>
  );
}
