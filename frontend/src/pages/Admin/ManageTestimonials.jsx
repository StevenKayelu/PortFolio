import { useEffect, useState } from "react";
import {
  Box, Typography, Stack, Card, CardContent, Button, Chip, CircularProgress, Alert,
} from "@mui/material";
import apiClient from "../../services/apiClient";

export default function ManageTestimonials() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    apiClient
      .get("/testimonials/admin/all")
      .then((res) => setItems(res.data))
      .catch(() => setError("Couldn't load testimonials — check the API is running."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setApproved = async (id, isApproved) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, isApproved } : t)));
    await apiClient.patch(`/testimonials/${id}`, { isApproved }).catch(() => load());
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Testimonials</Typography>

      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="warning">{error}</Alert>}

      <Stack spacing={2}>
        {items.map((t) => (
          <Card key={t.id} elevation={0}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{t.clientName} · {t.clientCompany}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 500 }}>"{t.content}"</Typography>
                </Box>
                <Chip size="small" label={t.isApproved ? "Approved" : "Pending"} color={t.isApproved ? "success" : "default"} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                {!t.isApproved && <Button size="small" variant="contained" onClick={() => setApproved(t.id, true)}>Approve</Button>}
                {t.isApproved && <Button size="small" variant="outlined" onClick={() => setApproved(t.id, false)}>Unpublish</Button>}
              </Stack>
            </CardContent>
          </Card>
        ))}
        {!loading && items.length === 0 && <Typography color="text.secondary">No testimonials yet.</Typography>}
      </Stack>
    </Box>
  );
}
