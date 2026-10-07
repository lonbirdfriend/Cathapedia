# Cathapedia: Prüfplan

## Funktionsumfang und Prüfkriterien

- Öffentlicher Lernraum: ohne Konto lesen und anlegen; neuer Eintrag erscheint nach Speichern und Neuladen.
- Zusammenarbeit: zweite Browsersitzung sieht denselben Eintrag; Abgleich alle 20 Sekunden.
- Admin: falsches Passwort ablehnen; gültiger Login erlaubt Bearbeiten, Löschen und XML-Import; nicht autorisierte API-Anfragen zurückweisen.
- Bearbeiten: Änderungen speichern; Versionskonflikte statt stilles Überschreiben.
- Löschen: Rückfrage mit Begriff, Abbrechen und bestätigtes Löschen.
- Import: XML-Dateiauswahl, Vorschau, Kategorien, Synonyme, Umlaute, HTML zu Text, doppelte Begriffe überspringen.
- Fehlerpfade: ungültiges XML, leere Definition, gleicher Begriff, fehlende Serverkonfiguration und gefälschter Token.
- Export: Moodle-XML, Rückimport mit unveränderten Cathapedia-Feldern, keine ungewollten Duplikate.
- Suche: Begriff, Synonym, Volltextschalter, Umlaute, leeres Ergebnis, Filter zurücksetzen.
- Navigation: Alphabet, Kategorien, Kategorieübersicht, Sortierung, Aktualisieren und Seitenwechsel.
- Lernen: Karte aufdecken, zurückdrehen, weiter, zurück und neu starten.
- Bedienung: Hilfetext, Modaldialoge, Escape, mobile Navigation, Dark Mode und Adminabmeldung.
- Darstellung: Desktop 1440 × 1000 und Mobilgerät 390 × 844; keine horizontalen Überläufe, abgeschnittenen Formulare oder überdeckten Aktionen.

## Automatisierte Prüfungen

`npm run check`, `npm test` und `npm run build` ausführen. Tests verwenden eine isolierte temporäre SQLite-Datenbank; die normale Glossardatenbank bleibt unverändert.

Die Tests umfassen einen lokalen HTTP-Aufruf des Vercel-Handlers inklusive Query-Rewrite. Ein echter Deploy in einen Vercel-Account ist davon getrennt und muss dort abschließend geprüft werden.

## Ergebnis der Prüfung

Stand: 7. Oktober 2026.

- TypeScript-Prüfung, Produktionsbuild und Vercel-Frontend-Build bestanden.
- Alle sechs automatisierten Tests bestanden, sowohl mit SQLite als auch mit einer echten lokalen PostgreSQL-18-Datenbank.
- End-to-End im Chromium-Browser geprüft: öffentlich anlegen, zweite unabhängige Browsersitzung, suchen, Volltext an/aus, falsches/richtiges Adminpasswort, bearbeiten, Löschen abbrechen/bestätigen.
- XML im Browser geprüft: fehlerhafte Datei, Vorschau von zehn Einträgen, Import, erneute Duplikatprüfung, Kategorien und Exportdownload.
- Sortierung, A–Z-Filter, leere Trefferliste, Filterrücksetzung, Seitenwechsel, Themenübersicht, Zufallsbegriff, Lernkarten, Hilfedialog, Aktualisieren und Abmelden geprüft.
- Desktop und Mobilansicht in Hell und Dunkel geprüft; Formular auf dem Mobilgerät tatsächlich ausgefüllt und gespeichert.
- Keine JavaScript-Laufzeitfehler oder horizontalen Seitenüberläufe in den geprüften Ansichten gefunden.
- Testeinträge anschließend aus der Vorschau entfernt. Übrig bleiben die zwei ausdrücklich gekennzeichneten Beispiele aus dem Screenshot.
- Frontend-Bundle enthält weder das Adminpasswort noch Zugriffe auf Browser-Datenspeicher oder Cookies.

`npm audit --omit=dev` meldete bei der Prüfung keine bekannten Schwachstellen in den Produktionsabhängigkeiten. Der vollständige Audit meldete neun Befunde in der Tailwind-3-Build-Werkzeugkette; sie sind nicht Bestandteil der ausgelieferten Browser-/API-Laufzeit. Das ist kein vollständiges Sicherheitsaudit; insbesondere bleibt die öffentliche Schreibfunktion bewusst offen.

