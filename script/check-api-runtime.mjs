import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

// Run emitted JS in plain Node without tsx, Vite or a bundler resolver.
// package.json also disables require(ESM), reproducing strict serverless loaders.
// Empty strings prevent dotenv from loading the user's real database credentials.
process.env.VERCEL = "1";
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.ADMIN_PASSWORD = randomBytes(24).toString("hex");
process.env.SESSION_SECRET = randomBytes(48).toString("hex");
const { default: handler } = await import("../.api-runtime/api/index.js");
const server = createServer(handler);
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const health = await fetch(`${base}/api/index?route=health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  const blocked = await fetch(`${base}/api/index?route=entries/test`, { method: "DELETE" });
  assert.equal(blocked.status, 401);
  const login = await fetch(`${base}/api/index?route=login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  assert.equal(typeof (await login.json()).token, "string");
  const missingDB = await fetch(`${base}/api/index?route=entries`);
  assert.equal(missingDB.status, 503);
  assert.match((await missingDB.json()).message, /DATABASE_URL/);
  console.log("PASS: emitted Node ESM handler, Vercel rewrite, login, admin gate and missing-database guard.");
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
