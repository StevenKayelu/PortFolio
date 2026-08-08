import { useState } from "react";
import { Box, IconButton, Menu, MenuItem, ListItemText, Tooltip } from "@mui/material";
import { FiSun, FiMoon, FiDroplet } from "react-icons/fi";
import { useThemeSwitcher } from "../../context/ThemeContext";

export default function ThemeSwitcher() {
  const { themeName, setTheme, toggleLightDark, availableThemes } = useThemeSwitcher();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const currentMode = availableThemes.find((t) => t.key === themeName)?.mode;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Tooltip title="Toggle light / dark">
        <IconButton onClick={toggleLightDark} size="small" aria-label="Toggle light or dark mode">
          {currentMode === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Choose theme">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="small"
          aria-label="Choose color theme"
          aria-haspopup="true"
        >
          <FiDroplet size={18} />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {availableThemes.map((t) => (
          <MenuItem
            key={t.key}
            selected={t.key === themeName}
            onClick={() => {
              setTheme(t.key);
              setAnchorEl(null);
            }}
          >
            <ListItemText primary={t.label} secondary={t.mode} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
