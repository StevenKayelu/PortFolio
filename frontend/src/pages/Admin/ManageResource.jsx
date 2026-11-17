import { useEffect, useRef, useState } from "react";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Chip, CircularProgress, Alert, Tooltip, Button, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, MenuItem, Autocomplete, InputAdornment, useMediaQuery, useTheme,
} from "@mui/material";
import { FiTrash2, FiEdit2, FiPlus, FiUpload, FiImage } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { useAdminBrand } from "../../context/AdminBrandContext";
import { toDateInput } from "../../utils/format";

const emptyValueFor = (field) => {
  if (field.type === "boolean") return false;
  if (field.type === "tags") return [];
  return "";
};

/** Upload, preview, replace or remove one image (stored as its URL). */
function ImageInput({ field, value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPEG, PNG or WebP image."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("That image is over 10 MB. Choose a smaller one."); return; }
    setBusy(true); setError("");
    const data = new FormData();
    data.append("image", file);
    try {
      onChange((await apiClient.post("/admin/uploads/image", data)).data.url);
    } catch (err) {
      setError(err.response?.data?.error || "The image wasn't uploaded. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{field.label}</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }}>
        <Box sx={{ width: 192, maxWidth: "100%", aspectRatio: field.ratio || "16 / 10", borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider", bgcolor: "action.hover", display: "grid", placeItems: "center", color: "text.secondary" }}>
          {value ? <Box component="img" src={value} alt="" sx={{ width: "100%", height: "100%", objectFit: field.fit || "cover" }} /> : <FiImage size={28} aria-hidden="true" />}
        </Box>
        <Stack gap={1} alignItems="flex-start">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
          <Button variant="outlined" size="small" startIcon={<FiUpload />} disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
          </Button>
          {value && <Button size="small" color="inherit" onClick={() => onChange(null)}>Remove image</Button>}
        </Stack>
      </Stack>
      {field.helperText && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>{field.helperText}</Typography>}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
}

/** Small preview for list columns. */
export const thumbnail = (src) => (src
  ? <Box component="img" src={src} alt="" loading="lazy" sx={{ width: 64, height: 40, objectFit: "cover", borderRadius: 1, display: "block", border: 1, borderColor: "divider" }} />
  : <Typography variant="caption" color="text.secondary">No image</Typography>);

function FieldInput({ field, value, onChange, selectOptions }) {
  if (field.type === "image") return <ImageInput field={field} value={value} onChange={onChange} />;

  if (field.type === "boolean") {
    return (
      <FormControlLabel
        control={<Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />}
        label={field.label}
      />
    );
  }

  if (field.type === "select") {
    const options = field.options || selectOptions?.[field.name] || [];
    return (
      <TextField select label={field.label} value={value ?? ""} onChange={(e) => onChange(e.target.value)} fullWidth>
        {field.allowEmpty && <MenuItem value="">None</MenuItem>}
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === "tags") {
    return (
      <Autocomplete
        multiple freeSolo options={[]}
        value={value || []}
        onChange={(e, val) => onChange(val)}
        renderTags={(val, getTagProps) =>
          val.map((opt, i) => <Chip label={opt} size="small" {...getTagProps({ index: i })} key={opt} />)
        }
        renderInput={(params) => <TextField {...params} label={field.label} placeholder="Press Enter to add" />}
      />
    );
  }

  if (field.type === "money") {
    return (
      <TextField
        label={field.label}
        type="number"
        value={value ?? ""}
        // Empty means "not set" (shown as "Custom pricing"), not K 0.
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
        inputProps={{ min: 0, step: "0.01", inputMode: "decimal" }}
        InputProps={{ startAdornment: <InputAdornment position="start">K</InputAdornment> }}
        helperText={field.helperText}
        fullWidth
      />
    );
  }

  return (
    <TextField
      label={field.label}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={(field.type === "date" ? toDateInput(value) : value) ?? ""}
      onChange={(e) => onChange(field.type === "number"
        ? (e.target.value === "" ? null : e.target.valueAsNumber)
        : field.type === "date" ? e.target.value || null : e.target.value)}
      inputProps={field.type === "number" ? { min: field.min, max: field.max, inputMode: "numeric" } : undefined}
      helperText={field.helperText}
      multiline={field.type === "textarea"}
      rows={field.type === "textarea" ? 3 : undefined}
      required={field.required}
      fullWidth
      InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
    />
  );
}

/**
 * One component drives full CRUD for every simple admin resource
 * (Services, Experience, Certificates, Skills, Gallery, Achievements,
 * FAQ, Projects) — configured per-page in resourcePages.jsx with a
 * `fields` array describing the create/edit form, rather than writing
 * a bespoke form for each.
 */
export default function ManageResource({ title, endpoint, listQuery, brandScoped = false, columns, fields = [], selectOptionsEndpoints = {}, canDelete = true, canCreate = true, intro }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { brandKey } = useAdminBrand();
  // Staff lists include drafts, inactive and unpublished items; the API only honours this for signed-in staff.
  const baseQuery = { includeHidden: "true", ...listQuery };
  const query = brandScoped && brandKey ? { ...baseQuery, brand: brandKey } : baseQuery;
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectOptions, setSelectOptions] = useState({});

  const load = () => {
    setLoading(true);
    apiClient
      .get(endpoint, { params: query })
      .then((res) => setItems(res.data.items || res.data))
      .catch(() => setError("Couldn't load this resource — check the API is running."))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [endpoint, JSON.stringify(query)]);
  // Pages pass selectOptionsEndpoints as an inline object; keying the effect on
  // its contents (not identity) stops it refetching on every render.
  const selectKey = JSON.stringify(selectOptionsEndpoints);

  useEffect(() => {
    Object.entries(selectOptionsEndpoints).forEach(([fieldName, path]) => {
      apiClient.get(path).then((res) => {
        const raw = res.data.items || res.data;
        setSelectOptions((prev) => ({
          ...prev,
          [fieldName]: raw.map((r) => ({ value: r.id ?? r.slug, label: r.name ?? r.title ?? r.legalName })),
        }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectKey]);

  const openCreate = () => {
    const defaults = {};
    fields.forEach((f) => { defaults[f.name] = f.default ?? emptyValueFor(f); });
    setFormData(defaults);
    setEditingId(null);
    setSaveError("");
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    const values = {};
    fields.forEach((f) => { values[f.name] = f.getValue ? f.getValue(item) : item[f.name] ?? emptyValueFor(f); });
    setFormData(values);
    setEditingId(item.id);
    setSaveError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = editingId
        ? await apiClient.patch(`${endpoint}/${editingId}`, formData)
        : await apiClient.post(endpoint, formData);
      // 202: an editor's change to published content is waiting for approval.
      setNotice(res.status === 202 ? res.data.message || "Sent for approval." : "");
      setDialogOpen(false);
      load();
    } catch (err) {
      setSaveError(err.response?.data?.error || "Couldn't save — check required fields.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item? This can't be undone from here.")) return;
    try {
      await apiClient.delete(`${endpoint}/${id}`);
    } catch (err) {
      setError(err.response?.status === 403
        ? "Only admins can delete. Ask a brand admin, or unpublish it instead."
        : err.response?.data?.error || "Couldn't delete it. Try again.");
      return;
    }
    load();
  };

  const actions = (item) => (
    <Stack direction="row" justifyContent="flex-end">
      {fields.length > 0 && (
        <Tooltip title="Edit">
          <IconButton onClick={() => openEdit(item)} aria-label="Edit"><FiEdit2 size={18} /></IconButton>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="Delete">
          <IconButton onClick={() => handleDelete(item.id)} aria-label="Delete"><FiTrash2 size={18} /></IconButton>
        </Tooltip>
      )}
    </Stack>
  );
  const cell = (col, item) => (col.render ? col.render(item) : item[col.key] ?? "—");
  const empty = <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Nothing here yet.</Typography>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
        {title && <Typography variant="h2" sx={{ fontSize: { xs: "1.6rem", md: undefined }, minWidth: 0 }}>{title}</Typography>}
        {fields.length > 0 && canCreate && (
          <Button variant="contained" startIcon={<FiPlus />} onClick={openCreate} sx={{ ml: "auto" }}>
            Add new
          </Button>
        )}
      </Stack>

      {intro && <Typography color="text.secondary" sx={{ mt: -2, mb: 3, maxWidth: "70ch" }}>{intro}</Typography>}
      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="warning" onClose={() => { setError(""); load(); }} sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="info" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice} It will appear here once a brand admin approves it.</Alert>}

      {/* Phones: one card per item, so nothing scrolls sideways. */}
      {!loading && isMobile && (
        <Stack gap={1.25}>
          {items.map((item) => {
            const [first, ...rest] = columns;
            return (
              <Box key={item.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5, bgcolor: "background.paper", minWidth: 0 }}>
                <Stack direction="row" alignItems="flex-start" gap={1}>
                  <Box sx={{ flex: 1, minWidth: 0, fontWeight: 600, overflowWrap: "anywhere", pt: 0.75 }}>{cell(first, item)}</Box>
                  {actions(item)}
                </Stack>
                {rest.length > 0 && (
                  <Box component="dl" sx={{ m: 0, mt: 1, display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", columnGap: 1.5, rowGap: 0.75, alignItems: "center" }}>
                    {rest.map((col) => (
                      <Box key={col.key} sx={{ display: "contents" }}>
                        <Typography component="dt" variant="caption" color="text.secondary">{col.label}</Typography>
                        <Box component="dd" sx={{ m: 0, minWidth: 0, fontSize: "0.875rem", overflowWrap: "anywhere" }}>{cell(col, item)}</Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
          {items.length === 0 && !error && empty}
        </Stack>
      )}

      {!loading && !isMobile && (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => <TableCell key={col.key}>{col.label}</TableCell>)}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  {columns.map((col) => <TableCell key={col.key}>{cell(col, item)}</TableCell>)}
                  <TableCell align="right">{actions(item)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !error && (
                <TableRow><TableCell colSpan={columns.length + 1}>{empty}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingId ? "Edit" : "Add new"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            {fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={formData[field.name]}
                onChange={(val) => setFormData((prev) => ({ ...prev, [field.name]: val }))}
                selectOptions={selectOptions}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}