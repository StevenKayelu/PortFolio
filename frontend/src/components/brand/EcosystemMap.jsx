import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Stack, Typography, ToggleButton, ToggleButtonGroup, Button, useTheme } from "@mui/material";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { ECOSYSTEM_LAYOUTS } from "../../brand/ecosystem";
import { useEcosystem } from "../../brand/useEcosystem";
import { useBrand } from "../../context/BrandContext";
import { siteHref } from "../../brand/brands";


// Verified links are always royal blue, so they never share copper with the founder link.
const verifiedStroke = (theme) => (theme.palette.mode === "dark" ? "#79AAE6" : "#2769B6");

const GLYPHS = {
  founder: "M-7 7c1-5 13-5 14 0M0-1a4.5 4.5 0 1 0 0-.01",
  umbrella: "M0-10 10 0 0 10-10 0Z",
  service: "M-8-8h16v16h-16zM-8 0h16M0-8v16",
  slot: "M0-8v16M-8 0h16",
};

function useContainerWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function StatusChip({ tone, children }) {
  const theme = useTheme();
  const color = { ok: theme.palette.success.main, pending: theme.palette.warning.main, open: theme.palette.primary.main }[tone];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.75, width: "fit-content",
        fontFamily: theme.custom.fontMono, fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase",
        px: 1, py: 0.6, borderRadius: 99, border: `1px solid ${color}`, color, whiteSpace: "nowrap",
      }}
    >
      {children}
    </Box>
  );
}

function Legend() {
  const theme = useTheme();
  const items = [
    { label: "Verified", stroke: verifiedStroke(theme), dash: undefined },
    { label: "Founder", stroke: theme.custom.accentText, dash: "6 4" },
    { label: "Awaiting confirmation", stroke: theme.palette.text.secondary, dash: "1 4" },
  ];
  return (
    <Stack direction="row" flexWrap="wrap" gap={2} aria-hidden="true">
      {items.map((i) => (
        <Stack key={i.label} direction="row" alignItems="center" gap={0.75} sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.7rem", color: "text.secondary" }}>
          <svg width="26" height="8" viewBox="0 0 26 8"><path d="M1 4h24" stroke={i.stroke} strokeWidth="2" strokeDasharray={i.dash} strokeLinecap="round" fill="none" /></svg>
          {i.label}
        </Stack>
      ))}
    </Stack>
  );
}

function NodeLink({ node }) {
  const { siteKey } = useBrand();
  if (!node.link) return null;
  const sameSite = node.link.site === siteKey;
  const props = sameSite
    ? { component: NavLink, to: node.link.path }
    : { component: "a", href: siteHref(node.link.site, node.link.path) };
  return (
    <Button {...props} variant="outlined" endIcon={<FiArrowRight />} sx={{ alignSelf: "flex-start" }}>
      {node.link.label}
    </Button>
  );
}

/**
 * Interactive map of the Devegen ecosystem. Arrow keys move between
 * nodes (roving tabindex); a list view offers the same content as
 * plain nested structure for screen readers and small screens.
 */
