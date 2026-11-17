import { useEffect, useRef, useState } from "react";
import {
  Box, Typography, Stack, Tabs, Tab, TextField, Button, Alert, Skeleton, IconButton, Tooltip, Autocomplete, Chip, Avatar,
} from "@mui/material";
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiUpload } from "react-icons/fi";
import apiClient from "../../services/apiClient";

/**
 * Editor for the SiteSetting content shown on stevenkayelu.online:
 * profile (hero), about, stats, tech stack and career timeline.
 * The API validates each section (validation/schemas.js → siteSettingSchemas).
 */

const SECTIONS = [
  { key: "identity", label: "Profile" },
  { key: "about", label: "About" },
  { key: "stats", label: "Stats" },
  { key: "technologies", label: "Tech stack" },
  { key: "timeline", label: "Timeline" },
];

const EMPTY = {
  identity: { name: "", role: "", tagline: "" },
  about: { bio: "", values: [], education: [] },
  stats: [],
  technologies: [],
  timeline: [],
};

/** Repeatable rows with add, remove and reorder. */
function ListEditor({ id, items, onChange, fields, addLabel, max }) {
  const update = (i, key, v) => onChange(items.map((row, j) => (j === i ? { ...row, [key]: v } : row)));
  const move = (i, d) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <Stack gap={1.5}>
      {items.map((row, i) => (
        <Box key={i} sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: `${fields.map((f) => (f.width ? f.width : "minmax(0, 1fr)")).join(" ")} auto` }, alignItems: "start", p: 1.5, border: 1, borderColor: "divider", borderRadius: 2 }}>
          {fields.map((f) => (
            <TextField
              key={f.key} id={`${id}-${i}-${f.key}`} size="small" label={f.label} value={row[f.key] || ""}
              onChange={(e) => update(i, f.key, e.target.value)} multiline={f.multiline} minRows={f.multiline ? 2 : undefined}
            />
          ))}
          <Stack direction="row">
            <Tooltip title="Move up"><span><IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><FiArrowUp /></IconButton></span></Tooltip>
            <Tooltip title="Move down"><span><IconButton size="small" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><FiArrowDown /></IconButton></span></Tooltip>
            <Tooltip title="Remove"><IconButton size="small" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><FiTrash2 /></IconButton></Tooltip>
          </Stack>
        </Box>
      ))}
      <Button startIcon={<FiPlus />} disabled={items.length >= max} onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, ""]))])} sx={{ alignSelf: "flex-start" }}>
        {addLabel}
      </Button>
    </Stack>
  );
}

function PhotoField({ value, alt, onUploaded }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPEG, PNG or WebP photo."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("That photo is over 10 MB. Choose a smaller one."); return; }
    setBusy(true); setError("");
    const data = new FormData();
    data.append("photo", file);
    try {
      const res = await apiClient.post("/site-settings/identity/photo", data);
      onUploaded(res.data.photo);
    } catch (err) {
      setError(err.response?.data?.error || "The photo wasn't uploaded. Try again.");
    } finally { setBusy(false); }
  };
  return (
    <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }}>
      <Avatar src={value || undefined} alt={alt || ""} variant="rounded" sx={{ width: 96, height: 120, bgcolor: "action.hover", color: "text.secondary", fontSize: "0.75rem" }}>
        No photo
      </Avatar>
      <Box>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
        <Button variant="outlined" startIcon={<FiUpload />} disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : value ? "Replace photo" : "Upload your photo"}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 420 }}>
          Your real portrait, shown in the homepage hero. It's converted to WebP and its location data is removed.
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Box>
    </Stack>
  );
}

