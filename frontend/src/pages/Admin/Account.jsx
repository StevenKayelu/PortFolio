import { useState } from "react";
import { Box, Typography, Stack, TextField, Button, Alert } from "@mui/material";
import apiClient from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";

/** Change your own password. Other sessions are signed out; this one continues. */
export default function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.newPassword.length < 12) local.newPassword = "Use at least 12 characters.";
    if (form.newPassword !== form.confirm) local.confirm = "The two new passwords don't match.";
    setErrors(local);
    if (Object.keys(local).length) return;
    setStatus("saving");
    try {
      const { data } = await apiClient.post("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setStatus(data.message);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      const res = err.response?.data;
      setErrors({
        ...(res?.fields ? Object.fromEntries(Object.entries(res.fields).map(([k, v]) => [k, v[0]])) : {}),
        _form: err.response?.status === 429 ? "Too many attempts. Wait 15 minutes and try again." : res?.error || "Your password wasn't changed. Try again.",
      });
      setStatus(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h2" sx={{ mb: 0.5 }}>Account</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Signed in as {user?.name} ({user?.email}).</Typography>

      <Typography variant="h4" component="h3" sx={{ mb: 2 }}>Change password</Typography>
      <Stack component="form" gap={2.5} onSubmit={submit} noValidate>
        {status && status !== "saving" && <Alert severity="success">{status}</Alert>}
        {errors._form && <Alert severity="error">{errors._form}</Alert>}
        <TextField id="current-password" label="Current password" type="password" autoComplete="current-password" required
          value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          error={Boolean(errors.currentPassword)} helperText={errors.currentPassword} />
        <TextField id="new-password" label="New password" type="password" autoComplete="new-password" required
          value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          error={Boolean(errors.newPassword)} helperText={errors.newPassword || "At least 12 characters. A short phrase works well."} />
        <TextField id="confirm-password" label="Repeat new password" type="password" autoComplete="new-password" required
          value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          error={Boolean(errors.confirm)} helperText={errors.confirm} />
        <Button type="submit" variant="contained" disabled={status === "saving"} sx={{ alignSelf: "flex-start" }}>
          {status === "saving" ? "Changing…" : "Change password"}
        </Button>
      </Stack>
    </Box>
  );
}
