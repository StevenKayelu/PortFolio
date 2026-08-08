import { prisma } from "../config/prisma.js";

/**
 * Builds list/getOne/create/update/remove handlers for a simple Prisma
 * model. Covers the ~8 "list of things with an admin CRUD panel" models
 * (Service, Experience, Certificate, Skill, GalleryItem, Achievement,
 * Faq, Testimonial) so each route file stays a few lines instead of
 * repeating the same boilerplate eight times.
 *
 * Models with real relational complexity (Project, BlogPost) get their
 * own hand-written controllers instead of using this factory.
 */
export function createCrudController(modelName, options = {}) {
  const {
    orderBy = { displayOrder: "asc" },
    searchFields = [],
    softDelete = true,
    publicWhere = {},
    afterCreate,
  } = options;

  const model = prisma[modelName];

  async function list(req, res, next) {
    try {
      const { search, page = 1, pageSize = 50 } = req.query;
      const where = { ...publicWhere };
      if (softDelete) where.deletedAt = null;

      if (search && searchFields.length) {
        where.OR = searchFields.map((field) => ({ [field]: { contains: search } }));
      }

      const take = Math.min(parseInt(pageSize), 100);
      const skip = (parseInt(page) - 1) * take;

      const [items, total] = await Promise.all([
        model.findMany({ where, orderBy, take, skip }),
        model.count({ where }),
      ]);

      res.json({ items, total, page: parseInt(page), pageSize: take });
    } catch (err) {
      next(err);
    }
  }

  async function getOne(req, res, next) {
    try {
      const item = await model.findUnique({ where: { id: req.params.id } });
      if (!item || (softDelete && item.deletedAt)) {
        return res.status(404).json({ error: "Not found." });
      }
      res.json(item);
    } catch (err) {
      next(err);
    }
  }

  async function create(req, res, next) {
    try {
      const item = await model.create({ data: req.body });
      if (afterCreate) await afterCreate(item, req);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }

  async function update(req, res, next) {
    try {
      const item = await model.update({ where: { id: req.params.id }, data: req.body });
      res.json(item);
    } catch (err) {
      next(err);
    }
  }

  async function remove(req, res, next) {
    try {
      if (softDelete) {
        await model.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
      } else {
        await model.delete({ where: { id: req.params.id } });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  return { list, getOne, create, update, remove };
}
