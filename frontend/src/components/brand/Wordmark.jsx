import { Box, useTheme } from "@mui/material";

/**
 * Text wordmarks until real logo files are supplied. Each mark uses the
 * brand's own glyph: a copper diamond (Devegen), a drafting square
 * (DevGen Solutions) and plain set type for Steven.
 */
export default function Wordmark({ brandKey, inverse = false }) {
  const theme = useTheme();
  const glyph = {
    width: 11,
    height: 11,
    flexShrink: 0,
    border: `1.5px solid ${brandKey === "devegen" ? theme.custom.copper : "currentColor"}`,
    transform: brandKey === "devegen" ? "rotate(45deg)" : "none",
    borderRadius: brandKey === "solutions" ? "2px" : 0,
  };

  if (brandKey === "steven") {
    return (
      <Box component="span" sx={{ fontFamily: theme.custom.fontSerif, fontSize: "1.3rem", lineHeight: 1, letterSpacing: "-0.01em" }}>
        Steven Kayelu
      </Box>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1.25,
        fontWeight: 700,
        fontSize: { xs: "0.82rem", sm: "0.92rem" },
        letterSpacing: brandKey === "devegen" ? { xs: "0.08em", sm: "0.14em" } : "0.01em",
        textTransform: brandKey === "devegen" ? "uppercase" : "none",
        color: inverse ? "inherit" : "text.primary",
        whiteSpace: "nowrap",
      }}
    >
      <Box component="span" aria-hidden="true" sx={glyph} />
      {brandKey === "devegen" ? "Devegen Ventures" : "DevGen Solutions"}
    </Box>
  );
}
