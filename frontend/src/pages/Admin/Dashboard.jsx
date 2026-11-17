import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Grid, Card, CardContent, CardActionArea, Typography, Box, Alert, Skeleton, useTheme } from "@mui/material";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import apiClient from "../../services/apiClient";

/**
 * Overview. Shows only real numbers: while loading, skeletons; on
 * failure, an error. (It used to show invented totals and a random
 * chart whenever the API didn't answer.)
 */
export default function Dashboard() {
  const theme = useTheme();
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.get("/admin/summary").then((res) => setSummary(res.data)).catch(() => setError("The dashboard couldn't be loaded. Check your connection and refresh."));
    apiClient.get("/admin/page-views").then((res) => setSeries(res.data)).catch(() => setSeries([]));
  }, []);

  // Cards that need action come first and link to where the work happens.
  const cards = summary ? [
    { label: "New leads", value: summary.newLeadCount, to: "/admin/leads", attention: summary.newLeadCount > 0 },
    { label: "Open leads", value: summary.openLeadCount, to: "/admin/leads" },
    { label: "Waiting for approval", value: summary.pendingApprovalCount, to: "/admin/approvals", attention: summary.pendingApprovalCount > 0 },
    { label: "New messages", value: summary.newMessageCount, to: "/admin/messages", attention: summary.newMessageCount > 0 },
    { label: "Pending testimonials", value: summary.pendingTestimonialCount, to: "/admin/testimonials" },
    ...(summary.expiringCredentialCount ? [{ label: "Registrations to renew", value: summary.expiringCredentialCount, to: "/admin/compliance", attention: true }] : []),
    { label: "Projects", value: summary.projectCount, to: "/admin/projects" },
    { label: "Published posts", value: summary.publishedPostCount, to: "/admin/blog" },
    { label: "Draft posts", value: summary.draftPostCount, to: "/admin/blog" },
  ] : [];

  const totalViews = (series || []).reduce((n, d) => n + d.count, 0);

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Dashboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {!summary && !error && Array.from({ length: 8 }).map((_, i) => (
          <Grid item xs={6} sm={4} md={3} key={i}><Skeleton variant="rounded" height={96} /></Grid>
        ))}
        {cards.map((c) => (
          <Grid item xs={6} sm={4} md={3} key={c.label}>
            <Card elevation={0} sx={{ height: "100%", borderColor: c.attention ? "primary.main" : "divider" }}>
              <CardActionArea component={NavLink} to={c.to} sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h3" component="p" sx={{ fontFamily: theme.custom.fontMono, color: c.attention ? "primary.main" : "text.primary", fontVariantNumeric: "tabular-nums" }}>
                    {c.value ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card elevation={0}>
        <CardContent>
          <Typography variant="h4" component="h2">Page views, last 30 days</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {series?.length ? `${totalViews.toLocaleString()} views across both sites.` : "Counted on the live domains only. No IP addresses are stored."}
          </Typography>
          <Box sx={{ height: 280 }}>
            {!series && <Skeleton variant="rounded" height={280} />}
            {series && series.length === 0 && (
              <Box sx={{ height: "100%", display: "grid", placeItems: "center", border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 2, textAlign: "center", p: 2 }}>
                <Typography color="text.secondary">No page views recorded yet. They'll appear here once the live sites get visitors.</Typography>
              </Box>
            )}
            {series && series.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={theme.palette.divider} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }} formatter={(v) => [v, "Views"]} />
                  <Area type="monotone" dataKey="count" stroke={theme.palette.primary.main} fill="url(#viewsGradient)" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
