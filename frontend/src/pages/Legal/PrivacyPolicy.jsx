import { Helmet } from "react-helmet-async";
import { Container, Typography, Stack, useTheme } from "@mui/material";
import Reveal from "../../components/common/Reveal";

const sections = [
  { title: "Information we collect", body: "Contact form submissions (name, email, message) and basic, anonymized analytics (page views, referrer) — no third-party ad trackers." },
  { title: "How it's used", body: "Solely to respond to inquiries and understand which content is useful. Never sold or shared with advertisers." },
  { title: "Cookies", body: "Only what's required for the theme preference (local storage, not a cookie) and, if enabled, essential session cookies for the admin dashboard." },
  { title: "Your rights", body: "You can request a copy or deletion of any data associated with your email by reaching out via the contact page." },
  { title: "Contact", body: "Questions about this policy can go to hello@example.com." },
];

export default function PrivacyPolicy() {
  const theme = useTheme();

  return (
    <>
      <Helmet>
        <title>Privacy Policy — Your Name</title>
      </Helmet>

      <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="h1" sx={{ mb: 1, fontSize: { xs: "2rem", md: "2.5rem" } }}>Privacy Policy</Typography>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
            Last updated August 2026
          </Typography>
        </Reveal>

        <Stack spacing={4} sx={{ mt: 5 }}>
          {sections.map((s, idx) => (
            <Reveal key={s.title} delay={idx * 0.05}>
              <Typography variant="h4" sx={{ mb: 1 }}>{s.title}</Typography>
              <Typography variant="body2" color="text.secondary">{s.body}</Typography>
            </Reveal>
          ))}
        </Stack>
      </Container>
    </>
  );
}
