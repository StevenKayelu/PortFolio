# Personal Brand & Portfolio Platform

A production-grade personal brand / portfolio / blog / lead-gen platform.

## Monorepo Layout

```
portfolio-platform/
├── backend/     Node.js + Express + Prisma + MySQL API
└── frontend/    React 19 + Vite + MUI + Framer Motion
```

## Status

All phases complete, **and the site is launch-ready** — every public page reads live from the
API (no more static sample data), blog posts are authored with a real rich-text editor, the
sitemap is generated from the live database, uploaded images are optimized automatically, and
file storage can be pointed at Cloudflare R2 with a single `.env` flag.

- [x] Phase 1 — Architecture, folder structure, database schema, design system (10 themes)
- [x] Phase 2 — Global layout shell (navbar/footer/transitions), Landing page
- [x] Phase 3 — About, Projects (filter/search), Project Details
- [x] Phase 4 — Blog (list, category/tag filter, single post, likes/bookmarks/comments)
- [x] Phase 5 — Services, Resume, Experience, Certificates, Gallery, Testimonials, Achievements
- [x] Phase 6 — Contact, FAQ, Privacy Policy, 404
- [x] Phase 7 — Auth (JWT + rotating refresh tokens) + Admin Dashboard
- [x] Phase 8 — Launch hardening: live data everywhere, TipTap editor, live sitemap,
      image optimization, real Cloudflare R2 support

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL and JWT secrets
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run prisma:seed        # populates real content + creates admin@example.com / ChangeMe123!
npm run dev                # http://localhost:5000/api/v1
```

### Frontend
```bash
cd frontend
cp .env.example .env       # points at the backend above
npm install
npm run dev                # http://localhost:5173
```

Visit `/admin/login` and sign in with the seeded admin account — **change that password
immediately** before deploying anywhere real (see "Changing the admin password" below).

## What's live

Every public page fetches from the real API — there is no sample-data fallback anymore.
`npm run prisma:seed` is what makes the site non-empty on first run; it populates:

- Hero copy, About bio/mission/values, homepage stats, tech-stack list, and the career timeline
  (all stored in the flexible `SiteSetting` key/value table — see "Editing hero/about copy" below)
- Skills, services, experience, certificates, gallery items, achievements, FAQ
- Two pre-approved testimonials
- Four projects (with categories + tech stack) and three blog posts

Editing any of this after launch goes through the admin dashboard (`/admin`) — Projects, Blog,
Services, Experience, Certificates, Skills, Testimonials, and Gallery all have management screens
there. The Hero/About/Stats/Timeline content currently has no dedicated admin UI yet (see
"Suggested next steps").

## Editing hero/about copy

**Admin → Site content** edits the profile (including uploading Steven's photo), About,
Stats, Tech stack and Timeline, with validation per section. The API route below still
works for scripts.

`SiteSetting` is a deliberate escape hatch — a JSON blob per key — for content that doesn't
warrant its own relational table. Update it directly via the API (authenticated as admin):

```bash
curl -X PUT http://localhost:5000/api/v1/site-settings/identity \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"value": {"name": "Real Name", "role": "...", "tagline": "...", "location": "..."}}'
```

Valid keys: `identity`, `about`, `stats`, `technologies`, `timeline` — see
`backend/prisma/seed.js` for the exact shape each one expects.

## Writing blog posts

`/admin/blog/new` opens a TipTap-based editor (bold/italic/code/headings/quote/list/link/image,
plus a cover-image upload). Content is stored as TipTap JSON (`contentFormat: "tiptap-json"`) and
rendered on the public post page through the exact same extension set
(`components/blog/RichTextRenderer.jsx`), so anything the editor can produce is guaranteed to
render correctly. The three seeded posts use plain-text content (`contentFormat: "plain"`) as a
migration example — edit and republish them through the editor to convert them to rich text.

## Images and file storage

Uploads (project images, blog cover images) go through `services/image.service.js`: resized to a
1920px max width (never upscaled), re-encoded as WebP, with an optional 400px thumbnail generated
alongside. This happens in memory before anything touches disk — see `services/upload.service.js`
for the orchestration.

Storage itself is driver-based (`services/storage.service.js`):
- `STORAGE_DRIVER=local` (default) — writes to `UPLOAD_DIR`, served at `/uploads/*`
- `STORAGE_DRIVER=r2` — uploads to Cloudflare R2 via `@aws-sdk/client-s3` (R2 speaks the S3 API).
  Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and
  `R2_PUBLIC_URL` in `.env` — no code changes needed.

## Sitemap

`GET /sitemap.xml` on the **backend** generates XML live from published projects and blog posts
plus the static routes — always current, no build step required. Since the frontend and backend
typically live on different domains in production, `frontend/vercel.json` includes a rewrite so
requests to `https://yourdomain.com/sitemap.xml` proxy through to the backend. **Update the
placeholder backend URL in that rewrite** once you know your Render domain.

## Architecture notes

- **Theme engine**: `frontend/src/theme/tokens.js` is the single source of truth for all 10
  themes; `createAppTheme.js` turns any one into a full MUI theme.
- **Data fetching**: every public page uses `hooks/useFetch.js` (a small loading/error/data
  wrapper around `apiClient`) instead of static imports.
- **CRUD factory**: `backend/src/utils/crudFactory.js` + `routes/crudRouterFactory.js` generate
  list/get/create/update/delete for the simple resources (Service, Experience, Certificate,
  Skill, GalleryItem, Achievement, Faq) so those route files are one-liners. Project and BlogPost
  have hand-written controllers because of their relational complexity.
- **Admin resource tables**: `ManageResource.jsx` is one generic table+delete UI, configured per
  resource in `resourcePages.jsx`.
- **Auth**: short-lived JWT access tokens (kept in memory, not localStorage) + rotating, hashed
  refresh tokens in an httpOnly cookie.

## Devegen ecosystem: brands, ventures, leads

One app serves **stevenkayelu.online** (personal) and **devegenventures.com** (umbrella,
with DevGen Solutions under `/solutions`). The frontend picks the site from the hostname;
on any other host, add `?site=devegen` or `?site=steven` to review a site.

### Data model (migration `20261117054425_devegen_ecosystem`, additive only)

| Model | Purpose |
|-------|---------|
| `Brand`, `Organization`, `BrandRelationship` | Public brands, legal entities, and relationships with a verification status |
| `Venture`, `Product` | Venture directory and products; DRAFT until published, products `NEEDS_REVIEW` until ownership is confirmed |
| `ProjectContributor` + new `Project` fields | Attribution: visibility, ownership status, owner, publication permission, outcome, showcase brand. Existing projects start as `NEEDS_REVIEW` |
| `UserBrandRole` | Brand-scoped admin access |
| `Lead`, `LeadActivity` | Structured enquiries with a status pipeline, notes and history |

`node prisma/seed-ecosystem.js` creates the three brands, their relationships (the
Devegen ↔ DevGen Solutions one as `PENDING`) and draft products. It is idempotent and
never overwrites admin edits; the Render build runs it after migrations.

### API

| Endpoint | Access |
|----------|--------|
| `GET /brands/public`, `GET /ecosystem`, `GET /ventures[/:slug]` | Public, published records only |
| `POST /enquiries` | Public. Validated, consent required, honeypot, 3/min + 20/day per IP. Brand is chosen server-side from type + site |
| `/admin/leads`, `/admin/ventures`, `/admin/products`, `/admin/brands` | Staff, filtered to their brands |
| `/admin/organizations`, `/admin/relationships`, `/admin/users/:id/brand-roles` | Super admin only |

**Permissions.** `SUPER_ADMIN` sees every brand. Everyone else needs a `UserBrandRole`:
`ADMIN` (publish, manage), `EDITOR` (drafts only; can't edit published records),
`LEAD_MANAGER` (leads only). Only a super admin can mark relationships verified, link legal
entities or confirm product ownership. Grants are re-checked on every request, so
deactivating a user takes effect immediately. Manage people and grants in
**Admin → Users & access** (super admins only).

**Approvals.** An editor's change to a *published* venture or product is saved as a
pending revision (HTTP 202) and appears in **Admin → Approvals**, where a brand admin
sees a before/after diff and approves or declines it. Every applied change is kept
(`ContentRevision`), so any change can be rolled back from the Applied tab.

**Lead emails.** New enquiries email the brand's lead handlers (super admins plus
brand `ADMIN`/`LEAD_MANAGER`), with Reply-To set to the sender. Set `SMTP_URL` (or
`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`) and `MAIL_FROM`; without them mail is
skipped. The API never emails addresses typed into public forms.

**Passwords.** Everyone can change their own password under **Account & password**
(other sessions are signed out). Super admins can reset anyone's password.

**Venture pages.** Every published venture gets a page at `/ventures/:slug` on
devegenventures.com (DevGen Solutions redirects to `/solutions`) and a sitemap entry.

**Dashboard.** Shows real counts only (new and open leads, pending approvals, messages…)
and a page-view chart. Page views are recorded on the production domains only, as path
and referrer; no IP address is stored.

### Client testimonials (invite-only, with consent)

There is no open "leave a testimonial" form. In **Admin → Testimonials → Invites**, staff
create a private link for one client (name, email, brand, optional project) and send it
themselves or have the API email it. Through that link only, the client:

- writes their testimonial (role, organisation, how they worked together, quote, rating);
- must tick consent to publish their quote with their name, role and organisation, and may
  separately consent to their email being kept for contact;
- can later edit it (which needs re-approval) or withdraw it, which unpublishes it and
  deletes their words and details.

The exact consent wording and time are stored with each testimonial. The public API
returns a testimonial only if it is approved, has recorded consent and is not withdrawn,
so older testimonials without consent are never shown. Admins can publish, feature or
unpublish, but cannot edit a client's words. Link tokens are stored only as hashes.

### Certificates

**Admin → Certificates** stores each certificate's original (PDF or image) **privately**:
in `PRIVATE_UPLOAD_DIR` locally, or in a separate, non-public R2 bucket
(`R2_PRIVATE_BUCKET`) in production. Only signed-in staff can download it. Visitors see a
1200px, watermarked WebP preview (for PDFs, page 1 is rendered in the admin's browser
with pdf.js) and a link to the issuer's own record (Credly, Coursera, Microsoft Learn…).
LinkedIn links are accepted but not labelled as verification. Each certificate has a
type (certification, course, academic, award), optional expiry, and switches for
publishing and showing the credential ID. Previews can still be screenshotted; the
verification link is the real proof.

### SEO per brand

- Each brand has default meta tags, Open Graph and JSON-LD (`components/seo/SeoTags.jsx`).
  Non-production hosts get `noindex`, and canonical URLs always point at the real domain.
- **Admin → SEO** overrides the title, description, share image, canonical URL or
  indexing for one path on one brand (`GET /seo?site=&path=`).
- `GET /sitemap.xml?site=steven|devegen` and `GET /robots.txt?site=…` are generated per
  site; `frontend/vercel.json` proxies each domain's `/sitemap.xml` and `/robots.txt` to
  them, adds the SPA fallback, redirects `www` to the apex domain and sets security headers.
  **Update the backend URL in `vercel.json` if the API moves.**

`POST /contact` still works; convert old messages with `POST /admin/leads/from-message/:id`.

### Integration tests

Run against a disposable database, never production:

```bash
cd backend
export DATABASE_URL="mysql://root@127.0.0.1:3306/devegen_test"
npx prisma migrate deploy && node prisma/seed.js && node prisma/seed-ecosystem.js
npm run test:integration
```

## Changing the admin password

There's no in-app "change password" screen yet. Fastest path for now:

```bash
cd backend
node -e "require('bcryptjs').hash('YourNewStrongPassword', 12).then(console.log)"
```

Then update that user's `passwordHash` column directly (`npx prisma studio` is the easiest way).

## Deployment

| Layer     | Target                                   | Config file            |
|-----------|-------------------------------------------|-------------------------|
| Frontend  | Vercel                                    | `frontend/vercel.json`  |
| Backend   | Render                                    | `backend/render.yaml`   |
| Database  | MySQL (TiDB Serverless recommended free tier) | `backend/prisma/schema.prisma` |
| Storage   | Local → Cloudflare R2                     | `backend/src/services/storage.service.js` |

## Suggested next steps

1. Change the seeded admin password under **Account & password** before launch.
2. Upload Steven's real photo under **Admin → Site content → Profile**.
3. Republish the three seeded blog posts through the TipTap editor so they're rich content
   instead of the plain-text placeholder they were seeded with.
4. Point `STORAGE_DRIVER=r2` at real Cloudflare R2 credentials before launch if you'd rather not
   rely on the backend host's local disk for uploads.
