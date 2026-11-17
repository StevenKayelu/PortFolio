import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Stack, Chip, Button, TextField, Alert, Skeleton, ToggleButton, ToggleButtonGroup, useTheme,
} from "@mui/material";
import { FiCheck, FiX, FiRotateCcw } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { useLiveRefresh } from "../../context/AdminRealtimeContext";
import { useAdminBrand } from "../../context/AdminBrandContext";

import { formatDateTime } from "../../utils/format";
const FIELD_LABEL = {
  name: "Name", summary: "Summary", description: "Description", stage: "Stage", website: "Website", logoUrl: "Logo",
  displayOrder: "Display order", lifecycle: "Lifecycle", ventureId: "Venture", projectId: "Case study", brandId: "Brand",
};
const show = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const fmt = formatDateTime;

/** Side-by-side "before → after" for each changed field. */
function Diff({ changes, before }) {
  const theme = useTheme();
  return (
    <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.25 }}>
      {Object.keys(changes).map((k) => (
        <Box key={k} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "8rem 1fr 1fr" }, gap: { xs: 0.5, sm: 1.5 }, alignItems: "start" }}>
          <Box component="dt" sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.72rem", color: "text.secondary", pt: 0.5 }}>{FIELD_LABEL[k] || k}</Box>
          <Box component="dd" sx={{ m: 0, p: 1, borderRadius: 1, bgcolor: "action.hover", textDecoration: "line-through", textDecorationColor: theme.palette.error.main, color: "text.secondary", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
            {show(before?.[k])}
          </Box>
          <Box component="dd" sx={{ m: 0, p: 1, borderRadius: 1, border: 1, borderColor: "success.main", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
            {show(changes[k])}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Approval queue for editors' changes to published ventures/products,
 * plus recent history with rollback (report §08 "publishing by approval").
 */
export default function ManageApprovals() {
  const [tab, setTab] = useState("PENDING");
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(null);
  const { brandKey, brands } = useAdminBrand();
  const brandId = brands.find((b) => b.key === brandKey)?.id;

  const load = useCallback(() => {
    setItems(null);
    apiClient.get("/admin/revisions", { params: { status: tab } })
      .then((r) => { setItems(r.data); setError(""); })
      .catch(() => setError("Changes couldn't be loaded. Try again."));
  }, [tab]);
  useEffect(load, [load]);
  useLiveRefresh("approval", load);

  const act = async (id, action) => {
    setBusy(id); setError("");
    try {
      await apiClient.post(`/admin/revisions/${id}/${action}`, action === "restore" ? undefined : { reviewNote: notes[id] || undefined });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "That didn't work. Try again.");
    } finally { setBusy(null); }
  };

  const visible = (items || []).filter((r) => !brandId || r.brandId === brandId);

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 0.5 }}>Approvals</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Editors' changes to published ventures and products wait here until a brand admin approves them.
      </Typography>

      <ToggleButtonGroup exclusive value={tab} onChange={(_, v) => v && setTab(v)} aria-label="Show changes" sx={{ mb: 3, "& .MuiToggleButton-root": { textTransform: "none", px: 2 } }}>
        <ToggleButton value="PENDING">Waiting</ToggleButton>
        <ToggleButton value="APPLIED">Applied</ToggleButton>
        <ToggleButton value="REJECTED">Declined</ToggleButton>
      </ToggleButtonGroup>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!items && !error && <Stack gap={1.5}>{[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={140} />)}</Stack>}
      {items && visible.length === 0 && (
        <Box sx={{ py: 6, textAlign: "center", border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 2 }}>
          <Typography variant="h4" component="p">{tab === "PENDING" ? "Nothing waiting for approval" : "No changes yet"}</Typography>
          <Typography color="text.secondary">
            {tab === "PENDING" ? "When an editor changes published content, it will appear here." : "Reviewed changes will be listed here."}
          </Typography>
        </Box>
      )}

      <Stack gap={2}>
        {visible.map((r) => (
          <Box key={r.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: { xs: 2, sm: 2.5 }, bgcolor: "background.paper", display: "grid", gap: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>
                  {r.entity?.name || "Deleted record"} <Chip size="small" variant="outlined" label={r.entityType === "VENTURE" ? "Venture" : "Product"} sx={{ ml: 1 }} />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.author?.name || "Someone"} · {fmt(r.createdAt)}
                  {r.reviewer && r.status !== "PENDING" ? ` · ${r.status === "APPLIED" ? "applied" : "declined"} by ${r.reviewer.name}` : ""}
                </Typography>
              </Box>
            </Stack>
            {r.note && <Typography variant="body2">“{r.note}”</Typography>}
            <Diff changes={r.changes} before={r.status === "PENDING" ? r.entity?.current : r.previous} />
            {r.reviewNote && <Typography variant="body2" color="text.secondary">Review note: {r.reviewNote}</Typography>}

            {r.status === "PENDING" && (
              <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
                <TextField
                  id={`review-note-${r.id}`} size="small" label="Note to the editor (optional)" fullWidth
                  value={notes[r.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <Stack direction="row" gap={1}>
                  <Button variant="contained" startIcon={<FiCheck />} disabled={busy === r.id || !r.entity || r.entity.deleted} onClick={() => act(r.id, "approve")}>Approve</Button>
                  <Button variant="outlined" color="inherit" startIcon={<FiX />} disabled={busy === r.id} onClick={() => act(r.id, "reject")}>Decline</Button>
                </Stack>
              </Stack>
            )}
            {r.status === "APPLIED" && r.previous && (
              <Box>
                <Button size="small" startIcon={<FiRotateCcw />} disabled={busy === r.id} onClick={() => act(r.id, "restore")}>
                  Roll back to the earlier values
                </Button>
              </Box>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
