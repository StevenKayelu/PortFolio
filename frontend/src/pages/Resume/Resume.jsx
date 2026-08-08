import { Helmet } from "react-helmet-async";
import { Container, Typography, Stack, Box, Button, Divider, LinearProgress, Grid, Skeleton, useTheme } from "@mui/material";
import { FiDownload } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

const CATEGORY_LABELS = {
  FRONTEND: "Frontend", BACKEND: "Backend", DATABASE: "Database", CLOUD: "Cloud",
  DEVOPS: "DevOps", TOOLS: "Tools", LANGUAGE: "Languages", FRAMEWORK: "Frameworks", SOFT_SKILL: "Soft Skills",
};

function groupByCategory(skills) {
  const groups = {};
  for (const skill of skills) {
    groups[skill.category] = groups[skill.category] || [];
    groups[skill.category].push(skill);
  }
  return groups;
}

export default function Resume() {
  const theme = useTheme();

  const { data: identity } = useFetch(() => apiClient.get("/site-settings/identity").then((r) => r.data), []);
  const { data: about } = useFetch(() => apiClient.get("/site-settings/about").then((r) => r.data), []);
  const { data: resume } = useFetch(() => apiClient.get("/resume").then((r) => r.data).catch(() => null), []);
  const { data: experienceData, loading: expLoading } = useFetch(
    () => apiClient.get("/experience").then((r) => r.data), []
  );
  const { data: skillsData, loading: skillsLoading } = useFetch(
    () => apiClient.get("/skills", { params: { pageSize: 100 } }).then((r) => r.data), []
  );

  const experience = experienceData?.items || [];
  const skillGroups = groupByCategory(skillsData?.items || []);

  return (
    <>
      <Helmet>
        <title>Résumé — Your Name</title>
        <meta name="description" content="Experience, skills, and education — downloadable résumé." />
      </Helmet>

      <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
                RÉSUMÉ
              </Typography>
              <Typography variant="h1" sx={{ mt: 1, fontSize: { xs: "2rem", md: "2.5rem" } }}>
                {identity?.name || "Your Name"}
              </Typography>
              <Typography variant="body1" color="text.secondary">{identity?.role}</Typography>
            </Box>
            <Button
              variant="contained" endIcon={<FiDownload />} sx={{ whiteSpace: "nowrap" }}
              href={resume?.fileUrl || "#"} disabled={!resume?.fileUrl} target="_blank" rel="noreferrer"
            >
              Download PDF
            </Button>
          </Stack>
        </Reveal>

        <Reveal>
          <Typography variant="h4" sx={{ mb: 2 }}>Experience</Typography>
          {expLoading && <Skeleton variant="text" height={100} />}
          <Stack spacing={3} sx={{ mb: 5 }}>
            {experience.map((e) => (
              <Box key={e.id}>
                <Stack direction="row" justifyContent="space-between" flexWrap="wrap">
                  <Typography sx={{ fontWeight: 600 }}>{e.title} · {e.organization}</Typography>
                  <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
                    {new Date(e.startDate).getFullYear()} — {e.endDate ? new Date(e.endDate).getFullYear() : "Present"}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{e.description}</Typography>
              </Box>
            ))}
          </Stack>
        </Reveal>

        <Divider sx={{ mb: 5 }} />

        <Reveal>
          <Typography variant="h4" sx={{ mb: 3 }}>Skills</Typography>
          {skillsLoading && <Skeleton variant="text" height={100} />}
          <Grid container spacing={4} sx={{ mb: 5 }}>
            {Object.entries(skillGroups).map(([category, items]) => (
              <Grid item xs={12} sm={6} key={category}>
                <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
                  {CATEGORY_LABELS[category] || category}
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  {items.map((skill) => (
                    <Box key={skill.id}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">{skill.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{skill.proficiency}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={skill.proficiency} sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: "background.paper" }} />
                    </Box>
                  ))}
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Reveal>

        <Divider sx={{ mb: 5 }} />

        <Reveal>
          <Typography variant="h4" sx={{ mb: 2 }}>Education</Typography>
          {(about?.education || []).map((e) => (
            <Box key={e.degree}>
              <Typography sx={{ fontWeight: 600 }}>{e.degree}</Typography>
              <Typography variant="body2" color="text.secondary">{e.institution} · {e.year}</Typography>
            </Box>
          ))}
        </Reveal>
      </Container>
    </>
  );
}
