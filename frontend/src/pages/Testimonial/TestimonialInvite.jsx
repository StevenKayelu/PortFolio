import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import {
  Box, Container, Typography, Stack, TextField, MenuItem, Button, Checkbox, FormControlLabel, Alert, Skeleton, Rating, useTheme,
} from "@mui/material";
import { FiCheck } from "react-icons/fi";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import apiClient from "../../services/apiClient";

const RELATIONSHIPS = ["Client", "Employer", "Colleague", "Partner", "Collaborator"];
const EMPTY = { clientRole: "", clientCompany: "", relationship: "Client", content: "", rating: 5, consentPublish: false, consentContact: false };

/**
 * The private page a client reaches from their invite link. They write
 * their testimonial, give (or withhold) consent, and can later edit or
 * withdraw it with the same link. Nothing is published without approval.
 */
export default function TestimonialInvite() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("form"); // form | saving | done | withdrawing | confirmWithdraw
  const [notice, setNotice] = useState("");

  const load = () => apiClient.get(`/testimonials/invite/${token}`)
    .then(({ data }) => {
      setInvite(data);
      if (data.submission && data.submission.status !== "WITHDRAWN") {
        const s = data.submission;
        setForm({ ...EMPTY, clientRole: s.clientRole || "", clientCompany: s.clientCompany || "", relationship: s.relationship || "Client", content: s.content, rating: s.rating, consentContact: s.consentContact });
      }
    })
    .catch((e) => setLoadError(e.response?.data?.error || "This link couldn't be opened. Check your connection and try again."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [token]);

  const set = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
    setErrors(({ [key]: _cleared, ...rest }) => rest);
  };

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.content.trim().length < 20) local.content = "Write at least 20 characters.";
    if (!form.consentPublish) local.consentPublish = "Tick this box so the testimonial can be published.";
    setErrors(local);
    if (Object.keys(local).length) { document.getElementById(`t-${Object.keys(local)[0]}`)?.focus(); return; }
    setState("saving");
    try {
      await apiClient.post(`/testimonials/invite/${token}`, form);
      setState("done");
      setNotice("");
      load();
    } catch (err) {
      const res = err.response?.data;
      if (res?.fields) setErrors(Object.fromEntries(Object.entries(res.fields).map(([k, v]) => [k, v[0]])));
      setNotice(res?.error || "Your testimonial wasn't sent. Try again.");
      setState("form");
    }
  };

  const withdraw = async () => {
    setState("withdrawing");
    try {
      await apiClient.post(`/testimonials/invite/${token}/withdraw`);
      setForm(EMPTY);
      setState("form");
      setNotice("Your testimonial has been withdrawn and its text deleted.");
      load();
    } catch {
      setState("confirmWithdraw");
      setNotice("It wasn't withdrawn. Try again.");
    }
  };

  const brandName = invite?.brand.name;
  const submission = invite?.submission;
  const canEdit = invite && !invite.expired;

  return (
    <>
      <Helmet>
        <title>Share your experience</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, sm: 3 } }}>
        {!invite && !loadError && <Stack gap={2}><Skeleton height={60} width="70%" /><Skeleton variant="rounded" height={320} /></Stack>}

        {loadError && (
          <Box>
            <Typography variant="h2" component="h1">This link isn't working.</Typography>
            <Typography color="text.secondary" sx={{ mt: 2, maxWidth: "56ch" }}>{loadError}</Typography>
          </Box>
        )}

        {invite && (
          <>
            <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.75rem", letterSpacing: "0.12em", color: theme.custom.accentText, textTransform: "uppercase" }}>
              Private link for {invite.clientName}
            </Typography>
            <Typography variant="h1" sx={{ mt: 1.5, mb: 2, maxWidth: "20ch" }}>
              {submission && submission.status !== "WITHDRAWN" ? "Your testimonial" : `How was working with ${brandName}?`}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: "60ch", mb: 4 }}>
              {invite.project ? <>This is about <b>{invite.project.title}</b>. </> : null}
              Say what's true for you, in your own words. Nothing is published unless you agree below, and {brandName} reviews it first. You can change or withdraw it any time with this link.
            </Typography>

            {submission?.status === "PUBLISHED" && <Alert severity="success" sx={{ mb: 3 }}>Your testimonial is published. Thank you. If you edit it, it will be reviewed again before it reappears.</Alert>}
            {submission?.status === "AWAITING_APPROVAL" && state !== "done" && <Alert severity="info" sx={{ mb: 3 }}>Received. It's waiting for {brandName} to review it.</Alert>}
            {notice && <Alert severity={notice.includes("withdrawn and") ? "success" : "error"} sx={{ mb: 3 }}>{notice}</Alert>}
            {invite.expired && <Alert severity="warning" sx={{ mb: 3 }}>This link expired before a testimonial was sent. Ask {brandName} for a new link.</Alert>}

            <AnimatePresence mode="wait" initial={false}>
              {state === "done" ? (
                <motion.div key="done" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Box role="status" sx={{ border: 1, borderColor: "success.main", borderRadius: `${theme.custom.radii.lg}px`, p: { xs: 3, md: 4 }, display: "grid", gap: 1.5, justifyItems: "start" }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "success.main", color: "#fff", display: "grid", placeItems: "center" }}><FiCheck size={22} aria-hidden="true" /></Box>
                    <Typography variant="h3" component="h2">Thank you, {invite.clientName.split(" ")[0]}.</Typography>
                    <Typography color="text.secondary">{brandName} will review it before it appears. Keep this link if you want to change or withdraw it later.</Typography>
                    <Button variant="outlined" onClick={() => setState("form")}>Review what I sent</Button>
                  </Box>
                </motion.div>
              ) : canEdit && (
                <motion.div key="form" initial={false}>
                  <Stack component="form" gap={2.5} onSubmit={submit} noValidate>
                    <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                      <TextField id="t-clientRole" label="Your role (optional)" value={form.clientRole} onChange={set("clientRole")} placeholder="e.g. Operations Manager" />
                      <TextField id="t-clientCompany" label="Organisation (optional)" value={form.clientCompany} onChange={set("clientCompany")} />
                    </Box>
                    <TextField id="t-relationship" select label={`How did you work with ${brandName}?`} value={form.relationship} onChange={set("relationship")}>
                      {RELATIONSHIPS.map((r) => <MenuItem key={r} value={r}>{r === "Client" ? "As a client" : r === "Employer" ? "As an employer" : `As a ${r.toLowerCase()}`}</MenuItem>)}
                    </TextField>
                    <TextField
                      id="t-content" label="Your testimonial" multiline minRows={5} value={form.content} onChange={set("content")}
                      error={Boolean(errors.content)} inputProps={{ maxLength: 1500 }}
                      helperText={errors.content || `What was the situation, what was done, and what changed? ${form.content.length}/1500`}
                    />
                    <Box>
                      <Typography component="legend" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Your rating</Typography>
                      <Rating name="t-rating" value={form.rating} onChange={(_, v) => v && setForm((f) => ({ ...f, rating: v }))} />
                    </Box>

                    <Box sx={{ border: 1, borderColor: errors.consentPublish ? "error.main" : "divider", borderRadius: 2, p: 2, display: "grid", gap: 1 }}>
                      <Typography variant="h4" component="h2">Your consent</Typography>
                      <FormControlLabel
                        sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { mt: -0.75 } }}
                        control={<Checkbox id="t-consentPublish" checked={form.consentPublish} onChange={set("consentPublish")} />}
                        label={<>{invite.consent.publish} <b>(required)</b></>}
                      />
                      {errors.consentPublish && <Typography variant="body2" color="error" sx={{ ml: 4 }}>{errors.consentPublish}</Typography>}
                      <FormControlLabel
                        sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { mt: -0.75 } }}
                        control={<Checkbox id="t-consentContact" checked={form.consentContact} onChange={set("consentContact")} />}
                        label={<>{invite.consent.contact} (optional)</>}
                      />
                      <Typography variant="caption" color="text.secondary">Your email address is never shown on the website.</Typography>
                    </Box>

                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                      <Button type="submit" variant="contained" size="large" disabled={state === "saving"}>
                        {state === "saving" ? "Sending…" : submission && submission.status !== "WITHDRAWN" ? "Save changes" : "Send testimonial"}
                      </Button>
                    </Stack>
                  </Stack>
                </motion.div>
              )}
            </AnimatePresence>

            {submission && submission.status !== "WITHDRAWN" && (
              <Box sx={{ mt: 5, pt: 3, borderTop: 1, borderColor: "divider" }}>
                <Typography variant="h4" component="h2">Withdraw your testimonial</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, mb: 1.5, maxWidth: "60ch" }}>
                  It will be removed from the website and its text deleted. You can write a new one later with this link.
                </Typography>
                {state === "confirmWithdraw" || state === "withdrawing" ? (
                  <Stack direction="row" gap={1}>
                    <Button color="error" variant="contained" onClick={withdraw} disabled={state === "withdrawing"}>
                      {state === "withdrawing" ? "Withdrawing…" : "Yes, withdraw it"}
                    </Button>
                    <Button onClick={() => setState("form")}>Keep it</Button>
                  </Stack>
                ) : (
                  <Button color="error" variant="outlined" onClick={() => { setNotice(""); setState("confirmWithdraw"); }}>Withdraw my testimonial</Button>
                )}
              </Box>
            )}
          </>
        )}
      </Container>
    </>
  );
}
