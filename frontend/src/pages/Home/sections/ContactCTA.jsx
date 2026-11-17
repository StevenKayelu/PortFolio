import { Box, Container, Typography, Button, Stack, useTheme } from "@mui/material";
import { FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import Reveal from "../../../components/common/Reveal";
import { siteHref } from "../../../brand/brands";

/**
 * Closing call to action on the personal site. Career and collaboration
 * enquiries stay here; commercial projects are routed to DevGen Solutions
 * (Digital Ecosystem report §03, enquiry separation).
 */
export default function ContactCTA() {
  const theme = useTheme();
  return (
    <Container maxWidth="lg" component="section" aria-labelledby="cta-title" sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3 } }}>
      <Reveal>
        <Box sx={{ borderTop: 2, borderColor: "text.primary", pt: { xs: 4, md: 6 }, display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "1.3fr 1fr" }, alignItems: "end" }}>
          <Box>
            <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.72rem", letterSpacing: "0.14em", color: theme.custom.accentText }}>
              GET IN TOUCH
            </Typography>
            <Typography id="cta-title" variant="h2" sx={{ mt: 1.5, maxWidth: "18ch" }}>
              Hiring, collaborating, or curious about my work?
            </Typography>
          </Box>
          <Stack spacing={1.5} sx={{ alignItems: { xs: "stretch", sm: "flex-start" } }}>
            <Button component={NavLink} to="/contact?type=career" variant="contained" size="large" endIcon={<FiArrowRight />}>
              Start a conversation
            </Button>
            <Box
              component="a"
              href={siteHref("devegen", "/contact?type=quote")}
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, minHeight: 44, color: "text.secondary", fontSize: "0.95rem", "& b": { color: "text.primary", fontWeight: 600 } }}
            >
              Need software built for a business? <b>DevGen Solutions</b> <FiArrowUpRight aria-hidden="true" />
            </Box>
          </Stack>
        </Box>
      </Reveal>
    </Container>
  );
}
