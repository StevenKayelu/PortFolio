/**
 * Live admin updates: only signed-in staff can connect, they hear about new
 * enquiries, and the menu badge counts match. Same prerequisites as other tests.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { startApp } from "./helpers.js";

const t = await startApp({ realtime: true });
const { prisma, api, login, base } = t;
const { token } = await login("admin@example.com", "ChangeMe123!");
const sockets = [];

after(async () => {
  sockets.forEach((s) => s.disconnect());
  await prisma.lead.deleteMany({ where: { email: "realtime.test@example.com" } });
  await prisma.$disconnect();
  await t.close();
});

function connect(auth) {
  const socket = io(base, { path: "/api/v1/realtime", auth, transports: ["websocket"], reconnection: false });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
  });
}

test("connections without a valid access token are refused", async () => {
  await assert.rejects(connect({}), /unauthorized/);
  await assert.rejects(connect({ token: "not-a-token" }), /unauthorized/);
});

test("staff hear about a new enquiry, and the badge count includes it", async () => {
  const socket = await connect({ token });
  const before = (await api("GET", "/admin/inbox-counts", { token })).body.leads;

  const heard = new Promise((resolve) => socket.once("notify", resolve));
  const res = await api("POST", "/enquiries", { body: {
    site: "steven", type: "QUOTE", name: "Realtime Test", email: "realtime.test@example.com",
    message: "Testing that the admin hears about this immediately.", consent: true,
  } });
  assert.equal(res.status, 201);

  const event = await Promise.race([heard, new Promise((_, reject) => setTimeout(() => reject(new Error("no event within 3s")), 3000))]);
  assert.equal(event.kind, "lead");
  assert.equal(event.link, "/admin/leads");
  assert.ok(!("email" in event), "events carry a summary only");

  const after = (await api("GET", "/admin/inbox-counts", { token })).body;
  assert.equal(after.leads, before + 1);
  assert.deepEqual(Object.keys(after).sort(), ["approvals", "leads", "messages", "testimonials"]);
});

test("badge counts need a signed-in user", async () => {
  assert.equal((await api("GET", "/admin/inbox-counts")).status, 401);
});
