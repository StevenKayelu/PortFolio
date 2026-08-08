import { useState } from "react";
import {
  AppBar, Toolbar, Box, Stack, Button, IconButton, Drawer, List,
  ListItemButton, ListItemText, useTheme, useMediaQuery,
} from "@mui/material";
import { FiMenu, FiX } from "react-icons/fi";
import { NavLink, useLocation } from "react-router-dom";
import ThemeSwitcher from "../ui/ThemeSwitcher";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Projects", to: "/projects" },
  { label: "Blog", to: "/blog" },
  { label: "Services", to: "/services" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ maxWidth: 1200, width: "100%", mx: "auto", py: 1.25 }}>
        <Box
          component={NavLink}
          to="/"
          sx={{
            fontFamily: theme.custom.fontMono,
            fontWeight: 600,
            fontSize: "1.05rem",
            color: "text.primary",
            textDecoration: "none",
            mr: "auto",
          }}
        >
          {"</"}<Box component="span" sx={{ color: "primary.main" }}>DevGen</Box>{">"}
        </Box>

        {!isMobile && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Button
                  key={link.to}
                  component={NavLink}
                  to={link.to}
                  sx={{
                    color: active ? "primary.main" : "text.secondary",
                    fontWeight: 500,
                    borderRadius: `${theme.custom.radii.pill}px`,
                    px: 2,
                    "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Stack>
        )}

        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
          <ThemeSwitcher />
          {!isMobile && (
            <Button variant="contained" color="primary" component={NavLink} to="/contact">
              Let's talk
            </Button>
          )}
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu">
              <FiMenu />
            </IconButton>
          )}
        </Stack>
      </Toolbar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }} role="presentation">
          <Stack direction="row" justifyContent="flex-end" sx={{ px: 2, mb: 1 }}>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu">
              <FiX />
            </IconButton>
          </Stack>
          <List>
            {NAV_LINKS.map((link) => (
              <ListItemButton
                key={link.to}
                component={NavLink}
                to={link.to}
                onClick={() => setDrawerOpen(false)}
              >
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
            <ListItemButton component={NavLink} to="/contact" onClick={() => setDrawerOpen(false)}>
              <ListItemText primary="Let's talk" primaryTypographyProps={{ color: "primary.main", fontWeight: 600 }} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
