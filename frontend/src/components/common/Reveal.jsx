import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@mui/material/styles";

/**
 * Wraps children in a scroll-triggered fade/slide-up that plays once.
 * With prefers-reduced-motion the content renders in place, unanimated.
 *
 * Usage: <Reveal delay={0.1}><Card /></Reveal>
 */
export default function Reveal({ children, delay = 0, y = 14, once = true, ...rest }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div {...rest}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.3, delay, ease: theme.custom.motion.easeOut }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
