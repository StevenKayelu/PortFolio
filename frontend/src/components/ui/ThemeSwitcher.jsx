import { IconButton, Tooltip } from "@mui/material";
import { FiSun, FiMoon, FiMonitor } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { useThemeSwitcher } from "../../context/ThemeContext";

const META = {
  system: { icon: FiMonitor, label: "Theme follows your device", next: "light" },
  light: { icon: FiSun, label: "Light theme", next: "dark" },
  dark: { icon: FiMoon, label: "Dark theme", next: "your device setting" },
};

/** Cycles system → light → dark. The icon shows the current setting. */
export default function ThemeSwitcher() {
  const { preference, cyclePreference } = useThemeSwitcher();
  const { icon: Icon, label, next } = META[preference];

  return (
    <Tooltip title={`${label}. Switch to ${next}.`}>
      <IconButton onClick={cyclePreference} aria-label={`${label}. Switch to ${next}.`} sx={{ width: 44, height: 44 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={preference}
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
