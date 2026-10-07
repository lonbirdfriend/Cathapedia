import type { Express, RequestHandler } from "express";
import type { Server } from "node:http";
import { z } from "zod";
import { storage } from "./storage";
import { conceptKey, insertEntrySchema } from "../shared/schema";
import { parseGlossary, exportGlossary, plainText } from "./xml";
import { checkPassword, issueToken, requireAdmin } from "./auth";

const asyncRoute = (handler: RequestHandler): RequestHandler => (req,res,next) => { Promise.resolve(handler(req,res,next)).catch(next); };
function validated(data: unknown) {
  const result = insertEntrySchema.parse(data);
  return insertEntrySchema.parse({ ...result,
    concept:plainText(result.concept),definition:plainText(result.definition),example:plainText(result.example),
    categories:[...new Set(result.categories.map(plainText).filter(Boolean))],
    aliases:[...new Set(result.aliases.map(plainText).filter(Boolean))],
    source:plainText(result.source),author:plainText(result.author) || "Lerngruppe",
  });
}
export function registerRoutes(httpServer: Server | null, app: Express) {
  const attempts = new Map<string, { count: number; until: number }>();
  app.get("/api/health", (_req,res) => res.json({ok:true}));
  app.get("/api/entries", asyncRoute(async (_req,res) => { res.json(await storage.list()); }));
  app.post("/api/login", asyncRoute(async (req,res) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    // Deliberately lightweight per-instance brake; not a distributed anti-abuse system.
    if (attempts.size > 5000) for (const [k,v] of attempts) if (v.until < now) attempts.delete(k);
    let attempt = attempts.get(key);
    if (!attempt || attempt.until < now) { attempt = {count:0,until:now+60000}; attempts.set(key,attempt); }
    if (attempt.count >= 12) { res.status(429).json({message:"Zu viele Versuche. Bitte eine Minute warten."}); return; }
    attempt.count++;
    if (!checkPassword(req.body?.password)) { res.status(401).json({message:"Das Passwort stimmt noch nicht. Versuch's nochmal."}); return; }
    attempts.delete(key);
    res.json({token:issueToken()});
  }));
  app.post("/api/entries", asyncRoute(async (req,res) => {
    const entry = await storage.create(validated(req.body));
    if (!entry) { res.status(409).json({message:"Diesen Begriff gibt es schon. Suche ihn im Glossar oder wähle eine präzisere Bezeichnung."}); return; }
    res.status(201).json(entry);
  }));
  app.put("/api/entries/:id", requireAdmin, asyncRoute(async (req,res) => {
    const version = z.number().int().positive().parse(req.body.version);
    const updated = await storage.update(String(req.params.id),validated(req.body),version);
    if (!updated) { res.status(409).json({message:"Dieser Eintrag wurde inzwischen verändert oder gelöscht. Bitte schließen, aktualisieren und erneut öffnen."}); return; }
    res.json(updated);
  }));
  app.delete("/api/entries/:id", requireAdmin, asyncRoute(async (req,res) => {
    if (!await storage.remove(String(req.params.id))) { res.status(404).json({message:"Der Eintrag wurde bereits entfernt."}); return; }
    res.json({deleted:true});
  }));
  app.post("/api/import/preview", requireAdmin, asyncRoute(async (req,res) => {
    const items = parseGlossary(req.body?.xml);
    const known = new Set((await storage.list()).map(e => e.key));
    let fresh = 0;
    for (const item of items) { const key = conceptKey(item.concept); if (!known.has(key)) { known.add(key); fresh++; } }
    res.json({total:items.length,fresh,duplicate:items.length-fresh,concepts:items.slice(0,10).map(i => i.concept)});
  }));
  app.post("/api/import", requireAdmin, asyncRoute(async (req,res) => {
    const items = parseGlossary(req.body?.xml);
    // Validate the complete document before the atomic database write.
    res.json(await storage.import(items));
  }));
  // Reading is public, so exporting the same public content does not need admin credentials.
  app.get("/api/export", asyncRoute(async (_req,res) => {
    res.setHeader("Content-Type","application/xml; charset=utf-8");
    res.setHeader("Content-Disposition",'attachment; filename="cathapedia.xml"');
    res.send(exportGlossary(await storage.list()));
  }));
  app.use("/api", (_req,res) => res.status(404).json({message:"Diese Funktion gibt es nicht."}));
  return httpServer;
}
