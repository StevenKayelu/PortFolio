import assert from "node:assert/strict";

/**
 * Shared setup for integration tests. Each test file runs in its own
 * process; files run one at a time (see package.json) because they share
 * one disposable database.
 */
export async function startApp({ mail = false, realtime = false } = {}) {
  process.env.JWT_ACCESS_SECRET ||= "test-access-secret";
  process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret";
  process.env.TRUST_PROXY = "1"; // lets each request present its own client IP
  process.env.NODE_ENV = "test";
  if (mail) process.env.MAIL_TRANSPORT = "memory";

  if (/onrender|tidb|amazonaws|planetscale|neon\.tech|supabase|vultr/i.test(process.env.DATABASE_URL || "") || !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "")) {
    throw new Error("Refusing to run integration tests against what looks like a hosted database.");
  }

  const { default: app } = await import("../src/app.js");
  const { prisma } = await import("../src/config/prisma.js");
  let server;
  if (realtime) {
    const { createServer } = await import("http");
    const { initRealtime } = await import("../src/services/realtime.service.js");
    const { allowedOrigins } = await import("../src/app.js");
    server = createServer(app);
    initRealtime(server, allowedOrigins);
    await new Promise((resolve) => server.listen(0, resolve));
  } else {
    server = app.listen(0);
  }
  const base = `http://127.0.0.1:${server.address().port}`;
  let ip = 0;

  async function api(method, path, { body, token, raw = false, cookie } = {}) {
    const res = await fetch(base + (path.startsWith("/sitemap") || path.startsWith("/robots") ? path : `/api/v1${path}`), {
      method,
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `198.51.100.${(ip += 1) % 250}`,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: raw || !text ? text : JSON.parse(text) };
  }

  async function login(email, password) {
    const res = await api("POST", "/auth/login", { body: { email, password } });
    assert.equal(res.status, 200, `login failed for ${email}`);
    return { token: res.body.accessToken, cookie: res.headers.get("set-cookie")?.split(";")[0] };
  }

  async function close() {
    if (realtime) (await import("../src/services/realtime.service.js")).closeRealtime();
    server.close();
  }

  return { prisma, api, login, base, close };
}
