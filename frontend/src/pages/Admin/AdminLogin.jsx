import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Box, Container, Typography, TextField, Button, Alert, Stack, useTheme } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminLogin() {
  const theme = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Admin Login</title></Helmet>
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", bgcolor: "background.default" }}>
        <Container maxWidth="xs">
          <Typography sx={{ fontFamily: theme.custom.fontMono, fontWeight: 600, mb: 0.5 }}>
            {"</"}<Box component="span" sx={{ color: "primary.main" }}>admin</Box>{">"}
          </Typography>
          <Typography variant="h2" sx={{ mb: 4 }}>Sign in</Typography>

          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <TextField label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
