import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Stack, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, Skeleton, Switch, FormControlLabel, InputAdornment, IconButton,
} from "@mui/material";
import { FiPlus, FiEdit2, FiEye, FiEyeOff, FiKey } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";

const ROLE_LABEL = { SUPER_ADMIN: "Super admin", ADMIN: "Admin", EDITOR: "Editor" };
const SCOPE_LABEL = { "": "No access", ADMIN: "Brand admin", EDITOR: "Editor (drafts)", LEAD_MANAGER: "Leads only" };
const SCOPE_HELP = {
  ADMIN: "Publish, manage ventures and products, handle leads, approve editors' changes",
  EDITOR: "Draft ventures and products; changes to published content need approval",
  LEAD_MANAGER: "See and work this brand's enquiries only",
};

function PasswordField({ id, label, value, onChange, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      id={id} label={label} type={visible ? "text" : "password"} value={value} onChange={onChange} fullWidth
      autoComplete="new-password" error={Boolean(error)} helperText={error || "At least 12 characters."}
      // Hide Edge's built-in reveal button; this field has its own.
      sx={{ "& input::-ms-reveal, & input::-ms-clear": { display: "none" } }}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} edge="end">
              {visible ? <FiEyeOff /> : <FiEye />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

/**
 * Super-admin page: staff accounts, roles and per-brand access
 * (report §08 "users and permissions"). The API enforces every rule
 * shown here; this page only explains and edits them.
 */
export default function ManageUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null); // { mode: "create" | "edit" | "password", user? }
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    Promise.all([apiClient.get("/admin/users"), apiClient.get("/admin/brands")])
      .then(([u, b]) => { setUsers(u.data); setBrands(b.data); setError(""); })
      .catch(() => setError("Users couldn't be loaded. Only super admins can open this page."));
  }, []);
  useEffect(load, [load]);

  const open = (mode, user) => {
    setFieldErrors({});
    setDialog({ mode, user });
    if (mode === "create") setForm({ name: "", email: "", role: "EDITOR", password: "", grants: {} });
    if (mode === "edit") {
      setForm({
        name: user.name, role: user.role, isActive: user.isActive,
        grants: Object.fromEntries(user.brandRoles.map((r) => [r.brand.id, r.scope])),
      });
    }
    if (mode === "password") setForm({ password: "" });
  };

  const save = async () => {
    setSaving(true); setFieldErrors({});
    const roles = Object.entries(form.grants || {}).filter(([, s]) => s).map(([brandId, scope]) => ({ brandId, scope }));
    try {
      if (dialog.mode === "create") {
        const { data } = await apiClient.post("/admin/users", { name: form.name, email: form.email, role: form.role, password: form.password });
        if (roles.length) await apiClient.put(`/admin/users/${data.id}/brand-roles`, { roles });
        setNotice(`${data.name} can now sign in. Share the password with them privately and ask them to change it.`);
      } else if (dialog.mode === "edit") {
        await apiClient.patch(`/admin/users/${dialog.user.id}`, { name: form.name, role: form.role, isActive: form.isActive });
        await apiClient.put(`/admin/users/${dialog.user.id}/brand-roles`, { roles });
        setNotice(`Saved ${form.name}.${!form.isActive && dialog.user.isActive ? " They have been signed out everywhere." : ""}`);
      } else {
        const { data } = await apiClient.post(`/admin/users/${dialog.user.id}/password`, { password: form.password });
        setNotice(data.message);
      }
      setDialog(null);
      load();
    } catch (err) {
      const res = err.response?.data;
      setFieldErrors({ ...(res?.fields ? Object.fromEntries(Object.entries(res.fields).map(([k, v]) => [k, v[0]])) : {}), _form: res?.error || "That wasn't saved. Try again." });
    } finally { setSaving(false); }
  };

  const isSelf = dialog?.user?.id === me?.id;

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ mb: 0.5 }}>Users &amp; access</Typography>
          <Typography color="text.secondary">Super admins see every brand. Everyone else sees only the brands granted here.</Typography>
        </Box>
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => open("create")}>Add person</Button>
      </Stack>

      {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!users && !error && <Stack gap={1}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={72} />)}</Stack>}

      <Stack gap={1}>
        {users?.map((u) => (
          <Box key={u.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper", display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1.2fr 1.6fr auto" }, alignItems: "center", opacity: u.isActive ? 1 : 0.6 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="div" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                {u.name} {u.id === me?.id && <Chip size="small" label="You" sx={{ ml: 0.5 }} />} {!u.isActive && <Chip size="small" label="Deactivated" sx={{ ml: 0.5 }} />}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{u.email}</Typography>
            </Box>
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              <Chip size="small" color={u.role === "SUPER_ADMIN" ? "primary" : "default"} label={ROLE_LABEL[u.role]} />
              {u.role !== "SUPER_ADMIN" && (u.brandRoles.length
                ? u.brandRoles.map((r) => <Chip key={r.brand.id} size="small" variant="outlined" label={`${r.brand.name}: ${SCOPE_LABEL[r.scope]}`} />)
                : <Typography variant="body2" color="text.secondary">No brand access yet</Typography>)}
            </Stack>
            <Stack direction="row" gap={1}>
              <Button size="small" startIcon={<FiEdit2 />} onClick={() => open("edit", u)}>Edit</Button>
              <Button size="small" startIcon={<FiKey />} onClick={() => open("password", u)}>Reset password</Button>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog?.mode === "create" ? "Add a person" : dialog?.mode === "edit" ? `Edit ${dialog.user.name}` : `Reset ${dialog?.user?.name}'s password`}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2.5} sx={{ pt: 1 }}>
            {fieldErrors._form && <Alert severity="error">{fieldErrors._form}</Alert>}
            {dialog?.mode !== "password" && (
              <>
                <TextField id="user-name" label="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} error={Boolean(fieldErrors.name)} helperText={fieldErrors.name} fullWidth />
                {dialog?.mode === "create" && (
                  <TextField id="user-email" label="Email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} error={Boolean(fieldErrors.email)} helperText={fieldErrors.email} fullWidth />
                )}
                <TextField
                  id="user-role" select label="Role" value={form.role || "EDITOR"} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  disabled={isSelf} helperText={isSelf ? "You can't change your own role." : form.role === "SUPER_ADMIN" ? "Full access to every brand, user and legal setting." : "Brand access below decides what they can see."} fullWidth
                >
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
                {form.role !== "SUPER_ADMIN" && (
                  <Box>
                    <Typography variant="h4" component="h3" sx={{ mb: 1 }}>Brand access</Typography>
                    <Stack gap={1.5}>
                      {brands.map((b) => (
                        <TextField
                          key={b.id} id={`grant-${b.key}`} select size="small" label={b.name} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                          value={form.grants?.[b.id] || ""} onChange={(e) => setForm({ ...form, grants: { ...form.grants, [b.id]: e.target.value } })}
                          helperText={SCOPE_HELP[form.grants?.[b.id]] || " "}
                        >
                          {Object.entries(SCOPE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                        </TextField>
                      ))}
                    </Stack>
                  </Box>
                )}
                {dialog?.mode === "edit" && (
                  <FormControlLabel
                    control={<Switch checked={Boolean(form.isActive)} disabled={isSelf} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
                    label={form.isActive ? "Can sign in" : "Deactivated: signed out everywhere and can't sign in"}
                  />
                )}
              </>
            )}
            {dialog?.mode !== "edit" && (
              <PasswordField
                id="user-password" label={dialog?.mode === "create" ? "Temporary password" : "New password"}
                value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} error={fieldErrors.password}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving…" : dialog?.mode === "password" ? "Reset password" : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
