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
        fontSize: { xs: "0.8125rem", sm: "0.9rem", md: "1rem" },
        color: "text.secondary",
        display: "flex",
        alignItems: "center",
        gap: 1,
        minHeight: 28,
        mb: { xs: 2, sm: 3 },
        flexWrap: "wrap",
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

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        background: `${theme.custom.gradient}, ${theme.palette.background.default}`,
        pt: { xs: 8, sm: 10, md: 14 },
        pb: { xs: 8, sm: 10, md: 16 },
      }}
    >
      <Container maxWidth="md" sx={{ px: { xs: 2.5, sm: 3 } }}>
        <TerminalLine role={identity?.role} />

        {loading ? (
          <>
            <Skeleton variant="text" height={80} width="90%" sx={{ mb: 2 }} />
            <Skeleton variant="text" height={30} width="60%" sx={{ mb: 5 }} />
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Typography
                component="h1"
                sx={{
                  mb: { xs: 2, sm: 3 },
                  fontWeight: 700,
                  fontSize: "clamp(1.5rem, 5vw + 0.5rem, 3.25rem)",
                  lineHeight: { xs: 1.25, md: 1.15 },
                  letterSpacing: { xs: "-0.01em", md: "-0.02em" },
                  overflowWrap: "break-word",
                  wordBreak: "break-word",
                }}
              >
                <Box component="span" sx={{ color: "primary.main" }}>
                  {identity?.name || "Your Name"}{" "}
                </Box>
                builds software people{" "}
                <Box component="span" sx={{ color: "primary.main" }}>
                  trust.
                </Box>
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  maxWidth: 560,
                  mb: { xs: 4, sm: 5 },
                  fontSize: "clamp(0.9375rem, 2vw + 0.4rem, 1.05rem)",
                  lineHeight: 1.6,
                  overflowWrap: "break-word",
                }}
              >
                {identity?.tagline} {identity?.location ? `${identity.location}.` : ""}
              </Typography>
            </motion.div>
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              component={NavLink}
              to="/projects"
              variant="contained"
              size="large"
              fullWidth
              endIcon={<FiArrowRight />}
              sx={{ width: { xs: "100%", sm: "auto" }, fontSize: { xs: "0.875rem", sm: "0.9375rem" } }}
            >
              View my work
            </Button>
            <Button
              component={NavLink}
              to="/resume"
              variant="outlined"
              size="large"
              fullWidth
              endIcon={<FiDownload />}
              sx={{ width: { xs: "100%", sm: "auto" }, fontSize: { xs: "0.875rem", sm: "0.9375rem" } }}
            >
              Download résumé
            </Button>
          </Stack>
        </motion.div>
      </Container>
    </Box>
  );
}
