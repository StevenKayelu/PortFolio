import { useEffect, useState } from "react";
import {
  AppBar, Toolbar, Box, Stack, Button, IconButton, Drawer, Typography, useTheme, useMediaQuery,
} from "@mui/material";
import { FiMenu, FiX, FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { motion, LayoutGroup } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import ThemeSwitcher from "../ui/ThemeSwitcher";
import Wordmark from "../brand/Wordmark";
import { useBrand } from "../../context/BrandContext";
import { siteHref } from "../../brand/brands";

function isActive(link, location) {
  const [path, hash] = link.to.split("#");
  if (hash) return location.pathname === path && location.hash === `#${hash}`;
  if (link.end || path === "/") return location.pathname === path && !location.hash;
  return location.pathname === path || location.pathname.startsWith(`${path}/`);
}

/** The "other side" of the ecosystem, offered as a secondary path. */
function useCrossLink() {
  const { siteKey } = useBrand();
  return siteKey === "steven"
    ? { eyebrow: "Founder of", label: "DevGen Ventures", href: siteHref("devegen") }
    : { eyebrow: "Founder", label: "Steven Kayelu", href: siteHref("steven") };
}

export default function Navbar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const { brandKey, nav, cta } = useBrand();
  const cross = useCrossLink();
  const homeTo = brandKey === "solutions" ? "/solutions" : "/";

  useEffect(() => setSheetOpen(false), [location.pathname, location.hash]);

  return (
    <AppBar position="sticky" elevation={0} sx={{ top: 0 }}>
      <Toolbar
        sx={{
          maxWidth: 1240, width: "100%", mx: "auto", minHeight: { xs: 64, md: 72 },
          px: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 2 },
        }}
      >
        <Box
          component={NavLink}
          to={homeTo}
          aria-label={`${theme.custom.label} home`}
          sx={{ color: "text.primary", textDecoration: "none", mr: "auto", display: "inline-flex", alignItems: "center", minHeight: 44 }}
        >
          <Wordmark brandKey={brandKey} />
        </Box>

        {!isMobile && (
          <LayoutGroup id="primary-nav">
            <Stack component="nav" aria-label="Primary" direction="row" spacing={0.5} alignItems="center">
              {nav.map((link) => {
                const active = isActive(link, location);
                return (
                  <Button
                    key={link.to}
                    component={NavLink}
                    to={link.to}
                    aria-current={active ? "page" : undefined}
                    sx={{
                      position: "relative",
                      color: active ? "text.primary" : "text.secondary",
                      fontWeight: active ? 600 : 500,
                      px: 1.5,
                      "&:hover": { color: "text.primary", bgcolor: "transparent" },
                      "&:active": { transform: "none" },
                    }}
                  >
                    {link.label}
                    {active && (
                      <motion.span
                        layoutId="nav-indicator"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        style={{
                          position: "absolute", left: 12, right: 12, bottom: 6, height: 2,
                          background: brandKey === "devegen" ? theme.custom.copper : theme.palette.primary.main,
                          borderRadius: 2,
                        }}
                      />
                    )}
                  </Button>
                );
              })}
            </Stack>
          </LayoutGroup>
        )}

        <Stack direction="row" spacing={1} alignItems="center">
          <ThemeSwitcher />
          {!isMobile && (
            <Button variant="contained" color="primary" component={NavLink} to={cta.to}>
              {cta.label}
            </Button>
          )}
          {isMobile && (
            <Button
              onClick={() => setSheetOpen(true)}
              aria-label="Open menu"
              aria-expanded={sheetOpen}
              aria-controls="site-menu"
              variant="outlined"
              color="inherit"
              sx={{
                borderColor: "divider", fontFamily: theme.custom.fontMono, fontSize: "0.75rem", letterSpacing: "0.08em",
                minWidth: 44, px: { xs: 1.25, sm: 1.75 }, gap: 1,
              }}
            >
              <FiMenu size={16} aria-hidden="true" />
              {/* Label hidden on the narrowest phones to keep the bar on one line */}
              <Box component="span" sx={{ display: "none", "@media (min-width: 360px)": { display: "inline" } }}>MENU</Box>
            </Button>
          )}
        </Stack>
      </Toolbar>

      {/* Mobile: bottom sheet keeps the menu in the thumb zone. MUI's
          Drawer traps focus, closes on Escape/backdrop and restores focus. */}
      <Drawer
        anchor="bottom"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        transitionDuration={{ enter: 280, exit: 200 }}
        PaperProps={{
          id: "site-menu",
          "aria-label": "Site menu",
          sx: {
            borderRadius: "20px 20px 0 0",
            maxHeight: "88dvh",
            pb: "calc(16px + env(safe-area-inset-bottom, 0px))",
          },
        }}
      >
        <Box sx={{ px: 2.5, pt: 1.25 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mb: 1.5 }} aria-hidden="true" />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.7rem", letterSpacing: "0.12em", color: "text.secondary" }}>
              {theme.custom.label.toUpperCase()}
            </Typography>
            <IconButton onClick={() => setSheetOpen(false)} aria-label="Close menu" sx={{ width: 44, height: 44 }}>
              <FiX />
            </IconButton>
          </Stack>

          <Box component="nav" aria-label="Primary">
            {[{ label: "Home", to: homeTo, end: true }, ...nav].map((link, i) => {
              const active = isActive(link, location);
              return (
                <Box
                  key={link.to}
                  component={motion.div}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.22 }}
                >
                  <Box
                    component={NavLink}
                    to={link.to}
                    aria-current={active ? "page" : undefined}
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      minHeight: 52, borderBottom: 1, borderColor: "divider",
                      color: "text.primary", textDecoration: "none",
                      fontFamily: theme.custom.fontDisplay, fontSize: "1.35rem",
                      fontWeight: theme.custom.headingWeight,
                    }}
                  >
                    <span>
                      {link.label}
                      {active && <Box component="span" sx={{ ml: 1, fontFamily: theme.custom.fontMono, fontSize: "0.65rem", color: "text.secondary", verticalAlign: "middle" }}>CURRENT</Box>}
                    </span>
                    <FiArrowRight size={16} aria-hidden="true" />
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Button component={NavLink} to={cta.to} variant="contained" fullWidth size="large" sx={{ mt: 2.5 }}>
            {cta.label}
          </Button>

          <Box
            component="a"
            href={cross.href}
            sx={{
              mt: 1.5, p: 2, borderRadius: `${theme.custom.radii.lg}px`, display: "flex",
              justifyContent: "space-between", alignItems: "center", textDecoration: "none",
              bgcolor: theme.custom.band?.bg ?? "#14243D", color: theme.custom.band?.ink ?? "#F3EFE6",
            }}
          >
            <span>
              <Box component="span" sx={{ display: "block", fontFamily: theme.custom.fontMono, fontSize: "0.65rem", letterSpacing: "0.1em", color: theme.custom.copper }}>
                {cross.eyebrow.toUpperCase()}
              </Box>
              {cross.label}
            </span>
            <FiArrowUpRight aria-hidden="true" />
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}
