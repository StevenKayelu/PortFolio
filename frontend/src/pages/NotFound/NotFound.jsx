import { Helmet } from "react-helmet-async";
import { Container, Typography, Button, Box, useTheme } from "@mui/material";
import { FiArrowLeft } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../components/common/Reveal";

export default function NotFound() {
  const theme = useTheme();

  return (
    <>
      <Helmet>
        <title>Page not found — Your Name</title>
      </Helmet>

      <Container maxWidth="sm" sx={{ py: { xs: 12, md: 18 }, textAlign: "center" }}>
        <Reveal>
          <Typography
            sx={{ fontFamily: theme.custom.fontMono, fontSize: "5rem", fontWeight: 700, color: "primary.main", lineHeight: 1 }}
          >
            404
          </Typography>
          <Typography variant="h2" sx={{ mt: 2, mb: 1.5 }}>Page not found</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            The route you followed doesn't resolve to anything here.
          </Typography>
          <Box>
            <Button component={NavLink} to="/" variant="contained" startIcon={<FiArrowLeft />}>
              Back to home
            </Button>
          </Box>
        </Reveal>
      </Container>
    </>
  );
}
