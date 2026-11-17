import { Chip, Button, Stack, Typography, Box } from "@mui/material";
import { FiPlus, FiEdit2 } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import ManageResource from "./ManageResource";
import { formatKwacha, formatDate, formatMonthYear, formatCount } from "../../utils/format";

const EXPERIENCE_TYPES = [
  { value: "EMPLOYMENT", label: "Employment" }, { value: "INTERNSHIP", label: "Internship" },
  { value: "FREELANCE", label: "Freelance" }, { value: "LEADERSHIP", label: "Leadership" },
  { value: "VOLUNTEER", label: "Volunteer" }, { value: "INTERNET_CAFE", label: "Early Experience" },
  { value: "STUDENT_DEVELOPER", label: "Student Developer" },
];
const SKILL_CATEGORIES = [
  { value: "FRONTEND", label: "Frontend" }, { value: "BACKEND", label: "Backend" },
  { value: "DATABASE", label: "Database" }, { value: "CLOUD", label: "Cloud" },
  { value: "DEVOPS", label: "DevOps" }, { value: "TOOLS", label: "Tools" },
  { value: "LANGUAGE", label: "Languages" }, { value: "FRAMEWORK", label: "Frameworks" },
  { value: "SOFT_SKILL", label: "Soft Skills" }, { value: "MOBILE", label: "Mobile" },
  { value: "OTHER", label: "Other" },
];
const labelOf = (options, value) => options.find((o) => o.value === value)?.label || value || "—";
const humanize = (v) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") : "—");

export const ManageProjects = () => (
  <ManageResource
    title="Manage Projects"
    endpoint="/projects"
    listQuery={{ includeHidden: "true", pageSize: 50 }}
    selectOptionsEndpoints={{ categoryId: "/projects/categories", showcaseBrandId: "/admin/brands" }}
    columns={[
      { key: "title", label: "Title" },
      { key: "status", label: "Status", render: (p) => <Chip size="small" label={humanize(p.status)} /> },
      { key: "visibility", label: "Visibility", render: (p) => <Chip size="small" variant="outlined" label={humanize(p.visibility)} /> },
      { key: "ownershipStatus", label: "Ownership", render: (p) => (
        <Chip size="small" color={p.ownershipStatus === "NEEDS_REVIEW" ? "warning" : "default"} label={humanize(p.ownershipStatus)} />
      ) },
      { key: "isFeatured", label: "Featured", render: (p) => (p.isFeatured ? "Yes" : "—") },
      { key: "viewCount", label: "Views", render: (p) => formatCount(p.viewCount) },
    ]}
    fields={[
      { name: "title", label: "Title", type: "text", required: true },
      { name: "summary", label: "Summary (shown in cards)", type: "textarea", required: true },
      { name: "description", label: "Full description", type: "textarea", required: true },
      { name: "status", label: "Status", type: "select", options: [
        { value: "DRAFT", label: "Draft" }, { value: "IN_PROGRESS", label: "In Progress" },
        { value: "COMPLETED", label: "Completed" }, { value: "ARCHIVED", label: "Archived" },
      ], default: "COMPLETED" },
      { name: "categoryId", label: "Category", type: "select", allowEmpty: true },
      { name: "isFeatured", label: "Featured on homepage", type: "boolean" },
      { name: "technologyNames", label: "Technologies", type: "tags",
        getValue: (item) => (item.technologies || []).map((t) => t.technology.name) },
      { name: "features", label: "Key features", type: "tags" },
      { name: "challenges", label: "The challenge", type: "textarea" },
      { name: "solutions", label: "The solution", type: "textarea" },
      { name: "lessonsLearned", label: "Lessons learned", type: "textarea" },
      { name: "githubUrl", label: "GitHub URL", type: "text" },
      { name: "liveDemoUrl", label: "Live demo URL", type: "text" },
      // Attribution (report §05): who owns it, and whether it may be shown.
      { name: "visibility", label: "Visibility", type: "select", default: "PUBLIC", options: [
        { value: "PUBLIC", label: "Public — listed" }, { value: "UNLISTED", label: "Unlisted — link only" }, { value: "PRIVATE", label: "Private — admin only" },
      ] },
      { name: "ownershipStatus", label: "Ownership", type: "select", default: "NEEDS_REVIEW", options: [
        { value: "NEEDS_REVIEW", label: "Needs review" }, { value: "CONFIRMED", label: "Confirmed — ours" }, { value: "NOT_OWNED", label: "Not ours — shown with permission" },
      ] },
      { name: "ownerName", label: "Owner (person or organisation)", type: "text" },
      { name: "publicationPermission", label: "Permission to publish", type: "select", default: "UNKNOWN", options: [
        { value: "UNKNOWN", label: "Unknown" }, { value: "GRANTED", label: "Granted by owner" }, { value: "NOT_REQUIRED", label: "Not required (own work)" }, { value: "DENIED", label: "Denied" },
      ] },
      { name: "showcaseBrandId", label: "Shown on brand", type: "select", allowEmpty: true },
      { name: "outcome", label: "Verified outcome", type: "textarea" },
    ]}
  />
);

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" },
];
const statusChip = (r) => <Chip size="small" color={r.status === "PUBLISHED" ? "success" : "default"} label={humanize(r.status)} />;

