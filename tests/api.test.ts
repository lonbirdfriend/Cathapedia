import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { Pool } from "pg";

const folder = mkdtempSync(join(tmpdir(),"cathapedia-test-"));
process.env.SQLITE_PATH = join(folder,"test.db");
process.env.ADMIN_PASSWORD = "integration-test-password";
process.env.SESSION_SECRET = "test-secret-only";
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.VERCEL;
const {default:handler} = await import("../api/index.js");
const server = createServer(handler);
await new Promise<void>(resolve => server.listen(0,"127.0.0.1",resolve));
const {port} = server.address() as {port:number};
const base = `http://127.0.0.1:${port}`;
const body = {concept:"Prüfbegriff",definition:"Eine Erklärung zum Testen.",categories:["Grundlagen"],aliases:["Alias"],example:"Ein Beispiel.",source:"Testunterlage",author:"Test"};
async function request(path:string,method="GET",data?:unknown,token?:string) {
  return fetch(base+path,{method,headers:{"Content-Type":"application/json",...(token ? {Authorization:`Bearer ${token}`} : {})},body:data === undefined ? undefined : JSON.stringify(data)});
}
after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  rmSync(folder,{recursive:true,force:true});
});
test("HTTP end to end: public creation, admin gates, persistence, versioning and atomic XML import", async () => {
  assert.equal((await request("/api/index?route=health")).status,200,"Vercel query rewrite");
  assert.equal((await request("/api/index?route=entries")).status,200,"Vercel nested route rewrite");
  const create = await request("/api/entries","POST",body);
  assert.equal(create.status,201);
  const entry = await create.json();
  assert.equal((await request("/api/entries","POST",{...body,concept:"prüfbegriff"})).status,409);
  assert.equal((await request("/api/entries","POST",{...body,definition:""})).status,400);
  assert.equal((await request(`/api/entries/${entry.id}`,"DELETE")).status,401);
  assert.equal((await request(`/api/entries/${entry.id}`,"PUT",{...body,version:1})).status,401);
  assert.equal((await request("/api/import","POST",{xml:"<broken>"})).status,401);
  assert.equal((await request("/api/import/preview","POST",{xml:"<broken>"})).status,401);
  assert.equal((await request("/api/login","POST",{password:"wrong"})).status,401);
  const {token} = await (await request("/api/login","POST",{password:process.env.ADMIN_PASSWORD})).json();
  assert.ok(token);
  assert.equal((await request(`/api/entries/${entry.id}`,"DELETE",undefined,token+"tampered")).status,401);
  const update = await request(`/api/entries/${entry.id}`,"PUT",{...body,definition:"Neue Erklärung.",version:1},token);
  assert.equal(update.status,200);
  assert.equal((await update.json()).version,2);
  assert.equal((await request(`/api/entries/${entry.id}`,"PUT",{...body,version:1},token)).status,409);
  // A second DB connection sees the committed content, not transient process state.
  if (process.env.TEST_DATABASE_URL) {
    const second = new Pool({connectionString:process.env.TEST_DATABASE_URL});
    assert.equal((await second.query("SELECT definition FROM entries WHERE id=$1",[entry.id])).rows[0].definition,"Neue Erklärung.");
    await second.end();
  } else {
    const second = new Database(process.env.SQLITE_PATH!);
    assert.equal((second.prepare("SELECT definition FROM entries WHERE id=?").get(entry.id) as any)?.definition,"Neue Erklärung.");
    second.close();
  }
  const xml = `<GLOSSARY><INFO><ENTRIES><ENTRY><CONCEPT>Neuer Import</CONCEPT><DEFINITION>Importierte Erklärung.</DEFINITION></ENTRY><ENTRY><CONCEPT>Prüfbegriff</CONCEPT><DEFINITION>Nicht überschreiben.</DEFINITION></ENTRY><ENTRY><CONCEPT>Neuer Import</CONCEPT><DEFINITION>Auch doppelt.</DEFINITION></ENTRY></ENTRIES></INFO></GLOSSARY>`;
  const preview = await (await request("/api/import/preview","POST",{xml},token)).json();
  assert.deepEqual([preview.total,preview.fresh,preview.duplicate],[3,1,2]);
  const imported = await (await request("/api/import","POST",{xml},token)).json();
  assert.deepEqual(imported,{imported:1,skipped:2});
  assert.deepEqual(await (await request("/api/import","POST",{xml},token)).json(),{imported:0,skipped:3});
  const badxml=xml.replace("</ENTRIES>","<ENTRY><CONCEPT>Invalid</CONCEPT></ENTRY></ENTRIES>");
  assert.equal((await request("/api/import","POST",{xml:badxml},token)).status,400);
  assert.equal((await (await request("/api/entries")).json()).length,2);
  assert.equal((await request("/api/import","POST",{xml:"<broken>"},token)).status,400);
  const exportRes=await request("/api/export");
  assert.match(exportRes.headers.get("content-disposition")!,/attachment/);
  const exported=await exportRes.text();
  assert.match(exported,/<GLOSSARY>/);
  assert.deepEqual(await (await request("/api/import","POST",{xml:exported},token)).json(),{imported:0,skipped:2});
  const collision=await request("/api/entries","POST",{...body,concept:"Anderer Begriff"});
  const other=await collision.json();
  assert.equal((await request(`/api/entries/${other.id}`,"PUT",{...body,version:1},token)).status,409);
  const concurrent = await Promise.all([request("/api/entries","POST",{...body,concept:"Gleichzeitig"}),request("/api/entries","POST",{...body,concept:"Gleichzeitig"})]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
  assert.equal((await request(`/api/entries/${entry.id}`,"DELETE",undefined,token)).status,200);
  assert.equal((await request(`/api/entries/${entry.id}`,"DELETE",undefined,token)).status,404);
  assert.equal((await request("/api/unknown")).status,404);
});
