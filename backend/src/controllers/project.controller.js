import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import slugify from "slugify";
import { STAFF_ROLES } from "../middleware/auth.middleware.js";
import { projectAttributionSchema } from "../validation/schemas.js";
import { audit } from "../services/audit.service.js";

const PROTECTED = new Set(["id", "createdAt", "updatedAt", "deletedAt", "viewCount", "authorId"]);
const PROJECT_FIELDS = new Set(
  Prisma.dmmf.datamodel.models.find((m) => m.name === "Project").fields
    .filter((f) => f.kind !== "object" && !PROTECTED.has(f.name))
    .map((f) => f.name)
);
const attribution = z.object(projectAttributionSchema);
const PROJECT_STATUSES = new Set(["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);

/**
 * Splits an admin request body into Project columns, the technology list
 * and the contributor list. Unknown keys are dropped; attribution fields
 * are validated (a 400 is thrown for bad values).
 */
function parseProjectBody(body = {}) {
  const parsed = attribution.safeParse(body);
  if (!parsed.success) {
    throw Object.assign(new Error("Invalid attribution fields."), { status: 400, publicMessage: "Some attribution fields are invalid." });
  }
  const { contributors, ...attr } = parsed.data;
  const data = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => PROJECT_FIELDS.has(k))
      .map(([k, v]) => [k, k.endsWith("Id") && v === "" ? null : v]) // empty select = no link
  );
  return { data: { ...data, ...attr }, technologyNames: body.technologyNames, contributors };
}

const projectInclude = {
  category: true,
  technologies: { include: { technology: true } },
  images: true,
  contributors: { orderBy: { displayOrder: "asc" } },
  showcaseBrand: { select: { key: true, name: true } },
};

// Internal review state is not part of the public payload.
// eslint-disable-next-line no-unused-vars
function toPublic({ publicationPermission, authorId, deletedAt, ...project }) {
  return project;
}

const isStaff = (req) => STAFF_ROLES.includes(req.user?.role);

export async function listProjects(req, res, next) {
  try {
    const { search, category, status, featuredOnly, brand, includeHidden, page = 1, pageSize = 20 } = req.query;
    // Drafts, private and unlisted projects only appear for signed-in staff
    // who ask for them (the admin table); public pages never see them.
    const showHidden = includeHidden === "true" && isStaff(req);
    const where = {
      deletedAt: null,
      ...(showHidden ? {} : { visibility: "PUBLIC", status: { not: "DRAFT" } }),
      ...(brand ? { showcaseBrand: { key: String(brand) } } : {}),
      ...(category ? { category: { slug: category } } : {}),
      // Combine with the public "not DRAFT" rule instead of replacing it.
      ...(PROJECT_STATUSES.has(status) ? { status: showHidden ? status : { equals: status, not: "DRAFT" } } : {}),
      ...(featuredOnly === "true" ? { isFeatured: true } : {}),
      ...(search ? { OR: [{ title: { contains: String(search), mode: "insensitive" } }, { summary: { contains: String(search), mode: "insensitive" } }] } : {}),
    };

    const take = Math.min(Math.max(parseInt(pageSize) || 20, 1), 50);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        take,
        skip,
        include: projectInclude,
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ items: showHidden ? items : items.map(toPublic), total, page: skip / take + 1, pageSize: take });
  } catch (err) {
    next(err);
  }
}

export async function getProjectBySlug(req, res, next) {
  try {
    const project = await prisma.project.findUnique({ where: { slug: req.params.slug }, include: projectInclude });

    // UNLISTED projects are reachable by link; drafts and PRIVATE are staff-only.
    const hidden = project && (project.status === "DRAFT" || project.visibility === "PRIVATE");
    if (!project || project.deletedAt || (hidden && !isStaff(req))) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (!isStaff(req)) {
      await prisma.project.update({ where: { id: project.id }, data: { viewCount: { increment: 1 } } });
    }

    res.json(isStaff(req) ? project : toPublic(project));
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const { data, technologyNames = [], contributors = [] } = parseProjectBody(req.body);
    if (!data.title) return res.status(400).json({ error: "A title is required." });
    const slug = data.slug || slugify(data.title, { lower: true, strict: true });

    const project = await prisma.project.create({
      data: {
        ...data,
        slug,
        authorId: req.user?.sub,
        categoryId: data.categoryId || null,
        technologies: {
          create: technologyNames.map((name) => ({
            technology: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
        contributors: { create: contributors },
      },
      include: projectInclude,
    });

    await audit(req, "CREATE", "Project", project.id);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { data: rest, technologyNames, contributors } = parseProjectBody(req.body);

    if (contributors) {
      await prisma.projectContributor.deleteMany({ where: { projectId: req.params.id } });
    }

    if (technologyNames) {
      // Replace the tech-stack relation wholesale rather than trying to
      // diff it — simpler and correct for a short, admin-edited list.
      await prisma.projectTechnology.deleteMany({ where: { projectId: req.params.id } });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(technologyNames && {
          technologies: {
            create: technologyNames.map((name) => ({
              technology: { connectOrCreate: { where: { name }, create: { name } } },
            })),
          },
        }),
        ...(contributors && { contributors: { create: contributors } }),
      },
      include: projectInclude,
    });

    await audit(req, "UPDATE", "Project", project.id, { fields: Object.keys(rest) });
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    await prisma.project.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await audit(req, "DELETE", "Project", req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function createProjectCategory(req, res, next) {
  try {
    const { name, slug } = req.body;
    const category = await prisma.projectCategory.create({
      data: { name, slug: slug || name.toLowerCase().replace(/\s+/g, "-") },
    });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

export async function updateProjectCategory(req, res, next) {
  try {
    const category = await prisma.projectCategory.update({ where: { id: req.params.id }, data: req.body });
    res.json(category);
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectCategory(req, res, next) {
  try {
    await prisma.projectCategory.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function listProjectCategories(req, res, next) {
  try {
    const categories = await prisma.projectCategory.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  } catch (err) {
    next(err);
  }
}