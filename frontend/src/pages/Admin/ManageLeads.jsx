import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Stack, Chip, TextField, MenuItem, Button, Drawer, IconButton, Alert, Skeleton,
  Divider, InputAdornment, useTheme, useMediaQuery,
} from "@mui/material";
import { FiX, FiSearch, FiMail, FiPhone, FiUserCheck } from "react-icons/fi";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import apiClient from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useAdminBrand } from "../../context/AdminBrandContext";

import { formatDateTime, formatDate } from "../../utils/format";
const STATUSES = ["NEW", "QUALIFIED", "CONTACTED", "PROPOSAL", "WON", "LOST", "ARCHIVED", "SPAM"];
const TYPE_LABEL = { CAREER: "Career", COLLABORATION: "Collaboration", QUOTE: "Quote", PARTNERSHIP: "Partnership", GENERAL: "General" };
const STATUS_COLOR = { NEW: "primary", QUALIFIED: "info", CONTACTED: "info", PROPOSAL: "warning", WON: "success", LOST: "default", ARCHIVED: "default", SPAM: "error" };

const fmt = formatDateTime;

function LeadDetail({ id, onClose, onChanged }) {
  const theme = useTheme();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiClient.get(`/admin/leads/${id}`).then((r) => setLead(r.data)).catch(() => setError("This lead couldn't be loaded."));
  }, [id]);
  useEffect(load, [load]);

  const patch = async (body) => {
    setBusy(true); setError("");
    try {
      await apiClient.patch(`/admin/leads/${id}`, body);
      load(); onChanged();
    } catch (err) {
      setError(err.response?.data?.error || "That change wasn't saved. Try again.");
    } finally { setBusy(false); }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true); setError("");
    try {
      await apiClient.post(`/admin/leads/${id}/notes`, { body: note.trim() });
      setNote(""); load();
    } catch (err) {
      setError(err.response?.data?.error || "The note wasn't saved. Try again.");
    } finally { setBusy(false); }
  };

  if (!lead) {
    return <Box sx={{ p: 3 }}>{error ? <Alert severity="error">{error}</Alert> : <Skeleton height={200} />}</Box>;
  }

  return (
    <Box sx={{ p: { xs: 2.5, sm: 3 }, display: "grid", gap: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Box>
          <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.72rem", color: "text.secondary", letterSpacing: "0.08em" }}>
            {lead.reference} · {TYPE_LABEL[lead.type]} · {lead.brand.name}
          </Typography>
          <Typography variant="h3" component="h2" sx={{ mt: 0.5 }}>{lead.name}</Typography>
          {lead.organization && <Typography color="text.secondary">{lead.organization}</Typography>}
        </Box>
        <IconButton onClick={onClose} aria-label="Close lead"><FiX /></IconButton>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button size="small" variant="outlined" startIcon={<FiMail />} href={`mailto:${lead.email}?subject=${encodeURIComponent(`Re: your enquiry ${lead.reference}`)}`}>{lead.email}</Button>
        {lead.phone && <Button size="small" variant="outlined" startIcon={<FiPhone />} href={`tel:${lead.phone}`}>{lead.phone}</Button>}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
        <TextField
          id="lead-status" select size="small" label="Status" value={lead.status} disabled={busy}
          onChange={(e) => patch({ status: e.target.value })} sx={{ minWidth: 180 }}
        >
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</MenuItem>)}
        </TextField>
        <Button
          variant="outlined" startIcon={<FiUserCheck />} disabled={busy || lead.assignedTo?.id === user?.id}
          onClick={() => patch({ assignedToId: user.id })}
        >
          {lead.assignedTo ? (lead.assignedTo.id === user?.id ? "Assigned to you" : `Assigned to ${lead.assignedTo.name} — take over`) : "Assign to me"}
        </Button>
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary">Message · received {fmt(lead.createdAt)} via {lead.source || "website"}</Typography>
        <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{lead.message}</Typography>
        {lead.details && (
          <Box component="dl" sx={{ m: 0, mt: 1.5, display: "grid", gridTemplateColumns: "7rem 1fr", rowGap: 0.5, "& dt": { color: "text.secondary", fontSize: "0.85rem" }, "& dd": { m: 0 } }}>
            {Object.entries(lead.details).map(([k, v]) => (<Fragment key={k}><dt>{k[0].toUpperCase() + k.slice(1)}</dt><dd>{String(v)}</dd></Fragment>))}
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {lead.consentAt ? `Consent to store given ${fmt(lead.consentAt)}` : "No consent recorded (legacy message)"}
        </Typography>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h4" component="h3" sx={{ mb: 1.5 }}>Activity</Typography>
        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5, borderLeft: 1, borderColor: "divider", pl: 2 }}>
          {lead.activities.map((a) => (
            <Box component="li" key={a.id}>
              <Typography variant="caption" color="text.secondary">{fmt(a.createdAt)}{a.user ? ` · ${a.user.name}` : ""}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {a.kind === "STATUS_CHANGE" ? `Status: ${a.fromStatus} → ${a.toStatus}` : a.body}
              </Typography>
            </Box>
          ))}
        </Box>
        <Stack component="form" onSubmit={addNote} direction="row" gap={1} sx={{ mt: 2 }}>
          <TextField id="lead-note" size="small" fullWidth label="Add a note" value={note} onChange={(e) => setNote(e.target.value)} multiline maxRows={6} />
          <Button type="submit" variant="contained" disabled={busy || !note.trim()}>Save</Button>
        </Stack>
      </Box>
    </Box>
  );
}

