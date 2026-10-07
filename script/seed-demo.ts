import "dotenv/config";
import { storage } from "../server/storage.js";
// Explicit opt-in only. Production starts empty; it never inserts demo content automatically.
const examples = [
  {concept:"Adaptation",definition:"Anpassung einer Aufgabe, eines Gegenstands oder der Umwelt an individuelle Voraussetzungen.",example:"Einen Griff verdicken, damit er leichter gehalten wird.",categories:["Alltag und Intervention"],aliases:["Anpassung"]},
  {concept:"ADL",definition:"Activities of Daily Living: grundlegende Aktivitäten des täglichen Lebens. Die genaue Zuordnung hängt vom verwendeten Modell oder Instrument ab.",example:"Essen, Körperpflege und Ankleiden.",categories:["Grundlagen"],aliases:["Aktivitäten des täglichen Lebens"]},
];
const result = await storage.import(examples.map(e => ({...e, source:"Beispiel aus dem bereitgestellten Moodle-Screenshot. Mit Unterricht und Fachliteratur abgleichen.",author:"Beispiel"})));
console.log(result);
process.exit(0);
