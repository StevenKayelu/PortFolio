export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  console.error(err);

  res.status(status).json({
    error: err.publicMessage || (status === 500 ? "Something went wrong on our end." : err.message),
    ...(isProd ? {} : { stack: err.stack }),
  });
}
