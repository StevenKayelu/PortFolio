import { useEffect, useState } from "react";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, Chip, CircularProgress, Alert,
} from "@mui/material";
import apiClient from "../../services/apiClient";

const STATUS_COLORS = { NEW: "primary", READ: "default", REPLIED: "success", ARCHIVED: "default", SPAM: "error" };

export default function ManageMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    apiClient
      .get("/contact")
      .then((res) => setMessages(res.data))
      .catch(() => setError("Couldn't load messages — check the API is running."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (id, status) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    await apiClient.patch(`/contact/${id}`, { status }).catch(() => load());
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Messages</Typography>

      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="warning">{error}</Alert>}

      {!loading && !error && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>From</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Received</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{m.email}</Typography>
                </TableCell>
                <TableCell>{m.subject || "—"}</TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body2" noWrap>{m.message}</Typography>
                </TableCell>
                <TableCell>{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={m.status}
                    onChange={(e) => updateStatus(m.id, e.target.value)}
                    renderValue={(v) => <Chip size="small" label={v} color={STATUS_COLORS[v]} />}
                  >
                    {["NEW", "READ", "REPLIED", "ARCHIVED", "SPAM"].map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {messages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No messages yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
