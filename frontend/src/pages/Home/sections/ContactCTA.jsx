import { Box, Container, Typography, Button, Stack, useTheme } from "@mui/material";
import { FiArrowRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../../components/common/Reveal";

export default function ContactCTA() {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, sm: 8, md: 12 }, px: { xs: 2, sm: 3 } }}>
      <Reveal>
        <Box
          sx={{
            textAlign: "center",
            p: { xs: 3, sm: 5, md: 8 },
            borderRadius: {
              xs: `${theme.custom.radii.lg}px`,
              md: `${theme.custom.radii.xl}px`,
            },
            border: `1px solid ${theme.palette.divider}`,
            background: `${theme.custom.gradient}, ${theme.palette.background.paper}`,
          }}
        >
          <Typography
            variant="h2"
            sx={{
              mb: 2,
              fontSize: "clamp(1.375rem, 5vw + 0.5rem, 2.75rem)",
              lineHeight: 1.25,
              overflowWrap: "break-word",
              wordBreak: "break-word",
              hyphens: "auto",
            }}
          >
            Have a project in mind?
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: 460,
              mx: "auto",
              mb: { xs: 3, sm: 4 },
              fontSize: "clamp(0.875rem, 2vw + 0.4rem, 1rem)",
              lineHeight: 1.6,
              overflowWrap: "break-word",
            }}
          >
            I take on a limited number of engagements at a time — reach out and I'll reply within a day.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            alignItems="stretch"
            sx={{
              maxWidth: { xs: 300, sm: "none" },
              mx: "auto",
            }}
          >
            <Button
              component={NavLink}
              to="/contact"
              variant="contained"
              size="large"
              fullWidth
              endIcon={<FiArrowRight />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                py: { xs: 1.25, sm: 1.5 },
              }}
            >
              Start a conversation
            </Button>
            <Button
              component={NavLink}
              to="/services"
              variant="outlined"
              size="large"
              fullWidth
              sx={{
                width: { xs: "100%", sm: "auto" },
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                py: { xs: 1.25, sm: 1.5 },
              }}
            >
              See services
            </Button>
          </Stack>
        </Box>
      </Reveal>
    </Container>
  );
}
