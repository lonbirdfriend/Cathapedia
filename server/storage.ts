import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { and, eq } from "drizzle-orm";
import { entries, conceptKey, type Entry, type InsertEntry } from "../shared/schema";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";

export interface IStorage {
  list(): Promise<Entry[]>;
  create(data: InsertEntry): Promise<Entry | undefined>;
  update(id: string, data: InsertEntry, version: number): Promise<Entry | undefined>;
  remove(id: string): Promise<boolean>;
  import(data: InsertEntry[]): Promise<{ imported: number; skipped: number }>;
}
const tableSQL = `CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, concept TEXT NOT NULL,
  definition TEXT NOT NULL, example TEXT NOT NULL, categories TEXT NOT NULL,
  aliases TEXT NOT NULL, source TEXT NOT NULL, author TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
)`;
function makeEntry(data: InsertEntry): Entry {
  const now = new Date().toISOString();
  return { ...data, author: data.author || "Lerngruppe", id: randomUUID(), key: conceptKey(data.concept), createdAt: now, updatedAt: now, version: 1 };
}
const columns = "id,key,concept,definition,example,categories,aliases,source,author,created_at,updated_at,version";
const insertSQL = `INSERT INTO entries (${columns}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (key) DO NOTHING RETURNING *`;
function values(e: Entry) { return [e.id,e.key,e.concept,e.definition,e.example,JSON.stringify(e.categories),JSON.stringify(e.aliases),e.source,e.author,e.createdAt,e.updatedAt,e.version]; }
function fromPG(r: any): Entry {
  return { id:r.id,key:r.key,concept:r.concept,definition:r.definition,example:r.example,categories:JSON.parse(r.categories),aliases:JSON.parse(r.aliases),source:r.source,author:r.author,createdAt:r.created_at,updatedAt:r.updated_at,version:r.version };
}

class DatabaseStorage implements IStorage {
  private ready?: Promise<void>;
  private pool?: Pool;
  private sqlite?: Database.Database;
  private db?: BetterSQLite3Database;
  private async init() {
    if (!this.ready) this.ready = this.initialize().catch(e => { this.ready = undefined; throw e; });
    return this.ready;
  }
  private async initialize() {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (url) {
      this.pool ??= new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        // Serialize the first-run schema creation across concurrent serverless instances.
        await client.query("SELECT pg_advisory_xact_lock(918273645)");
        await client.query(tableSQL);
        await client.query("COMMIT");
      } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
    } else {
      if (process.env.VERCEL) throw Object.assign(new Error("Die Datenbank fehlt. Bitte DATABASE_URL in Vercel hinterlegen und neu deployen."), { status: 503 });
      const [{ default: SQLite }, { drizzle }] = await Promise.all([import("better-sqlite3"), import("drizzle-orm/better-sqlite3")]);
      this.sqlite = new SQLite(process.env.SQLITE_PATH || "data.db");
      this.sqlite.pragma("journal_mode = WAL");
      this.sqlite.pragma("busy_timeout = 5000");
      this.sqlite.exec(tableSQL);
      this.db = drizzle(this.sqlite);
    }
  }
  async list() {
    await this.init();
    return this.pool ? (await this.pool.query("SELECT * FROM entries ORDER BY concept")).rows.map(fromPG) : this.db!.select().from(entries).all();
  }
  async create(data: InsertEntry) {
    await this.init();
    const entry = makeEntry(data);
    if (this.pool) { const r = await this.pool.query(insertSQL, values(entry)); return r.rows[0] ? fromPG(r.rows[0]) : undefined; }
    return this.db!.insert(entries).values(entry).onConflictDoNothing({ target: entries.key }).returning().get();
  }
  async update(id: string, data: InsertEntry, version: number) {
    await this.init();
    const patch = { ...data, key: conceptKey(data.concept), author: data.author || "Lerngruppe", updatedAt: new Date().toISOString(), version: version + 1 };
    if (this.pool) {
      const r = await this.pool.query(`UPDATE entries SET key=$1,concept=$2,definition=$3,example=$4,categories=$5,aliases=$6,source=$7,author=$8,updated_at=$9,version=$10 WHERE id=$11 AND version=$12 RETURNING *`,
        [patch.key,patch.concept,patch.definition,patch.example,JSON.stringify(patch.categories),JSON.stringify(patch.aliases),patch.source,patch.author,patch.updatedAt,patch.version,id,version]);
      return r.rows[0] ? fromPG(r.rows[0]) : undefined;
    }
    return this.db!.update(entries).set(patch).where(and(eq(entries.id,id),eq(entries.version,version))).returning().get();
  }
  async remove(id: string) {
    await this.init();
    return this.pool ? !!(await this.pool.query("DELETE FROM entries WHERE id=$1", [id])).rowCount : this.db!.delete(entries).where(eq(entries.id,id)).run().changes > 0;
  }
  async import(data: InsertEntry[]) {
    await this.init();
    let imported = 0;
    if (this.pool) {
      const client: PoolClient = await this.pool.connect();
      try {
        await client.query("BEGIN");
        // Batches keep large imports within serverless time limits. One transaction for all batches.
        for (let i = 0; i < data.length; i += 100) {
          const batch = data.slice(i, i + 100).map(makeEntry);
          const placeholders = batch.map((_, n) => `(${Array.from({length:12}, (_, j) => `$${n * 12 + j + 1}`).join(",")})`).join(",");
          const r = await client.query(`INSERT INTO entries (${columns}) VALUES ${placeholders} ON CONFLICT (key) DO NOTHING`, batch.flatMap(values));
          imported += r.rowCount || 0;
        }
        await client.query("COMMIT");
      } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
    } else {
      this.db!.transaction(tx => {
        for (const item of data) imported += tx.insert(entries).values(makeEntry(item)).onConflictDoNothing({target:entries.key}).run().changes;
      });
    }
    return { imported, skipped: data.length - imported };
  }
}
export const storage = new DatabaseStorage();
