import { Box, Container, Grid, Stack, Typography, TextField, Button, IconButton, useTheme } from "@mui/material";
import { FiGithub, FiLinkedin, FiTwitter, FiMail } from "react-icons/fi";
import { NavLink } from "react-router-dom";

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Projects", to: "/projects" },
      { label: "Blog", to: "/blog" },
      { label: "Services", to: "/services" },
      { label: "Resume", to: "/resume" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Testimonials", to: "/testimonials" },
      { label: "FAQ", to: "/faq" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [{ label: "Privacy Policy", to: "/privacy-policy" }],
  },
];

const socials = [
  { icon: FiGithub, href: "https://github.com", label: "GitHub" },
  { icon: FiLinkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: FiTwitter, href: "https://twitter.com", label: "Twitter" },
  { icon: FiMail, href: "mailto:hello@example.com", label: "Email" },
];

export default function Footer() {
  const theme = useTheme();

  return (
    <Box component="footer" sx={{ borderTop: `1px solid ${theme.palette.divider}`, mt: 12 }}>
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6}>
          <Grid item xs={12} md={4}>
            <Typography sx={{ fontFamily: theme.custom.fontMono, fontWeight: 600, mb: 1.5 }}>
              {"</"}<Box component="span" sx={{ color: "primary.main" }}>DevGen</Box>{">"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mb: 2 }}>
              Building fast, reliable software — and writing about how it gets built.
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {socials.map(({ icon: Icon, href, label }) => (
                <IconButton key={label} component="a" href={href} target="_blank" rel="noreferrer" aria-label={label} size="small">
                  <Icon size={18} />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {columns.map((col) => (
            <Grid item xs={6} md={2} key={col.title}>
              <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
                {col.title.toUpperCase()}
              </Typography>
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {col.links.map((link) => (
                  <Typography
                    key={link.to}
                    component={NavLink}
                    to={link.to}
                    variant="body2"
                    sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "text.primary" } }}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Stack>
            </Grid>
          ))}

          <Grid item xs={12} md={4}>
            <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
              NEWSLETTER
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              Occasional notes on shipping software. No spam.
            </Typography>
            <Stack direction="row" spacing={1} component="form" onSubmit={(e) => e.preventDefault()}>
              <TextField
                size="small"
                type="email"
                placeholder="you@email.com"
                fullWidth
                required
                inputProps={{ "aria-label": "Email address" }}
              />
              <Button type="submit" variant="contained">
                Join
              </Button>
            </Stack>
          </Grid>
        </Grid>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 8, textAlign: "center" }}>
          © {new Date().getFullYear()} Your Name. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
