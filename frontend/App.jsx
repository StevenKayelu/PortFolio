import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@mui/material/styles";

/**
 * Wraps children in a scroll-triggered fade/slide-up. Respects
 * prefers-reduced-motion by skipping the transform entirely.
 *
 * Usage: <Reveal delay={0.1}><Card /></Reveal>
 */
export default function Reveal({ children, delay = 0, y = 24, once = true, ...rest }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: theme.custom.motion.slow, delay, ease: theme.custom.motion.easeOut }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