Nicht ausgeführt: ein Deploy im Vercel-Account des Nutzers, eine Verbindung zu dessen Cloud-Datenbank oder ein Rückimport in dessen echte Moodle-Instanz. Die dafür nötigen Schritte stehen in der README.

## Korrektur nach dem ersten Vercel-Deploy

Der erste echte Vercel-Deploy zeigte `ERR_MODULE_NOT_FOUND` für `/var/task/server/app`. Die ursprünglichen lokalen Tests mit `tsx` und dem gebündelten CJS-Server erkannten die fehlenden Dateiendungen in den ESM-Imports nicht. Die frühere Aussage „Vercel-Frontend-Build bestanden“ war kein Nachweis für den Start der Vercel-API.

Die relativen Imports im Server-Abhängigkeitsbaum wurden auf `.js` umgestellt. Zusätzlich prüft `tsconfig.api.json` unter NodeNext, und CI führt den erzeugten ESM-Code mit normalem Node aus.

Die Korrektur wurde mit dem tatsächlichen lokalen Builder `@vercel/node` 22.0.0 überprüft: Das erzeugte Funktionspaket enthält `api/index.js`, die transitiven Serverdateien und `shared/schema.js`. Der Handler startete unter Node 22.23.3 ohne `tsx`; Healthcheck, Anmeldung, Adminschutz und die Fehlermeldung bei fehlender Datenbank bestanden. Die Korrektur verändert weder Schema noch gespeicherte Glossareinträge.

Zusätzlich wurde das erzeugte Vercel-Funktionspaket mit einer echten lokalen PostgreSQL-Datenbank gestartet: Öffentlicher Testeintrag, XML-Export und autorisiertes Löschen bestanden. Der Testeintrag wurde wieder entfernt.

Ein erneuter Deploy im Nutzerkonto muss nach Übernahme des Patches erfolgen. Die Kontoverbindung und die dortige Neon-Konfiguration wurden durch diese lokale Buildprüfung nicht geändert oder verifiziert.

## Zweiter Laufzeitfehler und strengere Regression

Der Logexport des Nutzers enthält zwei Deployments. Beim neueren Deployment um 18:30 Uhr CEST ist die relative Importkette aufgelöst; stattdessen scheitert `sanitize-html` 2.18.0 an einem CommonJS-`require()` des ESM-only-Pakets `htmlparser2` 12.0.0. Das war ein anderer Fehler als `ERR_MODULE_NOT_FOUND`.

Dieser Fehler ließ sich lokal identisch mit `node --no-experimental-require-module` reproduzieren. Die vorherige Prüfung in normalem Node 22 hatte diesen strengeren Fall nicht abgedeckt.

Die nicht mehr benötigte Sanitizer-Hülle und ihre Typ-/Entity-Hilfspakete wurden entfernt. Die Anwendung extrahiert jetzt mit einem direkten ESM-Import von `htmlparser2` ausschließlich Text; Absätze, Listen und Entities bleiben lesbar, Script-/Style-/Template-Inhalte und Attribute werden verworfen. Der Browser rendert die Inhalte weiterhin als React-Text, nicht als HTML.

Der API-Laufzeittest deaktiviert jetzt dauerhaft `require(ESM)`, und zusätzliche Tests decken Text-Extraktion und verschachtelte ausgeblendete Elemente ab. Paketmanifest und Lockfile sind gemeinsam aktualisiert.

Ergebnis: Alle acht Tests bestanden. Das frisch erzeugte `@vercel/node`-Funktionspaket startete mit `--no-experimental-require-module` unter Node 22.23.3 und bestand Anmeldung, PostgreSQL-Schreiben/-Lesen/-Löschen sowie XML-Import und -Export. Die Tracing-Dateiliste enthält `sanitize-html` nicht mehr. Ein zusätzlicher Chromium-Test importierte HTML mit Script-/Template-Inhalten, zeigte nur den erwarteten Text an und führte kein Script aus; der Testeintrag wurde anschließend entfernt.
