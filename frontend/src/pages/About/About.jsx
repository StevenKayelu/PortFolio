import { Helmet } from "react-helmet-async";
import { Box, Container, Typography, Grid, Card, CardContent, Button, Stack, Skeleton, useTheme } from "@mui/material";
import { FiDownload } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../components/common/Reveal";
import Timeline from "../Home/sections/Timeline";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function About() {
  const theme = useTheme();
  const { data: about, loading } = useFetch(
    () => apiClient.get("/site-settings/about").then((r) => r.data),
    []
  );
  console.log("About data:", about);

  return (
    <>
      <Helmet>
        <title>About — DevGen Solutions</title>
        <meta name="description" content="Background, mission, values, and career journey." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            ABOUT
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 3, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            The story behind the work.
          </Typography>
          {loading ? (
            <Skeleton variant="text" height={90} width="80%" />
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, fontSize: "1.05rem", mb: 3 }}>
              {about?.bio}
            </Typography>
          )}
          <Button component={NavLink} to="/resume" variant="outlined" endIcon={<FiDownload />}>
            Download résumé
          </Button>
        </Reveal>

        {!loading && (
          <>
            <Grid container spacing={3} sx={{ mt: 4 }}>
              <Grid item xs={12} sm={6}>
                <Reveal style={{ height: "100%" }}>
                  <Card elevation={0} sx={{ height: "100%" }}>
                    <CardContent>
                      <Typography variant="h4" sx={{ mb: 1 }}>Mission</Typography>
                      <Typography variant="body2" color="text.secondary">{about?.mission}</Typography>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Reveal delay={0.08} style={{ height: "100%" }}>
                  <Card elevation={0} sx={{ height: "100%" }}>
                    <CardContent>
                      <Typography variant="h4" sx={{ mb: 1 }}>Vision</Typography>
                      <Typography variant="body2" color="text.secondary">{about?.vision}</Typography>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
            </Grid>

            <Reveal>
              <Typography variant="h2" sx={{ mt: 8, mb: 3 }}>Core values</Typography>
            </Reveal>
            <Grid container spacing={3}>
              {(about?.values || []).map((v, idx) => (
                <Grid item xs={12} sm={4} key={v.title}>
                  <Reveal delay={idx * 0.08} style={{ height: "100%" }}>
                    <Card elevation={0} sx={{ height: "100%" }}>
                      <CardContent>
                        <Typography variant="h4" sx={{ mb: 1 }}>{v.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{v.detail}</Typography>
                      </CardContent>
                    </Card>
                  </Reveal>
                </Grid>
              ))}
            </Grid>

            <Reveal>
              <Typography variant="h2" sx={{ mt: 8, mb: 2 }}>Education</Typography>
              <Stack spacing={1.5}>
                {(about?.education || []).map((e) => (
                  <Box key={e.degree}>
                    <Typography variant="h4">{e.degree}</Typography>
                    <Typography variant="body2" color="text.secondary">{e.institution} · {e.year}</Typography>
                  </Box>
                ))}
              </Stack>
            </Reveal>

            <Reveal>
              <Typography variant="h2" sx={{ mt: 8, mb: 2 }}>Where this is headed</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>{about?.goals}</Typography>
            </Reveal>
          </>
        )}
      </Container>

      <Timeline />
    </>
  );
}
