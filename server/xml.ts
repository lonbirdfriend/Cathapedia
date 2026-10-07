import { XMLParser, XMLValidator } from "fast-xml-parser";
import sanitizeHtml from "sanitize-html";
import he from "he";
import { insertEntrySchema, type InsertEntry, type Entry } from "../shared/schema.js";

export function plainText(input: unknown): string {
  if (typeof input !== "string" && typeof input !== "number") return "";
  // HTML is converted to readable text, never rendered or executed in the client.
  const withBreaks = String(input).replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n").replace(/<li(?:\s[^>]*)?>/gi, "• ");
  return he.decode(sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} })).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
const array = (x: any): any[] => x === undefined || x === null ? [] : Array.isArray(x) ? x : [x];
function text(x: any) { return plainText(x && typeof x === "object" ? x["#text"] : x); }
export function parseGlossary(xml: string): InsertEntry[] {
  if (typeof xml !== "string" || Buffer.byteLength(xml, "utf8") > 3_000_000) throw new Error("Die XML-Datei darf höchstens 3 MB groß sein.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("DTD- und Entity-Deklarationen werden nicht unterstützt.");
  if (XMLValidator.validate(xml) !== true) throw new Error("Die XML-Datei ist nicht gültig. Bitte einen Moodle-Glossar-Export auswählen.");
  const parsed = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: false, processEntities: true }).parse(xml);
  const root = parsed.GLOSSARY?.INFO?.ENTRIES?.ENTRY ?? parsed.GLOSSARY?.ENTRIES?.ENTRY;
  const items = array(root);
  if (!items.length) throw new Error("Keine Einträge gefunden. Erwartet wird GLOSSARY → INFO → ENTRIES → ENTRY.");
  if (items.length > 2000) throw new Error("Pro Import sind höchstens 2.000 Einträge möglich. Bitte die Datei aufteilen.");
  return items.map((item, index) => {
    const concept = text(item.CONCEPT);
    const definition = text(item.CATHAPEDIA_DEFINITION ?? item.DEFINITION);
    const importedCategories = array(item.CATEGORIES?.CATEGORY).map(c => text(c.NAME ?? c)).filter(Boolean);
    const data = {
      concept, definition,
      example: text(item.CATHAPEDIA_EXAMPLE),
      categories: importedCategories.length ? [...new Set(importedCategories)] : ["Grundlagen"],
      aliases: [...new Set(array(item.ALIASES?.ALIAS).map(a => text(a.NAME ?? a)).filter(Boolean))],
      source: text(item.CATHAPEDIA_SOURCE),
      author: text(item.CATHAPEDIA_AUTHOR) || "Moodle-Import",
    };
    // FORMAT 1 uses HTML. Cathapedia's extra fields restore native entries exactly.
    // Plain XML exports (no extra fields) keep the full definition including examples and source text.
    const result = insertEntrySchema.safeParse(data);
    if (!result.success) throw new Error(`Eintrag ${index + 1} (${concept || "ohne Begriff"}) ist unvollständig oder zu lang: ${result.error.issues[0].message}`);
    return result.data;
  });
}
function escape(value: string) { return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"); }
function cdata(value: string) { return `<![CDATA[${value.replace(/]]>/g,"]]]]><![CDATA[>")}]]>`; }
export function exportGlossary(items: Entry[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<GLOSSARY><INFO><NAME>Cathapedia</NAME><INTRO>Unser gemeinsames Ergotherapie-Glossar</INTRO><DISPLAYFORMAT>dictionary</DISPLAYFORMAT><ALLOWDUPLICATEDENTRIES>0</ALLOWDUPLICATEDENTRIES><DEFAULTAPPROVAL>1</DEFAULTAPPROVAL><ENTRIES>\n${items.map(e => {
    // The complete definition remains useful when imported by Moodle, which ignores custom fields.
    const html = `<p>${escape(e.definition).replace(/\n/g,"<br>")}</p>` + (e.example ? `<p><strong>Alltagsbeispiel:</strong> ${escape(e.example).replace(/\n/g,"<br>")}</p>` : "") + (e.source ? `<p><strong>Quelle:</strong> ${escape(e.source)}</p>` : "");
    return `<ENTRY><CONCEPT>${escape(e.concept)}</CONCEPT><DEFINITION>${cdata(html)}</DEFINITION><FORMAT>1</FORMAT><USEDYNALINK>0</USEDYNALINK><CASESENSITIVE>0</CASESENSITIVE><FULLMATCH>0</FULLMATCH><TEACHERENTRY>1</TEACHERENTRY><CATEGORIES>${e.categories.map(c => `<CATEGORY><NAME>${escape(c)}</NAME><USEDYNALINK>0</USEDYNALINK></CATEGORY>`).join("")}</CATEGORIES><ALIASES>${e.aliases.map(a => `<ALIAS><NAME>${escape(a)}</NAME></ALIAS>`).join("")}</ALIASES><CATHAPEDIA_DEFINITION>${cdata(e.definition)}</CATHAPEDIA_DEFINITION><CATHAPEDIA_EXAMPLE>${cdata(e.example)}</CATHAPEDIA_EXAMPLE><CATHAPEDIA_SOURCE>${cdata(e.source)}</CATHAPEDIA_SOURCE><CATHAPEDIA_AUTHOR>${cdata(e.author)}</CATHAPEDIA_AUTHOR></ENTRY>`;
  }).join("\n")}\n</ENTRIES></INFO></GLOSSARY>`;
}
