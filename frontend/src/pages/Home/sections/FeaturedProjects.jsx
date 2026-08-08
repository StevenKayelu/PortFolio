import { Box, Container, Typography, Grid, Card, CardContent, Chip, Stack, Button, Skeleton, useTheme } from "@mui/material";
import { FiArrowUpRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../../components/common/Reveal";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";

export default function FeaturedProjects() {
  const theme = useTheme();
  const { data, loading } = useFetch(
    () => apiClient.get("/projects", { params: { featuredOnly: "true", pageSize: 3 } }).then((r) => r.data),
    []
  );
  const projects = data?.items || [];

  return (
    <Box sx={{ bgcolor: "background.paper", py: { xs: 8, md: 10 } }}>
      <Container maxWidth="md">
        <Reveal>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 4 }}>
            <Box>
              <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
                FEATURED WORK
              </Typography>
              <Typography variant="h2" sx={{ mt: 1 }}>Selected projects.</Typography>
            </Box>
            <Button component={NavLink} to="/projects" endIcon={<FiArrowUpRight />} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
              View all
            </Button>
          </Stack>
        </Reveal>

        <Grid container spacing={3}>
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rounded" height={280} sx={{ borderRadius: `${theme.custom.radii.lg}px` }} />
              </Grid>
            ))}

          {!loading &&
            projects.map((project, idx) => (
              <Grid item xs={12} md={4} key={project.slug}>
                <Reveal delay={idx * 0.1} style={{ height: "100%" }}>
                  <Card
                    component={NavLink}
                    to={`/projects/${project.slug}`}
                    elevation={0}
                    sx={{
                      height: "100%", display: "flex", flexDirection: "column", textDecoration: "none", cursor: "pointer",
                      "&:hover": { transform: "translateY(-4px)", borderColor: theme.palette.primary.main },
                    }}
                  >
                    <Box
                      sx={{
                        height: 140,
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
              <Typography color="text.secondary">No featured projects yet — add some from the admin dashboard.</Typography>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
}
