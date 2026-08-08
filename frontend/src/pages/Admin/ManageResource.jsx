import { useEffect, useState } from "react";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Chip, CircularProgress, Alert, Tooltip, Button, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, MenuItem, Autocomplete,
} from "@mui/material";
import { FiTrash2, FiEdit2, FiPlus } from "react-icons/fi";
import apiClient from "../../services/apiClient";

const emptyValueFor = (field) => {
  if (field.type === "boolean") return false;
  if (field.type === "tags") return [];
  return "";
};

function FieldInput({ field, value, onChange, selectOptions }) {
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

  return (
    <TextField
      label={field.label}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value ?? ""}
      onChange={(e) => onChange(field.type === "number" ? e.target.valueAsNumber || 0 : e.target.value)}
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
export default function ManageResource({ title, endpoint, columns, fields = [], selectOptionsEndpoints = {} }) {
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
      .get(endpoint)
      .then((res) => setItems(res.data.items || res.data))
      .catch(() => setError("Couldn't load this resource — check the API is running."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [endpoint]);

  useEffect(() => {
    Object.entries(selectOptionsEndpoints).forEach(([fieldName, path]) => {
      apiClient.get(path).then((res) => {
        const raw = res.data.items || res.data;
        setSelectOptions((prev) => ({
          ...prev,
          [fieldName]: raw.map((r) => ({ value: r.id ?? r.slug, label: r.name ?? r.title })),
        }));
      });
    });
  }, [selectOptionsEndpoints]);

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
      if (editingId) {
        await apiClient.patch(`${endpoint}/${editingId}`, formData);
      } else {
        await apiClient.post(endpoint, formData);
      }
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
    await apiClient.delete(`${endpoint}/${id}`).catch(() => {});
    load();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        {title && <Typography variant="h2">{title}</Typography>}
        {fields.length > 0 && (
          <Button variant="contained" startIcon={<FiPlus />} onClick={openCreate} sx={{ ml: "auto" }}>
            Add new
          </Button>
        )}
      </Stack>

      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (
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
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.render ? col.render(item) : item[col.key]}</TableCell>
                ))}
                <TableCell align="right">
                  {fields.length > 0 && (
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <FiEdit2 size={16} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(item.id)}>
                      <FiTrash2 size={16} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Nothing here yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
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
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}