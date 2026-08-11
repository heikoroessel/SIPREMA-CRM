# SIPREMA CRM (MVP)

Ersetzt die SIPREMA Kontakte-Masterliste (Excel). Node.js/Express-Backend,
React/Vite-Frontend, PostgreSQL – gleicher Stack wie eure anderen Railway-Apps
(Leistungsmatrix, Wandersteine).

## Was ist drin (MVP-Umfang, wie besprochen)

- Kontaktliste als filterbare Tabelle: Phase-Chips mit Live-Zähler, Filter
  "Nicht zugewiesen", PLZ-Filter, Spalte "Tage in aktueller Phase"
- Owner-Zuweisung direkt in der Tabelle (Dropdown) + Sammel-Zuweisung für
  mehrere ausgewählte oder gefilterte Kontakte
- Kontakt-Detailseite: Stage-Stepper (Unbearbeitet → In Kontakt → Termin →
  Angebot → Auftrag), Ergebnis (Offen/Verloren/Ruht) mit Absagegrund,
  Pilotprojekt-Häkchen, Wiedervorlage, strukturierte Aktivitäten-Timeline
- Bearbeiter-Verwaltung (Kürzel, Name, Arbeitszeit/Woche, aktiv/inaktiv –
  Deaktivieren statt Löschen, damit die Historie erhalten bleibt)
- Punkte-Gewichtung editierbar unter Einstellungen (Startwerte sind grobe
  Platzhalter – bitte anhand eurer echten Konversionsraten aus der
  Masterliste nachjustieren, siehe Chat-Verlauf)
- Tägliche Punkteanzeige in der Kopfleiste (Ist/Soll, arbeitszeitnormiert)
- Import der aktuellen Masterliste (.xlsx) unter Einstellungen → feste
  Spaltenzuordnung für das bekannte Format; alte Notizen werden als ein
  Historien-Eintrag pro Kontakt übernommen

## Bewusst nicht enthalten (Phase 2, wie besprochen)

- Fuzzy-Duplikaterkennung
- Genereller Import mit automatischem Spalten-Mapping für beliebige Quellen
- E-Mail-Erinnerungen, Datenexport
- Test-Free/Pilotprojekt als eigener Phasen-Workflow (aktuell nur ein
  einfaches Häkchen + Datum)
- Feinschliff Dashboard (Kontakte/Termine/Beauftragungen/Umsatz je Monat)

## Offene Punkte, die noch eine Entscheidung brauchen

- **Historische Owner-Zuweisung beim Import:** Der Import setzt bewusst
  *keinen* Owner (alle importierten Kontakte landen als "nicht zugewiesen"
  im Pickup-Pool). Falls ihr stattdessen die alte "Verantwortliche Person"
  aus der Masterliste 1:1 übernehmen wollt (auch für NEL), sag Bescheid –
  ist eine kleine Anpassung im Import-Mapping.
- **Farben/Branding:** aktuell nur grob an siprema.de angenähert (Teal/Grau).
  Echte Hex-Codes oder Logo nachreichen, dann passe ich `frontend/src/styles.css`
  an.
- **Punkte-Gewichtung:** Startwerte (Aktivität 1, In Kontakt 2, Termin 10,
  Angebot 15, Auftrag 40) sind ein grober erster Wurf, keine exakte
  Kalibrierung aus euren echten Konversionsraten – wie besprochen über
  Einstellungen frei anpassbar.

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

1. Repo auf GitHub anlegen (z. B. `heikoroessel/siprema-crm`, wie beim
   Wandersteine-Projekt: `frontend/` + `backend/` in einem Repo).
2. In Railway ein neues Projekt anlegen, GitHub-Repo verbinden, PostgreSQL-
   Plugin hinzufügen (setzt `DATABASE_URL` automatisch als Umgebungsvariable).
3. Build-Befehl: `cd frontend && npm install && npm run build && cd ../backend && npm install`
   Start-Befehl: `cd backend && npm start`
   (Der Backend-Server liefert `frontend/dist` direkt mit aus – ein Railway-
   Service reicht, wie bei Leistungsmatrix/Wandersteine.)
4. Beim ersten Start legt der Server automatisch alle Tabellen an
   (`initSchema()` in `backend/src/db.js`) und setzt die Bearbeiter HEC/UBC
   (aktiv) und NEL (inaktiv, da ausgeschieden) sowie Start-Punktwerte an.
5. Danach unter "Einstellungen" die aktuelle Masterliste (.xlsx) importieren.

## Datenmodell (Kurzüberblick)

- `kontakte` – alle Masterlisten-Felder + `phase`, `ergebnis`, `owner_kuerzel`,
  `phase_seit` (Zeitstempel des letzten Phasenwechsels, Basis für "Tage in
  Phase" und später die automatische KPI-Berechnung)
- `aktivitaeten` – Notiz-Timeline (Datum, Autor-Kürzel, Text) statt einem
  Freitextfeld
- `phase_historie` – ein Eintrag pro Phasen-/Ergebniswechsel mit Zeitstempel
  und Kürzel der Person, die geändert hat – Grundlage für Punkte und das
  spätere Dashboard
- `bearbeiter`, `punkte_gewichtung`, `firmen_einstellungen` – Einstellungen
