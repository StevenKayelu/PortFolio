/**
 * Idempotent seed for the Devegen ecosystem (Digital Ecosystem report §07,
 * "seed brand records idempotently"). Safe to run on production: it only
 * creates missing rows and never overwrites content edited in the admin.
 *
 * What it records is deliberately conservative:
 *  - relationships are UNVERIFIED until checked against PACRA records
 *  - products stay DRAFT + NEEDS_REVIEW until ownership is confirmed
 *  - no Organization (legal entity) rows: those come from real documents
 *
 * Run: node prisma/seed-ecosystem.js
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BRANDS = [
  {
    key: "steven", name: "Steven Kayelu", slug: "steven-kayelu", kind: "PERSONAL", displayOrder: 0,
    tagline: "Software engineer and founder",
    domains: ["stevenkayelu.online", "www.stevenkayelu.online"],
  },
  {
    key: "devegen", name: "Devegen Ventures", slug: "devegen-ventures", kind: "UMBRELLA", displayOrder: 1,
    tagline: "Building ideas into meaningful ventures.", // proposed positioning line, not a registered tagline
    domains: ["devgenventures.com", "www.devgenventures.com"],
  },
  {
    key: "solutions", name: "DevGen Solutions LTD", slug: "devgen-solutions", kind: "SERVICE", displayOrder: 2,
    tagline: "Business systems, web and mobile applications, and IT support.",
    domains: [],
  },
];

const RELATIONSHIPS = [
  {
    parent: "steven", child: "devegen", relationType: "FOUNDER_OF",
    publicNote: "Founder of Devegen Ventures.",
  },
  {
    parent: "devegen", child: "solutions", relationType: "UMBRELLA_OF",
    publicNote: "Operates as the technology services brand within the Devegen ecosystem. The legal relationship is still to be confirmed.",
    internalNote: "Confirm exact registered names and relationship with PACRA before changing to VERIFIED (report §12).",
  },
];

const PRODUCTS = ["MotoGo", "TangaOne", "Exam Made Easy"];

async function main() {
  const brandIds = {};
  for (const { domains, ...brand } of BRANDS) {
    const row = await prisma.brand.upsert({
      where: { key: brand.key },
      update: {}, // never overwrite admin edits
      create: { ...brand, domains, status: "PUBLISHED" },
    });
    brandIds[brand.key] = row.id;
  }

  for (const r of RELATIONSHIPS) {
    const where = {
      parentBrandId_childBrandId_relationType: { parentBrandId: brandIds[r.parent], childBrandId: brandIds[r.child], relationType: r.relationType },
    };
    const exists = await prisma.brandRelationship.findUnique({ where });
    if (!exists) {
      await prisma.brandRelationship.create({
        data: {
          parentBrandId: brandIds[r.parent], childBrandId: brandIds[r.child], relationType: r.relationType,
          verificationStatus: r.relationType === "FOUNDER_OF" ? "VERIFIED" : "PENDING",
          publicNote: r.publicNote, internalNote: r.internalNote,
        },
      });
    }
  }

  const solutionsVenture = await prisma.venture.upsert({
    where: { slug: "devgen-solutions" },
    update: {},
    create: {
      name: "DevGen Solutions LTD",
      slug: "devgen-solutions",
      summary: "Technology services: business systems, web and mobile applications, and IT support.",
      stage: "OPERATING",
      status: "PUBLISHED",
      verificationStatus: "PENDING",
      brandId: brandIds.solutions,
      displayOrder: 0,
    },
  });

  for (const [i, name] of PRODUCTS.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        name, slug, displayOrder: i,
        status: "DRAFT", // publish only after ownership is confirmed
        ownershipStatus: "NEEDS_REVIEW",
        ventureId: solutionsVenture.id,
      },
    });
  }

  // Existing projects are showcased on Steven's site; ownership stays NEEDS_REVIEW.
  await prisma.project.updateMany({ where: { showcaseBrandId: null }, data: { showcaseBrandId: brandIds.steven } });

  // Give the existing super admin(s) nothing extra: SUPER_ADMIN already spans all brands.
  console.log("Ecosystem seed complete:", Object.keys(brandIds).join(", "));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
