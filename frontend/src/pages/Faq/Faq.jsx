import { Helmet } from "react-helmet-async";
import { Container, Typography, Accordion, AccordionSummary, AccordionDetails, Skeleton, Stack, useTheme } from "@mui/material";
import { FiChevronDown } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

export default function Faq() {
  const theme = useTheme();
  const { data, loading } = useFetch(
    () => apiClient.get("/faq", { params: { pageSize: 50 } }).then((r) => r.data),
    []
  );
  const faqs = data?.items || [];

  return (
    <>
      <Helmet>
        <title>FAQ — Your Name</title>
        <meta name="description" content="Answers to common questions about working together." />
      </Helmet>

      <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary", letterSpacing: 1 }}>
            FAQ
          </Typography>
          <Typography variant="h1" sx={{ mt: 1, mb: 5, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Common questions.
          </Typography>
        </Reveal>

        {loading && <Stack spacing={1.5}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}</Stack>}

        {!loading && faqs.map((faq, idx) => (
          <Reveal key={faq.id} delay={idx * 0.06}>
            <Accordion elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, "&:before": { display: "none" }, mb: 1.5, borderRadius: `${theme.custom.radii.md}px !important`, overflow: "hidden" }}>
              <AccordionSummary expandIcon={<FiChevronDown />}>
                <Typography sx={{ fontWeight: 600 }}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          </Reveal>
        ))}
      </Container>
    </>
  );
}
