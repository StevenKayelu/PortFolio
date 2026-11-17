import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, Stack, Button, Chip, Alert, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, FormControlLabel, Switch, Divider,
} from "@mui/material";
import { FiPlus, FiEdit2, FiUpload, FiDownload, FiTrash2, FiLock } from "react-icons/fi";
import apiClient from "../../services/apiClient";

/**
 * Business registrations, licences and compliance registrations
 * (super admins only). Only the facts are ever published; documents
 * stay private here.
 */

export const CREDENTIAL_TYPES = {
  PACRA_REGISTRATION: "PACRA registration",
  ZICTA_LICENCE: "ZICTA licence or registration",
  DATA_PROTECTION_REGISTRATION: "Data protection registration",
  OTHER: "Other registration or licence",
};
// Starting suggestions only; confirm against the document.
const DEFAULTS = {
  PACRA_REGISTRATION: { authority: "Patents and Companies Registration Agency (PACRA)", verificationNote: "Search the registered name or number on PACRA's online services." },
  ZICTA_LICENCE: { authority: "Zambia Information and Communications Technology Authority (ZICTA)", verificationNote: "Contact ZICTA to confirm this licence." },
  DATA_PROTECTION_REGISTRATION: { authority: "Office of the Data Protection Commissioner", verificationNote: "Contact the Office of the Data Protection Commissioner to confirm this registration." },
  OTHER: { authority: "", verificationNote: "" },
};
const EMPTY_CRED = { type: "PACRA_REGISTRATION", title: "", authority: DEFAULTS.PACRA_REGISTRATION.authority, referenceNumber: "", issuedAt: "", expiresAt: "", verificationUrl: "", verificationNote: DEFAULTS.PACRA_REGISTRATION.verificationNote, isPublic: false };
const EMPTY_ORG = { legalName: "", tradingName: "", registrationType: "", registry: "", registrationNumber: "", website: "", verificationStatus: "UNVERIFIED", notes: "" };
const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
const errorsFrom = (err) => {
  const res = err.response?.data;
  return { ...(res?.fields ? Object.fromEntries(Object.entries(res.fields).map(([k, v]) => [k, v[0]])) : {}), _form: res?.error || "Not saved. Try again." };
};

function StateChip({ c }) {
  if (c.state === "EXPIRED") return <Chip size="small" color="error" label={`Expired ${fmt(c.expiresAt)}`} />;
  if (c.state === "RENEW_SOON") return <Chip size="small" color="warning" label={`Renew: ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"} left`} />;
  return <Chip size="small" color="success" variant="outlined" label={c.expiresAt ? `Valid until ${fmt(c.expiresAt)}` : "No expiry"} />;
}

function UploadButton({ credential, onDone, onError }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append("original", file, file.name);
    try { await apiClient.post(`/admin/credentials/${credential.id}/file`, form); onDone(); } catch (err) { onError(err.response?.data?.error || "The document wasn't uploaded."); } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <>
      <input ref={ref} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} />
      <Button size="small" startIcon={<FiUpload />} disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "Uploading…" : credential.hasOriginal ? "Replace document" : "Upload document"}
      </Button>
    </>
  );
}