export default function EcosystemMap() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const width = useContainerWidth(canvasRef);
  const inView = useInView(canvasRef, { once: true, amount: 0.3 });
  const { nodes: ECOSYSTEM_NODES, links: ECOSYSTEM_LINKS } = useEcosystem();
  const byId = useMemo(() => Object.fromEntries(ECOSYSTEM_NODES.map((n) => [n.id, n])), [ECOSYSTEM_NODES]);
  const ORDER = useMemo(() => ECOSYSTEM_NODES.map((n) => n.id), [ECOSYSTEM_NODES]);
  const [current, setCurrent] = useState("dv");
  const [view, setView] = useState("map");
  const layout = ECOSYSTEM_LAYOUTS[width && width < 520 ? "tall" : "wide"];
  const node = byId[current] ?? byId.dv;

  const lit = useMemo(() => {
    const s = new Set([current]);
    ECOSYSTEM_LINKS.forEach((l) => {
      if (l.a === current || l.b === current) { s.add(l.a); s.add(l.b); }
    });
    return s;
  }, [current, ECOSYSTEM_LINKS]);

  const select = useCallback((id, focus = false) => {
    setCurrent(id);
    if (focus) requestAnimationFrame(() => svgRef.current?.querySelector(`[data-id="${id}"]`)?.focus());
  }, []);

  const onKeyDown = (e) => {
    const i = ORDER.indexOf(current);
    const next = {
      ArrowRight: ORDER[(i + 1) % ORDER.length], ArrowDown: ORDER[(i + 1) % ORDER.length],
      ArrowLeft: ORDER[(i - 1 + ORDER.length) % ORDER.length], ArrowUp: ORDER[(i - 1 + ORDER.length) % ORDER.length],
      Home: ORDER[0], End: ORDER[ORDER.length - 1],
    }[e.key];
    if (next) { e.preventDefault(); select(next, true); }
  };

  const strokeFor = (kind) => ({
    verified: verifiedStroke(theme),
    founder: theme.custom.accentText,
    pending: theme.palette.text.secondary,
    slot: theme.palette.text.secondary,
  }[kind]);
  const dashFor = (kind) => ({ founder: "6 5", pending: "2 5", slot: "8 6" }[kind]);

  const listItem = (id, children) => {
    const n = byId[id];
    return (
      <Box component="li" key={id} sx={{ listStyle: "none" }}>
        <Box
          component="button"
          type="button"
          onClick={() => select(id)}
          aria-current={current === id ? "true" : undefined}
          sx={{
            all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", display: "grid",
            gridTemplateColumns: "1fr auto", gap: 1.5, alignItems: "center", p: 1.5, borderRadius: 2,
            "&:hover, &[aria-current='true']": { bgcolor: theme.custom.elevatedBg },
            "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}` },
          }}
        >
          <span>
            <Box component="b" sx={{ display: "block", fontWeight: 600 }}>{n.name}</Box>
            <Box component="small" sx={{ color: "text.secondary", fontSize: "0.82rem" }}>{n.role}</Box>
          </span>
          <StatusChip tone={n.status.tone}>{n.status.label}</StatusChip>
        </Box>
        {children?.length > 0 && (
          <Box component="ul" sx={{ m: "4px 0 0 18px", pl: 1.75, borderLeft: `1px dashed ${theme.palette.divider}` }}>
            {children}
          </Box>
        )}
      </Box>
    );
  };

  // Without published products the bottom row is empty, so crop it off.
  const hasProducts = ORDER.some((id) => id.startsWith("p"));
  const [vbW, fullH] = layout.viewBox;
  const vbH = hasProducts ? fullH : fullH - (vbW > 400 ? 70 : 150);
  const [bx, by, bw, bh] = layout.boundary;
  const animateDraw = inView && !reduceMotion;

  return (
    <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "1.45fr 0.85fr" }, alignItems: "start" }}>
      <Box ref={canvasRef} sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.xl}px`, p: 1.25, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ p: 0.75, pb: 1.25 }}>
          <Box sx={{ visibility: view === "map" ? "visible" : "hidden" }}><Legend /></Box>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(_, v) => v && setView(v)}
            aria-label="Ecosystem view"
          >
            <ToggleButton value="map" sx={{ px: 2, minHeight: 40 }}>Map</ToggleButton>
            <ToggleButton value="list" sx={{ px: 2, minHeight: 40 }}>List</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {view === "map" ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${vbW} ${vbH}`}
            role="group"
            aria-label="Devegen Ventures ecosystem map. Use the arrow keys to move between organisations."
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            <rect x={bx} y={by} width={bw} height={bh} rx="22" fill={theme.custom.elevatedBg} stroke={theme.palette.divider} />
            <text x={bx + 16} y={by + 24} fill={theme.palette.text.secondary} style={{ font: `500 10px ${theme.custom.fontMono}`, letterSpacing: "0.12em" }}>
              UMBRELLA
            </text>

            {ECOSYSTEM_LINKS.map((l) => {
              const [x1, y1] = layout.pos[l.a];
              const [x2, y2] = layout.pos[l.b];
              const my = (y1 + y2) / 2 - (l.kind === "founder" ? 30 : 0);
              const on = l.a === current || l.b === current;
              const dash = dashFor(l.kind);
              return (
                <motion.path
                  key={`${l.a}-${l.b}`}
                  d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke={strokeFor(l.kind)}
                  strokeWidth={on ? 2.5 : 1.5}
                  strokeDasharray={dash}
                  strokeLinecap="round"
                  // Only solid links draw in: pathLength overrides strokeDasharray.
                  initial={!dash && !reduceMotion ? { pathLength: 0 } : false}
                  animate={dash || reduceMotion
                    ? { opacity: on ? 1 : 0.28 }
                    : { pathLength: animateDraw ? 1 : 0, opacity: on ? 1 : 0.28 }}
                  transition={{ pathLength: { duration: 0.9, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.15 } }}
                />
              );
            })}

            {ECOSYSTEM_NODES.map((n) => {
              const [x, y] = layout.pos[n.id];
              const selected = n.id === current;
              // Labels get a halo in the colour behind them so connector lines never cut through text.
              const halo = { stroke: ["dv", "ds", "fv"].includes(n.id) ? theme.custom.elevatedBg : theme.palette.background.paper, strokeWidth: 5, paintOrder: "stroke", strokeLinejoin: "round" };
              const ring = {
                umbrella: { fill: "#14243D", stroke: theme.custom.copper, width: 2 },
                founder: { fill: theme.palette.background.paper, stroke: theme.custom.accentText, width: 1.5 },
                service: { fill: theme.palette.background.paper, stroke: theme.palette.primary.main, width: 2 },
                slot: { fill: "none", stroke: theme.palette.text.secondary, width: 1.5, dash: "5 4" },
                product: { fill: theme.palette.background.paper, stroke: theme.palette.text.secondary, width: 1.5, dash: "2 3" },
              }[n.kind];
              return (
                <g
                  key={n.id}
                  data-id={n.id}
                  role="button"
                  tabIndex={selected ? 0 : -1}
                  aria-pressed={selected}
                  aria-label={`${n.name}. ${n.role}. ${n.status.label}.`}
                  transform={`translate(${x} ${y})`}
                  onClick={() => select(n.id, true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(n.id, true); return; }
                    onKeyDown(e);
                  }}
                  style={{ cursor: "pointer", outline: "none", opacity: lit.has(n.id) ? 1 : 0.5, transition: "opacity 150ms" }}
                  className="eco-node"
                >
                  <circle r={n.r + 6} fill="none" stroke={theme.palette.primary.main} strokeWidth="2" className="eco-halo" opacity={selected ? 1 : 0} />
                  <circle r={n.r} fill={ring.fill} stroke={ring.stroke} strokeWidth={ring.width} strokeDasharray={ring.dash} />
                  {GLYPHS[n.kind] && (
                    <path d={GLYPHS[n.kind]} fill="none" stroke={n.kind === "umbrella" ? theme.custom.copper : theme.palette.text.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  <text y={n.r + 18} textAnchor="middle" fill={theme.palette.text.primary} style={{ font: `600 ${n.kind === "product" ? 12 : 13}px ${theme.typography.fontFamily}`, ...halo }}>
                    {n.name}
                  </text>
                  <text y={n.r + 32} textAnchor="middle" fill={theme.palette.text.secondary} style={{ font: `400 10px ${theme.custom.fontMono}`, letterSpacing: "0.04em", ...halo }}>
                    {n.short.toUpperCase()}
                  </text>
                </g>
              );
            })}
            <style>{`.eco-node:hover .eco-halo, .eco-node:focus-visible .eco-halo { opacity: 1; }`}</style>
          </svg>
        ) : (
          <Box component="ul" aria-label="Devegen Ventures ecosystem" sx={{ p: 0.5, m: 0, display: "grid", gap: 0.5 }}>
            {listItem("dv", [listItem("ds", ORDER.filter((id) => id.startsWith("p")).map((id) => listItem(id))), listItem("fv")])}
            <Box component="li" sx={{ listStyle: "none", mt: 1, p: 1.5, borderTop: 1, borderColor: "divider", fontFamily: theme.custom.fontMono, fontSize: "0.7rem", letterSpacing: "0.1em", color: "text.secondary" }}>
              INDEPENDENT IDENTITY
            </Box>
            {listItem("sk")}
          </Box>
        )}
      </Box>

      <Box
        component="aside"
        aria-live="polite"
        sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.xl}px`, p: { xs: 2.5, sm: 3 }, minWidth: 0 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={node.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Stack spacing={1.75}>
              <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.7rem", letterSpacing: "0.12em", color: theme.custom.accentText, textTransform: "uppercase" }}>
                {node.role}
              </Typography>
              <Typography variant="h3" component="h3" sx={{ fontFamily: theme.custom.fontSerif, fontWeight: 400, fontSize: "1.75rem" }}>
                {node.name}
              </Typography>
              <StatusChip tone={node.status.tone}>{node.status.label}</StatusChip>
              <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.5, "& dt": { fontFamily: theme.custom.fontMono, fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }, "& dd": { m: "2px 0 0", fontSize: "0.94rem", overflowWrap: "anywhere" } }}>
                <div><dt>Where it lives</dt><Box component="dd" sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.85rem !important" }}>{node.where}</Box></div>
                <div><dt>Relationship</dt><dd>{node.relationship}</dd></div>
                <div><dt>What visitors find here</dt><dd>{node.visit}</dd></div>
              </Box>
              <NodeLink node={node} />
              <Typography variant="caption" color="text.secondary">
                Arrow keys move between organisations · {ORDER.indexOf(node.id) + 1} of {ORDER.length}
              </Typography>
            </Stack>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
