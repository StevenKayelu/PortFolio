import { Box, Card, CardContent, Avatar, Stack, Typography, useTheme } from "@mui/material";
import { FiStar, FiCheckCircle } from "react-icons/fi";
import { NavLink } from "react-router-dom";

/**
 * One published testimonial. Verified ones (from a private invite link,
 * with recorded consent) say so, with the brand and project they're about.
 */
export default function TestimonialCard({ t, projectBase = "/projects" }) {
  const theme = useTheme();
  const meta = [t.clientRole, t.clientCompany].filter(Boolean).join(" · ");
  return (
    <Card elevation={0} component="figure" sx={{ m: 0, height: "100%" }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, display: "grid", gap: 2, height: "100%", alignContent: "space-between" }}>
        <Box>
          <Stack direction="row" spacing={0.5} sx={{ mb: 2 }} aria-label={`Rated ${t.rating} out of 5`} role="img">
            {Array.from({ length: t.rating }).map((_, i) => (
              <FiStar key={i} size={14} color={theme.palette.primary.main} fill={theme.palette.primary.main} aria-hidden="true" />
            ))}
          </Stack>
          <Typography component="blockquote" sx={{ m: 0, fontFamily: theme.custom.fontSerif, fontSize: { xs: "1.1rem", sm: "1.2rem" }, lineHeight: 1.45, overflowWrap: "break-word" }}>
            “{t.content}”
          </Typography>
        </Box>
        <Box component="figcaption">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontFamily: theme.custom.fontMono, flexShrink: 0 }} aria-hidden="true">
              {t.clientName.charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.clientName}</Typography>
              {meta && <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "break-word" }}>{meta}</Typography>}
            </Box>
          </Stack>
          {t.verified && (
            <Typography variant="caption" sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", flexWrap: "wrap" }}>
              <FiCheckCircle aria-hidden="true" color={theme.palette.success.main} />
              Verified {(t.relationship || "client").toLowerCase()}
              {t.brand ? ` of ${t.brand.name}` : ""}
              {t.project && <> · <Box component={NavLink} to={`${projectBase}/${t.project.slug}`} sx={{ color: "inherit" }}>{t.project.title}</Box></>}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
