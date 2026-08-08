import { prisma } from "../config/prisma.js";
import slugify from "slugify";

export async function listPosts(req, res, next) {
  try {
    const { search, category, tag, page = 1, pageSize = 10 } = req.query;
    const where = {
      deletedAt: null,
      status: "PUBLISHED",
      ...(category ? { category: { slug: category } } : {}),
      ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
      ...(search ? { OR: [{ title: { contains: search } }, { excerpt: { contains: search } }] } : {}),
    };

    const take = Math.min(parseInt(pageSize), 30);
    const skip = (parseInt(page) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        take,
        skip,
        include: { category: true, tags: { include: { tag: true } } },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({ items, total, page: parseInt(page), pageSize: take });
  } catch (err) {
    next(err);
  }
}

export async function getPostById(req, res, next) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      include: { category: true, tags: { include: { tag: true } } },
    });
    if (!post || post.deletedAt) return res.status(404).json({ error: "Post not found." });
    res.json(post);
  } catch (err) {
    next(err);
  }
}

export async function getPostBySlug(req, res, next) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: true,
        tags: { include: { tag: true } },
        comments: { where: { isApproved: true, deletedAt: null }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!post || post.deletedAt || post.status !== "PUBLISHED") {
      return res.status(404).json({ error: "Post not found." });
    }

    await prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });

    const related = await prisma.blogPost.findMany({
      where: { categoryId: post.categoryId, status: "PUBLISHED", id: { not: post.id } },
      take: 3,
      orderBy: { publishedAt: "desc" },
    });

    res.json({ ...post, related });
  } catch (err) {
    next(err);
  }
}

export async function createPost(req, res, next) {
  try {
    const { tagNames = [], categoryId, status, ...rest } = req.body;
    const slug = rest.slug || slugify(rest.title, { lower: true, strict: true });

    const post = await prisma.blogPost.create({
      data: {
        ...rest,
        slug,
        status: status || "DRAFT",
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        categoryId: categoryId || null,
        authorId: req.user?.sub,
        tags: {
          create: tagNames.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name, slug: slugify(name, { lower: true }) } } },
          })),
        },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}

export async function updatePost(req, res, next) {
  try {
    const { tagNames, status, ...rest } = req.body;
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(status ? { status } : {}),
        publishedAt: status === "PUBLISHED" && !existing?.publishedAt ? new Date() : undefined,
      },
    });

    res.json(post);
  } catch (err) {
    next(err);
  }
}

export async function deletePost(req, res, next) {
  try {
    await prisma.blogPost.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function toggleLike(req, res, next) {
  try {
    const { fingerprint } = req.body;
    const postId = req.params.id;

    const existing = await prisma.blogLike.findUnique({ where: { postId_fingerprint: { postId, fingerprint } } });

    if (existing) {
      await prisma.$transaction([
        prisma.blogLike.delete({ where: { id: existing.id } }),
        prisma.blogPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return res.json({ liked: false });
    }

    await prisma.$transaction([
      prisma.blogLike.create({ data: { postId, fingerprint } }),
      prisma.blogPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    res.json({ liked: true });
  } catch (err) {
    next(err);
  }
}

export async function toggleBookmark(req, res, next) {
  try {
    const { fingerprint } = req.body;
    const postId = req.params.id;

    const existing = await prisma.blogBookmark.findUnique({ where: { postId_fingerprint: { postId, fingerprint } } });

    if (existing) {
      await prisma.blogBookmark.delete({ where: { id: existing.id } });
      return res.json({ bookmarked: false });
    }

    await prisma.blogBookmark.create({ data: { postId, fingerprint } });
    res.json({ bookmarked: true });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const { guestName, guestEmail, content, parentId } = req.body;
    const comment = await prisma.comment.create({
      data: { postId: req.params.id, guestName, guestEmail, content, parentId: parentId || null, isApproved: false },
    });
    res.status(201).json({ message: "Comment submitted — it will appear once approved.", id: comment.id });
  } catch (err) {
    next(err);
  }
}

export async function listAllComments(req, res, next) {
  try {
    const { status } = req.query; // "pending" | "approved" | undefined (all)
    const where = {
      deletedAt: null,
      ...(status === "pending" ? { isApproved: false } : {}),
      ...(status === "approved" ? { isApproved: true } : {}),
    };
    const comments = await prisma.comment.findMany({
      where,
      include: { post: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(comments);
  } catch (err) {
    next(err);
  }
}

export async function moderateComment(req, res, next) {
  try {
    const comment = await prisma.comment.update({
      where: { id: req.params.id },
      data: { isApproved: req.body.isApproved },
    });
    res.json(comment);
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req, res, next) {
  try {
    await prisma.comment.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function listCategories(req, res, next) {
  try {
    res.json(await prisma.blogCategory.findMany({ orderBy: { name: "asc" } }));
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, slug } = req.body;
    const category = await prisma.blogCategory.create({
      data: { name, slug: slug || name.toLowerCase().replace(/\s+/g, "-") },
    });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await prisma.blogCategory.update({ where: { id: req.params.id }, data: req.body });
    res.json(category);
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    await prisma.blogCategory.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function listTags(req, res, next) {
  try {
    res.json(await prisma.blogTag.findMany({ orderBy: { name: "asc" } }));
  } catch (err) {
    next(err);
  }
}