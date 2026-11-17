import { IconButton, Tooltip } from "@mui/material";
import { FiSun, FiMoon } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { useThemeSwitcher } from "../../context/ThemeContext";

/**
 * Light ⇄ dark switch. Every click visibly changes the theme (the old
 * system → light → dark cycle looked broken when "system" was already light).
 * Until someone clicks, the site follows the device setting. The icon shows
 * what a click switches to.
 */
export default function ThemeSwitcher() {
  const { mode, setPreference } = useThemeSwitcher();
  const next = mode === "dark" ? "light" : "dark";
  const Icon = next === "dark" ? FiMoon : FiSun;
  const label = `Switch to ${next} theme`;

  return (
    <Tooltip title={label}>
      <IconButton onClick={() => setPreference(next)} aria-label={label} sx={{ width: 44, height: 44 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={mode}
            initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            style={{ display: "inline-flex" }}
          >
            <Icon size={18} />
          </motion.span>
        </AnimatePresence>
      </IconButton>
    </Tooltip>
  );
}
