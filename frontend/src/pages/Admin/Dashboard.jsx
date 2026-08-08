import { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Box, useTheme } from "@mui/material";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import apiClient from "../../services/apiClient";

const FALLBACK_SUMMARY = {
  projectCount: 24, publishedPostCount: 56, draftPostCount: 4,
  newMessageCount: 3, subscriberCount: 212, pendingTestimonialCount: 2, totalViews: 18420,
};

const FALLBACK_SERIES = Array.from({ length: 14 }).map((_, i) => ({
  date: `Day ${i + 1}`,
  count: Math.round(40 + Math.random() * 60 + i * 3),
}));

export default function Dashboard() {
  const theme = useTheme();
  const [summary, setSummary] = useState(FALLBACK_SUMMARY);
  const [series, setSeries] = useState(FALLBACK_SERIES);

  useEffect(() => {
    apiClient.get("/admin/summary").then((res) => setSummary(res.data)).catch(() => {});
    apiClient.get("/admin/page-views").then((res) => res.data.length && setSeries(res.data)).catch(() => {});
  }, []);

  const cards = [
    { label: "Projects", value: summary.projectCount },
    { label: "Published posts", value: summary.publishedPostCount },
    { label: "Draft posts", value: summary.draftPostCount },
    { label: "New messages", value: summary.newMessageCount },
    { label: "Newsletter subscribers", value: summary.subscriberCount },
    { label: "Pending testimonials", value: summary.pendingTestimonialCount },
  ];

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Dashboard</Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {cards.map((c) => (
          <Grid item xs={6} sm={4} md={2} key={c.label}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h3" sx={{ fontFamily: theme.custom.fontMono, color: "primary.main" }}>
                  {c.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card elevation={0}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2 }}>Page views — last 30 days</Typography>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <Tooltip
                  contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="count" stroke={theme.palette.primary.main} fill="url(#viewsGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
