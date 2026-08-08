import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box, Container, Typography, Grid, Card, CardContent, Chip, Stack,
  TextField, InputAdornment, ToggleButtonGroup, ToggleButton, Skeleton, useTheme,
} from "@mui/material";
import { FiSearch } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function Projects() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: categoriesData } = useFetch(
    () => apiClient.get("/projects/categories").then((r) => r.data),
    []
  );

  const { data, loading } = useFetch(
    () =>
      apiClient
        .get("/projects", {
          params: { search: search || undefined, category: category === "all" ? undefined : category, pageSize: 50 },
        })
        .then((r) => r.data),
    [search, category]
  );

  const projects = data?.items || [];

  return (
    <>
      <Helmet>
        <title>Projects — Your Name</title>
        <meta name="description" content="A filterable portfolio of shipped projects, tech stacks, and outcomes." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            PORTFOLIO
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 4, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Projects.
          </Typography>
        </Reveal>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 4 }}>
          <ToggleButtonGroup exclusive size="small" value={category} onChange={(e, val) => val && setCategory(val)} sx={{ flexWrap: "wrap" }}>
            <ToggleButton value="all" sx={{ borderRadius: `${theme.custom.radii.pill}px !important`, textTransform: "none" }}>All</ToggleButton>
            {(categoriesData || []).map((c) => (
              <ToggleButton key={c.slug} value={c.slug} sx={{ borderRadius: `${theme.custom.radii.pill}px !important`, textTransform: "none", ml: 1 }}>
                {c.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><FiSearch /></InputAdornment> }}
            sx={{ minWidth: 220 }}
          />
        </Stack>

        <Grid container spacing={3}>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} key={i}><Skeleton variant="rounded" height={260} /></Grid>
            ))}

          {!loading &&
            projects.map((project, idx) => (
              <Grid item xs={12} sm={6} key={project.slug}>
                <Reveal delay={idx * 0.06} style={{ height: "100%" }}>
                  <Card
                    component={NavLink}
                    to={`/projects/${project.slug}`}
                    elevation={0}
                    sx={{
                      height: "100%", display: "flex", flexDirection: "column", textDecoration: "none",
                      "&:hover": { transform: "translateY(-4px)", borderColor: theme.palette.primary.main },
                    }}
                  >
                    <Box
                      sx={{
                        height: 130,
                        background: project.coverImage ? `url(${project.coverImage}) center/cover` : theme.custom.gradient,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                    <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <Typography variant="h4" sx={{ mb: 1 }}>{project.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>{project.summary}</Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {(project.technologies || []).map(({ technology }) => (
                          <Chip key={technology.name} label={technology.name} size="small" sx={{ fontFamily: theme.custom.fontMono, bgcolor: "background.default" }} />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
            ))}

          {!loading && projects.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary">No projects match that search.</Typography>
            </Grid>
          )}
        </Grid>
      </Container>
    </>
  );
}
