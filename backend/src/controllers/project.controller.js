import { prisma } from "../config/prisma.js";
import slugify from "slugify";

export async function listProjects(req, res, next) {
  try {
    const { search, category, status, featuredOnly, page = 1, pageSize = 20 } = req.query;
    const where = {
      deletedAt: null,
      ...(category ? { category: { slug: category } } : {}),
      ...(status ? { status } : {}),
      ...(featuredOnly === "true" ? { isFeatured: true } : {}),
      ...(search ? { OR: [{ title: { contains: search } }, { summary: { contains: search } }] } : {}),
    };

    const take = Math.min(parseInt(pageSize), 50);
    const skip = (parseInt(page) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        take,
        skip,
        include: { category: true, technologies: { include: { technology: true } }, images: true },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ items, total, page: parseInt(page), pageSize: take });
  } catch (err) {
    next(err);
  }
}

export async function getProjectBySlug(req, res, next) {
  try {
    const project = await prisma.project.findUnique({
      where: { slug: req.params.slug },
      include: { category: true, technologies: { include: { technology: true } }, images: true },
    });

    if (!project || project.deletedAt) return res.status(404).json({ error: "Project not found." });

    await prisma.project.update({ where: { id: project.id }, data: { viewCount: { increment: 1 } } });

    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const { technologyNames = [], categoryId, ...rest } = req.body;
    const slug = rest.slug || slugify(rest.title, { lower: true, strict: true });

    const project = await prisma.project.create({
      data: {
        ...rest,
        slug,
        authorId: req.user?.sub,
        categoryId: categoryId || null,
        technologies: {
          create: technologyNames.map((name) => ({
            technology: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
      },
      include: { technologies: { include: { technology: true } } },
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { technologyNames, ...rest } = req.body;

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
      },
      include: { technologies: { include: { technology: true } } },
    });

    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    await prisma.project.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
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