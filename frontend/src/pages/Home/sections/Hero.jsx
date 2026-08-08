import { useEffect, useState } from "react";
import { Box, Container, Typography, Stack, Button, Skeleton, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { FiArrowRight, FiDownload } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import apiClient from "../../../services/apiClient";
import { useFetch } from "../../../hooks/useFetch";

const COMMAND = "whoami";

function TerminalLine({ role }) {
  const theme = useTheme();
  const [typed, setTyped] = useState("");
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(COMMAND.slice(0, i));
      if (i === COMMAND.length) {
        clearInterval(interval);
        setTimeout(() => setResolved(true), 350);
      }
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        fontFamily: theme.custom.fontMono,
        fontSize: { xs: "0.9rem", md: "1rem" },
        color: "text.secondary",
        display: "flex",
        alignItems: "center",
        gap: 1,
        minHeight: 28,
        mb: 3,
      }}
    >
      <Box component="span" sx={{ color: "primary.main" }}>$</Box>
      <span>{typed}</span>
      {!resolved && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
          style={{ width: 8, height: 16, background: theme.palette.primary.main, display: "inline-block" }}
        />
      )}
      {resolved && role && (
        <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
          → {role}
        </motion.span>
      )}
    </Box>
  );
}

export default function Hero() {
  const theme = useTheme();
  const { data: identity, loading } = useFetch(
    () => apiClient.get("/site-settings/identity").then((r) => r.data),
    []
  );

  console.log("Identity data:", identity);

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        background: `${theme.custom.gradient}, ${theme.palette.background.default}`,
        pt: { xs: 10, md: 14 },
        pb: { xs: 10, md: 16 },
      }}
    >
      <Container maxWidth="md">
        <TerminalLine role={identity?.role} />

        {loading ? (
          <>
            <Skeleton variant="text" height={80} width="90%" sx={{ mb: 2 }} />
            <Skeleton variant="text" height={30} width="60%" sx={{ mb: 5 }} />
          </>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <Typography variant="h1" sx={{ mb: 3 }}>
                <Box component="span" sx={{ color: "primary.main" }}>{identity?.name || "Your Name"} </Box> builds software people{" "}
                <Box component="span" sx={{ color: "primary.main" }}>trust.</Box>
              </Typography>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mb: 5, fontSize: "1.05rem" }}>
                {identity?.tagline} {identity?.location ? `${identity.location}.` : ""}
              </Typography>
            </motion.div>
          </>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button component={NavLink} to="/projects" variant="contained" size="large" endIcon={<FiArrowRight />}>
              View my work
            </Button>
            <Button component={NavLink} to="/resume" variant="outlined" size="large" endIcon={<FiDownload />}>
              Download résumé
            </Button>
          </Stack>
        </motion.div>
      </Container>
    </Box>
  );
}