/**
 * Enquiry pipeline. The API only returns leads for brands the signed-in
 * user can manage, so this page needs no brand logic of its own.
 */
export default function ManageLeads() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const reduceMotion = useReducedMotion();
  const [filters, setFilters] = useState({ status: "", type: "", search: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const { brandKey } = useAdminBrand();

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries({ ...filters, brand: brandKey }).filter(([, v]) => v));
    apiClient.get("/admin/leads", { params })
      .then((r) => { setData(r.data); setError(""); })
      .catch((err) => setError(err.response?.status === 404 ? "The leads API isn't deployed yet." : "Leads couldn't be loaded. Check your connection and try again."));
  }, [filters, brandKey]);

  useEffect(() => {
    const t = setTimeout(load, filters.search ? 300 : 0); // debounce typing
    return () => clearTimeout(t);
  }, [load, filters.search]);

  const counts = data?.statusCounts || {};

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 0.5 }}>Leads</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Enquiries from both sites. You only see brands you have access to.</Typography>

      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }} role="group" aria-label="Filter by status">
        <Chip label={`Open (${STATUSES.filter((s) => !["ARCHIVED", "SPAM"].includes(s)).reduce((n, s) => n + (counts[s] || 0), 0)})`}
          color={!filters.status ? "primary" : "default"} variant={!filters.status ? "filled" : "outlined"}
          onClick={() => setFilters((f) => ({ ...f, status: "" }))} />
        {STATUSES.map((s) => (
          <Chip key={s} label={`${s.charAt(0) + s.slice(1).toLowerCase()} (${counts[s] || 0})`}
            color={filters.status === s ? "primary" : "default"} variant={filters.status === s ? "filled" : "outlined"}
            onClick={() => setFilters((f) => ({ ...f, status: s }))} />
        ))}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mb: 3 }}>
        <TextField
          id="lead-search" size="small" label="Search name, email, organisation or reference" fullWidth value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          InputProps={{ startAdornment: <InputAdornment position="start"><FiSearch /></InputAdornment> }}
        />
        <TextField id="lead-type" select size="small" label="Type" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} sx={{ minWidth: 170 }}>
          <MenuItem value="">All types</MenuItem>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <Stack gap={1}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={64} />)}</Stack>}
      {data && data.items.length === 0 && (
        <Box sx={{ py: 6, textAlign: "center", border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 2 }}>
          <Typography variant="h4" component="p">No leads here</Typography>
          <Typography color="text.secondary">
            {filters.status || filters.type || filters.search ? "Try a different filter." : "New enquiries from the contact forms will appear here."}
          </Typography>
        </Box>
      )}

      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1 }}>
        <AnimatePresence initial={false}>
          {data?.items.map((l) => (
            <Box
              component={motion.li} key={l.id} layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }}
            >
              <Box
                component="button" type="button" onClick={() => setOpenId(l.id)}
                sx={{
                  all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", p: 2, borderRadius: 2,
                  border: 1, borderColor: openId === l.id ? "primary.main" : "divider", bgcolor: "background.paper",
                  display: "grid", gap: 1, alignItems: "center",
                  gridTemplateColumns: { xs: "1fr auto", md: "1.4fr 1fr 0.8fr auto" },
                  "&:hover": { borderColor: "primary.main" }, "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}` },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.organization || l.email}</Typography>
                </Box>
                <Typography variant="body2" sx={{ display: { xs: "none", md: "block" } }}>{TYPE_LABEL[l.type]} · {l.brand.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>{formatDate(l.createdAt)}</Typography>
                <Chip size="small" label={l.status} color={STATUS_COLOR[l.status]} variant={l.status === "NEW" ? "filled" : "outlined"} />
              </Box>
            </Box>
          ))}
        </AnimatePresence>
      </Box>

      <Drawer
        anchor={isMobile ? "bottom" : "right"} open={Boolean(openId)} onClose={() => setOpenId(null)}
        PaperProps={{ sx: { width: { md: 520 }, maxHeight: { xs: "92dvh", md: "100%" }, borderRadius: { xs: "16px 16px 0 0", md: 0 } } }}
      >
        {openId && <LeadDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
      </Drawer>
    </Box>
  );
}
