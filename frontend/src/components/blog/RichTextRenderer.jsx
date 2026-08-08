import { EditorContent, useEditor } from "@tiptap/react";
import { Box, Typography, useTheme } from "@mui/material";
import { TIPTAP_EXTENSIONS } from "../editor/TiptapEditor";

/**
 * Renders BlogPost.content according to its contentFormat:
 *  - "tiptap-json": rendered through a read-only TipTap instance built
 *    on the exact same extensions as the editor, so nothing written in
 *    the admin can fail to render on the public post.
 *  - "plain" (legacy/seed data): rendered as plain paragraphs, since
 *    there's no rich structure to lose.
 */
export default function RichTextRenderer({ content, contentFormat }) {
  const theme = useTheme();

  if (contentFormat !== "tiptap-json") {
    return (
      <Typography variant="body1" sx={{ fontSize: "1.05rem", lineHeight: 1.8, color: "text.secondary", mb: 5 }}>
        {content}
      </Typography>
    );
  }

  let parsed;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    parsed = null;
  }

  return <TiptapReadOnly content={parsed} theme={theme} />;
}

function TiptapReadOnly({ content, theme }) {
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: content || "",
    editable: false,
  });

  if (!editor) return null;

  return (
    <Box
      sx={{
        mb: 5,
        fontSize: "1.05rem",
        lineHeight: 1.8,
        color: "text.secondary",
        "& h2, & h3, & h4": { color: "text.primary", mt: 4, mb: 1.5 },
        "& p": { mb: 2 },
        "& a": { color: theme.palette.primary.main },
        "& blockquote": {
          borderLeft: `3px solid ${theme.palette.primary.main}`,
          pl: 2, ml: 0, fontStyle: "italic", color: "text.primary",
        },
        "& pre": {
          bgcolor: "background.paper",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.custom.radii.md}px`,
          p: 2, overflowX: "auto",
          fontFamily: theme.custom.fontMono, fontSize: "0.875rem",
        },
        "& img": { maxWidth: "100%", borderRadius: `${theme.custom.radii.md}px`, my: 2 },
        "& ul, & ol": { pl: 3, mb: 2 },
      }}
    >
      <EditorContent editor={editor} />
    </Box>
  );
}
