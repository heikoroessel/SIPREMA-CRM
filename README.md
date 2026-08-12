# SIPREMA CRM (MVP)

Ersetzt die SIPREMA Kontakte-Masterliste (Excel). Node.js/Express-Backend,
React/Vite-Frontend, PostgreSQL – gleicher Stack wie eure anderen Railway-Apps.

## Update auf diesen Stand

**Wichtig: Ihr müsst NICHT das ganze GitHub-Repo löschen.** Alle Änderungen
sind rein additiv (keine Datei wurde entfernt, keine Datenbank-Spalte
umbenannt) – am einfachsten zieht ihr einfach den kompletten entpackten
Ordner per Drag & Drop nochmal auf die GitHub-Upload-Seite (wie beim ersten
Mal). Dateien mit gleichem Pfad werden automatisch überschrieben. Railway
baut danach automatisch neu – Build-Befehl, Start-Befehl, DATABASE_URL und
die Domain bleiben unverändert, die hängen am Service, nicht am Datei-Inhalt.

Die Datenbank-Struktur wird beim Start automatisch erweitert
(`CREATE TABLE/COLUMN IF NOT EXISTS`) – eure bereits importierten Kontakte
bleiben erhalten, es ist **kein Reset nötig**.

**Neu zu pflegen nach diesem Update:** Unter Einstellungen → "Bearbeiter
verwalten" sind die persönlichen Monatsziele (Kontakte/Termine/Angebote/
Aufträge) für jeden Bearbeiter anfangs auf 0 gesetzt – bitte einmal von Hand
eintragen, sonst zeigen die Fortschrittsbalken in der Kopfzeile 0 als Ziel an.

## Was ist neu gegenüber der letzten Version

- **Login-Popup:** beim Start erscheint zwingend ein Auswahl-Fenster
  ("Wer bist du?"), damit die Kürzel-Auswahl nicht vergessen wird. Das
  gewählte Kürzel bleibt app-weit erhalten (auch beim Wechseln zwischen
  Liste, Detail und Einstellungen)
- **Zwei Listenansichten mit Umschalter:**
  - *Bearbeiterliste* (Standard): nur eigene Kontakte, automatisch
    priorisiert sortiert – zuerst fällige/überfällige Wiedervorlagen
    (älteste zuerst), dann Phase Angebot → Termin → In Kontakt →
    Unbearbeitet (jeweils nach Verweildauer in der Phase). "Verloren"
    wird ausgeblendet. Reduzierte Spalten.
  - *Vollständige Liste*: wie bisher – alle Bearbeiter, alle Spalten,
    freie Filter/Sortierung, inkl. "Nicht zugewiesen"
  - Beide mit **CSV-Export-Button** (berücksichtigt die aktuell aktiven
    Filter) und der bekannten Checkbox-Spalte für Sammel-Zuweisung
- **"Neuer Kontakt"-Button** oben in der Liste – einzelnen Kontakt von Hand
  anlegen, ohne Excel-Import
- **Bugfix Firma-Suche:** die Textsuche in der Firma-Spalte hat bisher
  nichts gefiltert (fehlender Parameter im Backend) – funktioniert jetzt
  wie PLZ/Ort
- **Kontaktliste volle Breite**, reduzierte Spaltenzahl in der
  Bearbeiteransicht (Zielgruppe/PLZ/Ort/Anrede ausgeblendet)
- **Kontakt-Detailseite als Desktop-One-Pager:** kompakte Statusleiste oben,
  darunter zweispaltig – links Firma/Ansprechpartner kompakt übereinander,
  rechts der Aktivitäten-Feed (neuester Eintrag oben) über die volle Höhe.
  Auf Mobilgeräten weiterhin gestapelt (Status → Firma → Ansprechpartner →
  Aktivitäten)
- **Reporting komplett neu:** statt einem kombinierten Tages-Punktewert jetzt
  vier getrennte Monats-Kennzahlen (Kontakte, Termine, Angebote, Aufträge),
  je als eigene "schwebende" Box in der (jetzt größeren) Kopfzeile. Jeder
  Balken zeigt das Monatsziel (grauer Hintergrund), den Ist-Stand (grüne
  Füllung) und einen Dreieck-Pfeil als rechnerischen Soll-Stand "heute"
  (Monatsziel × Kalendertag/20). "Kontakt" zählt sowohl bei jeder
  Aktivitäts-Notiz als auch beim Phasenwechsel nach "In Kontakt"; Termin/
  Angebot/Auftrag zählen jeweils nur beim Wechsel in die entsprechende Phase
- **Monatsziele pro Bearbeiter:** in "Bearbeiter verwalten" direkt editierbar
  (vier neue Spalten). Die alten Blöcke "Kapazität & Punkte-Ziel" und
  "Punkte-Gewichtung" sind entfallen, da nicht mehr benötigt
- **"Alle Kontakte übertragen"** ist jetzt eine eigene Karte (vorher
  innerhalb der Bearbeiter-Karte)
- **Kopfzeile:** überflüssiger "Kontakte"-Link entfernt (Logo verlinkt
  bereits zur Liste)

## Bewusst nicht enthalten (Phase 2, wie besprochen)

- Fuzzy-Duplikaterkennung (deshalb: Reset-Knopf für saubere Re-Importe)
- Genereller Import mit automatischem Spalten-Mapping für beliebige Quellen
- E-Mail-Erinnerungen
- Test-Free/Pilotprojekt als eigener Phasen-Workflow (aktuell nur ein
  einfaches Häkchen + Datum)
- Individuelle Arbeitstage/Teilzeit im "Soll heute"-Pfeil (aktuell einfache
  Näherung: 1/20 des Monatsziels pro Kalendertag, gleich für alle)

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
übernehmen (siehe oben).

## Datenmodell (Kurzüberblick)

- `kontakte` – alle Masterlisten-Felder + `phase`, `ergebnis` (UI-Label:
  "Status"), `owner_kuerzel`, `phase_seit` (Zeitstempel des letzten
  Phasenwechsels, Basis für "Tage in Phase")
- `aktivitaeten` – Notiz-Timeline (Datum, Autor-Kürzel, Text)
- `phase_historie` – ein Eintrag pro Phasen-/Ergebniswechsel mit Zeitstempel
  und Kürzel der Person, die geändert hat – Grundlage für die vier
  Monats-Kennzahlen
- `status_optionen` – frei erweiterbare Werte für das Status-Feld
- `bearbeiter` – inkl. `ziel_kontakte`, `ziel_termine`, `ziel_angebote`,
  `ziel_auftraege` (persönliche Monatsziele für die Kopfzeilen-Boxen)
