import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  concept: text("concept").notNull(),
  definition: text("definition").notNull(),
  example: text("example").notNull().default(""),
  categories: text("categories", { mode: "json" }).$type<string[]>().notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull(),
  source: text("source").notNull().default(""),
  author: text("author").notNull().default("Lerngruppe"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  version: integer("version").notNull().default(1),
});
export const insertEntrySchema = createInsertSchema(entries).omit({
  id: true, key: true, createdAt: true, updatedAt: true, version: true,
}).extend({
  concept: z.string().trim().min(1, "Bitte einen Begriff eingeben.").max(150),
  definition: z.string().trim().min(3, "Die Erklärung ist noch etwas kurz.").max(20000),
  example: z.string().trim().max(5000).default(""),
  categories: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  aliases: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  source: z.string().trim().max(500).default(""),
  author: z.string().trim().max(60).default("Lerngruppe"),
});
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entries.$inferSelect;
export const conceptKey = (value: string) => value.normalize("NFC").trim().toLocaleLowerCase("de-DE");
