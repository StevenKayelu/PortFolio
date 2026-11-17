import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container, Typography, TextField, Button, Stack, Box, MenuItem, Checkbox, FormControlLabel,
  ToggleButton, ToggleButtonGroup, Alert, useTheme,
} from "@mui/material";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FiCheck, FiArrowUpRight, FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { NavLink, useSearchParams } from "react-router-dom";
import SectionHeading from "../../components/common/SectionHeading";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";
import { useBrand } from "../../context/BrandContext";
import { siteHref } from "../../brand/brands";

/**
 * Enquiries are routed by type (report §05): career enquiries stay on
 * Steven's site, commercial ones on Devegen. The type is prefixed onto
 * the subject so the existing ContactMessage API needs no change.
 */
const TYPES = {
  steven: [
    { key: "career", label: "Job or career", subject: "Career" },
    { key: "collaboration", label: "Collaboration", subject: "Collaboration" },
    { key: "general", label: "Something else", subject: "General" },
  ],
  devegen: [
    { key: "quote", label: "Request a quote", subject: "Quote" },
    { key: "partnership", label: "Partnership", subject: "Partnership" },
    { key: "general", label: "General question", subject: "General" },
  ],
};

const HEADINGS = {
  career: { title: "Talk about a role or opportunity.", lede: "Recruiters, hiring managers and collaborators: tell me about the role and I will reply personally." },
  collaboration: { title: "Build something together.", lede: "Open-source, research or product collaboration. Share what you have in mind." },
  quote: { title: "Request a quote.", lede: "Describe the project and DevGen Solutions will reply with questions or a scoped proposal." },
  partnership: { title: "Start a partnership conversation.", lede: "Tell Devegen Ventures about the idea, venture or collaboration you are proposing." },
  general: { title: "Get in touch.", lede: "Ask anything. Messages are read by a person, not a bot." },
};

const TIMELINES = ["As soon as possible", "Within 1–3 months", "3–6 months", "Just exploring"];
const BUDGETS = ["Prefer to discuss", "Under ZMW 10,000", "ZMW 10,000–50,000", "ZMW 50,000–150,000", "Above ZMW 150,000"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form, type) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter your name so we know who to reply to.";
  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter an email address like name@company.com.";
  if (form.message.trim().length < 20) errors.message = "Add a little more detail (at least 20 characters).";
  if (type === "quote" && !form.service) errors.service = "Choose the service closest to what you need.";
  if (!form.consent) errors.consent = "Please agree so we can store your message and reply.";
  return errors;
}

const EMPTY = { name: "", email: "", organisation: "", service: "", timeline: "", budget: "", message: "", consent: false, website: "" };

// Server field names → this form's field ids
const SERVER_FIELDS = { organization: "organisation" };

