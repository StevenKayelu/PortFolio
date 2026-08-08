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
    <Box sx={{ bgcolor: "background.paper", py: { xs: 6, sm: 8, md: 10 } }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
        <Reveal>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "baseline" }}
            spacing={{ xs: 1.5, sm: 0 }}
            sx={{ mb: { xs: 3, sm: 4 } }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: theme.custom.fontMono,
                  color: "text.secondary",
                  letterSpacing: 1,
                  fontSize: "0.75rem",
                }}
              >
                FEATURED WORK
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  mt: 1,
                  fontSize: "clamp(1.375rem, 4vw + 0.5rem, 2.5rem)",
                  lineHeight: 1.25,
                  overflowWrap: "break-word",
                }}
              >
                Selected projects.
              </Typography>
            </Box>
            <Button
              component={NavLink}
              to="/projects"
              endIcon={<FiArrowUpRight />}
              sx={{ display: { xs: "none", sm: "inline-flex" }, flexShrink: 0 }}
            >
              View all
            </Button>
          </Stack>

          {/* Mobile-only "view all" link, full width under the heading */}
          <Button
            component={NavLink}
            to="/projects"
            endIcon={<FiArrowUpRight />}
            sx={{ display: { xs: "inline-flex", sm: "none" }, mb: 3, px: 0 }}
          >
            View all
          </Button>
        </Reveal>

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton
                  variant="rounded"
                  height={260}
                  sx={{ borderRadius: `${theme.custom.radii.lg}px` }}
                />
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
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                      "&:hover": {
                        transform: { xs: "none", sm: "translateY(-4px)" },
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        height: { xs: 160, sm: 140 },
                        background: project.coverImage
                          ? `url(${project.coverImage}) center/cover`
                          : theme.custom.gradient,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                    <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", p: { xs: 2, sm: 2.5 } }}>
                      <Typography
                        variant="h4"
                        sx={{
                          mb: 1,
                          fontSize: "clamp(1.0625rem, 2.5vw + 0.4rem, 1.375rem)",
                          lineHeight: 1.3,
                          overflowWrap: "break-word",
                        }}
                      >
                        {project.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          flex: 1,
                          fontSize: "0.875rem",
                          lineHeight: 1.6,
                          overflowWrap: "break-word",
                        }}
                      >
                        {project.summary}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {(project.technologies || []).map(({ technology }) => (
                          <Chip
                            key={technology.name}
                            label={technology.name}
                            size="small"
                            sx={{
                              fontFamily: theme.custom.fontMono,
                              bgcolor: "background.default",
                              fontSize: "0.6875rem",
                            }}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
            ))}

          {!loading && projects.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary">
                No featured projects yet — add some from the admin dashboard.
              </Typography>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
}
