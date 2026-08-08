import { useEffect, useState } from "react";
import { Box, Fab, Zoom, LinearProgress } from "@mui/material";
import { FiArrowUp } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const max = scrollHeight - clientHeight;
      setProgress(max > 0 ? (scrollTop / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

function BackToTopFab() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
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
        sx={{ position: "fixed", bottom: 28, right: 28, zIndex: 1200 }}
      >
        <FiArrowUp />
      </Fab>
    </Zoom>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const progress = useScrollProgress();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1301,
          height: 2, bgcolor: "transparent",
          "& .MuiLinearProgress-bar": { bgcolor: "primary.main" },
        }}
      />
      <Navbar />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{ flex: 1 }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <Footer />
      <BackToTopFab />
    </Box>
  );
}
