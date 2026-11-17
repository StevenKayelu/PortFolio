import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container, Typography, Stack, TextField, InputAdornment, Box, Skeleton, Button, Chip, Dialog, DialogContent, IconButton, useTheme, useMediaQuery,
} from "@mui/material";
import { FiSearch, FiAward, FiExternalLink, FiX, FiCheckCircle } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
import SectionHeading from "../../components/common/SectionHeading";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

// Shown in this order, each type labelled for what it is.
const GROUPS = [
  ["CERTIFICATION", "Professional certifications"],
  ["ACADEMIC", "Academic qualifications"],
  ["COURSE", "Courses completed"],
  ["AWARD", "Awards"],
];
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });

function VerifyButton({ cert, size = "small" }) {
  if (!cert.verification) return null;
  return (
    <Button
      size={size} href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" variant="outlined"
      startIcon={cert.verification.isIssuer ? <FiCheckCircle /> : null} endIcon={<FiExternalLink />}
      sx={{ alignSelf: "flex-start" }}
    >
      {cert.verification.label}
    </Button>
  );
}

function CertificateCard({ cert, onOpen }) {
  const theme = useTheme();
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.lg}px`, bgcolor: "background.paper", overflow: "hidden", display: "grid", height: "100%", gridTemplateRows: "auto 1fr" }}>
      {cert.previewUrl ? (
        <Box
          component="button" type="button" onClick={() => onOpen(cert)} aria-label={`View certificate: ${cert.title}`}
          sx={{ all: "unset", cursor: "zoom-in", display: "block", aspectRatio: "1.41", maxWidth: "100%", bgcolor: "action.hover", borderBottom: 1, borderColor: "divider", "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 } }}
        >
          <Box component="img" src={cert.previewUrl} alt="" loading="lazy" draggable={false}
            sx={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block", userSelect: "none" }} />
        </Box>
      ) : (
        <Box sx={{ aspectRatio: "1.41", maxWidth: "100%", display: "grid", placeItems: "center", bgcolor: "action.hover", color: "text.secondary", borderBottom: 1, borderColor: "divider" }}>
          <FiAward size={28} aria-hidden="true" />
        </Box>
      )}
      <Box sx={{ p: 2.25, display: "grid", gap: 1, alignContent: "start" }}>
        <Typography variant="h4" component="h3" sx={{ fontSize: "1.05rem" }}>{cert.title}</Typography>
        <Typography variant="body2" color="text.secondary">{cert.institution} · {fmtDate(cert.issueDate)}</Typography>
        {cert.expiresAt && (
          <Chip size="small" sx={{ justifySelf: "start" }} color={cert.expired ? "default" : "success"} variant="outlined"
            label={cert.expired ? `Expired ${fmtDate(cert.expiresAt)}` : `Valid until ${fmtDate(cert.expiresAt)}`} />
        )}
        {cert.credentialId && <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>ID {cert.credentialId}</Typography>}
        <Box sx={{ mt: 0.5 }}><VerifyButton cert={cert} /></Box>
      </Box>
    </Box>
  );
}

/**
 * Certificates: watermarked previews to view (no downloads) and links to
 * each issuer's own verification record, which is the real proof.
 */
export default function Certificates() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const { data, loading, error } = useFetch(() => apiClient.get("/certificates").then((r) => r.data), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items || []).filter((c) => !q || `${c.title} ${c.institution} ${c.category || ""}`.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <>
      <Helmet>
        <title>Certificates</title>
        <meta name="description" content="Certifications, qualifications and completed courses, each linked to the issuer's own record where available." />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, sm: 3 } }}>
        <SectionHeading
          eyebrow="Credentials"
          title="Certificates and qualifications."
          lede="Where an issuer offers verification, use the link on each certificate to check it on their site."
        />

        {(data?.items?.length || 0) > 4 && (
          <TextField
            id="certificate-search" size="small" placeholder="Search certificates" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 4, width: { xs: "100%", sm: 320 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><FiSearch /></InputAdornment> }}
            inputProps={{ "aria-label": "Search certificates" }}
          />
        )}

        {loading && <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" } }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={320} />)}</Box>}
        {error && <Typography color="text.secondary">Certificates couldn't be loaded right now. Please try again later.</Typography>}
        {!loading && !error && filtered.length === 0 && (
          <Typography color="text.secondary">{search ? "No certificates match that search." : "Certificates will be listed here soon."}</Typography>
        )}

        <Stack gap={{ xs: 6, md: 8 }}>
          {GROUPS.map(([type, label]) => {
            const certs = filtered.filter((c) => c.type === type);
            if (!certs.length) return null;
            return (
              <Box component="section" key={type} aria-labelledby={`group-${type}`}>
                <Typography id={`group-${type}`} variant="h3" component="h2" sx={{ mb: 2.5 }}>{label}</Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" } }}>
                  {certs.map((c, i) => (
                    <Reveal key={c.id} delay={Math.min(i, 5) * 0.05} style={{ height: "100%" }}><CertificateCard cert={c} onOpen={setViewing} /></Reveal>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Container>

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} maxWidth="lg" fullWidth fullScreen={fullScreen} aria-labelledby="cert-viewer-title">
        {viewing && (
          <DialogContent sx={{ p: { xs: 2, sm: 3 }, display: "grid", gap: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
              <Box>
                <Typography id="cert-viewer-title" variant="h3" component="h2">{viewing.title}</Typography>
                <Typography color="text.secondary">{viewing.institution} · {fmtDate(viewing.issueDate)}</Typography>
              </Box>
              <IconButton onClick={() => setViewing(null)} aria-label="Close"><FiX /></IconButton>
            </Stack>
            <Box component="img" src={viewing.previewUrl} alt={`Certificate: ${viewing.title}, issued by ${viewing.institution}`} draggable={false}
              sx={{ width: "100%", height: "auto", maxHeight: "72vh", objectFit: "contain", bgcolor: "action.hover", borderRadius: 1, userSelect: "none" }} />
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5} alignItems={{ sm: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {viewing.verification?.isIssuer ? "This preview is for viewing. Check the original record with the issuer." : "This preview is for viewing only."}
              </Typography>
              <VerifyButton cert={viewing} size="medium" />
            </Stack>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
