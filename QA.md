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
