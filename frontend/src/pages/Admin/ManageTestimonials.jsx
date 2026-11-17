import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Stack, Card, CardContent, Button, Chip, Alert, Skeleton, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, FormControlLabel, Switch, InputAdornment, IconButton, Tooltip, Collapse,
} from "@mui/material";
import { FiPlus, FiCopy, FiCheck, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { useAdminBrand } from "../../context/AdminBrandContext";

import { formatDate } from "../../utils/format";
const INVITE_STATUS = {
  SENT: { label: "Waiting for client", color: "info" },
  AWAITING_APPROVAL: { label: "Answered — review it", color: "warning" },
  PUBLISHED: { label: "Published", color: "success" },
  WITHDRAWN: { label: "Withdrawn by client", color: "default" },
  EXPIRED: { label: "Expired", color: "default" },
  REVOKED: { label: "Revoked", color: "default" },
};
const fmt = formatDate;

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select manually */ }
  };
  return (
    <TextField
      id="invite-link" label="Private link" value={value} fullWidth InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={copied ? "Copied" : "Copy link"}>
              <IconButton onClick={copy} aria-label="Copy link" edge="end">{copied ? <FiCheck /> : <FiCopy />}</IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
      onFocus={(e) => e.target.select()}
    />
  );
}

function ConsentRecord({ t }) {
  const [open, setOpen] = useState(false);
  if (!t.consentText) return null;
  return (
    <Box>
      <Button size="small" onClick={() => setOpen((o) => !o)}>{open ? "Hide consent record" : "Show consent record"}</Button>
      <Collapse in={open}>
        <Typography component="pre" variant="caption" sx={{ whiteSpace: "pre-wrap", m: 0, mt: 1, p: 1.5, bgcolor: "action.hover", borderRadius: 1, fontFamily: "inherit" }}>
          {t.consentText}
        </Typography>
      </Collapse>
    </Box>
  );
}

