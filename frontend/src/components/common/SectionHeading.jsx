import { Box, Typography, useTheme } from "@mui/material";
import Reveal from "./Reveal";

/** Eyebrow + heading + optional lede, used to open every section. */
export default function SectionHeading({ eyebrow, title, lede, id, align = "left", inverse = false, sx }) {
  const theme = useTheme();
  const band = theme.custom.band;
  return (
    <Reveal>
      <Box sx={{ display: "grid", gap: 1.5, mb: { xs: 4, md: 5 }, textAlign: align, justifyItems: align === "center" ? "center" : "start", ...sx }}>
        {eyebrow && (
          <Typography
            component="p"
            sx={{
              fontFamily: theme.custom.fontMono, fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase",
              color: inverse ? band?.accent : theme.custom.accentText,
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h2" id={id} sx={{ color: inverse ? band?.ink : "text.primary", maxWidth: "22ch" }}>
          {title}
        </Typography>
        {lede && (
          <Typography sx={{ color: inverse ? band?.muted : "text.secondary", maxWidth: "62ch", fontSize: "1.05rem" }}>
            {lede}
          </Typography>
        )}
      </Box>
    </Reveal>
  );
}