export const ManageVentures = () => (
  <ManageResource
    title="Ventures"
    endpoint="/admin/ventures"
    brandScoped
    selectOptionsEndpoints={{ brandId: "/admin/brands" }}
    columns={[
      { key: "name", label: "Venture" },
      { key: "brand", label: "Brand", render: (v) => v.brand?.name || "—" },
      { key: "stage", label: "Stage", render: (v) => humanize(v.stage) },
      { key: "status", label: "Status", render: statusChip },
      { key: "verificationStatus", label: "Verified", render: (v) => humanize(v.verificationStatus) },
    ]}
    fields={[
      { name: "name", label: "Name", type: "text", required: true },
      { name: "summary", label: "Summary (shown on cards)", type: "textarea", required: true },
      { name: "description", label: "Full description", type: "textarea" },
      { name: "brandId", label: "Brand", type: "select", required: true },
      { name: "stage", label: "Stage", type: "select", default: "IDEA", options: [
        { value: "IDEA", label: "Idea" }, { value: "BUILDING", label: "Building" }, { value: "OPERATING", label: "Operating" }, { value: "PAUSED", label: "Paused" },
      ] },
      { name: "status", label: "Publication (brand admins publish)", type: "select", default: "DRAFT", options: STATUS_OPTIONS },
      { name: "verificationStatus", label: "Relationship verification (super admin)", type: "select", default: "UNVERIFIED", options: [
        { value: "UNVERIFIED", label: "Unverified" }, { value: "PENDING", label: "Pending" }, { value: "VERIFIED", label: "Verified" },
      ] },
      { name: "website", label: "Website", type: "text" },
      { name: "displayOrder", label: "Display order", type: "number", default: 0 },
    ]}
  />
);

export const ManageProducts = () => (
  <ManageResource
    title="Products"
    endpoint="/admin/products"
    brandScoped
    selectOptionsEndpoints={{ ventureId: "/admin/ventures", projectId: "/projects?includeHidden=true&pageSize=50" }}
    columns={[
      { key: "name", label: "Product" },
      { key: "venture", label: "Venture", render: (p) => p.venture?.name || "—" },
      { key: "status", label: "Status", render: statusChip },
      { key: "ownershipStatus", label: "Ownership", render: (p) => (
        <Chip size="small" color={p.ownershipStatus === "NEEDS_REVIEW" ? "warning" : "default"} label={humanize(p.ownershipStatus)} />
      ) },
    ]}
    fields={[
      { name: "name", label: "Name", type: "text", required: true },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "ventureId", label: "Venture", type: "select", allowEmpty: true },
      { name: "projectId", label: "Case study project", type: "select", allowEmpty: true },
      { name: "lifecycle", label: "Lifecycle (concept, beta, live…)", type: "text" },
      { name: "status", label: "Publication (brand admins publish)", type: "select", default: "DRAFT", options: STATUS_OPTIONS },
      { name: "ownershipStatus", label: "Ownership (super admin confirms)", type: "select", default: "NEEDS_REVIEW", options: [
        { value: "NEEDS_REVIEW", label: "Needs review" }, { value: "CONFIRMED", label: "Confirmed" }, { value: "NOT_OWNED", label: "Not owned" },
      ] },
      { name: "website", label: "Website", type: "text" },
      { name: "displayOrder", label: "Display order", type: "number", default: 0 },
    ]}
  />
);

export const ManageBlog = () => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 1 }}>
      <Typography variant="h2" sx={{ fontSize: { xs: "1.6rem", md: undefined } }}>Manage Blog</Typography>
      <Button component={NavLink} to="/admin/blog/new" variant="contained" startIcon={<FiPlus />}>
        New post
      </Button>
    </Stack>
    <ManageResource
      title=""
      endpoint="/blog"
      listQuery={{ pageSize: 100 }}
      columns={[
        {
          key: "title", label: "Title",
          render: (p) => (
            <Stack direction="row" spacing={1} alignItems="center">
              <span>{p.title}</span>
              <NavLink to={`/admin/blog/${p.id}/edit`} style={{ color: "inherit" }}>
                <FiEdit2 size={14} />
              </NavLink>
            </Stack>
          ),
        },
        { key: "status", label: "Status", render: (p) => <Chip size="small" color={p.status === "PUBLISHED" ? "success" : "default"} label={humanize(p.status)} /> },
        { key: "publishedAt", label: "Published", render: (p) => (p.publishedAt ? formatDate(p.publishedAt) : "Not yet") },
        { key: "viewCount", label: "Views", render: (p) => formatCount(p.viewCount) },
        { key: "likeCount", label: "Likes", render: (p) => formatCount(p.likeCount) },
      ]}
    />
  </Box>
);

