import { Container, Typography, Chip, Stack, Skeleton, useTheme } from "@mui/material";
import Reveal from "../../../components/common/Reveal";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";

export default function Technologies() {
  const theme = useTheme();
  const { data: technologies, loading } = useFetch(
    () => apiClient.get("/site-settings/technologies").then((r) => r.data),
    []
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, sm: 8, md: 10 }, px: { xs: 2, sm: 3 } }}>
      <Reveal>
        <Typography
          variant="caption"
          sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1, fontSize: "0.75rem" }}
        >
          TECH STACK
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
          Tools I reach for.
        </Typography>
      </Reveal>

      <Stack direction="row" flexWrap="wrap" gap={{ xs: 1, sm: 1.25 }}>
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={72} height={30} sx={{ borderRadius: 999 }} />
          ))}
        {!loading &&
          (technologies || []).map((tech, idx) => (
            <Reveal key={tech} delay={idx * 0.03}>
              <Chip
                label={tech}
                variant="outlined"
                sx={{
                  fontFamily: theme.custom.fontMono,
                  borderColor: theme.palette.divider,
                  px: 1,
                  fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                  height: { xs: 28, sm: 32 },
                  "&:hover": { borderColor: theme.palette.primary.main, color: theme.palette.primary.main },
                }}
              />
            </Reveal>
          ))}
      </Stack>
    </Container>
  );
}
