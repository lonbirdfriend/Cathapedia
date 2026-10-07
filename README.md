# Cathapedia

Das gemeinsame Ergotherapie-Glossar für Catha und ihre Mitlernenden. Ohne Registrierung, ohne Werbung, mit einem kleinen Adminbereich statt einer kompletten Lernplattform.

## Das ist enthalten

- **Öffentlich:** Begriffe lesen und anlegen, alphabetische Navigation, Themengebiete, Suche nach Begriffen und Synonymen, optionale Volltextsuche, Sortierung und Lernkarten.
- **Admin:** Bestehende Einträge bearbeiten und löschen sowie Moodle-XML importieren. Die Berechtigungsprüfung erfolgt auf dem Server, nicht nur durch ausgeblendete Buttons.
- **Gemeinsam:** Eine zentrale Datenbank, automatischer Abruf alle 20 Sekunden und Konflikterkennung beim Bearbeiten.
- **Daten mitnehmen:** XML-Export, Importvorschau, Kategorien und Synonyme. Doppelte Begriffe werden ohne Beachtung der Groß-/Kleinschreibung übersprungen.
- **Oberfläche:** Deutsch, mobil nutzbar, Hell-/Dunkelmodus und tastaturbedienbare Dialoge.

Das ist eine eigenständige App, keine Moodle-Installation. Es gibt keine Nutzerkonten, Kommentare, Uploads von Bildern, persönliche Lernstandsverfolgung oder medizinische Qualitätskontrolle.

## Schnellstart lokal

Voraussetzung: Node.js 22 und npm. Eine externe Datenbank ist lokal nicht nötig.

```bash
npm ci
cp .env.example .env
```

Setze in `.env`:

```dotenv
ADMIN_PASSWORD=DEIN_GEWÜNSCHTES_PASSWORT
SESSION_SECRET=EIN_LANGER_ZUFAELLIGER_WERT
```

Das gewünschte Passwort aus dem Chat setzt du als `ADMIN_PASSWORD`. Es ist bewusst weder im Frontend noch in diesem Repository eingebaut.

```bash
# Zufälligen Sitzungsschlüssel erzeugen:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# App starten:
npm run dev
```

Öffne `http://localhost:5000`. Ohne `DATABASE_URL` speichert die App in `data.db`, nicht im Browser.

Die App startet leer. Optional legt `npm run seed:demo` zwei Einträge aus dem bereitgestellten Moodle-Screenshot an: Adaptation und ADL. Der Seed wird nie automatisch ausgeführt; die medizinischen Inhalte sind Lernbeispiele und müssen fachlich geprüft werden.

## Auf Vercel bereitstellen

### Git-Repository vorbereiten

Das ZIP enthält den vollständigen Quellcode einschließlich Lockfile, Tests und Vercel-Konfiguration. Nach dem Entpacken kannst du ein eigenes Repository initialisieren:

```bash
git init -b main
git add .
git commit -m "Initial Cathapedia app"
git remote add origin https://github.com/DEIN_ACCOUNT/cathapedia.git
git push -u origin main
```

Die GitHub-Adresse ist ein Platzhalter. Erstelle vorher dein eigenes Repository; teile keine `.env`-Datei und keine Datenbankdatei.

### Datenbank und Umgebungsvariablen

In Vercel das Repository als neues Projekt importieren. Die eingecheckte `vercel.json` setzt Build-Befehl, statischen Ausgabeordner und API-Rewrites; Node.js 22 ist in `package.json` festgelegt.

