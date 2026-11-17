import slugify from "slugify";
import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.service.js";
import { SCOPES, assertBrandScope, brandFilter, forbidden, hasBrandScope } from "../services/brandAccess.service.js";

/**
 * Brands, ventures and products (Digital Ecosystem report §02, §07, §08).
 * Public endpoints only ever return PUBLISHED records and the fields
 * approved for display; internal notes and legal metadata stay admin-only.
 */

const publicBrandSelect = {
  key: true, name: true, slug: true, kind: true, tagline: true, description: true, logoUrl: true, domains: true, theme: true,
};
const publicProductSelect = { name: true, slug: true, summary: true, website: true, lifecycle: true, ownershipStatus: true };
const publicVentureSelect = {
  name: true, slug: true, summary: true, description: true, stage: true, verificationStatus: true, website: true, logoUrl: true,
  brand: { select: { key: true, name: true } },
  products: { where: { status: "PUBLISHED", deletedAt: null }, orderBy: { displayOrder: "asc" }, select: publicProductSelect },
};

function notFound(message = "Not found.") {
  return Object.assign(new Error(message), { status: 404, publicMessage: message });
}

// ------------------------------------------------------------------ public

export async function listPublicBrands(req, res, next) {
  try {
    const brands = await prisma.brand.findMany({ where: { status: "PUBLISHED" }, orderBy: { displayOrder: "asc" }, select: publicBrandSelect });
    res.json(brands);
  } catch (err) {
    next(err);
  }
}

/** Everything the ecosystem map needs, in one request. */
export async function getEcosystem(req, res, next) {
  try {
    const [brands, relationships, ventures, unassignedProducts] = await Promise.all([
      prisma.brand.findMany({ where: { status: "PUBLISHED" }, orderBy: { displayOrder: "asc" }, select: publicBrandSelect }),
      prisma.brandRelationship.findMany({
        where: { parentBrand: { status: "PUBLISHED" }, childBrand: { status: "PUBLISHED" } },
        select: { relationType: true, verificationStatus: true, publicNote: true, parentBrand: { select: { key: true } }, childBrand: { select: { key: true } } },
      }),
      prisma.venture.findMany({ where: { status: "PUBLISHED", deletedAt: null }, orderBy: { displayOrder: "asc" }, select: publicVentureSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null, ventureId: null }, orderBy: { displayOrder: "asc" }, select: publicProductSelect }),
    ]);
    res.set("Cache-Control", "public, max-age=300");
    res.json({
      brands,
      relationships: relationships.map((r) => ({
        parent: r.parentBrand.key, child: r.childBrand.key, type: r.relationType, verification: r.verificationStatus, note: r.publicNote,
      })),
      ventures,
      unassignedProducts,
    });
  } catch (err) {
    next(err);
  }
}

export async function listPublicVentures(req, res, next) {
  try {
    const ventures = await prisma.venture.findMany({
      where: { status: "PUBLISHED", deletedAt: null }, orderBy: { displayOrder: "asc" }, select: publicVentureSelect,
    });
    res.json({ items: ventures, total: ventures.length });
  } catch (err) {
    next(err);
  }
}

export async function getPublicVenture(req, res, next) {
  try {
    const venture = await prisma.venture.findFirst({
      where: { slug: req.params.slug, status: "PUBLISHED", deletedAt: null }, select: publicVentureSelect,
    });
    if (!venture) throw notFound("Venture not found.");
    res.json(venture);
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------ admin: brands

export async function adminListBrands(req, res, next) {
  try {
    const where = req.brandAccess.all ? {} : { id: { in: [...req.brandAccess.scopes.keys()] } };
    const brands = await prisma.brand.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: { organization: true, _count: { select: { ventures: true, leads: true } } },
    });
    res.json(brands.map((b) => ({ ...b, myScope: req.brandAccess.all ? "SUPER_ADMIN" : req.brandAccess.scopes.get(b.id) })));
  } catch (err) {
    next(err);
  }
}

