import { Helmet } from "react-helmet-async";
import { useParams, Navigate, NavLink } from "react-router-dom";
import { Box, Container, Typography, Grid, Chip, Stack, Button, Divider, Skeleton, useTheme } from "@mui/material";
import { FiGithub, FiExternalLink, FiArrowLeft } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function ProjectDetails() {
  const { slug } = useParams();
  const theme = useTheme();

  const { data: project, loading, error } = useFetch(
    () => apiClient.get(`/projects/${slug}`).then((r) => r.data),
    [slug]
  );

  console.log("Project data:", project);
  if (!loading && (error || !project)) return <Navigate to="/projects" replace />;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 10 }}>
        <Skeleton variant="text" height={60} width="60%" />
        <Skeleton variant="text" height={30} width="80%" />
        <Skeleton variant="rounded" height={300} sx={{ mt: 4 }} />
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>{project.title} — Projects — Your Name</title>
        <meta name="description" content={project.summary} />
      </Helmet>

      <Box sx={{ background: theme.custom.gradient, pt: { xs: 8, md: 10 }, pb: 6 }}>
        <Container maxWidth="md">
          <Reveal>
            <Button component={NavLink} to="/projects" startIcon={<FiArrowLeft />} sx={{ mb: 3, color: "text.secondary" }}>
              All projects
            </Button>
            <Typography variant="h1" sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.75rem" } }}>{project.title}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mb: 3 }}>{project.summary}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
              {(project.technologies || []).map(({ technology }) => (
                <Chip key={technology.name} label={technology.name} sx={{ fontFamily: theme.custom.fontMono }} />
              ))}
            </Stack>
            <Stack direction="row" spacing={2}>
              {project.githubUrl && (
                <Button variant="outlined" startIcon={<FiGithub />} href={project.githubUrl} target="_blank" rel="noreferrer">
                  Source
                </Button>
              )}
              {project.liveDemoUrl && (
                <Button variant="contained" startIcon={<FiExternalLink />} href={project.liveDemoUrl} target="_blank" rel="noreferrer">
                  Live demo
                </Button>
              )}
            </Stack>
          </Reveal>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        {project.features?.length > 0 && (
          <Reveal>
            <Typography variant="h2" sx={{ mb: 2 }}>Key features</Typography>
            <Grid container spacing={1.5} sx={{ mb: 6 }}>
              {project.features.map((f) => (
                <Grid item xs={12} sm={6} key={f}>
                  <Typography variant="body2" color="text.secondary">— {f}</Typography>
                </Grid>
              ))}
            </Grid>
          </Reveal>
        )}

        {[
          { label: "The challenge", value: project.challenges },
          { label: "The solution", value: project.solutions },
          { label: "Lessons learned", value: project.lessonsLearned },
        ].filter((s) => s.value).map((section, idx) => (
          <Reveal key={section.label} delay={idx * 0.05}>
            <Divider sx={{ mb: 4 }} />
            <Typography variant="h4" sx={{ mb: 1.5 }}>{section.label}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 640 }}>
              {section.value}
            </Typography>
          </Reveal>
        ))}
      </Container>
    </>
  );
}