Verbinde eine PostgreSQL-Datenbank, beispielsweise über die Neon-Integration im Vercel Marketplace. Vercel stellt für neue Projekte externe PostgreSQL-Anbieter über den Marketplace bereit und kann deren Zugangsdaten als Umgebungsvariablen eintragen ([Vercel-Dokumentation](https://vercel.com/docs/postgres)).

Im Vercel-Projekt diese Variablen unter Settings → Environment Variables setzen:

| Variable | Wert |
| --- | --- |
| `DATABASE_URL` | PostgreSQL-Verbindungsstring des Anbieters, vorzugsweise gepoolt, z. B. `postgresql://…?sslmode=require` |
| `ADMIN_PASSWORD` | Das von dir gewünschte Adminpasswort aus dem Chat |
| `SESSION_SECRET` | Zufälliger Wert aus dem oben genannten Node-Befehl |

Alternativ zu `DATABASE_URL` wird auch `POSTGRES_URL` erkannt. Falls die Integration einen anderen Variablennamen erzeugt, dessen Verbindungsstring unter `DATABASE_URL` hinterlegen. Niemals `VITE_` vor diese Variablen setzen: Variablen mit diesem Präfix könnten im Client-Build landen.

Die Variablen mindestens für Production setzen, danach deployen oder erneut deployen. Für Preview-Deployments entweder eine separate Datenbank verwenden oder die entsprechenden Preview-Variablen setzen; dieselbe Datenbank bedeutet denselben Datenbestand.

Konfiguration, falls manuell gefragt:

```text
Framework Preset: Other
Root Directory: Projektwurzel mit package.json
Build Command: npm run build:vercel
Output Directory: dist/public
Node.js Version: 22.x
```

API-Funktionen liegen unter `api/`; Vercel unterstützt dort TypeScript-Funktionen ([Vercel-Dokumentation](https://vercel.com/docs/functions/runtimes/node-js)). Das Projekt verwendet genau eine Funktion, die die Express-API bedient.

Beim ersten Datenzugriff erzeugt die App die Tabelle `entries`. Der DB-Nutzer benötigt deshalb einmalig CREATE-Rechte sowie dauerhaft SELECT, INSERT, UPDATE und DELETE. Ein bestehendes, leeres App-Datenbankschema reicht aus; kein manuelles SQL ist nötig.

**Wichtig:** Auf Vercel gibt es absichtlich keinen SQLite-Fallback. Fehlt die PostgreSQL-Verbindung, zeigt die App einen Konfigurationsfehler, statt Daten scheinbar zu speichern und später zu verlieren.

Es wurden keine kostenpflichtigen Dienste für dich gebucht. Preise, Freikontingente und Nutzungsbedingungen von Vercel und dem DB-Anbieter bitte vor dem Deploy selbst prüfen.

### Nach dem Deploy testen

1. Die Vercel-Adresse in einem privaten Fenster öffnen.
2. Einen Begriff ohne Anmeldung anlegen.
3. In einem zweiten Fenster prüfen, ob der Begriff sichtbar wird.
4. Unten links den Adminbereich öffnen und anmelden.
5. Testeintrag bearbeiten und danach löschen.
6. Eine kleine Moodle-XML-Datei importieren, dann dieselbe Datei erneut prüfen: Sie sollte nur noch Duplikate melden.
7. XML exportieren und außerhalb der App aufbewahren.

Die mitgelieferte Computer-Vorschau nutzt eine separate SQLite-Datenbank. Änderungen in dieser Vorschau werden nicht automatisch nach Vercel übertragen; nutze bei Bedarf den XML-Export.

## Euer bestehendes Moodle-Glossar übernehmen

In Moodle die Glossareinträge als XML exportieren. Moodle verwendet XML für den Austausch von Glossareinträgen einschließlich optionaler Kategorien ([Moodle-Dokumentation](https://docs.moodle.org/en/Import_glossary_entries)).

In Cathapedia:

1. Adminbereich öffnen.
2. **XML importieren** auswählen.
3. XML-Datei auswählen, Vorschau prüfen.
4. **Jetzt importieren** bestätigen.

Unterstützter Kern:

```xml
<GLOSSARY>
  <INFO>
    <ENTRIES>
      <ENTRY>
        <CONCEPT>Fachbegriff</CONCEPT>
        <DEFINITION><![CDATA[<p>Eine verständliche Erklärung.</p>]]></DEFINITION>
        <CATEGORIES>
          <CATEGORY><NAME>Grundlagen</NAME></CATEGORY>
        </CATEGORIES>
        <ALIASES>
          <ALIAS><NAME>Alternativer Begriff</NAME></ALIAS>
        </ALIASES>
      </ENTRY>
    </ENTRIES>
  </INFO>
</GLOSSARY>
```

- **Grenzen:** 3 MB und 2.000 Einträge pro Datei. Größere Exporte aufteilen.
- **Duplikate:** Erster vorhandener/auftretender Begriff gewinnt, nach NFC-Normalisierung, Trim und deutscher Kleinschreibung. Bestehende Inhalte werden nie durch einen Import ersetzt.
- **Fehler:** Die gesamte Datei wird vor dem Schreiben validiert. Ein ungültiger Eintrag bricht den Import ab. Der Datenbank-Import erfolgt in einer Transaktion.
- **HTML:** Formatierungen werden zu lesbarem Text umgewandelt; Absatzumbrüche bleiben erhalten. Ausführbarer HTML-Code wird nicht angezeigt.
- **Anhänge:** Bilder und Dateianhänge werden nicht übernommen. XML enthält dafür häufig nur Verweise auf Moodle.
- **Beispiele und Quellen aus Moodle:** Stehen sie innerhalb der Definition, bleiben sie dort als Text erhalten; es wird keine unsichere automatische Aufteilung versucht.
- **Cathapedia-Export:** Eigene `CATHAPEDIA_*`-Felder erhalten Definition, Beispiel, Quelle und Anzeigename beim Rückimport. Die Standard-DEFINITION enthält zusätzlich Beispiel und Quelle für Moodle.
- **Kein Komplettbackup:** Interne IDs, Zeitstempel und Versionsnummern werden bei einem Import neu erzeugt. Kommentare, Anhänge oder andere Moodle-Aktivitäten sind nicht Bestandteil des Formats.

Die vorherige 120-Begriffe-Datei ist nicht im Projekt enthalten. Du kannst sie oder einen aktuellen Export deines Moodle-Glossars importieren. Ein Import in deiner konkreten Moodle-Instanz wurde nicht ausgeführt.

## Rechte und bewusst einfache Sicherheit

| Aktion | Ohne Anmeldung | Admin |
| --- | --- | --- |
| Lesen, suchen, Lernkarten | Ja | Ja |
| Neue Einträge anlegen | Ja | Ja |
| Bestehende Einträge bearbeiten | Nein | Ja |
| Einträge löschen | Nein | Ja |
| XML importieren | Nein | Ja |
| Öffentliche Inhalte exportieren | API öffentlich; Button im Adminmodus | Ja |

Jede Person mit dem Link kann lesen und schreiben. Anzeigenamen sind frei wählbar und nicht verifiziert. Das ist für eine kleine vertraute Lerngruppe gedacht, nicht für vertrauliche Daten oder eine öffentlich beworbene Community.

Das Adminpasswort bleibt auf dem Server. Nach erfolgreichem Login nutzt der Browser einen signierten, maximal acht Stunden gültigen Token im Arbeitsspeicher. Neuladen meldet den Admin ab. Abmelden entfernt den lokalen Token; ein kopierter Token bleibt bis zu seinem Ablauf gültig. Ein Wechsel von `SESSION_SECRET` und anschließender Redeploy invalidiert alle zuvor ausgestellten Tokens.

Es gibt eine einfache, pro Serverinstanz wirksame Bremse gegen wiederholte Loginversuche. Kein CAPTCHA, keine verteilte Ratenbegrenzung, keine Moderationswarteschlange und keine Nutzer-Sperrlisten. Die öffentliche Schreibfunktion kann ohne zusätzliche Schutzmaßnahmen für Spam missbraucht werden. Keine Patientendaten, Diagnosen konkreter Personen oder sonstige vertrauliche Inhalte speichern.

## Entwicklung und Betrieb

```bash
npm run dev           # Express + Vite, Port 5000
npm run check         # TypeScript
npm test              # XML- und HTTP-Integrationstests
npm run build         # Frontend + eigenständig startbarer Node-Server
npm start             # zuvor npm run build ausführen
npm run build:vercel  # Vite-Frontend; API baut Vercel separat
```

Projektaufbau:

```text
client/src/App.tsx       Oberfläche und Dialoge
client/src/index.css     Cathapedia-Design
shared/schema.ts        Datenmodell und Eingabevalidierung
server/app.ts           Express-App und Fehlerbehandlung
server/routes.ts        API und Rechte
server/auth.ts          Signierte Adminsitzungen
server/storage.ts       PostgreSQL / lokales SQLite
server/xml.ts           Moodle-XML-Import und -Export
api/index.ts            Vercel-Funktion
vercel.json             Build, API-Rewrites, Header
tests/                  Reproduzierbare Tests
```

Bei Weiterentwicklung das `db:push`-Skript nicht gegen PostgreSQL verwenden: Die mitgelieferte Drizzle-Konfiguration ist für das lokale SQLite-Schema gedacht. Der aktuelle Produktivpfad erzeugt das identische Tabellenschema direkt über die SQL-Anweisung in `server/storage.ts`; spätere Schemaänderungen brauchen eine passende Migration.

Lokal zum Backup die App stoppen und `data.db` sichern oder XML exportieren. Produktiv zusätzlich die Backup-Möglichkeiten des PostgreSQL-Anbieters nutzen. Exportdateien regelmäßig herunterladen; ein Git-Repository enthält den Code, nicht den laufenden Glossardatenbestand.
