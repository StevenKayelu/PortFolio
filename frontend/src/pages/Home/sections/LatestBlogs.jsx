import { Box, Container, Typography, Grid, Stack, Divider, Skeleton, useTheme } from "@mui/material";
import { NavLink } from "react-router-dom";
import Reveal from "../../../components/common/Reveal";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";

export default function LatestBlogs() {
  const theme = useTheme();
  const { data, loading } = useFetch(
    () => apiClient.get("/blog", { params: { pageSize: 3 } }).then((r) => r.data),
    []
  );
  const posts = data?.items || [];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, sm: 8, md: 10 }, px: { xs: 2, sm: 3 } }}>
      <Reveal>
        <Typography
          variant="caption"
          sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1, fontSize: "0.75rem" }}
        >
          FROM THE BLOG
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
          Recent writing.
        </Typography>
      </Reveal>

      {loading && (
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={70} />
          ))}
        </Stack>
      )}

      {!loading && (
        <Stack divider={<Divider />} spacing={0}>
          {posts.map((post, idx) => (
            <Reveal key={post.slug} delay={idx * 0.08}>
              <Box
                component={NavLink}
                to={`/blog/${post.slug}`}
                sx={{
                  display: "block",
                  textDecoration: "none",
                  py: { xs: 2.5, sm: 3 },
                  "&:hover .post-title": { color: "primary.main" },
                }}
              >
                <Grid container spacing={{ xs: 0.5, sm: 2 }} alignItems="baseline">
                  <Grid item xs={12} sm={2}>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", fontSize: "0.75rem" }}
                    >
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <Typography
                      variant="h4"
                      className="post-title"
                      sx={{
                        color: "text.primary",
                        transition: "color .2s",
                        fontSize: "clamp(1.0625rem, 2.5vw + 0.4rem, 1.375rem)",
                        lineHeight: 1.3,
                        overflowWrap: "break-word",
                      }}
                    >
                      {post.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, fontSize: "0.875rem", lineHeight: 1.6, overflowWrap: "break-word" }}
                    >
                      {post.excerpt}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={2} sx={{ textAlign: { sm: "right" } }}>
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", fontSize: "0.75rem" }}
                    >
                      {post.readingTimeMins} min read
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Reveal>
          ))}
          {posts.length === 0 && <Typography color="text.secondary">No posts published yet.</Typography>}
        </Stack>
      )}
    </Container>
  );
}