export default function ManageSiteContent() {
  const [tab, setTab] = useState("identity");
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({}); // per section: { saving, message, error, fields }

  useEffect(() => {
    apiClient.get("/site-settings", { params: { keys: SECTIONS.map((s) => s.key).join(",") } })
      .then((r) => setValues(Object.fromEntries(SECTIONS.map(({ key }) => [key, r.data[key] ?? EMPTY[key]]))))
      .catch(() => setStatus({ _load: "Content couldn't be loaded. Refresh to try again." }))
      .finally(() => setLoading(false));
  }, []);

  const value = values[tab];
  const set = (patch) => setValues((v) => ({ ...v, [tab]: Array.isArray(patch) ? patch : { ...v[tab], ...patch } }));
  const field = (key, label, props = {}) => (
    <TextField
      id={`${tab}-${key}`} label={label} value={value?.[key] || ""} onChange={(e) => set({ [key]: e.target.value })}
      error={Boolean(status[tab]?.fields?.[key])} helperText={status[tab]?.fields?.[key]?.[0] || props.helperText} fullWidth {...props}
    />
  );

  const save = async () => {
    setStatus((s) => ({ ...s, [tab]: { saving: true } }));
    try {
      await apiClient.put(`/site-settings/${tab}`, { value });
      setStatus((s) => ({ ...s, [tab]: { message: "Saved. The site shows the change on the next page load." } }));
    } catch (err) {
      const res = err.response?.data;
      setStatus((s) => ({ ...s, [tab]: { error: res?.error || "Not saved. Try again.", fields: res?.fields } }));
    }
  };

  const current = status[tab] || {};

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 0.5 }}>Site content</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>The text and photo on stevenkayelu.online's homepage and About page.</Typography>
      {status._load && <Alert severity="error" sx={{ mb: 2 }}>{status._load}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        {SECTIONS.map((s) => <Tab key={s.key} value={s.key} label={s.label} />)}
      </Tabs>

      {loading && <Skeleton variant="rounded" height={320} />}
      {!loading && value && (
        <Stack gap={2.5} sx={{ maxWidth: 820 }}>
          {tab === "identity" && (
            <>
              <PhotoField value={value.photo} alt={value.photoAlt} onUploaded={(photo) => set({ photo })} />
              {field("photoAlt", "Photo description (for screen readers)", { helperText: "e.g. Steven Kayelu smiling, wearing a blue shirt" })}
              <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}>
                {field("name", "Name")}
                {field("role", "Role")}
                {field("location", "Location")}
                {field("availability", "Availability")}
              </Box>
              {field("tagline", "Tagline (under the headline)", { multiline: true, minRows: 2 })}
              <Typography variant="h4" component="h3">Contact &amp; profiles</Typography>
              <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}>
                {field("email", "Email")}
                {field("phone", "Phone")}
                {field("github", "GitHub URL")}
                {field("linkedin", "LinkedIn URL")}
                {field("facebook", "Facebook URL")}
              </Box>
            </>
          )}

          {tab === "about" && (
            <>
              {field("bio", "Bio", { multiline: true, minRows: 4 })}
              {field("mission", "Mission", { multiline: true, minRows: 2 })}
              {field("vision", "Vision", { multiline: true, minRows: 2 })}
              {field("goals", "Goals", { multiline: true, minRows: 2 })}
              <Typography variant="h4" component="h3">Values</Typography>
              <ListEditor id="values" items={value.values || []} onChange={(values) => set({ values })} max={12} addLabel="Add a value"
                fields={[{ key: "title", label: "Value", width: "1fr" }, { key: "detail", label: "What it means", width: "2fr", multiline: true }]} />
              <Typography variant="h4" component="h3">Education</Typography>
              <ListEditor id="education" items={value.education || []} onChange={(education) => set({ education })} max={12} addLabel="Add education"
                fields={[{ key: "degree", label: "Qualification" }, { key: "institution", label: "Institution" }, { key: "year", label: "Year", width: "8rem" }]} />
            </>
          )}

          {tab === "stats" && (
            <>
              <Alert severity="info">Use only facts you can back up. These appear as large figures on the homepage.</Alert>
              <ListEditor id="stats" items={value} onChange={set} max={8} addLabel="Add a stat"
                fields={[{ key: "value", label: "Figure (e.g. 14+)", width: "10rem" }, { key: "label", label: "Label (e.g. GitHub repositories)" }]} />
            </>
          )}

          {tab === "technologies" && (
            <Autocomplete
              multiple freeSolo options={[]} value={value} onChange={(_, v) => set(v.map((t) => t.trim()).filter(Boolean))}
              renderTags={(val, getTagProps) => val.map((opt, i) => <Chip label={opt} size="small" {...getTagProps({ index: i })} key={opt} />)}
              renderInput={(params) => <TextField {...params} id="technologies" label="Technologies" placeholder="Type a name and press Enter" />}
            />
          )}

          {tab === "timeline" && (
            <ListEditor id="timeline" items={value} onChange={set} max={40} addLabel="Add a timeline entry"
              fields={[{ key: "year", label: "When (e.g. 2026 — Now)", width: "11rem" }, { key: "title", label: "Title" }, { key: "org", label: "Organisation" }]} />
          )}

          <Box aria-live="polite">
            {current.message && <Alert severity="success">{current.message}</Alert>}
            {current.error && <Alert severity="error">{current.error}</Alert>}
          </Box>
          <Button variant="contained" onClick={save} disabled={current.saving} sx={{ alignSelf: "flex-start" }}>
            {current.saving ? "Saving…" : `Save ${SECTIONS.find((s) => s.key === tab).label.toLowerCase()}`}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
