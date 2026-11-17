/**
 * Validates req.body (default) or req.query against a zod schema.
 * On success the parsed, stripped value replaces req.body, or is put on
 * req.validQuery for queries. Unknown keys are dropped by the schemas,
 * which is what stops mass-assignment of fields like `status` or `role`.
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: "Some fields need attention.",
        fields: result.error.flatten().fieldErrors,
      });
    }
    if (source === "body") req.body = result.data;
    else req.validQuery = result.data;
    return next();
  };
}
