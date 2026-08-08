import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Grid,
  Stack,
  Typography,
  Button,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  FiGithub,
  FiFacebook,
  FiLinkedin,
  FiTwitter,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { NavLink } from "react-router-dom";
import apiClient from "../../services/apiClient";

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
    title: "About",
    links: [
      { label: "About Me", to: "/about" },
      { label: "Experience", to: "/experience" },
      { label: "Skills", to: "/skills" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Testimonials", to: "/testimonials" },
      { label: "FAQ", to: "/faq" },
      { label: "Privacy Policy", to: "/privacy-policy" },
    ],
  },
];

export default function Footer() {
  const theme = useTheme();

  const [identity, setIdentity] = useState({
    name: "Steven Kayelu",
    brand: "DevGen Solutions",
    role: "Full-Stack Software Engineer",
    tagline:
      "I design and build reliable, user-focused digital products for web and mobile.",
    email: "stevenkayelu1@gmail.com",
    phone: "+260 964 626 286",
    github: "https://github.com/StevenKayelu",
    facebook:
      "https://www.facebook.com/profile.php?id=61592826819870",
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiClient.get("/settings");

        // Supports either:
        // { identity: {...} }
        // or { data: { identity: {...} } }
        const settings = response.data?.data || response.data;

        if (settings?.identity) {
          setIdentity((prev) => ({
            ...prev,
            ...settings.identity,
          }));
        }
      } catch (error) {
        console.error("Failed to load footer settings:", error);
      }
    };

    loadSettings();
  }, []);

  const socials = [
    {
      icon: FiGithub,
      href: identity.github,
      label: "GitHub",
    },
    {
      icon: FiFacebook,
      href: identity.facebook,
      label: "Facebook",
    },
    {
      icon: FiMail,
      href: `mailto:${identity.email}`,
      label: "Email",
    },
    {
      icon: FiPhone,
      href: `tel:${identity.phone.replace(/\s/g, "")}`,
      label: "Phone",
    },
  ].filter((social) => social.href);

  return (
    <Box
      component="footer"
      sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        mt: { xs: 8, sm: 10, md: 12 },
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 6, sm: 7, md: 8 }, px: { xs: 2.5, sm: 3 } }}>
        <Grid container spacing={{ xs: 4, sm: 5 }}>
          {/* BRAND */}
          <Grid item xs={12} md={4}>
            <Typography
              sx={{
                fontFamily: theme.custom.fontMono,
                fontWeight: 600,
                mb: 1.5,
                fontSize: { xs: "1rem", sm: "1.0625rem" },
                overflowWrap: "break-word",
              }}
            >
              {"</"}
              <Box component="span" sx={{ color: "primary.main" }}>
                {identity.brand || "DevGen Solutions"}
              </Box>
              {">"}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                maxWidth: 320,
                mb: 2,
                fontSize: "0.875rem",
                lineHeight: 1.6,
                overflowWrap: "break-word",
              }}
            >
              {identity.tagline}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, fontSize: "0.875rem", overflowWrap: "break-word" }}
            >
              {identity.name}
              {identity.location ? ` · ${identity.location}` : ""}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {socials.map(({ icon: Icon, href, label }) => (
                <IconButton
                  key={label}
                  component="a"
                  href={href}
                  target={label === "Email" || label === "Phone" ? undefined : "_blank"}
                  rel={
                    label === "Email" || label === "Phone"
                      ? undefined
                      : "noopener noreferrer"
                  }
                  aria-label={label}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    "&:hover": {
                      color: "primary.main",
                    },
                  }}
                >
                  <Icon size={18} />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {/* NAVIGATION */}
          {columns.map((col) => (
            <Grid item xs={6} sm={4} md={2} key={col.title}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: theme.custom.fontMono,
                  color: "text.secondary",
                  letterSpacing: 1,
                  fontSize: "0.75rem",
                }}
              >
                {col.title.toUpperCase()}
              </Typography>

              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {col.links.map((link) => (
                  <Typography
                    key={link.to}
                    component={NavLink}
                    to={link.to}
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      "&:hover": {
                        color: "text.primary",
                      },
                    }}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Stack>
            </Grid>
          ))}

          {/* CONTACT / NEWSLETTER */}
          <Grid item xs={12} sm={12} md={4}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: theme.custom.fontMono,
                color: "text.secondary",
                letterSpacing: 1,
                fontSize: "0.75rem",
              }}
            >
              STAY CONNECTED
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, mb: 2, fontSize: "0.875rem", lineHeight: 1.6, maxWidth: { xs: "100%", md: 320 } }}
            >
              Get in touch for software development, web, mobile or
              custom digital product projects.
            </Typography>

            <Stack spacing={1}>
              <Typography
                component="a"
                href={`mailto:${identity.email}`}
                variant="body2"
                sx={{
                  color: "text.secondary",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  overflowWrap: "break-word",
                  "&:hover": {
                    color: "primary.main",
                  },
                }}
              >
                {identity.email}
              </Typography>

              <Typography
                component="a"
                href={`tel:${identity.phone.replace(/\s/g, "")}`}
                variant="body2"
                sx={{
                  color: "text.secondary",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  "&:hover": {
                    color: "primary.main",
                  },
                }}
              >
                {identity.phone}
              </Typography>
            </Stack>
          </Grid>
        </Grid>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: { xs: 5, sm: 6, md: 8 },
            pt: 3,
            borderTop: `1px solid ${theme.palette.divider}`,
            textAlign: "center",
            fontSize: "0.8125rem",
          }}
        >
          © {new Date().getFullYear()} {identity.name}. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
