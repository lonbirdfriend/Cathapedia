import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGlossary, exportGlossary, plainText } from "../server/xml.js";
import type { Entry } from "../shared/schema.js";
const sample = `<?xml version="1.0"?><GLOSSARY><INFO><ENTRIES><ENTRY><CONCEPT>Ätiologie &amp; Alltag</CONCEPT><DEFINITION><![CDATA[<p>Eine Erklärung.</p><p><strong>Beispiel:</strong> Etwas tun.</p><script>alert(1)</script>]]></DEFINITION><CATEGORIES><CATEGORY><NAME>Grundlagen</NAME></CATEGORY><CATEGORY><NAME>Alltag</NAME></CATEGORY></CATEGORIES><ALIASES><ALIAS><NAME>Test</NAME></ALIAS></ALIASES></ENTRY></ENTRIES></INFO></GLOSSARY>`;
test("Moodle HTML, Unicode, categories and aliases", () => {
  const [e] = parseGlossary(sample);
  assert.equal(e.concept,"Ätiologie & Alltag");
  assert.match(e.definition,/Eine Erklärung.\nBeispiel: Etwas tun./);
  assert.ok(!e.definition.includes("alert"));
  assert.deepEqual(e.categories,["Grundlagen","Alltag"]);
  assert.deepEqual(e.aliases,["Test"]);
});
test("Reject malformed, empty, XXE and oversized imports", () => {
  for (const xml of ["<GLOSSARY>","<x/>",'<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>',"x".repeat(3000001)]) assert.throws(() => parseGlossary(xml));
});
test("One invalid entry rejects entire file", () => {
  assert.throws(() => parseGlossary(sample.replace("</ENTRIES>","<ENTRY><CONCEPT>Leerer Begriff</CONCEPT></ENTRY></ENTRIES>")));
});
test("Export has Moodle structure and restores native fields without repetition", () => {
  const entry: Entry = {...parseGlossary(sample)[0],id:"test",key:"test",example:"Testbeispiel.",source:"Buch 1",author:"Catha",createdAt:"2026-01-01",updatedAt:"2026-01-01",version:1};
  const xml = exportGlossary([entry]);
  assert.match(xml,/<GLOSSARY><INFO>/);
  const [r] = parseGlossary(xml);
  assert.equal(r.concept,entry.concept);
  assert.equal(r.definition,entry.definition);
  assert.equal(r.example,entry.example);
  assert.equal(r.source,entry.source);
  assert.equal(r.author,entry.author);
  assert.deepEqual(r.categories,entry.categories);
  assert.deepEqual(r.aliases,entry.aliases);
});
test("HTML sanitization preserves human text but not scripts", () => {
  assert.equal(plainText('<img src=x onerror="alert(1)"><b>Hallo</b> &amp; Welt<script>bad()</script>'),"Hallo & Welt");
});
