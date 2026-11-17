import { useEffect, useState } from "react";
import {
  Box, Typography, Stack, Select, MenuItem, Chip, CircularProgress, Alert, Button, Collapse,
} from "@mui/material";
import { FiChevronDown, FiChevronUp, FiCornerUpLeft } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { formatDateTime } from "../../utils/format";

const STATUS_COLORS = { NEW: "primary", READ: "default", REPLIED: "success", ARCHIVED: "default", SPAM: "error" };
const STATUS_LABEL = { NEW: "New", READ: "Read", REPLIED: "Replied", ARCHIVED: "Archived", SPAM: "Spam" };

/**
 * Messages from the older contact form. New enquiries arrive as Leads;
 * these stay readable here until they're archived.
 */
export default function ManageMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const load = () => {
    setLoading(true);
    apiClient
      .get("/contact")
      .then((res) => setMessages(res.data.items || res.data))
      .catch(() => setError("Couldn't load messages. Refresh to try again."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (id, status) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    await apiClient.patch(`/contact/${id}`, { status }).catch(() => {
      setError("Couldn't update the status. Refresh and try again.");
      load();
    });
  };

  const toggle = (m) => {
    const next = open === m.id ? null : m.id;
    setOpen(next);
    if (next && m.status === "NEW") updateStatus(m.id, "READ");
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: "1.6rem", md: undefined } }}>Messages</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        From the earlier contact form. New enquiries now arrive in <strong>Leads</strong>.
      </Typography>

      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="warning" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && (
        <Stack gap={1.25}>
          {messages.map((m) => {
            const expanded = open === m.id;
            return (
              <Box key={m.id} sx={{ border: 1, borderColor: m.status === "NEW" ? "primary.main" : "divider", borderRadius: 2, p: { xs: 1.5, md: 2 }, bgcolor: "background.paper", minWidth: 0 }}>
                <Stack direction={{ xs: "column", sm: "row" }} gap={1} justifyContent="space-between" alignItems={{ sm: "flex-start" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{m.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{m.email}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDateTime(m.createdAt)}</Typography>
                  </Box>
                  <Select
                    size="small" value={m.status} onChange={(e) => updateStatus(m.id, e.target.value)}
                    inputProps={{ "aria-label": `Status of the message from ${m.name}` }}
                    renderValue={(v) => <Chip size="small" label={STATUS_LABEL[v]} color={STATUS_COLORS[v]} />}
                    sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                  >
                    {Object.keys(STATUS_LABEL).map((s) => <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>)}
                  </Select>
                </Stack>

                {m.subject && <Typography sx={{ mt: 1, fontWeight: 500, overflowWrap: "anywhere" }}>{m.subject}</Typography>}
                <Collapse in={expanded} collapsedSize={44}>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.message}</Typography>
                </Collapse>

                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => toggle(m)} startIcon={expanded ? <FiChevronUp /> : <FiChevronDown />}>
                    {expanded ? "Show less" : "Read full message"}
                  </Button>
                  <Button
                    size="small" startIcon={<FiCornerUpLeft />}
                    href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message"}`)}`}
                    onClick={() => m.status !== "REPLIED" && updateStatus(m.id, "REPLIED")}
                  >
                    Reply by email
                  </Button>
                </Stack>
              </Box>
            );
          })}
          {messages.length === 0 && !error && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No messages yet.</Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
