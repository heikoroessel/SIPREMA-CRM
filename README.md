# SIPREMA CRM (MVP)

Ersetzt die SIPREMA Kontakte-Masterliste (Excel). Node.js/Express-Backend,
React/Vite-Frontend, PostgreSQL – gleicher Stack wie eure anderen Railway-Apps.

## Update auf diesen Stand

**Wichtig: Ihr müsst NICHT das ganze GitHub-Repo löschen.** Alle Änderungen
sind rein additiv (keine Datei wurde entfernt, keine Datenbank-Spalte
umbenannt) – am einfachsten zieht ihr einfach den kompletten entpackten
Ordner per Drag & Drop nochmal auf die GitHub-Upload-Seite (wie beim ersten
Mal). Dateien mit gleichem Pfad werden automatisch überschrieben, neue
Dateien (z.B. package-lock.json) kommen dazu. Railway baut danach automatisch
neu – Build-Befehl, Start-Befehl, DATABASE_URL und die Domain bleiben
unverändert, die hängen am Service, nicht am Datei-Inhalt.

Die Datenbank-Struktur wird beim Start automatisch erweitert
(`CREATE TABLE IF NOT EXISTS`) – eure bereits importierten Kontakte bleiben
erhalten, es ist **kein Reset nötig**, außer ihr wollt ohnehin sauber neu
importieren.

## Was ist neu gegenüber der ersten Version

- **Status statt Ergebnis:** umbenannt, und die Werte (Offen/Verloren/Ruht)
  sind jetzt unter Einstellungen frei erweiterbar
- **Kontakt-Detailseite:** alle Masterlisten-Felder editierbar, sauber in
  zwei Spalten (Firma links, Ansprechpartner rechts). Anrede als festes
  Dropdown (Herr/Frau/Divers)
- **Notiz-Historie beim Import:** wird versucht, anhand von Datums-Zeilen
  (z.B. "2.3. Anruf") in einzelne, datierte Aktivitäten zu zerlegen. Gelingt
  das nicht eindeutig, bleibt der komplette Text als ein Block erhalten,
  markiert mit "[Übernommen aus Masterliste]" – es geht nie Text verloren
- **Kontaktliste:** deutlich mehr Spalten (Zielgruppe, Firma, PLZ, Ort,
  Anrede, Vorname, Nachname, Quelle, Wiedervorlage, Owner), jede Spalte hat
  eine eigene Excel-artige Filterzeile direkt unter der Überschrift
  (Freitext bei Firma/Ort/PLZ/Namen, Dropdown bei Zielgruppe/Quelle/Anrede/
  Owner). Alle Filter kombinierbar, Spalten weiterhin klickbar sortierbar
- **Kopfbereich:** kein Textlink-Menü mehr, stattdessen Zahnrad-Symbol oben
  rechts für die Einstellungen; die Punkteanzeige ("Heute: X / Y Soll")
  sitzt jetzt prominent mittig
- **Reset-Funktion** unter Einstellungen (alle Kontakte löschen, für einen
  sauberen Neu-Import ohne Duplikate)
- **Kapazität & Punkte-Ziel editierbar:** Vollzeit-Stunden/Woche und
  Sollpunkte pro Vollzeit-Woche jetzt unter Einstellungen anpassbar (vorher
  nur in der Datenbank versteckt, keine Oberfläche dafür)
- **Bearbeiter-Sammelübertragung** unter Einstellungen (alle Kontakte einer
  Person auf eine andere übertragen)

## Bewusst nicht enthalten (Phase 2, wie besprochen)

- Fuzzy-Duplikaterkennung (deshalb: Reset-Knopf für saubere Re-Importe)
- Genereller Import mit automatischem Spalten-Mapping für beliebige Quellen
- E-Mail-Erinnerungen, Datenexport
- Test-Free/Pilotprojekt als eigener Phasen-Workflow (aktuell nur ein
  einfaches Häkchen + Datum)
- Punkte-Korrektur/Reset pro Person (bewusst weggelassen: die Tagesanzeige
  berechnet sich live und ist am nächsten Tag ohnehin wieder bei 0)

## Bekannte Einschränkungen der Notiz-Zerlegung

Bei Datumsangaben ohne Jahr (z.B. "2.3.") wird das **aktuelle Kalenderjahr**
angenommen – das kann bei älteren Einträgen falsch liegen. Die Zerlegung
greift nur, wenn mindestens zwei Zeilen mit einem Datum am Zeilenanfang
beginnen; ist das Datum mitten im Satz eingebettet, bleibt der Text
sicherheitshalber als ein Block erhalten (kein Datenverlust, nur weniger
fein aufgeteilt).

## Lokal starten

```bash
# Backend
cd backend
cp .env.example .env   # DATABASE_URL auf eure lokale/Railway-Postgres setzen
npm install
npm run dev             # läuft auf Port 3000

# Frontend (separates Terminal)
cd frontend
npm install
npm run dev              # läuft auf Port 5173, proxied /api auf Port 3000
```

## Deployment auf Railway

Bereits eingerichtet (Service SIPREMA-CRM + Postgres) – bei diesem Update
ist nichts weiter zu tun, außer den neuen Datei-Inhalt auf GitHub zu
übernehmen (siehe oben). Für eine komplette Neueinrichtung von Grund auf:

1. Repo auf GitHub anlegen, Inhalt dieses Ordners hochladen.
2. In Railway: "New Project" → "Deploy from GitHub repo" → Repo auswählen.
3. "+ New" → "Database" → "PostgreSQL" im selben Projekt hinzufügen.
4. Im App-Service unter "Settings" → "Build": Build Command
   `cd frontend && npm install && npm run build && cd ../backend && npm install`
   Unter "Deploy": Start Command `cd backend && npm start`
5. Unter "Variables": "Add Reference Variable" → `DATABASE_URL` vom
   Postgres-Service verknüpfen.
6. Unter "Settings" → "Networking" → "Generate Domain" (Port 8080 passt).
7. In der App unter "Einstellungen" die Masterliste (.xlsx) importieren.

## Datenmodell (Kurzüberblick)

- `kontakte` – alle Masterlisten-Felder + `phase`, `ergebnis` (UI-Label:
  "Status"), `owner_kuerzel`, `phase_seit` (Zeitstempel des letzten
  Phasenwechsels, Basis für "Tage in Phase")
- `aktivitaeten` – Notiz-Timeline (Datum, Autor-Kürzel, Text)
- `phase_historie` – ein Eintrag pro Phasen-/Ergebniswechsel mit Zeitstempel
  und Kürzel der Person, die geändert hat – Grundlage für Punkte und das
  spätere Dashboard
- `status_optionen` – frei erweiterbare Werte für das Status-Feld
- `bearbeiter`, `punkte_gewichtung`, `firmen_einstellungen` – Einstellungen
