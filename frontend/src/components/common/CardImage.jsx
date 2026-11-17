import { Box } from "@mui/material";

/**
 * Top-of-card image. Thumbnails are cropped to 16:10 (recommended upload:
 * 1600 x 1000); logos are shown whole on a soft background.
 * `bleed` cancels the card's padding so the image reaches its edges.
 */
export default function CardImage({ src, alt = "", logo = false, bleed = 2.5 }) {
  if (!src) return null;
  return (
    <Box sx={{ mx: -bleed, mt: -bleed, mb: 0.5, aspectRatio: logo ? "16 / 7" : "16 / 10", overflow: "hidden", bgcolor: "action.hover", display: "grid", placeItems: "center", borderBottom: 1, borderColor: "divider" }}>
      <Box
        component="img" src={src} alt={alt} loading="lazy"
        sx={logo ? { maxHeight: "70%", maxWidth: "60%", objectFit: "contain" } : { width: "100%", height: "100%", objectFit: "cover" }}
      />
    </Box>
  );
}
