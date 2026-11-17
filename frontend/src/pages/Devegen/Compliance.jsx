import { Helmet } from "react-helmet-async";
import { Box, Container, Typography, Stack, Skeleton, Button, useTheme } from "@mui/material";
import { FiExternalLink, FiShield, FiArrowRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import SectionHeading from "../../components/common/SectionHeading";
import Reveal from "../../components/common/Reveal";
import EmptyState from "../../components/common/EmptyState";
import { useCompliance } from "../../brand/useCompliance";

import { formatDateLong } from "../../utils/format";
const fmt = formatDateLong;

/**
 * Registration & compliance facts. Deliberately facts only: documents
 * can list directors, shareholders and ID numbers, so they aren't shown.
 * Expired items are hidden by the API.
 */
export default function Compliance() {
  const theme = useTheme();
  const { organizations, loading } = useCompliance();

  return (
    <>
      <Helmet>
        <title>Registration &amp; compliance</title>
        <meta name="description" content="Business registration, licences and data protection registration, with how to verify each one." />
      </Helmet>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, sm: 3 } }}>
        <SectionHeading
          eyebrow="Registration & compliance"
          title="Who you're dealing with."
          lede="Our registrations and licences, with how to check each one with the authority that issued it. We show the details rather than the documents, which contain personal information."
        />

        {loading && <Skeleton variant="rounded" height={240} />}
        {!loading && organizations.length === 0 && (
          <EmptyState
            icon={FiShield}
            eyebrow="DevGen Solutions LTD"
            title="Our registration details are being prepared for this page."
            items={[
              { label: "Company registration", detail: "Patents and Companies Registration Agency (PACRA)" },
              { label: "Data protection registration", detail: "Office of the Data Protection Commissioner" },
            ]}
            actions={[
              <Button key="ask" component={NavLink} to="/contact?type=general" variant="contained" endIcon={<FiArrowRight />}>Request registration details</Button>,
              <Button key="ds" component={NavLink} to="/solutions" variant="outlined">About DevGen Solutions</Button>,
            ]}
          >
            <Typography>
              For each registration we'll publish the registered name, number, issuing authority and how to verify it with them.
            </Typography>
            <Typography>
              Need them now for a tender, supplier form or contract? Ask and we'll send what's required directly.
            </Typography>
          </EmptyState>
        )}

        <Stack gap={5}>
          {organizations.map((org) => (
            <Reveal key={org.legalName}>
              <Box component="section" aria-labelledby={`org-${org.legalName}`} sx={{ borderTop: 2, borderColor: "text.primary", pt: 3 }}>
                <Typography id={`org-${org.legalName}`} variant="h2" sx={{ fontSize: "clamp(1.6rem, 1.3rem + 1.2vw, 2.2rem)" }}>{org.legalName}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {(() => {
                    // List brands only when their names differ from the legal name.
                    const others = org.brands.filter((b) => b.name.toLowerCase() !== org.legalName.toLowerCase()).map((b) => b.name);
                    return [org.registrationType, org.tradingName && `trading as ${org.tradingName}`, others.length && `operates ${others.join(", ")}`].filter(Boolean).join(" · ");
                  })()}
                </Typography>

                <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 3, p: 0, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
                  {org.credentials.map((c) => (
                    <Box component="li" key={c.id} sx={{ border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.lg}px`, bgcolor: "background.paper", p: 2.5, display: "grid", gap: 1.25, alignContent: "start" }}>
                      <Stack direction="row" gap={1} alignItems="center">
                        <FiShield aria-hidden="true" color={theme.palette.success.main} />
                        <Typography variant="h4" component="h3">{c.title}</Typography>
                      </Stack>
                      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "8.5rem 1fr", rowGap: 0.75, columnGap: 1.5, "& dt": { color: "text.secondary", fontSize: "0.85rem" }, "& dd": { m: 0, overflowWrap: "anywhere" } }}>
                        <dt>Issued by</dt><dd>{c.authority}</dd>
                        <dt>Number</dt><Box component="dd" sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.9rem" }}>{c.referenceNumber}</Box>
                        <dt>Issued</dt><dd>{fmt(c.issuedAt)}</dd>
                        {c.expiresAt && (<><dt>Valid until</dt><dd>{fmt(c.expiresAt)}</dd></>)}
                      </Box>
                      {c.verificationNote && <Typography variant="body2" color="text.secondary">{c.verificationNote}</Typography>}
                      {c.verificationUrl && (
                        <Button href={c.verificationUrl} target="_blank" rel="noopener noreferrer" endIcon={<FiExternalLink />} variant="outlined" size="small" sx={{ justifySelf: "start" }}>
                          Check with {c.authority.match(/\(([^)]+)\)/)?.[1] || "the authority"}
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Reveal>
          ))}
        </Stack>

        {organizations.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 6, maxWidth: "62ch" }}>
            Need copies for a tender or supplier registration? <NavLink to="/contact?type=general">Ask us</NavLink> and we'll send what's required directly.
          </Typography>
        )}
      </Container>
    </>
  );
}
