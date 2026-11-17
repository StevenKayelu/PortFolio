import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Stack, ToggleButtonGroup, ToggleButton, TextField, MenuItem, Alert, Skeleton, Button, Table, TableHead,
  TableRow, TableCell, TableBody, useTheme,
} from "@mui/material";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import apiClient from "../../services/apiClient";
import { formatCount, formatDate } from "../../utils/format";

/**
 * Page visits for both sites. Privacy: no cookies, no stored IP addresses;
 * visitors are counted with a code that changes every day.
 */

const RANGES = [{ value: 7, label: "7 days" }, { value: 30, label: "30 days" }, { value: 90, label: "90 days" }, { value: 365, label: "1 year" }];
const SITE_LABEL = { steven: "stevenkayelu.online", devegen: "devgenventures.com", unknown: "Before site tracking" };
const DEVICE_LABEL = { mobile: "Phone", tablet: "Tablet", desktop: "Computer", unknown: "Unknown" };

// Validated (dataviz validator) against the light #FFFFFF and dark #111F35 surfaces.
const SERIES = {
  light: { steven: "#2769B6", devegen: "#B8862A", unknown: "#8A96A8" },
  dark: { steven: "#5B93D6", devegen: "#B08A3E", unknown: "#6B788C" },
};

function change(current, previous) {
  if (!previous) return current ? "New this period" : "No change";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} ${Math.abs(pct)}% vs the previous period`;
}

function Tile({ label, value, note }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper", minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</Typography>
      <Typography sx={{ fontSize: { xs: "1.7rem", md: "2rem" }, fontWeight: 600, lineHeight: 1.2, mt: 0.5 }}>{value}</Typography>
      {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
    </Box>
  );
}

/** Ranked list with a proportional bar; numbers stay in text colours. */
function BarList({ title, rows, empty }) {
  const theme = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper", minWidth: 0 }}>
      <Typography variant="h4" component="h3" sx={{ mb: 1.5, fontSize: "1.05rem" }}>{title}</Typography>
      {rows.length === 0 && <Typography variant="body2" color="text.secondary">{empty}</Typography>}
      <Stack component="ol" gap={1.25} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {rows.map((r) => (
          <Box component="li" key={r.key} sx={{ minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" gap={1} alignItems="baseline">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{r.label}</Typography>
                {r.sub && <Typography variant="caption" color="text.secondary">{r.sub}</Typography>}
              </Box>
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{r.display ?? formatCount(r.value)}</Typography>
            </Stack>
            <Box sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: "action.hover" }}>
              <Box sx={{ height: "100%", width: `${Math.max(2, (r.value / max) * 100)}%`, borderRadius: 3, bgcolor: r.color || theme.palette.primary.main }} />
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

/** One row per day for the whole range, zeros included. */
function buildDays(daily, days, sites) {
  const map = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() + 2 * 3600000 - i * 86400000).toISOString().slice(0, 10); // Lusaka days
    map.set(d, Object.fromEntries([["day", d], ...sites.flatMap((s) => [[s, 0], [`${s}Visitors`, 0]])]));
  }
  for (const r of daily) {
    const row = map.get(r.day);
    if (row && sites.includes(r.site)) { row[r.site] = r.views; row[`${r.site}Visitors`] = r.visitors; }
  }
  return [...map.values()];
}

export default function Analytics() {
  const theme = useTheme();
  const colors = SERIES[theme.palette.mode] || SERIES.light;
  const [days, setDays] = useState(30);
  const [site, setSite] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [asTable, setAsTable] = useState(false);

  useEffect(() => {
    setData(null);
    apiClient.get("/admin/analytics", { params: { days, site } })
      .then((r) => { setData(r.data); setError(""); })
      .catch(() => setError("Visits couldn't be loaded. Try again."));
  }, [days, site]);

  const sites = useMemo(() => {
    if (site !== "all") return [site];
    const present = new Set((data?.daily || []).map((r) => r.site));
    return ["steven", "devegen", ...(present.has("unknown") ? ["unknown"] : [])];
  }, [data, site]);
  const series = useMemo(() => (data ? buildDays(data.daily, days, sites) : []), [data, days, sites]);
  const dayLabel = (d) => formatDate(`${d}T12:00:00Z`).replace(/ \d{4}$/, "");

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 0.5, fontSize: { xs: "1.6rem", md: undefined } }}>Visits</Typography>
      <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: "70ch" }}>
        Page visits on both sites. No cookies and no stored IP addresses: visitors are counted with a code that changes every day,
        so one person visiting on three days counts as three visitors. Bots and your own admin pages are left out.
      </Typography>

      {/* Filters: one row above the charts. */}
      <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mb: 3 }}>
        <ToggleButtonGroup exclusive size="small" value={days} onChange={(_, v) => v && setDays(v)} aria-label="Time range"
          sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", "& .MuiToggleButton-root": { textTransform: "none", px: 1.5 } }}>
          {RANGES.map((r) => <ToggleButton key={r.value} value={r.value}>{r.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <TextField select size="small" label="Site" value={site} onChange={(e) => setSite(e.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="all">Both sites</MenuItem>
          <MenuItem value="steven">{SITE_LABEL.steven}</MenuItem>
          <MenuItem value="devegen">{SITE_LABEL.devegen}</MenuItem>
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <Skeleton variant="rounded" height={360} />}

      {data && (
        <Stack gap={2.5}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" } }}>
            <Tile label="Page views" value={formatCount(data.current.views)} note={change(data.current.views, data.previous.views)} />
            <Tile label="Visitors" value={formatCount(data.current.visitors)} note={change(data.current.visitors, data.previous.visitors)} />
            <Tile label="Pages per visitor" value={data.current.visitors ? (data.current.views / data.current.visitors).toFixed(1) : "—"} note="Average across the period" />
          </Box>

          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: { xs: 1.5, md: 2 }, bgcolor: "background.paper", minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              <Typography variant="h4" component="h3" sx={{ fontSize: "1.05rem" }}>Page views per day</Typography>
              <Button size="small" onClick={() => setAsTable((v) => !v)}>{asTable ? "Show chart" : "Show as table"}</Button>
            </Stack>
            {sites.length > 1 && (
              <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mb: 1 }} aria-hidden={asTable}>
                {sites.map((s) => (
                  <Stack key={s} direction="row" gap={0.75} alignItems="center">
                    <Box sx={{ width: 14, height: 3, borderRadius: 2, bgcolor: colors[s] }} />
                    <Typography variant="caption" color="text.secondary">{SITE_LABEL[s]}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
            {asTable ? (
              <Box sx={{ overflowX: "auto", maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      {sites.map((s) => <TableCell key={s} align="right">{SITE_LABEL[s]}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...series].reverse().map((r) => (
                      <TableRow key={r.day}>
                        <TableCell>{formatDate(`${r.day}T12:00:00Z`)}</TableCell>
                        {sites.map((s) => <TableCell key={s} align="right">{r[s]} views · {r[`${s}Visitors`]} visitors</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Box sx={{ height: { xs: 220, md: 280 } }} role="img" aria-label={`Page views per day over the last ${days} days. Use "Show as table" for the numbers.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={theme.palette.divider} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip
                      cursor={{ stroke: theme.palette.text.secondary, strokeDasharray: "3 3" }}
                      contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(d) => formatDate(`${d}T12:00:00Z`)}
                      formatter={(value, name, item) => [`${value} views · ${item.payload[`${name}Visitors`]} visitors`, SITE_LABEL[name]]}
                    />
                    {sites.map((s) => (
                      <Line key={s} type="monotone" dataKey={s} stroke={colors[s]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: theme.palette.background.paper }} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Box>

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "2fr 1fr" } }}>
            <BarList
              title="Most visited pages"
              empty="No visits in this period yet."
              rows={data.pages.map((p) => ({
                key: `${p.site}${p.path}`, label: p.path, value: p.views,
                sub: `${site === "all" ? `${SITE_LABEL[p.site]} · ` : ""}${formatCount(p.visitors)} visitors`,
                color: colors[p.site],
              }))}
            />
            <Stack gap={2}>
              <BarList
                title="Where visitors came from"
                empty="No links from other websites yet. Visits from typed addresses, bookmarks and many apps (including WhatsApp) show no source."
                rows={data.referrers.map((r) => ({ key: r.host, label: r.host, value: r.views }))}
              />
              <BarList
                title="Devices"
                empty="No visits yet."
                rows={(() => {
                  const total = data.devices.reduce((n, d) => n + d.views, 0) || 1;
                  return data.devices.map((d) => ({ key: d.device, label: DEVICE_LABEL[d.device] || d.device, value: d.views, display: `${Math.round((d.views / total) * 100)}%` }));
                })()}
              />
            </Stack>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
