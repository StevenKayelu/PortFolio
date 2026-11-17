import { Box, useTheme } from "@mui/material";

/**
 * A full-bleed section on the brand's signature ground: navy ledger
 * for Devegen, drafting-grid blueprint for DevGen Solutions. The band
 * keeps its colours in both light and dark mode, so text inside reads
 * from band tokens, never from the page palette.
 */
export default function Band({ children, grid = false, sx, ...rest }) {
  const theme = useTheme();
  const band = theme.custom.band ?? { bg: theme.palette.background.paper, ink: theme.palette.text.primary };
  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        bgcolor: band.bg,
        color: band.ink,
        overflow: "hidden",
        ...(grid && band.grid
          ? {
              backgroundImage: `linear-gradient(${band.grid} 1px, transparent 1px), linear-gradient(90deg, ${band.grid} 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
              backgroundPosition: "-1px -1px",
            }
          : {}),
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}