export const ManageServices = () => (
  <ManageResource
    title="Manage Services"
    endpoint="/services"
    columns={[
      { key: "title", label: "Title" },
      { key: "startingPrice", label: "Starting price", render: (s) => (s.startingPrice ? `From ${formatKwacha(s.startingPrice)}` : "Custom pricing") },
      { key: "isActive", label: "Active", render: (s) => (s.isActive ? "Yes" : "No") },
    ]}
    fields={[
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "startingPrice", label: "Starting price (Kwacha, ZMW)", type: "money", helperText: "Shown as \"From K …\". Leave empty for \"Custom pricing\"." },
      { name: "isActive", label: "Active", type: "boolean", default: true },
    ]}
  />
);

export const ManageExperience = () => (
  <ManageResource
    title="Manage Experience"
    endpoint="/experience"
    columns={[
      { key: "title", label: "Title" },
      { key: "organization", label: "Organisation" },
      { key: "type", label: "Type", render: (e) => labelOf(EXPERIENCE_TYPES, e.type) },
      { key: "startDate", label: "Period", render: (e) => `${formatMonthYear(e.startDate)} – ${e.isCurrent || !e.endDate ? "Present" : formatMonthYear(e.endDate)}` },
    ]}
    fields={[
      { name: "title", label: "Title", type: "text", required: true },
      { name: "organization", label: "Organisation", type: "text", required: true },
      { name: "type", label: "Type", type: "select", options: EXPERIENCE_TYPES, default: "EMPLOYMENT" },
      { name: "location", label: "Location (e.g. Lusaka, Zambia)", type: "text" },
      { name: "startDate", label: "Start date", type: "date", required: true },
      { name: "endDate", label: "End date (leave blank if current)", type: "date" },
      { name: "isCurrent", label: "Current role", type: "boolean" },
      { name: "description", label: "Description", type: "textarea", required: true },
    ]}
  />
);

export const ManageSkills = () => (
  <ManageResource
    title="Manage Skills"
    endpoint="/skills"
    columns={[
      { key: "name", label: "Name" },
      { key: "category", label: "Category", render: (s) => labelOf(SKILL_CATEGORIES, s.category) },
      { key: "proficiency", label: "Proficiency", render: (s) => `${s.proficiency}%` },
    ]}
    fields={[
      { name: "name", label: "Name", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: SKILL_CATEGORIES, default: "FRONTEND" },
      { name: "proficiency", label: "Proficiency (0–100)", type: "number", default: 80, min: 0, max: 100 },
    ]}
  />
);

export const ManageGallery = () => (
  <ManageResource
    title="Manage Gallery"
    endpoint="/gallery"
    columns={[
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
    ]}
    fields={[
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "text" },
      { name: "imageUrl", label: "Image URL", type: "text", required: true },
    ]}
  />
);

export const ManageAchievements = () => (
  <ManageResource
    title="Manage Achievements"
    endpoint="/achievements"
    columns={[
      { key: "title", label: "Title" },
      { key: "date", label: "Date", render: (a) => formatDate(a.date) },
    ]}
    fields={[
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "date", label: "Date", type: "date", required: true },
    ]}
  />
);

export const ManageFaq = () => (
  <ManageResource
    title="Manage FAQ"
    endpoint="/faq"
    columns={[
      { key: "question", label: "Question" },
      { key: "isPublished", label: "Published", render: (f) => (f.isPublished ? "Yes" : "No") },
    ]}
    fields={[
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer", type: "textarea", required: true },
      { name: "category", label: "Category", type: "text" },
      { name: "isPublished", label: "Published", type: "boolean", default: true },
    ]}
  />
);
export const ManageSeo = () => (
  <ManageResource
    title="SEO by brand"
    endpoint="/admin/seo"
    brandScoped
    selectOptionsEndpoints={{ brandId: "/admin/brands" }}
    columns={[
      { key: "brand", label: "Brand", render: (m) => m.brand?.name },
      { key: "route", label: "Path" },
      { key: "title", label: "Title" },
      { key: "noIndex", label: "Search engines", render: (m) => (m.noIndex ? <Chip size="small" label="Hidden" /> : "Indexed") },
    ]}
    fields={[
      { name: "brandId", label: "Brand", type: "select", required: true },
      { name: "route", label: "Path (e.g. / or /solutions)", type: "text", required: true },
      { name: "title", label: "Page title (about 60 characters)", type: "text", required: true },
      { name: "description", label: "Description (about 155 characters)", type: "textarea", required: true },
      { name: "ogImage", label: "Social share image URL", type: "text" },
      { name: "canonicalUrl", label: "Canonical URL (leave empty for the default)", type: "text" },
      { name: "noIndex", label: "Hide this page from search engines", type: "boolean" },
    ]}
  />
);