export default function ManageCompliance() {
  const [orgs, setOrgs] = useState(null);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [orgDialog, setOrgDialog] = useState(null); // { org? }
  const [orgForm, setOrgForm] = useState(EMPTY_ORG);
  const [credDialog, setCredDialog] = useState(null); // { org, credential? }
  const [credForm, setCredForm] = useState(EMPTY_CRED);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    Promise.all([apiClient.get("/admin/organizations"), apiClient.get("/admin/brands")])
      .then(([o, b]) => { setOrgs(o.data); setBrands(b.data); setError(""); })
      .catch(() => setError("This page couldn't be loaded. Only super admins can open it."));
  }, []);
  useEffect(load, [load]);

  const openOrg = (org) => {
    setFieldErrors({});
    setOrgForm(org ? Object.fromEntries(Object.keys(EMPTY_ORG).map((k) => [k, org[k] ?? ""])) : { ...EMPTY_ORG, legalName: "DevGen Solutions LTD", registrationType: "Private limited company", registry: "PACRA" });
    setOrgDialog({ org });
  };
  const saveOrg = async () => {
    setFieldErrors({});
    try {
      if (orgDialog.org) await apiClient.patch(`/admin/organizations/${orgDialog.org.id}`, orgForm);
      else await apiClient.post("/admin/organizations", orgForm);
      setOrgDialog(null); setNotice("Organisation saved."); load();
    } catch (err) { setFieldErrors(errorsFrom(err)); }
  };

  const linkBrand = async (org, brandId) => {
    try {
      await apiClient.patch(`/admin/brands/${brandId}`, { organizationId: org.id });
      setNotice("Brand linked."); load();
    } catch (err) { setError(err.response?.data?.error || "The brand wasn't linked."); }
  };

  const openCred = (org, credential) => {
    setFieldErrors({});
    setCredForm(credential
      ? { ...Object.fromEntries(Object.keys(EMPTY_CRED).map((k) => [k, credential[k] ?? EMPTY_CRED[k]])), issuedAt: dateInput(credential.issuedAt), expiresAt: dateInput(credential.expiresAt) }
      : EMPTY_CRED);
    setCredDialog({ org, credential });
  };
  const changeType = (type) => setCredForm((f) => ({
    ...f, type,
    // Swap in the suggested authority/note only if the user hasn't edited them.
    authority: Object.values(DEFAULTS).some((d) => d.authority === f.authority) || !f.authority ? DEFAULTS[type].authority : f.authority,
    verificationNote: Object.values(DEFAULTS).some((d) => d.verificationNote === f.verificationNote) || !f.verificationNote ? DEFAULTS[type].verificationNote : f.verificationNote,
  }));
  const saveCred = async () => {
    setFieldErrors({});
    try {
      if (credDialog.credential) await apiClient.patch(`/admin/credentials/${credDialog.credential.id}`, credForm);
      else await apiClient.post(`/admin/organizations/${credDialog.org.id}/credentials`, credForm);
      setCredDialog(null); setNotice(credForm.isPublic ? "Saved. These facts are now on the compliance page." : "Saved. It isn't shown on the website until you switch it on."); load();
    } catch (err) { setFieldErrors(errorsFrom(err)); }
  };

  const download = async (c) => {
    try {
      const res = await apiClient.get(`/admin/credentials/${c.id}/original`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      Object.assign(document.createElement("a"), { href: url, download: c.originalName || "document" }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("The document couldn't be downloaded."); }
  };
  const remove = async (c) => {
    try { await apiClient.delete(`/admin/credentials/${c.id}`); setConfirmDelete(null); setNotice("Deleted, with its document."); load(); } catch { setError("It wasn't deleted."); }
  };

  const tf = (form, setForm, key, label, props = {}) => (
    <TextField id={`${key}-field`} label={label} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      error={Boolean(fieldErrors[key])} helperText={fieldErrors[key] || props.helperText} fullWidth {...props} />
  );

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ mb: 0.5 }}>Legal &amp; compliance</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: "64ch" }}>
            Registrations and licences. The website shows only the facts you switch on: name, number, dates and how to verify.
            Documents stay private here.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => openOrg(null)} sx={{ alignSelf: { sm: "flex-start" } }}>Add organisation</Button>
      </Stack>

      {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}
      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}
      {!orgs && !error && <Skeleton variant="rounded" height={200} />}
      {orgs?.length === 0 && (
        <Box sx={{ py: 5, textAlign: "center", border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 2 }}>
          <Typography variant="h4" component="p">No organisations yet</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Start with DevGen Solutions LTD, using its exact registered name.</Typography>
          <Button variant="outlined" onClick={() => openOrg(null)}>Add DevGen Solutions LTD</Button>
        </Box>
      )}

      <Stack gap={3}>
        {orgs?.map((org) => (
          <Box key={org.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: { xs: 2, sm: 2.5 }, display: "grid", gap: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}>
              <Box>
                <Typography variant="h3" component="h2" sx={{ fontSize: "1.4rem" }}>{org.legalName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {[org.registrationType, org.registry && `Registry: ${org.registry}`, org.tradingName && `Trading as ${org.tradingName}`].filter(Boolean).join(" · ") || "Details not filled in"}
                </Typography>
              </Box>
              <Stack direction="row" gap={1} alignItems="flex-start">
                <Button size="small" startIcon={<FiEdit2 />} onClick={() => openOrg(org)}>Edit</Button>
                <Button size="small" variant="contained" startIcon={<FiPlus />} onClick={() => openCred(org, null)}>Add registration</Button>
              </Stack>
            </Stack>

            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">Brands:</Typography>
              {org.brands.map((b) => <Chip key={b.id} size="small" label={b.name} />)}
              <TextField id={`link-brand-${org.id}`} select size="small" label="Link a brand" value="" onChange={(e) => linkBrand(org, e.target.value)} sx={{ minWidth: 200 }}>
                {brands.filter((b) => !org.brands.some((x) => x.id === b.id)).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Stack>

            <Divider />
            {org.credentials.length === 0 && <Typography color="text.secondary">No registrations added yet.</Typography>}
            <Stack gap={1.5}>
              {org.credentials.map((c) => (
                <Box key={c.id} sx={{ display: "grid", gap: 1 }}>
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1}>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{c.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {CREDENTIAL_TYPES[c.type]} · {c.authority} · No. {c.referenceNumber} · issued {fmt(c.issuedAt)}
                      </Typography>
                    </Box>
                    <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="flex-start">
                      <StateChip c={c} />
                      <Chip size="small" label={c.isPublic ? "On website" : "Not on website"} color={c.isPublic ? "primary" : "default"} variant={c.isPublic ? "filled" : "outlined"} />
                      {c.hasOriginal && <Chip size="small" icon={<FiLock />} label="Document stored privately" variant="outlined" />}
                    </Stack>
                  </Stack>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button size="small" startIcon={<FiEdit2 />} onClick={() => openCred(org, c)}>Edit</Button>
                    <UploadButton credential={c} onDone={() => { setNotice("Document stored privately."); load(); }} onError={setError} />
                    {c.hasOriginal && <Button size="small" startIcon={<FiDownload />} onClick={() => download(c)}>Download</Button>}
                    {confirmDelete === c.id ? (
                      <>
                        <Button size="small" color="error" variant="contained" onClick={() => remove(c)}>Delete it and its document</Button>
                        <Button size="small" onClick={() => setConfirmDelete(null)}>Keep</Button>
                      </>
                    ) : <Button size="small" color="error" startIcon={<FiTrash2 />} onClick={() => setConfirmDelete(c.id)}>Delete</Button>}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={Boolean(orgDialog)} onClose={() => setOrgDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{orgDialog?.org ? "Edit organisation" : "Add organisation"}</DialogTitle>
        <DialogContent>
          <Stack gap={2.5} sx={{ pt: 1 }}>
            {fieldErrors._form && <Alert severity="error">{fieldErrors._form}</Alert>}
            {tf(orgForm, setOrgForm, "legalName", "Exact registered name", { helperText: "As it appears on the PACRA certificate." })}
            {tf(orgForm, setOrgForm, "tradingName", "Trading name (if different)")}
            {tf(orgForm, setOrgForm, "registrationType", "Type (e.g. Private limited company, Business name)")}
            {tf(orgForm, setOrgForm, "registry", "Registry (e.g. PACRA)")}
            {tf(orgForm, setOrgForm, "website", "Website")}
            <TextField id="org-verification" select label="Record checked against the documents?" value={orgForm.verificationStatus} onChange={(e) => setOrgForm({ ...orgForm, verificationStatus: e.target.value })}>
              <MenuItem value="UNVERIFIED">Not yet</MenuItem>
              <MenuItem value="PENDING">In progress</MenuItem>
              <MenuItem value="VERIFIED">Yes, checked</MenuItem>
            </TextField>
            {tf(orgForm, setOrgForm, "notes", "Private notes", { multiline: true, minRows: 2, helperText: "Never shown on the website." })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrgDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveOrg}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(credDialog)} onClose={() => setCredDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{credDialog?.credential ? "Edit registration" : `Add registration for ${credDialog?.org?.legalName}`}</DialogTitle>
        <DialogContent>
          <Stack gap={2.5} sx={{ pt: 1 }}>
            {fieldErrors._form && <Alert severity="error">{fieldErrors._form}</Alert>}
            <TextField id="cred-type" select label="Kind" value={credForm.type} onChange={(e) => changeType(e.target.value)}>
              {Object.entries(CREDENTIAL_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            {tf(credForm, setCredForm, "title", "Title, exactly as printed", { helperText: "e.g. Certificate of Incorporation" })}
            {tf(credForm, setCredForm, "authority", "Issued by", { helperText: "Check this matches the document." })}
            {tf(credForm, setCredForm, "referenceNumber", "Registration or licence number")}
            <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {tf(credForm, setCredForm, "issuedAt", "Issued on", { type: "date", InputLabelProps: { shrink: true } })}
              {tf(credForm, setCredForm, "expiresAt", "Expires on (if it does)", { type: "date", InputLabelProps: { shrink: true } })}
            </Box>
            {tf(credForm, setCredForm, "verificationUrl", "Verification link (optional)", { helperText: "An official page where someone can check it." })}
            {tf(credForm, setCredForm, "verificationNote", "How to verify (shown to visitors)", { multiline: true, minRows: 2 })}
            <FormControlLabel
              control={<Switch checked={credForm.isPublic} onChange={(e) => setCredForm({ ...credForm, isPublic: e.target.checked })} />}
              label="Show these facts on the website (the document is never shown)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCredDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveCred}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
