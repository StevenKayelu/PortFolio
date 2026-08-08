import { useEffect, useState } from "react";
import { useNavigate, useParams, NavLink } from "react-router-dom";
import {
  Box, Typography, Stack, TextField, Button, Select, MenuItem, Chip,
  FormControl, InputLabel, Alert, CircularProgress, Autocomplete,
} from "@mui/material";
import { FiArrowLeft, FiUpload } from "react-icons/fi";
import TiptapEditor from "../../components/editor/TiptapEditor";
import apiClient from "../../services/apiClient";

const emptyPost = {
  title: "", slug: "", excerpt: "", content: null, status: "DRAFT",
  categoryId: "", tagNames: [], coverImage: "",
};

export default function BlogEditor() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [post, setPost] = useState(emptyPost);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.get("/blog/categories").then((r) => setCategories(r.data)).catch(() => {});
    if (isEditing) {
      apiClient
        .get(`/blog/id/${id}`)
        .then((r) => {
          const p = r.data;
          setPost({
            title: p.title, slug: p.slug, excerpt: p.excerpt,
            content: p.contentFormat === "tiptap-json" ? JSON.parse(p.content) : p.content,
            status: p.status, categoryId: p.categoryId || "",
            tagNames: (p.tags || []).map((t) => t.tag.name),
            coverImage: p.coverImage || "",
          });
        })
        .catch(() => setError("Couldn't load this post."))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleField = (field) => (e) => setPost((p) => ({ ...p, [field]: e.target.value }));

  const uploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await apiClient.post("/blog/cover-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setPost((p) => ({ ...p, coverImage: data.url }));
  };

  const save = async (status) => {
    setSaving(true);
    setError("");
    const payload = {
      ...post,
      status,
      content: JSON.stringify(post.content || {}),
      contentFormat: "tiptap-json",
      categoryId: post.categoryId || null,
    };
    try {
      if (isEditing) {
        await apiClient.patch(`/blog/${id}`, payload);
      } else {
        await apiClient.post("/blog", payload);
      }
      navigate("/admin/blog");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save this post.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Button component={NavLink} to="/admin/blog" startIcon={<FiArrowLeft />} sx={{ mb: 2, color: "text.secondary" }}>
        Back to posts
      </Button>

      <Typography variant="h2" sx={{ mb: 3 }}>{isEditing ? "Edit post" : "New post"}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2.5}>
        <TextField label="Title" value={post.title} onChange={handleField("title")} required />
        <TextField
          label="Slug (leave blank to auto-generate)"
          value={post.slug}
          onChange={handleField("slug")}
          helperText="Used in the URL: /blog/your-slug-here"
        />
        <TextField label="Excerpt" value={post.excerpt} onChange={handleField("excerpt")} multiline rows={2} required />

        <Stack direction="row" spacing={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={post.categoryId} onChange={handleField("categoryId")}>
              <MenuItem value="">None</MenuItem>
              {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>

          <Autocomplete
            multiple freeSolo sx={{ flex: 1 }}
            options={[]}
            value={post.tagNames}
            onChange={(e, value) => setPost((p) => ({ ...p, tagNames: value }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip label={option} size="small" {...getTagProps({ index })} key={option} />)
            }
            renderInput={(params) => <TextField {...params} label="Tags (press Enter to add)" />}
          />
        </Stack>

        <Box>
          <Button component="label" variant="outlined" startIcon={<FiUpload />} size="small">
            {post.coverImage ? "Replace cover image" : "Upload cover image"}
            <input type="file" accept="image/*" hidden onChange={uploadCover} />
          </Button>
          {post.coverImage && (
            <Box component="img" src={post.coverImage} alt="Cover preview" sx={{ display: "block", mt: 1.5, maxWidth: 240, borderRadius: 2 }} />
          )}
        </Box>

        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>Content</Typography>
          <TiptapEditor
            content={post.content}
            onChange={(json) => setPost((p) => ({ ...p, content: json }))}
          />
        </Box>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => save("DRAFT")} disabled={saving}>
            Save draft
          </Button>
          <Button variant="contained" onClick={() => save("PUBLISHED")} disabled={saving}>
            {saving ? "Publishing…" : "Publish"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
