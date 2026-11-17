import { z } from "zod";

/**
 * Request schemas. Objects are non-strict, so unknown keys are stripped
 * rather than rejected: older admin clients sending extra fields keep
 * working, but those fields never reach Prisma.
 */

const trimmed = (max) => z.string().trim().max(max);
const optionalText = (max) => trimmed(max).optional().nullable().transform((v) => (v === "" ? null : v));
const url = z.string().trim().url().max(500).optional().nullable().or(z.literal("").transform(() => null));
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

export const testimonialSubmitSchema = z.object({
  clientName: trimmed(120).min(1),
  clientRole: optionalText(120),
  clientCompany: optionalText(120),
  content: trimmed(2000).min(10),
  rating: z.coerce.number().int().min(1).max(5).default(5),
});

export const testimonialModerateSchema = z.object({
  isApproved: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  clientName: trimmed(120).min(1).optional(),
  clientRole: optionalText(120),
  clientCompany: optionalText(120),
  content: trimmed(2000).min(1).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

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
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  ownershipStatus: z.enum(["NEEDS_REVIEW", "CONFIRMED", "NOT_OWNED"]).optional(),
  ownerName: optionalText(191),
  publicationPermission: z.enum(["UNKNOWN", "GRANTED", "NOT_REQUIRED", "DENIED"]).optional(),
  outcome: optionalText(5000),
  showcaseBrandId: optionalId,
  contributors: z.array(contributorSchema).max(30).optional(),
};
