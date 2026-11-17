export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
}

// Prisma's known request errors mapped to responses the client can act on.
const PRISMA_ERRORS = {
  P2002: [409, "That value is already in use. Choose a different one."],
  P2003: [400, "A linked record doesn't exist."],
  P2025: [404, "Not found."],
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === "production";
  const prismaError = PRISMA_ERRORS[err.code];
  const status = prismaError?.[0] || err.status || err.statusCode || 500;

  if (status >= 500) console.error(err);

  res.status(status).json({
    error: prismaError?.[1] || err.publicMessage || (status === 500 ? "Something went wrong on our end." : err.message),
    ...(err.code === "P2002" && err.meta?.target ? { fields: err.meta.target } : {}),
    ...(isProd || status < 500 ? {} : { stack: err.stack }),
  });
}
