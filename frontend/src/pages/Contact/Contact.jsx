import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container, Grid, Typography, TextField, Button, Stack, Box, Card, CardContent,
  IconButton, Alert, useTheme,
} from "@mui/material";
import { FiGithub, FiLinkedin, FiTwitter, FiMail, FiMapPin, FiClock } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";

const socials = [
  { icon: FiGithub, href: "https://github.com", label: "GitHub" },
  { icon: FiLinkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: FiTwitter, href: "https://twitter.com", label: "Twitter" },
  { icon: FiMail, href: "mailto:hello@example.com", label: "Email" },
];

export default function Contact() {
  const theme = useTheme();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState(null); // null | "sending" | "sent" | "error"

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await apiClient.post("/contact", form);
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact — Your Name</title>
        <meta name="description" content="Get in touch about a project, collaboration, or question." />
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            CONTACT
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 5, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Let's talk.
          </Typography>
        </Reveal>

        <Grid container spacing={6}>
          <Grid item xs={12} md={7}>
            <Reveal>
              <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
                <TextField label="Name" required value={form.name} onChange={handleChange("name")} />
                <TextField label="Email" type="email" required value={form.email} onChange={handleChange("email")} />
                <TextField label="Subject" value={form.subject} onChange={handleChange("subject")} />
                <TextField label="Message" multiline rows={5} required value={form.message} onChange={handleChange("message")} />
                <Button type="submit" variant="contained" size="large" disabled={status === "sending"} sx={{ alignSelf: "flex-start" }}>
                  {status === "sending" ? "Sending…" : "Send message"}
                </Button>
                {status === "sent" && <Alert severity="success">Thanks — I'll reply within a day.</Alert>}
                {status === "error" && <Alert severity="error">Something went wrong. Try emailing directly instead.</Alert>}
              </Stack>
            </Reveal>
          </Grid>

          <Grid item xs={12} md={5}>
            <Reveal delay={0.1}>
              <Stack spacing={3}>
                <Card elevation={0}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <FiMapPin color={theme.palette.primary.main} />
                      <Typography variant="h4">Location</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">Remote-first, available worldwide.</Typography>
                  </CardContent>
                </Card>

                <Card elevation={0}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <FiClock color={theme.palette.primary.main} />
                      <Typography variant="h4">Business hours</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">Mon – Fri, 9am – 6pm (client timezone). Async first.</Typography>
                  </CardContent>
                </Card>

                <Card elevation={0}>
                  <CardContent>
                    <Typography variant="h4" sx={{ mb: 1.5 }}>Elsewhere</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {socials.map(({ icon: Icon, href, label }) => (
                        <IconButton key={label} component="a" href={href} target="_blank" rel="noreferrer" aria-label={label}>
                          <Icon size={18} />
                        </IconButton>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                <Box
                  sx={{
                    height: 140, borderRadius: `${theme.custom.radii.lg}px`, border: `1px solid ${theme.palette.divider}`,
                    display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary",
                    fontFamily: theme.custom.fontMono, fontSize: "0.85rem",
                  }}
                >
                  [ Calendly booking widget ]
                </Box>
              </Stack>
            </Reveal>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
