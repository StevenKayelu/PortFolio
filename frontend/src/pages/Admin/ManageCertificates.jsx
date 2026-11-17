import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, Stack, Button, Chip, Alert, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, FormControlLabel, Switch, Checkbox, LinearProgress, useTheme,
} from "@mui/material";
import { FiPlus, FiEdit2, FiUpload, FiDownload, FiTrash2, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import apiClient from "../../services/apiClient";

import { formatDate, toDateInput } from "../../utils/format";
export const CERT_TYPES = {
  CERTIFICATION: "Professional certification",
  COURSE: "Course completed",
  ACADEMIC: "Academic qualification",
  AWARD: "Award",
};
const EMPTY = { title: "", institution: "", category: "", type: "COURSE", issueDate: "", expiresAt: "", credentialId: "", showCredentialId: true, credentialUrl: "", isPublished: true, displayOrder: 0 };
const dateInput = toDateInput;
const fmtSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

function UploadDialog({ cert, onClose, onDone }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState("idle"); // idle | rendering | uploading
  const [error, setError] = useState("");

  const choose = (f) => {
    setError("");
    if (!f) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)) { setError("Choose a PDF, JPEG, PNG or WebP file."); return; }
    if (f.size > 10 * 1024 * 1024) { setError("That file is over 10 MB."); return; }
    setFile(f);
  };

  const upload = async () => {
    setError("");
    const form = new FormData();
    form.append("original", file, file.name);
    try {
      if (file.type === "application/pdf") {
        setState("rendering");
        const { renderPdfFirstPage } = await import("../../utils/renderPdfPreview");
        form.append("preview", await renderPdfFirstPage(file), "page-1.png");
      }
      setState("uploading");
      await apiClient.post(`/admin/certificates/${cert.id}/file`, form);
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || (state === "rendering" ? "This PDF couldn't be read. Try exporting it again, or upload an image instead." : "The upload didn't finish. Try again."));
      setState("idle");
    }
  };

  return (
    <Dialog open onClose={state === "idle" ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>{cert.hasOriginal ? "Replace" : "Upload"} certificate file</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            {cert.title}. The original stays private (only signed-in admins can download it). Visitors see a smaller, watermarked image.
          </Typography>
          <Alert severity="info" icon={false}>
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Before uploading, check the document doesn't show:</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              <li>national ID, passport or student numbers</li>
              <li>your date of birth or home address</li>
              <li>grades or a full transcript (show the qualification instead)</li>
            </Box>
          </Alert>
          <input ref={inputRef} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => choose(e.target.files?.[0])} />
          <Button variant="outlined" startIcon={<FiUpload />} onClick={() => inputRef.current?.click()} disabled={state !== "idle"} sx={{ alignSelf: "flex-start" }}>
            {file ? "Choose a different file" : "Choose PDF or image"}
          </Button>
          {file && <Typography variant="body2">{file.name} · {fmtSize(file.size)}</Typography>}
          <FormControlLabel control={<Checkbox id="cert-privacy-check" checked={checked} onChange={(e) => setChecked(e.target.checked)} />}
            label="I've checked it shows nothing private." />
          {state !== "idle" && (
            <Box>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary">{state === "rendering" ? "Reading the PDF's first page…" : "Uploading and creating the watermarked preview…"}</Typography>
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={state !== "idle"}>Cancel</Button>
        <Button variant="contained" onClick={upload} disabled={!file || !checked || state !== "idle"}>Upload</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Certificates: details, private originals and public watermarked previews. */
export default function ManageCertificates() {
  const theme = useTheme();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | cert
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploading, setUploading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    apiClient.get("/admin/certificates").then((r) => setItems(r.data.items)).catch(() => setError("Certificates couldn't be loaded. Try again."));
  }, []);
  useEffect(load, [load]);

  const open = (cert) => {
    setFieldErrors({});
    setEditing(cert || "new");
    setForm(cert ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, cert[k] ?? EMPTY[k]])), issueDate: dateInput(cert.issueDate), expiresAt: dateInput(cert.expiresAt) } : EMPTY);
  };

  const save = async () => {
    setFieldErrors({});
    const body = { ...form, displayOrder: Number(form.displayOrder) || 0 };
    try {
      const res = editing === "new" ? await apiClient.post("/admin/certificates", body) : await apiClient.patch(`/admin/certificates/${editing.id}`, body);
      setEditing(null);
      setNotice(editing === "new" ? `Added ${res.data.title}. Upload the certificate file next.` : "Saved.");
      load();
      if (editing === "new") setUploading(res.data);
    } catch (err) {
      const res = err.response?.data;
      setFieldErrors({ ...(res?.fields ? Object.fromEntries(Object.entries(res.fields).map(([k, v]) => [k, v[0]])) : {}), _form: res?.error || "Not saved." });
    }
  };

  const downloadOriginal = async (cert) => {
    try {
      const res = await apiClient.get(`/admin/certificates/${cert.id}/original`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement("a"), { href: url, download: cert.originalName || "certificate" });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("The original couldn't be downloaded.");
    }
  };

  const remove = async (cert) => {
    try { await apiClient.delete(`/admin/certificates/${cert.id}`); setConfirmDelete(null); setNotice(`Deleted ${cert.title} and its files.`); load(); } catch { setError("It wasn't deleted. Try again."); }
  };

  const field = (key, label, props = {}) => (
    <TextField id={`cert-${key}`} label={label} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      error={Boolean(fieldErrors[key])} helperText={fieldErrors[key] || props.helperText} fullWidth {...props} />
  );

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ mb: 0.5 }}>Certificates</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: "62ch" }}>
            Visitors see a watermarked preview and a link to the issuer's own record. Original files are private.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => open(null)} sx={{ alignSelf: { sm: "flex-start" } }}>Add certificate</Button>
      </Stack>

      {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}
      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}
      {!items && !error && <Stack gap={1.5}>{[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={120} />)}</Stack>}
      {items?.length === 0 && <Typography color="text.secondary" sx={{ py: 3 }}>No certificates yet.</Typography>}

      <Stack gap={1.5}>
        {items?.map((c) => (
          <Box key={c.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper", display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "140px 1fr" }, alignItems: "start" }}>
            <Box sx={{ aspectRatio: "1.41", maxWidth: "100%", borderRadius: 1, overflow: "hidden", bgcolor: "action.hover", display: "grid", placeItems: "center" }}>
              {c.previewUrl
                ? <Box component="img" src={c.previewUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Typography variant="caption" color="text.secondary">No file yet</Typography>}
            </Box>
            <Box sx={{ minWidth: 0, display: "grid", gap: 1 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.institution} · {formatDate(c.issueDate)}</Typography>
                </Box>
                <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="flex-start">
                  <Chip size="small" label={CERT_TYPES[c.type]} />
                  <Chip size="small" label={c.isPublished ? "Published" : "Hidden"} color={c.isPublished ? "success" : "default"} variant={c.isPublished ? "filled" : "outlined"} />
                </Stack>
              </Stack>
              {!c.verification && (
                <Typography variant="body2" sx={{ display: "flex", gap: 0.75, alignItems: "center", color: "warning.main" }}>
                  <FiAlertTriangle aria-hidden="true" /> No verification link. Visitors see the image only.
                </Typography>
              )}
              {c.verification && !c.verification.isIssuer && (
                <Typography variant="body2" sx={{ display: "flex", gap: 0.75, alignItems: "center", color: "warning.main" }}>
                  <FiAlertTriangle aria-hidden="true" /> {c.verification.note} Use the issuer's link behind “Show credential” instead.
                </Typography>
              )}
              {c.verification?.isIssuer && (
                <Typography variant="body2" sx={{ display: "flex", gap: 0.75, alignItems: "center", color: "success.main" }}>
                  <FiCheckCircle aria-hidden="true" /> {c.verification.label}
                </Typography>
              )}
              {c.legacyPublicFile && <Alert severity="warning" variant="outlined">This has an old public download link. Upload the file again to make it private.</Alert>}
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button size="small" startIcon={<FiEdit2 />} onClick={() => open(c)}>Edit</Button>
                <Button size="small" startIcon={<FiUpload />} onClick={() => setUploading(c)}>{c.hasOriginal ? "Replace file" : "Upload file"}</Button>
                {c.hasOriginal && <Button size="small" startIcon={<FiDownload />} onClick={() => downloadOriginal(c)}>Download original</Button>}
                {confirmDelete === c.id ? (
                  <>
                    <Button size="small" color="error" variant="contained" onClick={() => remove(c)}>Delete it and its files</Button>
                    <Button size="small" onClick={() => setConfirmDelete(null)}>Keep</Button>
                  </>
                ) : (
                  <Button size="small" color="error" startIcon={<FiTrash2 />} onClick={() => setConfirmDelete(c.id)}>Delete</Button>
                )}
              </Stack>
            </Box>
          </Box>
        ))}
      </Stack>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing === "new" ? "Add certificate" : "Edit certificate"}</DialogTitle>
        <DialogContent>
          <Stack gap={2.5} sx={{ pt: 1 }}>
            {fieldErrors._form && <Alert severity="error">{fieldErrors._form}</Alert>}
            {field("title", "Title (as printed on the certificate)")}
            {field("institution", "Issued by")}
            <TextField id="cert-type" select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              helperText={form.type === "CERTIFICATION" ? "Only for exam-based professional certifications (e.g. AWS, Microsoft, Cisco)." : "Course completions and certifications are shown separately."}>
              {Object.entries(CERT_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            {field("category", "Category (optional, e.g. AI, Web, Cloud)")}
            <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {field("issueDate", "Issued on", { type: "date", InputLabelProps: { shrink: true } })}
              {field("expiresAt", "Expires on (if it does)", { type: "date", InputLabelProps: { shrink: true } })}
            </Box>
            {field("credentialUrl", "Verification link", { helperText: "The issuer's page (Credly, Coursera, Microsoft Learn…). On LinkedIn, use the link behind “Show credential”." })}
            {field("credentialId", "Credential ID (optional)")}
            <FormControlLabel control={<Switch checked={form.showCredentialId} onChange={(e) => setForm({ ...form, showCredentialId: e.target.checked })} />} label="Show the credential ID publicly" />
            <FormControlLabel control={<Switch checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />} label="Show on the website" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>

      {uploading && (
        <UploadDialog cert={uploading} onClose={() => setUploading(null)} onDone={() => { setUploading(null); setNotice("File uploaded. The watermarked preview is ready."); load(); }} />
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3, color: theme.palette.text.secondary }}>
        Previews can still be screenshotted, as anything on screen can. The verification link is what proves a certificate is genuine.
      </Typography>
    </Box>
  );
}