export async function adminCreateBrand(req, res, next) {
  try {
    const brand = await prisma.brand.create({ data: req.body });
    await audit(req, "CREATE", "Brand", brand.id, { key: brand.key });
    res.status(201).json(brand);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateBrand(req, res, next) {
  try {
    const brand = await prisma.brand.findUnique({ where: { id: req.params.id } });
    if (!brand) throw notFound("Brand not found.");
    assertBrandScope(req.brandAccess, brand.id, SCOPES.manage);
    // Linking a brand to a legal entity is a governance decision (report §02).
    if (changedKeys(req.body, brand).includes("organizationId") && !req.brandAccess.all) {
      throw forbidden("Only a super admin can change a brand's legal entity.");
    }
    const updated = await prisma.brand.update({ where: { id: brand.id }, data: req.body });
    await audit(req, "UPDATE", "Brand", brand.id, { fields: Object.keys(req.body) });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------- admin: legal + relationships

export async function adminListOrganizations(req, res, next) {
  try {
    res.json(await prisma.organization.findMany({ orderBy: { legalName: "asc" } }));
  } catch (err) {
    next(err);
  }
}

export async function adminSaveOrganization(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.verificationStatus === "VERIFIED") data.verifiedAt = new Date();
    const org = req.params.id
      ? await prisma.organization.update({ where: { id: req.params.id }, data })
      : await prisma.organization.create({ data });
    await audit(req, req.params.id ? "UPDATE" : "CREATE", "Organization", org.id, { verificationStatus: org.verificationStatus });
    res.status(req.params.id ? 200 : 201).json(org);
  } catch (err) {
    next(err);
  }
}

export async function adminListRelationships(req, res, next) {
  try {
    res.json(await prisma.brandRelationship.findMany({
      include: { parentBrand: { select: { key: true, name: true } }, childBrand: { select: { key: true, name: true } } },
    }));
  } catch (err) {
    next(err);
  }
}

export async function adminSaveRelationship(req, res, next) {
  try {
    const rel = req.params.id
      ? await prisma.brandRelationship.update({ where: { id: req.params.id }, data: req.body })
      : await prisma.brandRelationship.create({ data: req.body });
    await audit(req, req.params.id ? "UPDATE" : "CREATE", "BrandRelationship", rel.id, { verificationStatus: rel.verificationStatus });
    res.status(req.params.id ? 200 : 201).json(rel);
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteRelationship(req, res, next) {
  try {
    await prisma.brandRelationship.delete({ where: { id: req.params.id } });
    await audit(req, "DELETE", "BrandRelationship", req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------- admin: ventures

/** Keys of `body` whose value differs from `existing` (admin forms resend every field). */
function changedKeys(body, existing = {}) {
  return Object.keys(body).filter((k) => body[k] !== undefined && body[k] !== (existing[k] ?? null) && !(body[k] === null && existing[k] === undefined));
}

/**
 * Editors work on drafts only; publishing, archiving and editing
 * published content need a brand ADMIN (report §08, "publishing by approval").
 */
function assertEditorRules(access, brandId, body, existing) {
  if (hasBrandScope(access, brandId, SCOPES.manage)) return;
  if (existing && existing.status !== "DRAFT") throw forbidden("This is published. Ask a brand admin to change it.");
  if (body.status && body.status !== "DRAFT") throw forbidden("Only a brand admin can publish or archive.");
}

function assertSuperForVerification(access, body, existing) {
  const changed = changedKeys(body, existing);
  if ((changed.includes("verificationStatus") || changed.includes("organizationId")) && !access.all) {
    throw forbidden("Only a super admin can change verification or legal entity.");
  }
}

export async function adminListVentures(req, res, next) {
  try {
    const ventures = await prisma.venture.findMany({
      where: { deletedAt: null, ...brandFilter(req.brandAccess, SCOPES.edit) },
      orderBy: { displayOrder: "asc" },
      include: { brand: { select: { id: true, key: true, name: true } }, organization: { select: { id: true, legalName: true } }, _count: { select: { products: true } } },
    });
    res.json({ items: ventures, total: ventures.length });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateVenture(req, res, next) {
  try {
    const data = { ...req.body, slug: req.body.slug || slugify(req.body.name, { lower: true, strict: true }) };
    assertBrandScope(req.brandAccess, data.brandId, SCOPES.edit);
    assertEditorRules(req.brandAccess, data.brandId, data);
    assertSuperForVerification(req.brandAccess, data, { verificationStatus: "UNVERIFIED" });
    const venture = await prisma.venture.create({ data });
    await audit(req, "CREATE", "Venture", venture.id, { status: venture.status });
    res.status(201).json(venture);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateVenture(req, res, next) {
  try {
    const venture = await prisma.venture.findUnique({ where: { id: req.params.id } });
    if (!venture || venture.deletedAt) throw notFound("Venture not found.");
    assertBrandScope(req.brandAccess, venture.brandId, SCOPES.edit);
    if (req.body.brandId !== undefined && req.body.brandId !== venture.brandId) {
      assertBrandScope(req.brandAccess, req.body.brandId, SCOPES.manage); // moving needs admin on the target
    }
    assertEditorRules(req.brandAccess, venture.brandId, req.body, venture);
    assertSuperForVerification(req.brandAccess, req.body, venture);
    const updated = await prisma.venture.update({ where: { id: venture.id }, data: req.body });
    await audit(req, "UPDATE", "Venture", venture.id, { fields: Object.keys(req.body) });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteVenture(req, res, next) {
  try {
    const venture = await prisma.venture.findUnique({ where: { id: req.params.id } });
    if (!venture || venture.deletedAt) throw notFound("Venture not found.");
    assertBrandScope(req.brandAccess, venture.brandId, SCOPES.manage);
    await prisma.venture.update({ where: { id: venture.id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
    await audit(req, "DELETE", "Venture", venture.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------- admin: products

async function productBrandId(ventureId) {
  if (!ventureId) return null;
  const venture = await prisma.venture.findUnique({ where: { id: ventureId }, select: { brandId: true } });
  if (!venture) throw Object.assign(new Error("Unknown venture."), { status: 400, publicMessage: "Unknown venture." });
  return venture.brandId;
}

function assertSuperForOwnership(access, body, existing = { ownershipStatus: "NEEDS_REVIEW" }) {
  // Ownership is a legal claim; only a super admin may set it (report §05).
  if (changedKeys(body, existing).includes("ownershipStatus") && !access.all) {
    throw forbidden("Only a super admin can confirm product ownership.");
  }
}

export async function adminListProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, ...(req.brandAccess.all ? {} : { venture: brandFilter(req.brandAccess, SCOPES.edit) }) },
      orderBy: { displayOrder: "asc" },
      include: { venture: { select: { id: true, name: true, brandId: true } }, project: { select: { id: true, title: true, slug: true } } },
    });
    res.json({ items: products, total: products.length });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateProduct(req, res, next) {
  try {
    const data = { ...req.body, slug: req.body.slug || slugify(req.body.name, { lower: true, strict: true }) };
    const brandId = await productBrandId(data.ventureId);
    assertBrandScope(req.brandAccess, brandId, SCOPES.edit);
    assertEditorRules(req.brandAccess, brandId, data);
    assertSuperForOwnership(req.brandAccess, data);
    const product = await prisma.product.create({ data });
    await audit(req, "CREATE", "Product", product.id, { status: product.status });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateProduct(req, res, next) {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.deletedAt) throw notFound("Product not found.");
    const brandId = await productBrandId(product.ventureId);
    assertBrandScope(req.brandAccess, brandId, SCOPES.edit);
    if (req.body.ventureId !== undefined && req.body.ventureId !== product.ventureId) {
      assertBrandScope(req.brandAccess, await productBrandId(req.body.ventureId), SCOPES.manage);
    }
    assertEditorRules(req.brandAccess, brandId, req.body, product);
    assertSuperForOwnership(req.brandAccess, req.body, product);
    const updated = await prisma.product.update({ where: { id: product.id }, data: req.body });
    await audit(req, "UPDATE", "Product", product.id, { fields: Object.keys(req.body) });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteProduct(req, res, next) {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.deletedAt) throw notFound("Product not found.");
    assertBrandScope(req.brandAccess, await productBrandId(product.ventureId), SCOPES.manage);
    await prisma.product.update({ where: { id: product.id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
    await audit(req, "DELETE", "Product", product.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------- admin: brand roles

export async function adminListUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true,
        brandRoles: { select: { scope: true, brand: { select: { id: true, key: true, name: true } } } },
      },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/** Replaces a user's brand grants wholesale. */
export async function adminSetBrandRoles(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!user) throw notFound("User not found.");
    await prisma.$transaction([
      prisma.userBrandRole.deleteMany({ where: { userId: user.id } }),
      prisma.userBrandRole.createMany({ data: req.body.roles.map((r) => ({ ...r, userId: user.id })) }),
    ]);
    await audit(req, "UPDATE", "UserBrandRole", user.id, { roles: req.body.roles });
    const roles = await prisma.userBrandRole.findMany({ where: { userId: user.id }, include: { brand: { select: { key: true, name: true } } } });
    res.json(roles);
  } catch (err) {
    next(err);
  }
}
