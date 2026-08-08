import { prisma } from "../config/prisma.js";

export async function submitContactMessage(req, res, next) {
  try {
    const { name, email, subject, message } = req.body;
    await prisma.contactMessage.create({
      data: { name, email, subject, message, ipAddress: req.ip },
    });
    res.status(201).json({ message: "Thanks for reaching out — I'll reply within a day." });
  } catch (err) {
    next(err);
  }
}

export async function listContactMessages(req, res, next) {
  try {
    const { status } = req.query;
    const messages = await prisma.contactMessage.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function updateContactMessageStatus(req, res, next) {
  try {
    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json(message);
  } catch (err) {
    next(err);
  }
}

export async function listSubscribers(req, res, next) {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null },
      orderBy: { createdAt: "desc" },
    });
    res.json(subscribers);
  } catch (err) {
    next(err);
  }
}
export async function unsubscribeNewsletter(req, res, next) {
  try {
    const { email } = req.body;
    await prisma.newsletterSubscriber.update({
      where: { email },
      data: { unsubscribedAt: new Date() },
    });
    res.json({ message: "You have been unsubscribed." });
  } catch (err) {
    next(err);
  }
}

export async function deleteContactMessage(req, res, next) {
  try {
    await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ message: "Message deleted." });
  } catch (err) {
    next(err);
  }
}

export async function subscribeNewsletter(req, res, next) {
  try {
    const { email } = req.body;
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    res.status(201).json({ message: "Subscribed. Check your inbox to confirm." });
  } catch (err) {
    next(err);
  }
}