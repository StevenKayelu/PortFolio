import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container, Typography, Grid, Card, CardContent, Stack, TextField,
  InputAdornment, ToggleButtonGroup, ToggleButton, Box, Skeleton, useTheme,
} from "@mui/material";
import { FiSearch, FiAward } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function Certificates() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data, loading } = useFetch(
    () => apiClient.get("/certificates", { params: { pageSize: 100 } }).then((r) => r.data),
    []
  );
  const certificates = data?.items || [];
  const categories = useMemo(() => [...new Set(certificates.map((c) => c.category).filter(Boolean))], [certificates]);

  const filtered = certificates.filter((c) => {
    const matchesCategory = category === "all" || c.category === category;
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Helmet>
        <title>Certificates — Your Name</title>
        <meta name="description" content="Professional certifications and credentials." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            CREDENTIALS
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 4, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Certificates.
          </Typography>
        </Reveal>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 4 }}>
          <ToggleButtonGroup exclusive size="small" value={category} onChange={(e, v) => v && setCategory(v)}>
            <ToggleButton value="all" sx={{ borderRadius: `${theme.custom.radii.pill}px !important`, textTransform: "none" }}>All</ToggleButton>
            {categories.map((c) => (
              <ToggleButton key={c} value={c} sx={{ borderRadius: `${theme.custom.radii.pill}px !important`, textTransform: "none", ml: 1 }}>{c}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            size="small" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><FiSearch /></InputAdornment> }}
          />
        </Stack>

        <Grid container spacing={3}>
          {loading && Array.from({ length: 4 }).map((_, i) => <Grid item xs={12} sm={6} key={i}><Skeleton variant="rounded" height={100} /></Grid>)}

          {!loading && filtered.map((cert, idx) => (
            <Grid item xs={12} sm={6} key={cert.id}>
              <Reveal delay={idx * 0.06} style={{ height: "100%" }}>
                <Card elevation={0} sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ p: 1, borderRadius: `${theme.custom.radii.sm}px`, bgcolor: "background.default", color: "primary.main" }}>
                        <FiAward size={18} />
                      </Box>
                      <Box>
                        <Typography variant="h4" sx={{ mb: 0.5 }}>{cert.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{cert.institution}</Typography>
                        <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
                          Issued {new Date(cert.issueDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Reveal>
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
}
