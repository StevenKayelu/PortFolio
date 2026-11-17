import { useEffect, useState } from "react";
import { Box, Fab, Zoom } from "@mui/material";
import { FiArrowUp } from "react-icons/fi";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useLocation, Outlet } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { Helmet } from "react-helmet-async";
import { useBrand } from "../../context/BrandContext";
import { isProductionHost } from "../../brand/brands";
import apiClient from "../../services/apiClient";
import { SeoDefaults, SeoOverrides } from "../seo/SeoTags";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppButton from "./WhatsAppButton";

function BackToTopFab() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 900);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Zoom in={visible}>
      <Fab
        size="medium"
        color="primary"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        sx={{
          position: "fixed", zIndex: 1200,
          // Sits above the WhatsApp button.
          bottom: "calc(92px + env(safe-area-inset-bottom, 0px))",
          right: "calc(24px + env(safe-area-inset-right, 0px))",
          boxShadow: 3,
        }}
      >
        <FiArrowUp />
      </Fab>
    </Zoom>
  );
}

/**
 * Counts a page view on the live domains only (path + referrer; the API
 * stores no IP address). Feeds the admin dashboard chart.
 */
function usePageViewTracking() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isProductionHost()) return;
    const referrer = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer.slice(0, 191) : undefined;
    apiClient.post("/admin/track", { path: pathname.slice(0, 191), referrer }).catch(() => {});
  }, [pathname]);
}

/** New pages start at the top; links with a #hash scroll to that section. */
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}

export default function MainLayout() {
  const location = useLocation();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const { brandName } = useBrand();
  useScrollOnNavigate();
  usePageViewTracking();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Helmet titleTemplate={`%s — ${brandName}`} defaultTitle={brandName} />
      <SeoDefaults />
      <Box
        component="a"
        href="#main"
        sx={{
          position: "absolute", left: 16, top: -60, zIndex: 1400, px: 2, py: 1.25,
          bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 1, textDecoration: "none",
          "&:focus": { top: 12 },
        }}
      >
        Skip to content
      </Box>
      <motion.div
        aria-hidden="true"
        style={{
          scaleX: progress, transformOrigin: "0 50%", position: "fixed", top: 0, left: 0, right: 0,
          height: 2, zIndex: 1301, background: theme.palette.primary.main,
        }}
      />
      <Navbar />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          tabIndex={-1}
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ flex: 1, outline: "none" }}
        >
          <Outlet />
          <SeoOverrides />
        </motion.main>
      </AnimatePresence>

      <Footer />
      <BackToTopFab />
      <WhatsAppButton />
    </Box>
  );
}
