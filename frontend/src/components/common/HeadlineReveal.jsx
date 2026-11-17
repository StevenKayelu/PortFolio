import { Box } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Hero headline whose lines rise in reading order, once per page load
 * (420ms each, 70ms stagger). Static with prefers-reduced-motion.
 * `lines` is an array of nodes, one per visual line.
 */
export default function HeadlineReveal({ lines, component = "h1", id, sx, delay = 0 }) {
  const reduceMotion = useReducedMotion();
  return (
    <Box component={component} id={id} sx={{ m: 0, ...sx }}>
      {lines.map((line, i) => (
        <Box key={i} component="span" sx={{ display: "block", overflow: "hidden", pb: "0.06em" }}>
          <motion.span
            style={{ display: "block" }}
            initial={reduceMotion ? false : { y: "0.5em", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.42, delay: delay + i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {line}
          </motion.span>
        </Box>
      ))}
    </Box>
  );
}
