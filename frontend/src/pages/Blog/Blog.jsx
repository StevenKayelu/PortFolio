import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container, Typography, Stack, Divider, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton, Grid, Skeleton, useTheme,
} from "@mui/material";
import { FiSearch } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function Blog() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: categoriesData } = useFetch(
    () => apiClient.get("/blog/categories").then((r) => r.data),
    []
  );
  

  const { data, loading } = useFetch(
    () =>
      apiClient
        .get("/blog", {
          params: { search: search || undefined, category: category === "all" ? undefined : category, pageSize: 30 },
        })
        .then((r) => r.data),
    [search, category]
  );

  const posts = data?.items || [];
console.log("posts", posts);
  return (
    <>
      <Helmet>
        <title>Blog — Your Name</title>
        <meta name="description" content="Writing on engineering, architecture, and building products." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            BLOG
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 4, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Writing.
          </Typography>
        </Reveal>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 4 }}>
          <ToggleButtonGroup exclusive size="small" value={category} onChange={(e, v) => v && setCategory(v)} sx={{ flexWrap: "wrap" }}>
            <ToggleButton value="all" sx={{ borderRadius: `${theme.custom.radii.pill}px !important`, textTransform: "none" }}>All</ToggleButton>
            {(categoriesData || []).map((c) => (
              <ToggleButton key={c.slug} value={c.slug} sx={{ borderRadius: `${theme.custom.radii.pill}px !important`, textTransform: "none", ml: 1 }}>
                {c.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            size="small"
            placeholder="Search articles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><FiSearch /></InputAdornment> }}
            sx={{ minWidth: 220 }}
          />
        </Stack>

        {loading && <Stack spacing={2}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="text" height={70} />)}</Stack>}

        {!loading && (
          <Stack divider={<Divider />} spacing={0}>
            {posts.map((post, idx) => (
              <Reveal key={post.slug} delay={idx * 0.06}>
                <NavLink to={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                  <Grid container spacing={2} alignItems="baseline" sx={{ py: 3, "&:hover .post-title": { color: "primary.main" } }}>
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
                </NavLink>
              </Reveal>
            ))}
            {posts.length === 0 && <Typography color="text.secondary" sx={{ py: 4 }}>No articles match that search.</Typography>}
          </Stack>
        )}
      </Container>
    </>
  );
}