function TestimonialsTab() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    apiClient.get("/testimonials/admin/all").then((r) => setItems(r.data)).catch(() => setError("Testimonials couldn't be loaded. Try again."));
  }, []);
  useEffect(load, [load]);

  const patch = async (id, body) => {
    setError("");
    try { await apiClient.patch(`/testimonials/${id}`, body); load(); } catch (err) { setError(err.response?.data?.error || "That change wasn't saved."); }
  };

  if (!items && !error) return <Stack gap={1.5}>{[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={140} />)}</Stack>;
  return (
    <Stack gap={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {items?.length === 0 && <Typography color="text.secondary">No testimonials yet. Invite a client from the Invites tab.</Typography>}
      {items?.map((t) => {
        const consented = Boolean(t.consentPublishAt) && !t.withdrawnAt;
        return (
          <Card key={t.id} elevation={0}>
            <CardContent sx={{ display: "grid", gap: 1.5 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {t.clientName}{[t.clientRole, t.clientCompany].filter(Boolean).length ? ` · ${[t.clientRole, t.clientCompany].filter(Boolean).join(", ")}` : ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[t.relationship, t.brand?.name, t.project?.title].filter(Boolean).join(" · ") || "No brand recorded"}
                    {t.clientEmail ? ` · ${t.clientEmail}` : t.invite ? " · email not kept (no contact consent)" : ""}
                  </Typography>
                </Box>
                <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="flex-start">
                  {t.verified
                    ? <Chip size="small" icon={<FiCheckCircle />} label="Verified via invite" color="success" variant="outlined" />
                    : <Chip size="small" icon={<FiAlertTriangle />} label="Unverified source" color="warning" variant="outlined" />}
                  {t.withdrawnAt && <Chip size="small" label={`Withdrawn ${fmt(t.withdrawnAt)}`} />}
                  {!t.withdrawnAt && <Chip size="small" label={t.isApproved ? (t.isFeatured ? "Published · featured" : "Published") : "Not published"} color={t.isApproved ? "success" : "default"} />}
                </Stack>
              </Stack>

              {t.withdrawnAt ? (
                <Typography variant="body2" color="text.secondary">The client withdrew consent. Their words and details were deleted.</Typography>
              ) : (
                <Typography sx={{ whiteSpace: "pre-wrap" }}>“{t.content}”</Typography>
              )}
              {!consented && !t.withdrawnAt && (
                <Alert severity="warning" variant="outlined">
                  No consent to publish is recorded, so this can't be published. Invite this person through a link if you want to use their words.
                </Alert>
              )}
              <ConsentRecord t={t} />
              <Stack direction="row" gap={1} flexWrap="wrap">
                {consented && !t.isApproved && <Button size="small" variant="contained" onClick={() => patch(t.id, { isApproved: true })}>Publish</Button>}
                {t.isApproved && <Button size="small" variant="outlined" onClick={() => patch(t.id, { isApproved: false })}>Unpublish</Button>}
                {t.isApproved && <Button size="small" onClick={() => patch(t.id, { isFeatured: !t.isFeatured })}>{t.isFeatured ? "Remove from homepage" : "Feature on homepage"}</Button>}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

function InvitesTab() {
  const { brands, brandKey } = useAdminBrand();
  const [items, setItems] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    apiClient.get("/admin/testimonial-invites", { params: brandKey ? { brand: brandKey } : {} })
      .then((r) => setItems(r.data)).catch(() => setError("Invites couldn't be loaded. Try again."));
  }, [brandKey]);
  useEffect(load, [load]);
  useEffect(() => {
    apiClient.get("/projects", { params: { includeHidden: "true", pageSize: 50 } }).then((r) => setProjects(r.data.items)).catch(() => {});
  }, []);

  const start = () => {
    setForm({ clientName: "", clientEmail: "", brandId: brands.find((b) => b.key === brandKey)?.id || brands[0]?.id || "", projectId: "", expiresInDays: 30, sendEmail: false });
    setFieldErrors({}); setCreated(null); setOpen(true);
  };

  const create = async () => {
    setSaving(true); setFieldErrors({});
    try {
      const { data } = await apiClient.post("/admin/testimonial-invites", { ...form, expiresInDays: Number(form.expiresInDays) });
      setCreated(data);
      load();
    } catch (err) {
      const res = err.response?.data;
      setFieldErrors({ ...(res?.fields ? Object.fromEntries(Object.entries(res.fields).map(([k, v]) => [k, v[0]])) : {}), _form: res?.error || "The invite wasn't created." });
    } finally { setSaving(false); }
  };

  const revoke = async (id) => {
    setError("");
    try { await apiClient.post(`/admin/testimonial-invites/${id}/revoke`); load(); } catch (err) { setError(err.response?.data?.error || "That link wasn't revoked."); }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
        <Typography color="text.secondary" sx={{ maxWidth: "60ch" }}>
          Each client gets a private link. Only they can use it to write, change or withdraw their testimonial, and it's published only with their consent and your approval.
        </Typography>
        <Button variant="contained" startIcon={<FiPlus />} onClick={start} sx={{ alignSelf: { sm: "flex-start" }, flexShrink: 0 }}>Invite a client</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!items && !error && <Skeleton variant="rounded" height={120} />}
      {items?.length === 0 && <Typography color="text.secondary" sx={{ py: 3 }}>No invites yet.</Typography>}
      <Stack gap={1}>
        {items?.map((i) => (
          <Box key={i.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper", display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "1.3fr 1fr auto" }, alignItems: "center" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>{i.clientName}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{i.clientEmail}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {i.brand.name}{i.project ? ` · ${i.project.title}` : ""} · sent {fmt(i.createdAt)}{i.createdBy ? ` by ${i.createdBy.name}` : ""}
              {i.status === "SENT" ? ` · expires ${fmt(i.expiresAt)}` : ""}
            </Typography>
            <Stack direction="row" gap={1} alignItems="center">
              <Chip size="small" label={INVITE_STATUS[i.status].label} color={INVITE_STATUS[i.status].color} />
              {i.status === "SENT" && <Button size="small" color="inherit" onClick={() => revoke(i.id)}>Revoke</Button>}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{created ? "Invite created" : "Invite a client"}</DialogTitle>
        <DialogContent>
          {created ? (
            <Stack gap={2} sx={{ pt: 1 }}>
              <Alert severity="success">
                {created.emailed
                  ? `We emailed the link to ${form.clientEmail}. You can also copy it below.`
                  : "Copy this link and send it to your client yourself (email, WhatsApp…)."}
                {form.sendEmail && !created.emailed ? " Email isn't set up on the server, so it wasn't sent." : ""}
              </Alert>
              <CopyField value={created.link} />
              <Typography variant="body2" color="text.secondary">
                This is the only time the full link is shown. It works until {fmt(created.expiresAt)} for a first reply, and after that for changes or withdrawal.
              </Typography>
            </Stack>
          ) : (
            <Stack gap={2.5} sx={{ pt: 1 }}>
              {fieldErrors._form && <Alert severity="error">{fieldErrors._form}</Alert>}
              <TextField id="invite-name" label="Client's name" value={form.clientName || ""} onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                error={Boolean(fieldErrors.clientName)} helperText={fieldErrors.clientName || "Shown with their testimonial, exactly as written here."} />
              <TextField id="invite-email" label="Client's email" type="email" value={form.clientEmail || ""} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                error={Boolean(fieldErrors.clientEmail)} helperText={fieldErrors.clientEmail || "Private. Never shown on the website."} />
              <TextField id="invite-brand" select label="About which brand?" value={form.brandId || ""} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
                {brands.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
              <TextField id="invite-project" select label="Project (optional)" value={form.projectId || ""} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                <MenuItem value="">No specific project</MenuItem>
                {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>)}
              </TextField>
              <TextField id="invite-days" label="Link valid for (days)" type="number" inputProps={{ min: 1, max: 90 }} value={form.expiresInDays}
                onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} sx={{ maxWidth: 220 }} />
              <FormControlLabel control={<Switch checked={Boolean(form.sendEmail)} onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })} />}
                label="Also email the link to them (needs email set up on the server)" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{created ? "Done" : "Cancel"}</Button>
          {!created && <Button variant="contained" onClick={create} disabled={saving}>{saving ? "Creating…" : "Create link"}</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Verified, consented testimonials: published quotes and private client invites. */
export default function ManageTestimonials() {
  const [tab, setTab] = useState("testimonials");
  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 0.5 }}>Testimonials</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Only testimonials with the client's recorded consent can be published.</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab value="testimonials" label="Testimonials" />
        <Tab value="invites" label="Invites" />
      </Tabs>
      {tab === "testimonials" ? <TestimonialsTab /> : <InvitesTab />}
    </Box>
  );
}