export default function Contact() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { siteKey } = useBrand();
  const types = TYPES[siteKey];
  const [params, setParams] = useSearchParams();
  const type = types.some((t) => t.key === params.get("type")) ? params.get("type") : types[0].key;
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error | limited
  const [reference, setReference] = useState(null);
  const [serverErrors, setServerErrors] = useState({});
  const { data: identity } = useFetch(() => apiClient.get("/site-settings/identity").then((r) => r.data), []);
  const { data: services } = useFetch(() => apiClient.get("/services").then((r) => r.data), []);

  const errors = useMemo(() => validate(form, type), [form, type]);
  const show = (field) => (touched[field] && errors[field]) || serverErrors[field];
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
    setServerErrors(({ [field]: _cleared, ...rest }) => rest);
  };
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));
  const heading = HEADINGS[type];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, message: true, service: true, consent: true });
    if (Object.keys(errors).length) {
      document.getElementById(`contact-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    setStatus("sending");
    setServerErrors({});
    try {
      const { data } = await apiClient.post("/enquiries", {
        site: siteKey,
        type: type.toUpperCase(),
        name: form.name,
        email: form.email,
        organization: form.organisation,
        service: form.service,
        timeline: form.timeline,
        budget: form.budget,
        message: form.message,
        consent: form.consent,
        website: form.website, // honeypot
      });
      setReference(data.reference);
      setStatus("sent");
      setForm(EMPTY);
      setTouched({});
    } catch (err) {
      const res = err.response;
      if (res?.status === 404 || res?.status === 503) {
        // API not yet upgraded or brands not seeded: use the legacy contact endpoint.
        try {
          await postLegacyContact();
          setReference(null);
          setStatus("sent");
          setForm(EMPTY);
          setTouched({});
        } catch (legacyErr) {
          setStatus(legacyErr.response?.status === 429 ? "limited" : "error");
        }
        return;
      }
      if (res?.status === 400 && res.data?.fields) {
        const mapped = Object.fromEntries(Object.entries(res.data.fields).map(([k, v]) => [SERVER_FIELDS[k] || k, v[0]]));
        setServerErrors(mapped);
        setStatus("idle");
        document.getElementById(`contact-${Object.keys(mapped)[0]}`)?.focus();
        return;
      }
      setStatus(res?.status === 429 ? "limited" : "error");
    }
  };

  const postLegacyContact = () => {
    const typeMeta = types.find((t) => t.key === type);
    const details = [
      form.organisation && `Organisation: ${form.organisation}`,
      form.service && `Service: ${form.service}`,
      form.timeline && `Timeline: ${form.timeline}`,
      form.budget && `Budget: ${form.budget}`,
    ].filter(Boolean);
    return apiClient.post("/contact", {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: `[${typeMeta.subject}] ${siteKey === "steven" ? "stevenkayelu.online" : "devgenventures.com"}`,
      message: [...details, details.length ? "" : null, form.message.trim()].filter((l) => l !== null).join("\n"),
    });
  };

  const contactLines = [
    identity?.email && { icon: FiMail, label: identity.email, href: `mailto:${identity.email}` },
    identity?.phone && { icon: FiPhone, label: identity.phone, href: `tel:${identity.phone.replace(/\s/g, "")}` },
    siteKey === "steven" && identity?.location && { icon: FiMapPin, label: identity.location },
  ].filter(Boolean);

  return (
    <>
      <Helmet>
        <title>Contact</title>
        <meta name="description" content="Send an enquiry about a role, a project, a partnership or anything else." />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "grid", gap: { xs: 5, md: 8 }, gridTemplateColumns: { xs: "1fr", md: "1.25fr 0.75fr" }, alignItems: "start" }}>
          <Box sx={{ minWidth: 0 }}>
            <ToggleButtonGroup
              exclusive
              value={type}
              onChange={(_, v) => v && setParams({ type: v }, { replace: true })}
              aria-label="What is your enquiry about?"
              sx={{ display: { xs: "grid", sm: "inline-flex" }, gridTemplateColumns: `repeat(${types.length}, 1fr)`, width: { xs: "100%", sm: "auto" }, mb: 4, "& .MuiToggleButton-root": { px: { xs: 1, sm: 2 }, minHeight: 48, textTransform: "none", fontWeight: 600, lineHeight: 1.25 } }}
            >
              {types.map((t) => <ToggleButton key={t.key} value={t.key}>{t.label}</ToggleButton>)}
            </ToggleButtonGroup>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={type} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }}>
                <SectionHeading eyebrow="Contact" title={heading.title} lede={heading.lede} sx={{ mb: 4 }} />
              </motion.div>
            </AnimatePresence>

            {siteKey === "steven" && (
              <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
                Need software built for your business? Commercial projects go through{" "}
                <Box component="a" href={siteHref("devegen", "/contact?type=quote")} sx={{ color: "inherit", fontWeight: 600 }}>DevGen Solutions</Box>.
              </Alert>
            )}

            <AnimatePresence mode="wait" initial={false}>
              {status === "sent" ? (
                <motion.div key="sent" initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
                  <Box role="status" sx={{ border: 1, borderColor: "success.main", borderRadius: `${theme.custom.radii.lg}px`, p: { xs: 3, md: 4 }, display: "grid", gap: 1.5, justifyItems: "start" }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "success.main", color: "#fff", display: "grid", placeItems: "center" }}>
                      <motion.span initial={reduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 18 }} style={{ display: "inline-flex" }}>
                        <FiCheck size={22} aria-hidden="true" />
                      </motion.span>
                    </Box>
                    <Typography variant="h3" component="h2">Message received.</Typography>
                    <Typography color="text.secondary">Thank you. You will get a reply at the email address you gave.</Typography>
                    {reference && (
                      <Typography color="text.secondary">
                        Your reference is <Box component="b" sx={{ fontFamily: theme.custom.fontMono, color: "text.primary" }}>{reference}</Box>. Quote it if you follow up.
                      </Typography>
                    )}
                    <Button onClick={() => setStatus("idle")} variant="outlined" sx={{ mt: 1 }}>Send another message</Button>
                  </Box>
                </motion.div>
              ) : (
                <motion.div key="form" initial={false} exit={reduceMotion ? undefined : { opacity: 0 }}>
                  <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate aria-describedby="contact-required-note">
                    <Typography id="contact-required-note" variant="body2" color="text.secondary">Fields marked * are required.</Typography>
                    {/* Honeypot: hidden from people and assistive tech; bots that fill it are discarded server-side. */}
                    <Box aria-hidden="true" sx={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
                      <label htmlFor="contact-website">Website</label>
                      <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
                    </Box>
                    <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                      <TextField id="contact-name" label="Name" required autoComplete="name" value={form.name} onChange={set("name")} onBlur={blur("name")} error={Boolean(show("name"))} helperText={show("name") || " "} />
                      <TextField id="contact-email" label="Email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} onBlur={blur("email")} error={Boolean(show("email"))} helperText={show("email") || " "} />
                    </Box>
                    {type !== "career" && (
                      <TextField id="contact-organisation" label="Organisation (optional)" autoComplete="organization" value={form.organisation} onChange={set("organisation")} />
                    )}
                    {type === "quote" && (
                      <>
                        <TextField id="contact-service" select required label="Service" value={form.service} onChange={set("service")} onBlur={blur("service")} error={Boolean(show("service"))} helperText={show("service") || " "}>
                          {(services?.items || []).map((s) => <MenuItem key={s.id} value={s.title}>{s.title}</MenuItem>)}
                          <MenuItem value="Not sure yet">Not sure yet</MenuItem>
                        </TextField>
                        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                          <TextField id="contact-timeline" select label="Timeline (optional)" value={form.timeline} onChange={set("timeline")}>
                            {TIMELINES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                          </TextField>
                          <TextField id="contact-budget" select label="Budget guide (optional)" value={form.budget} onChange={set("budget")}>
                            {BUDGETS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                          </TextField>
                        </Box>
                      </>
                    )}
                    <TextField
                      id="contact-message" label={type === "quote" ? "Describe the project" : "Message"} required multiline minRows={5}
                      value={form.message} onChange={set("message")} onBlur={blur("message")}
                      error={Boolean(show("message"))}
                      helperText={show("message") || (type === "quote" ? "Who will use it, what it should do, and anything that already exists." : " ")}
                    />
                    <Box>
                      <FormControlLabel
                        control={<Checkbox id="contact-consent" checked={form.consent} onChange={set("consent")} onBlur={blur("consent")} />}
                        label={<>I agree that my details are stored to reply to this enquiry, as described in the <NavLink to="/privacy-policy">privacy policy</NavLink>.</>}
                        sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { mt: -0.75 } }}
                      />
                      {show("consent") && <Typography variant="body2" color="error" sx={{ ml: 4 }}>{show("consent")}</Typography>}
                    </Box>
                    <Box aria-live="polite">
                      {status === "error" && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          Your message was not sent because the server did not respond. Try again{identity?.email ? <>, or email <b>{identity.email}</b></> : ""}.
                        </Alert>
                      )}
                      {status === "limited" && (
                        <Alert severity="warning" sx={{ mb: 2 }}>Too many messages were sent from this connection. Wait a few minutes and try again.</Alert>
                      )}
                    </Box>
                    <Button type="submit" variant="contained" size="large" disabled={status === "sending"} sx={{ alignSelf: "flex-start", minWidth: 180 }}>
                      {status === "sending" ? "Sending…" : status === "error" ? "Try again" : "Send message"}
                    </Button>
                  </Stack>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          <Box component="aside" aria-label="Direct contact details" sx={{ borderTop: 2, borderColor: "text.primary", pt: 2.5, display: "grid", gap: 2 }}>
            <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.72rem", letterSpacing: "0.12em", color: "text.secondary" }}>DIRECT</Typography>
            {contactLines.map(({ icon: Icon, label, href }) => (
              <Stack key={label} direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Icon aria-hidden="true" style={{ flexShrink: 0 }} />
                {href ? (
                  <Box component="a" href={href} sx={{ color: "text.primary", overflowWrap: "anywhere" }}>{label}</Box>
                ) : (
                  <Typography sx={{ overflowWrap: "anywhere" }}>{label}</Typography>
                )}
              </Stack>
            ))}
            {identity?.availability && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{identity.availability}</Typography>
            )}
            <Box component="a" href={siteKey === "steven" ? siteHref("devegen") : siteHref("steven")} sx={{ mt: 2, display: "inline-flex", alignItems: "center", gap: 0.75, color: theme.custom.accentText, minHeight: 44 }}>
              {siteKey === "steven" ? "Devegen Ventures" : "Steven Kayelu's portfolio"} <FiArrowUpRight aria-hidden="true" />
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
}
