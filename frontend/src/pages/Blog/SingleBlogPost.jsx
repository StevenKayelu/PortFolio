import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Navigate, NavLink } from "react-router-dom";
import {
  Box, Container, Typography, Stack, Chip, IconButton, Grid, Card, CardContent,
  TextField, Button, Tooltip, Skeleton, useTheme,
} from "@mui/material";
import { FiHeart, FiBookmark, FiShare2, FiArrowLeft, FiTwitter, FiLinkedin } from "react-icons/fi";
import Reveal from "../../components/common/Reveal";
import RichTextRenderer from "../../components/blog/RichTextRenderer";
import apiClient from "../../services/apiClient";
import { useFetch } from "../../hooks/useFetch";

// A stable per-browser id so likes/bookmarks survive a refresh without
// requiring a login — matches BlogLike/BlogBookmark's `fingerprint` field.
function getFingerprint() {
  const key = "portfolio.fingerprint";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}

export default function SingleBlogPost() {
  const { slug } = useParams();
  const theme = useTheme();
  const fingerprint = useMemo(getFingerprint, []);

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentForm, setCommentForm] = useState({ guestName: "", guestEmail: "", content: "" });
  const [commentStatus, setCommentStatus] = useState(null);

  const { data: post, loading, error } = useFetch(
    () =>
      apiClient.get(`/blog/${slug}`).then((r) => {
        setLikeCount(r.data.likeCount);
        return r.data;
      }),
    [slug]
  );

  if (!loading && (error || !post)) return <Navigate to="/blog" replace />;

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Skeleton variant="text" height={50} width="80%" />
        <Skeleton variant="text" height={200} sx={{ mt: 3 }} />
      </Container>
    );
  }

  const toggleLike = async () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => prev + (liked ? -1 : 1));
    await apiClient.post(`/blog/${post.id}/like`, { fingerprint }).catch(() => {});
  };

  const toggleBookmark = async () => {
    setBookmarked((prev) => !prev);
    await apiClient.post(`/blog/${post.id}/bookmark`, { fingerprint }).catch(() => {});
  };

  const submitComment = async (e) => {
    e.preventDefault();
    setCommentStatus("sending");
    try {
      await apiClient.post(`/blog/${post.id}/comments`, commentForm);
      setCommentStatus("sent");
      setCommentForm({ guestName: "", guestEmail: "", content: "" });
    } catch {
      setCommentStatus("error");
    }
  };

  const related = post.related || [];

  return (
    <>
      <Helmet>
        <title>{post.title} — Blog — Your Name</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:type" content="article" />
        {post.ogImage && <meta property="og:image" content={post.ogImage} />}
      </Helmet>

      <Container maxWidth="sm" sx={{ py: { xs: 8, md: 10 } }}>
        <Reveal>
          <Button component={NavLink} to="/blog" startIcon={<FiArrowLeft />} sx={{ mb: 3, color: "text.secondary" }}>
            All articles
          </Button>

          {post.category?.name && (
            <Chip label={post.category.name} size="small" sx={{ fontFamily: theme.custom.fontMono, mb: 2 }} />
          )}

          <Typography variant="h1" sx={{ mb: 2, fontSize: { xs: "1.9rem", md: "2.5rem" } }}>{post.title}</Typography>

          <Stack direction="row" spacing={2} sx={{ mb: 4 }} divider={<Box sx={{ width: "1px", bgcolor: "divider" }} />}>
            <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
              {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
              {post.readingTimeMins} min read
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: theme.custom.fontMono, color: "text.secondary" }}>
              {post.viewCount} views
            </Typography>
          </Stack>

          <RichTextRenderer content={post.content} contentFormat={post.contentFormat} />

          {post.tags?.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 4 }}>
              {post.tags.map(({ tag }) => (
                <Chip key={tag.slug} label={`#${tag.name}`} size="small" variant="outlined" sx={{ fontFamily: theme.custom.fontMono }} />
              ))}
            </Stack>
          )}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2, borderTop: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Tooltip title={liked ? "Unlike" : "Like this article"}>
              <IconButton onClick={toggleLike} color={liked ? "primary" : "default"}>
                <FiHeart fill={liked ? "currentColor" : "none"} />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" color="text.secondary">{likeCount}</Typography>

            <Tooltip title={bookmarked ? "Remove bookmark" : "Bookmark"}>
              <IconButton onClick={toggleBookmark} color={bookmarked ? "primary" : "default"} sx={{ ml: 2 }}>
                <FiBookmark fill={bookmarked ? "currentColor" : "none"} />
              </IconButton>
            </Tooltip>

            <Box sx={{ flex: 1 }} />

            <Tooltip title="Share on Twitter">
              <IconButton component="a" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}`} target="_blank" rel="noreferrer">
                <FiTwitter />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on LinkedIn">
              <IconButton component="a" href="https://linkedin.com" target="_blank" rel="noreferrer">
                <FiLinkedin />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy link">
              <IconButton onClick={() => navigator.clipboard?.writeText(window.location.href)}>
                <FiShare2 />
              </IconButton>
            </Tooltip>
          </Stack>
        </Reveal>

        <Reveal>
          <Typography variant="h4" sx={{ mt: 6, mb: 2 }}>Leave a comment</Typography>
          <Stack spacing={2} component="form" onSubmit={submitComment} sx={{ maxWidth: 480 }}>
            <TextField
              size="small" label="Name" required
              value={commentForm.guestName}
              onChange={(e) => setCommentForm((f) => ({ ...f, guestName: e.target.value }))}
            />
            <TextField
              size="small" label="Email" type="email" required
              value={commentForm.guestEmail}
              onChange={(e) => setCommentForm((f) => ({ ...f, guestEmail: e.target.value }))}
            />
            <TextField
              size="small" label="Comment" multiline rows={3} required
              value={commentForm.content}
              onChange={(e) => setCommentForm((f) => ({ ...f, content: e.target.value }))}
            />
            <Button type="submit" variant="contained" sx={{ alignSelf: "flex-start" }} disabled={commentStatus === "sending"}>
              {commentStatus === "sending" ? "Submitting…" : "Submit"}
            </Button>
            {commentStatus === "sent" && (
              <Typography variant="caption" color="success.main">Thanks — your comment is awaiting review.</Typography>
            )}
            {commentStatus === "error" && (
              <Typography variant="caption" color="error.main">Something went wrong — try again.</Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Comments are reviewed before appearing publicly.
            </Typography>
          </Stack>
        </Reveal>
      </Container>

      {related.length > 0 && (
        <Box sx={{ bgcolor: "background.paper", py: { xs: 6, md: 8 } }}>
          <Container maxWidth="sm">
            <Reveal>
              <Typography variant="h4" sx={{ mb: 3 }}>Related articles</Typography>
            </Reveal>
            <Grid container spacing={2}>
              {related.map((r, idx) => (
                <Grid item xs={12} sm={6} key={r.slug}>
                  <Reveal delay={idx * 0.08} style={{ height: "100%" }}>
                    <Card component={NavLink} to={`/blog/${r.slug}`} elevation={0} sx={{ height: "100%", textDecoration: "none" }}>
                      <CardContent>
                        <Typography variant="h4" sx={{ mb: 1 }}>{r.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{r.excerpt}</Typography>
                      </CardContent>
                    </Card>
                  </Reveal>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}
    </>
  );
}
