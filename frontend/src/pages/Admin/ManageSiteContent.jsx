import { useEffect, useRef, useState } from "react";
import {
  Box, Typography, Stack, Tabs, Tab, TextField, Button, Alert, Skeleton, IconButton, Tooltip, Autocomplete, Chip, MenuItem,
} from "@mui/material";
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiUpload } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { DefaultMark, loadBranding } from "../../components/brand/BrandMark";
import { PHOTO_POSITION } from "../../utils/photo";

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
  { key: "branding", label: "Logo & favicon" },
];

const EMPTY = {
  identity: { name: "", role: "", tagline: "" },
  about: { bio: "", values: [], education: [] },
  stats: [],
  technologies: [],
  timeline: [],
  branding: {},
};

const PHOTO_FOCUS = [
  { value: "top", label: "Top: keep the top of the head" },
  { value: "upper", label: "Upper: face and shoulders (recommended)" },
  { value: "center", label: "Centre: the middle of the photo" },
];

/** Shared upload button: posts one image and reports the API's answer. */
function UploadButton({ endpoint, field = "image", label, onDone, accept = "image/png,image/webp,image/jpeg" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("That file is over 10 MB. Choose a smaller one."); return; }
    setBusy(true); setError("");
    const data = new FormData();
    data.append(field, file);
    try {
      onDone((await apiClient.post(endpoint, data)).data);
    } catch (err) {
      setError(err.response?.data?.error || "It wasn't uploaded. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <Box>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => upload(e.target.files?.[0])} />
      <Button variant="outlined" startIcon={<FiUpload />} disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Uploading…" : label}
      </Button>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
}

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

function PhotoField({ value, alt, position, onUploaded, onPosition }) {
  const objectPosition = PHOTO_POSITION[position] || PHOTO_POSITION.upper;
  const frame = (ratio, width, label) => (
    <Stack gap={0.5} alignItems="center">
      <Box sx={{ width, aspectRatio: ratio, borderRadius: 2, overflow: "hidden", bgcolor: "action.hover", border: 1, borderColor: "divider", display: "grid", placeItems: "center" }}>
        {value
          ? <Box component="img" src={value} alt={alt || ""} sx={{ width: "100%", height: "100%", objectFit: "cover", objectPosition }} />
          : <Typography variant="caption" color="text.secondary">No photo</Typography>}
      </Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Stack>
  );
  return (
    <Stack gap={2}>
      <Stack direction="row" gap={2} alignItems="flex-end" flexWrap="wrap">
        {frame("4 / 5", 120, "Tablets & computers")}
        {frame("1 / 1", 96, "Phones")}
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }}>
        <UploadButton endpoint="/site-settings/identity/photo" field="photo" accept="image/jpeg,image/png,image/webp"
          label={value ? "Replace photo" : "Upload your photo"} onDone={(d) => onUploaded(d.photo)} />
        <TextField select size="small" label="Photo focus" value={position || "upper"} onChange={(e) => onPosition(e.target.value)} sx={{ minWidth: { sm: 300 } }}>
          {PHOTO_FOCUS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>
      <Alert severity="info" variant="outlined">
        <strong>Best results:</strong> a portrait (upright) photo, at least <strong>1200 × 1500 pixels</strong> (4:5), with your face in the
        upper third and some space above your head. A plain background works best. JPEG, PNG or WebP up to 10 MB; it's converted to WebP and
        its location data is removed. The previews above show exactly how it will be trimmed. Remember to save the profile after changing the focus.
      </Alert>
    </Stack>
  );
}

function BrandingTab({ value, set }) {
  const after = (v) => { set(v); loadBranding({ fresh: true }); };
  const tile = { width: 96, height: 96, borderRadius: 2, border: 1, borderColor: "divider", display: "grid", placeItems: "center", bgcolor: "background.paper", overflow: "hidden" };
  return (
    <Stack gap={4}>
      <Box>
        <Typography variant="h4" component="h3" sx={{ mb: 1 }}>Umbrella logo</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Shown in the header and footer of devgenventures.com and in the admin. Without an upload, the built-in DevGen Ventures mark is used.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }}>
          <Stack direction="row" gap={1}>
            <Box sx={tile}>{value.logo ? <Box component="img" src={value.logo} alt="Current logo" sx={{ maxWidth: "80%", maxHeight: "80%" }} /> : <DefaultMark size={64} />}</Box>
            <Box sx={{ ...tile, bgcolor: "#14243D", color: "#F3EFE6" }}>
              {value.logo ? <Box component="img" src={value.logo} alt="" sx={{ maxWidth: "80%", maxHeight: "80%" }} /> : <DefaultMark size={64} color="#F3EFE6" />}
            </Box>
          </Stack>
          <Stack gap={1} alignItems="flex-start">
            <UploadButton endpoint="/site-settings/branding/logo" label={value.logo ? "Replace logo" : "Upload logo"} onDone={after} />
            {value.logo && <Button size="small" color="inherit" onClick={() => set({ logo: "" })}>Use the built-in mark (then save)</Button>}
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Use a <strong>PNG with a transparent background</strong>, at least <strong>512 × 512 pixels</strong>, without words, so it reads on
          light and dark backgrounds (check both previews). Empty margins are trimmed automatically.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h4" component="h3" sx={{ mb: 1 }}>Favicon</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          The small icon in browser tabs, bookmarks and phone home screens, on all sites and the admin.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }}>
          <Stack direction="row" gap={1.5} alignItems="flex-end">
            {[64, 32, 16].map((size) => (
              <Box key={size} sx={{ width: size, height: size, borderRadius: size > 20 ? 1 : 0.5, overflow: "hidden" }}>
                <Box component="img" src={value.favicon512 || value.favicon192 || "/icon-512.png"} alt="" sx={{ width: "100%", height: "100%" }} />
              </Box>
            ))}
          </Stack>
          <Stack gap={1} alignItems="flex-start">
            <UploadButton endpoint="/site-settings/branding/favicon" label={value.favicon32 ? "Replace favicon" : "Upload favicon"} onDone={after} />
            {value.favicon32 && (
              <Button size="small" color="inherit" onClick={() => set({ favicon32: "", favicon180: "", favicon192: "", favicon512: "" })}>
                Use the built-in favicon (then save)
              </Button>
            )}
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Use a <strong>square image, 512 × 512 pixels</strong>, with a solid background and a simple shape (no words; they can't be read at
          16 pixels). All the needed sizes are made from it automatically. Browsers may take a few minutes or a refresh to show a new favicon.
        </Typography>
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
      fullWidth {...props} error={Boolean(status[tab]?.fields?.[key])} helperText={status[tab]?.fields?.[key]?.[0] || props.helperText}
    />
  );

  const save = async () => {
    setStatus((s) => ({ ...s, [tab]: { saving: true } }));
    try {
      await apiClient.put(`/site-settings/${tab}`, { value });
      if (tab === "branding") loadBranding({ fresh: true });
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
      <Typography color="text.secondary" sx={{ mb: 2 }}>The text and photo on stevenkayelu.online's homepage and About page, and the logo and favicon for all sites.</Typography>
      {status._load && <Alert severity="error" sx={{ mb: 2 }}>{status._load}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        {SECTIONS.map((s) => <Tab key={s.key} value={s.key} label={s.label} />)}
      </Tabs>

      {loading && <Skeleton variant="rounded" height={320} />}
      {!loading && value && (
        <Stack gap={2.5} sx={{ maxWidth: 820 }}>
          {tab === "identity" && (
            <>
              <PhotoField value={value.photo} alt={value.photoAlt} position={value.photoPosition} onUploaded={(photo) => set({ photo })} onPosition={(photoPosition) => set({ photoPosition })} />
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
                {field("whatsapp", "WhatsApp number", { helperText: "e.g. +260 97 123 4567. Leave empty to use the phone number for the WhatsApp button." })}
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

          {tab === "branding" && <BrandingTab value={value} set={set} />}

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
