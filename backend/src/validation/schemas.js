import { z } from "zod";

/**
 * Request schemas. Objects are non-strict, so unknown keys are stripped
 * rather than rejected: older admin clients sending extra fields keep
 * working, but those fields never reach Prisma.
 */

const trimmed = (max) => z.string().trim().max(max);
const optionalText = (max) => trimmed(max).optional().nullable().transform((v) => (v === "" ? null : v));
// http(s) only: z.string().url() alone also accepts javascript: and data: URLs,
// which would run script when a visitor clicks the link.
const httpUrl = z.string().trim().url().max(500).regex(/^https?:\/\//i, "Use a link starting with https://");
const url = httpUrl.optional().nullable().or(z.literal("").transform(() => null));
const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");
const id = z.string().trim().min(1).max(64);
// Admin forms send "" for an empty select; treat it as "no link".
const optionalId = z.preprocess((v) => (v === "" ? null : v), id.nullable().optional());

export const PUBLICATION = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const VERIFICATION = z.enum(["UNVERIFIED", "PENDING", "VERIFIED"]);

// ---------------------------------------------------------------- enquiries

export const SITES = ["steven", "devegen"];
export const LEAD_TYPES = ["CAREER", "COLLABORATION", "QUOTE", "PARTNERSHIP", "GENERAL"];

export const enquirySchema = z.object({
  site: z.enum(SITES),
  type: z.enum(LEAD_TYPES),
  name: trimmed(120).min(1, "Enter your name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(191),
  phone: optionalText(40),
  organization: optionalText(160),
  message: trimmed(5000).min(20, "Add a little more detail (at least 20 characters)."),
  service: optionalText(120),
  timeline: optionalText(60),
  budget: optionalText(60),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required to store your enquiry." }) }),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(200).optional(),
});

export const leadQuerySchema = z.object({
  status: z.enum(["NEW", "QUALIFIED", "CONTACTED", "PROPOSAL", "WON", "LOST", "ARCHIVED", "SPAM"]).optional(),
  type: z.enum(LEAD_TYPES).optional(),
  brand: z.string().max(40).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const leadUpdateSchema = z.object({
  status: z.enum(["NEW", "QUALIFIED", "CONTACTED", "PROPOSAL", "WON", "LOST", "ARCHIVED", "SPAM"]).optional(),
  assignedToId: optionalId,
}).refine((v) => v.status !== undefined || v.assignedToId !== undefined, "Nothing to update.");

export const leadNoteSchema = z.object({ body: trimmed(4000).min(1, "Write a note first.") });

export const convertMessageSchema = z.object({
  brandKey: z.string().max(40).default("steven"),
  type: z.enum(LEAD_TYPES).default("GENERAL"),
});

// ---------------------------------------------------------- legacy endpoints

export const contactSchema = z.object({
  name: trimmed(120).min(1),
  email: z.string().trim().email().max(191),
  subject: optionalText(191),
  message: trimmed(5000).min(1),
});


// Admins approve or feature; they never edit a client's words.
export const testimonialModerateSchema = z.object({
  isApproved: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
}).refine((v) => v.isApproved !== undefined || v.isFeatured !== undefined, "Nothing to update.");

export const pageViewSchema = z.object({
  path: trimmed(191).min(1).regex(/^\//, "Path must start with /."),
  referrer: optionalText(191),
});

// ---------------------------------------------------------------- ecosystem

export const brandUpdateSchema = z.object({
  name: trimmed(120).min(1).optional(),
  tagline: optionalText(191),
  description: optionalText(5000),
  logoUrl: url,
  domains: z.array(z.string().trim().toLowerCase().max(253).regex(/^[a-z0-9.-]+$/)).max(10).optional(),
  status: PUBLICATION.optional(),
  displayOrder: z.coerce.number().int().optional(),
  organizationId: optionalId,
});

export const brandCreateSchema = brandUpdateSchema.extend({
  key: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
  name: trimmed(120).min(1),
  slug,
  kind: z.enum(["PERSONAL", "UMBRELLA", "SERVICE", "VENTURE"]),
});

export const organizationSchema = z.object({
  legalName: trimmed(191).min(1),
  tradingName: optionalText(191),
  registrationType: optionalText(120),
  registry: optionalText(60),
  registrationNumber: optionalText(60),
  website: url,
  verificationStatus: VERIFICATION.optional(),
  notes: optionalText(5000),
});

export const relationshipSchema = z.object({
  parentBrandId: id,
  childBrandId: id,
  relationType: z.enum(["UMBRELLA_OF", "FOUNDER_OF", "ASSOCIATED_WITH"]),
  verificationStatus: VERIFICATION.optional(),
  publicNote: optionalText(1000),
  internalNote: optionalText(5000),
}).refine((v) => v.parentBrandId !== v.childBrandId, "A brand cannot relate to itself.");

export const ventureSchema = z.object({
  name: trimmed(160).min(1),
  slug: slug.optional(),
  summary: trimmed(2000).min(1),
  description: optionalText(20000),
  stage: z.enum(["IDEA", "BUILDING", "OPERATING", "PAUSED"]).optional(),
  status: PUBLICATION.optional(),
  verificationStatus: VERIFICATION.optional(),
  website: url,
  logoUrl: url,
  displayOrder: z.coerce.number().int().optional(),
  brandId: optionalId,
  organizationId: optionalId,
});
export const ventureUpdateSchema = ventureSchema.partial();

export const productSchema = z.object({
  name: trimmed(160).min(1),
  slug: slug.optional(),
  summary: optionalText(2000),
  website: url,
  lifecycle: optionalText(40),
  status: PUBLICATION.optional(),
  ownershipStatus: z.enum(["NEEDS_REVIEW", "CONFIRMED", "NOT_OWNED"]).optional(),
  displayOrder: z.coerce.number().int().optional(),
  ventureId: optionalId,
  projectId: optionalId,
});
export const productUpdateSchema = productSchema.partial();

export const brandRolesSchema = z.object({
  roles: z.array(z.object({ brandId: id, scope: z.enum(["ADMIN", "EDITOR", "LEAD_MANAGER"]) })).max(50),
});

// ------------------------------------------------------------------ projects

export const contributorSchema = z.object({
  name: trimmed(160).min(1),
  organizationName: optionalText(160),
  role: trimmed(120).min(1),
  contribution: optionalText(2000),
  displayOrder: z.coerce.number().int().optional(),
});

export const projectAttributionSchema = {
  githubUrl: url,
  liveDemoUrl: url,
  videoDemoUrl: url,
  documentationUrl: url,
  coverImage: url,
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  ownershipStatus: z.enum(["NEEDS_REVIEW", "CONFIRMED", "NOT_OWNED"]).optional(),
  ownerName: optionalText(191),
  publicationPermission: z.enum(["UNKNOWN", "GRANTED", "NOT_REQUIRED", "DENIED"]).optional(),
  outcome: optionalText(5000),
  showcaseBrandId: optionalId,
  contributors: z.array(contributorSchema).max(30).optional(),
};

// --------------------------------------------------------- users + passwords

const password = z.string().min(12, "Use at least 12 characters.").max(128);
const STAFF_ROLE = z.enum(["SUPER_ADMIN", "ADMIN", "EDITOR"]);

export const userCreateSchema = z.object({
  name: trimmed(120).min(1),
  email: z.string().trim().toLowerCase().email().max(191),
  role: STAFF_ROLE.default("EDITOR"),
  password,
}).refine((v) => v.password.toLowerCase() !== v.email, { message: "The password can't be the email address.", path: ["password"] });

export const userUpdateSchema = z.object({
  name: trimmed(120).min(1).optional(),
  role: STAFF_ROLE.optional(),
  isActive: z.boolean().optional(),
});

export const passwordResetSchema = z.object({ password });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
  newPassword: password,
}).refine((v) => v.currentPassword !== v.newPassword, { message: "Choose a password you haven't used here.", path: ["newPassword"] });

// ---------------------------------------------------------------- revisions

export const revisionQuerySchema = z.object({
  status: z.enum(["PENDING", "APPLIED", "REJECTED"]).optional(),
  entityType: z.enum(["VENTURE", "PRODUCT"]).optional(),
  entityId: z.string().max(64).optional(),
});

export const reviewSchema = z.object({ reviewNote: optionalText(1000) });

// ---------------------------------------------------------------------- SEO

const route = z.string().trim().min(1).max(191).regex(/^\/[^\s?#]*$/, "Use a path like /about (no query string).");

export const seoQuerySchema = z.object({
  site: z.enum(SITES),
  path: route,
});

export const seoSchema = z.object({
  brandId: id,
  route,
  title: trimmed(191).min(1),
  description: trimmed(500).min(1),
  keywords: optionalText(500),
  ogImage: url,
  canonicalUrl: url,
  structuredData: z.record(z.unknown()).nullable().optional(),
  noIndex: z.boolean().optional(),
});
export const seoUpdateSchema = seoSchema.partial();

// -------------------------------------------------------- site settings (CMS)

const shortText = (max) => trimmed(max).min(1);
const optionalUrl = url;

/** One schema per SiteSetting key, so the admin can't store malformed content. */
export const siteSettingSchemas = {
  identity: z.object({
    name: shortText(120),
    role: shortText(120),
    tagline: shortText(300),
    location: optionalText(120),
    availability: optionalText(160),
    brand: optionalText(120),
    email: z.string().trim().email().max(191).optional().or(z.literal("").transform(() => undefined)),
    phone: optionalText(40),
    whatsapp: optionalText(40),
    github: optionalUrl,
    linkedin: optionalUrl,
    facebook: optionalUrl,
    photo: optionalUrl,
    photoAlt: optionalText(200),
  }),
  about: z.object({
    bio: shortText(4000),
    mission: optionalText(1000),
    vision: optionalText(1000),
    goals: optionalText(2000),
    values: z.array(z.object({ title: shortText(120), detail: shortText(600) })).max(12).default([]),
    education: z.array(z.object({ degree: shortText(160), institution: shortText(160), year: shortText(40) })).max(12).default([]),
  }),
  stats: z.array(z.object({ label: shortText(60), value: shortText(20) })).max(8),
  technologies: z.array(shortText(60)).max(80),
  timeline: z.array(z.object({ year: shortText(40), title: shortText(160), org: shortText(160) })).max(40),
};

// ------------------------------------------------------- testimonial invites

export const RELATIONSHIPS = ["Client", "Employer", "Colleague", "Partner", "Collaborator"];

export const inviteCreateSchema = z.object({
  clientName: trimmed(120).min(1, "Enter the client's name."),
  clientEmail: z.string().trim().email("Enter a valid email address.").max(191),
  brandId: id,
  projectId: optionalId,
  expiresInDays: z.coerce.number().int().min(1).max(90).default(30),
  sendEmail: z.boolean().default(false),
});

export const inviteSubmitSchema = z.object({
  clientRole: optionalText(120),
  clientCompany: optionalText(160),
  relationship: z.enum(RELATIONSHIPS),
  content: trimmed(1500).min(20, "Write at least 20 characters."),
  rating: z.coerce.number().int().min(1).max(5),
  consentPublish: z.literal(true, { errorMap: () => ({ message: "Your consent is needed to publish the testimonial." }) }),
  consentContact: z.boolean().default(false),
});

// --------------------------------------------------------------- certificates

const optionalDate = z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.coerce.date().nullable().optional());

const certificateFields = {
  title: trimmed(191).min(1, "Enter the certificate's title."),
  institution: trimmed(191).min(1, "Enter who issued it."),
  category: optionalText(80),
  type: z.enum(["CERTIFICATION", "COURSE", "ACADEMIC", "AWARD"]),
  issueDate: z.coerce.date({ errorMap: () => ({ message: "Enter the issue date." }) }),
  expiresAt: optionalDate,
  credentialId: optionalText(120),
  showCredentialId: z.boolean().optional(),
  credentialUrl: url,
  isPublished: z.boolean().optional(),
  displayOrder: z.coerce.number().int().optional(),
};
const expiryAfterIssue = (v) => !v.expiresAt || !v.issueDate || v.expiresAt > v.issueDate;
export const certificateSchema = z.object(certificateFields).refine(expiryAfterIssue, { message: "The expiry date must be after the issue date.", path: ["expiresAt"] });
export const certificateUpdateSchema = z.object(certificateFields).partial().refine(expiryAfterIssue, { message: "The expiry date must be after the issue date.", path: ["expiresAt"] });

// ------------------------------------------------------ business compliance

const credentialFields = {
  type: z.enum(["PACRA_REGISTRATION", "ZICTA_LICENCE", "DATA_PROTECTION_REGISTRATION", "OTHER"]),
  title: trimmed(191).min(1, "Enter the title exactly as printed."),
  authority: trimmed(191).min(1, "Enter the issuing authority."),
  referenceNumber: trimmed(120).min(1, "Enter the registration or licence number."),
  issuedAt: z.coerce.date({ errorMap: () => ({ message: "Enter the issue date." }) }),
  expiresAt: optionalDate,
  verificationUrl: url,
  verificationNote: optionalText(500),
  isPublic: z.boolean().optional(),
  displayOrder: z.coerce.number().int().optional(),
};
const credentialDates = (v) => !v.expiresAt || !v.issuedAt || v.expiresAt > v.issuedAt;
export const credentialSchema = z.object(credentialFields).refine(credentialDates, { message: "The expiry date must be after the issue date.", path: ["expiresAt"] });
export const credentialUpdateSchema = z.object(credentialFields).partial().refine(credentialDates, { message: "The expiry date must be after the issue date.", path: ["expiresAt"] });
