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
    <Container maxWidth="md" sx={{ py: { xs: 8, md: 10 } }}>
      <Reveal>
        <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
          FROM THE BLOG
        </Typography>
        <Typography variant="h2" sx={{ mt: 1, mb: 4 }}>Recent writing.</Typography>
      </Reveal>

      {loading && (
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="text" height={70} />)}
        </Stack>
      )}

      {!loading && (
        <Stack divider={<Divider />} spacing={0}>
          {posts.map((post, idx) => (
            <Reveal key={post.slug} delay={idx * 0.08}>
              <Box
                component={NavLink}
                to={`/blog/${post.slug}`}
                sx={{ display: "block", textDecoration: "none", py: 3, "&:hover .post-title": { color: "primary.main" } }}
              >
                <Grid container spacing={2} alignItems="baseline">
                  <Grid item xs={12} sm={2}>
                    <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
                      {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="h4" className="post-title" sx={{ color: "text.primary", transition: "color .2s" }}>
                      {post.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{post.excerpt}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2} sx={{ textAlign: { sm: "right" } }}>
                    <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
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
