import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Box, ToggleButtonGroup, ToggleButton, Divider, useTheme } from "@mui/material";
import {
  FiBold, FiItalic, FiCode, FiLink, FiList, FiImage,
} from "react-icons/fi";
import { LuHeading2, LuHeading3, LuQuote } from "react-icons/lu";
import apiClient from "../../services/apiClient";

/**
 * The editor and the public-facing renderer (RichTextRenderer.jsx) both
 * build on the exact same extension set. That's what makes storing
 * BlogPost.content as TipTap JSON (contentFormat: "tiptap-json") safe —
 * whatever the editor can produce, the renderer can always reproduce.
 */
export const TIPTAP_EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
  Link.configure({ openOnClick: false, autolink: true }),
  Image,
];

function ToolbarButton({ active, onClick, children, label }) {
  return (
    <ToggleButton value={label} selected={active} onClick={onClick} size="small" sx={{ border: "none", p: 1 }}>
      {children}
    </ToggleButton>
  );
}

export default function TiptapEditor({ content, onChange, placeholder = "Start writing…" }) {
  const theme = useTheme();

  const editor = useEditor({
    extensions: [
      ...TIPTAP_EXTENSIONS,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
    editorProps: {
      attributes: {
        style: `min-height: 320px; padding: 16px; outline: none; font-family: ${theme.typography.fontFamily};`,
      },
    },
  });

  if (!editor) return null;

  const insertImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await apiClient.post("/blog/cover-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      editor.chain().focus().setImage({ src: data.url }).run();
    };
    input.click();
  };

  const setLink = () => {
    const url = window.prompt("URL");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.custom.radii.md}px`, overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", p: 0.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: "background.paper" }}>
        <ToolbarButton label="bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <FiBold size={16} />
        </ToolbarButton>
        <ToolbarButton label="italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <FiItalic size={16} />
        </ToolbarButton>
        <ToolbarButton label="code" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <FiCode size={16} />
        </ToolbarButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />
        <ToolbarButton label="h2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <LuHeading2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="h3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <LuHeading3 size={16} />
        </ToolbarButton>
        <ToolbarButton label="quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <LuQuote size={16} />
        </ToolbarButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />
        <ToolbarButton label="bullet" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <FiList size={16} />
        </ToolbarButton>
        <ToolbarButton label="link" active={editor.isActive("link")} onClick={setLink}>
          <FiLink size={16} />
        </ToolbarButton>
        <ToolbarButton label="image" onClick={insertImage}>
          <FiImage size={16} />
        </ToolbarButton>
      </Box>
      <EditorContent editor={editor} />
    </Box>
  );
}
