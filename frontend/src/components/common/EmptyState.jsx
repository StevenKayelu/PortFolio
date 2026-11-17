import { Box, Stack, Typography, useTheme } from "@mui/material";

/**
 * A considered "nothing published yet" panel: says what will appear here,
 * why it isn't here yet, and what the visitor can do now. Never shows
 * placeholder data as if it were real.
 */
export default function EmptyState({ icon: Icon, eyebrow, title, children, items, actions }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: 1, borderColor: "divider", borderRadius: `${theme.custom.radii.xl}px`, bgcolor: "background.paper",
        p: { xs: 3, md: 5 }, display: "grid", gap: { xs: 3, md: 5 },
        gridTemplateColumns: { xs: "1fr", md: items ? "1.1fr 0.9fr" : "1fr" },
      }}
    >
      <Stack gap={2} sx={{ maxWidth: "58ch" }}>
        {Icon && (
          <Box sx={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: theme.custom.elevatedBg, color: "primary.main" }}>
            <Icon size={22} aria-hidden="true" />
          </Box>
        )}
        {eyebrow && (
          <Typography sx={{ fontFamily: theme.custom.fontMono, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: theme.custom.accentText }}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h3" component="h2">{title}</Typography>
        <Box sx={{ color: "text.secondary", display: "grid", gap: 1.5 }}>{children}</Box>
        {actions && <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 1 }}>{actions}</Stack>}
      </Stack>
      {items && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, alignSelf: "center", borderTop: 1, borderColor: "divider" }}>
          {items.map(({ label, detail }) => (
            <Box component="li" key={label} sx={{ py: 1.75, borderBottom: 1, borderColor: "divider", display: "grid", gap: 0.25 }}>
              <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
              {detail && <Typography variant="body2" color="text.secondary">{detail}</Typography>}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
