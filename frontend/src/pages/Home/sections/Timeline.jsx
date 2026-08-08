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
    <Container maxWidth="md" sx={{ py: { xs: 6, sm: 8, md: 10 }, px: { xs: 2, sm: 3 } }}>
      <Reveal>
        <Typography
          variant="caption"
          sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1, fontSize: "0.75rem" }}
        >
          CAREER TIMELINE
        </Typography>
        <Typography
          variant="h2"
          sx={{
            mt: 1,
            mb: { xs: 4, sm: 5 },
            fontSize: "clamp(1.375rem, 4vw + 0.5rem, 2.5rem)",
            lineHeight: 1.25,
          }}
        >
          Where I've been.
        </Typography>
      </Reveal>

      {loading && (
        <Stack spacing={4}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={60} />
          ))}
        </Stack>
      )}

      {!loading && (
        <Box sx={{ position: "relative", pl: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              position: "absolute",
              left: { xs: 6, sm: 7 },
              top: 6,
              bottom: 6,
              width: "1px",
              bgcolor: theme.palette.divider,
            }}
          />
          <Stack spacing={{ xs: 4, sm: 5 }}>
            {(timeline || []).map((item, idx) => (
              <Reveal key={item.title} delay={idx * 0.1}>
                <Box sx={{ position: "relative" }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: { xs: -26, sm: -33 },
                      top: 4,
                      width: { xs: 10, sm: 12 },
                      height: { xs: 10, sm: 12 },
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      border: `3px solid ${theme.palette.background.default}`,
                      boxShadow: `0 0 0 1px ${theme.palette.divider}`,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: theme.custom.fontMono, color: "primary.main", fontSize: "0.75rem" }}
                  >
                    {item.year}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      mt: 0.5,
                      fontSize: "clamp(1.0625rem, 2.5vw + 0.4rem, 1.375rem)",
                      lineHeight: 1.3,
                      overflowWrap: "break-word",
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.875rem", overflowWrap: "break-word" }}
                  >
                    {item.org}
                  </Typography>
                </Box>
              </Reveal>
            ))}
          </Stack>
        </Box>
      )}
    </Container>
  );
}
