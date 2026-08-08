import { Box, Container, Typography, Button, Stack, useTheme } from "@mui/material";
import { FiArrowRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../../components/common/Reveal";

export default function ContactCTA() {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
      <Reveal>
        <Box
          sx={{
            textAlign: "center",
            p: { xs: 5, md: 8 },
            borderRadius: `${theme.custom.radii.xl}px`,
            border: `1px solid ${theme.palette.divider}`,
            background: `${theme.custom.gradient}, ${theme.palette.background.paper}`,
          }}
        >
          <Typography variant="h2" sx={{ mb: 2 }}>
            Have a project in mind?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460, mx: "auto", mb: 4 }}>
            I take on a limited number of engagements at a time — reach out and I'll reply within a day.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button component={NavLink} to="/contact" variant="contained" size="large" endIcon={<FiArrowRight />}>
              Start a conversation
            </Button>
            <Button component={NavLink} to="/services" variant="outlined" size="large">
              See services
            </Button>
          </Stack>
        </Box>
      </Reveal>
    </Container>
  );
}
