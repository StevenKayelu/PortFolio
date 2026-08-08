import { Helmet } from "react-helmet-async";
import { Container, Typography, Box, Skeleton, useTheme } from "@mui/material";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function Gallery() {
  const theme = useTheme();
  const { data, loading } = useFetch(
    () => apiClient.get("/gallery", { params: { pageSize: 100 } }).then((r) => r.data),
    []
  );
  const items = data?.items || [];

  return (
    <>
      <Helmet>
        <title>Gallery — Your Name</title>
        <meta name="description" content="Photos from talks, events, and behind the scenes." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            GALLERY
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 5, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Moments.
          </Typography>
        </Reveal>

        <Box sx={{ columnCount: { xs: 1, sm: 2, md: 3 }, columnGap: "16px" }}>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ breakInside: "avoid", mb: 2 }}><Skeleton variant="rounded" height={180 + (i % 3) * 40} /></Box>
            ))}

          {!loading &&
            items.map((item, idx) => (
              <Reveal key={item.id} delay={idx * 0.06} style={{ breakInside: "avoid", marginBottom: 16 }}>
                <Box sx={{ borderRadius: `${theme.custom.radii.lg}px`, border: `1px solid ${theme.palette.divider}`, overflow: "hidden" }}>
                  <Box
                    sx={{
                      height: 140 + (idx % 3) * 60,
                      background: item.imageUrl ? `url(${item.imageUrl}) center/cover` : theme.custom.gradient,
                    }}
                  />
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.category}</Typography>
                  </Box>
                </Box>
              </Reveal>
            ))}
        </Box>
      </Container>
    </>
  );
}
