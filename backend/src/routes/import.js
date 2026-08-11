import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { pool } from '../db.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Feste Spaltenzuordnung fuer die heutige SIPREMA-Masterliste (MVP-Scope).
// Ein generischer Import mit automatischem Spalten-Mapping fuer beliebige Quellen ist bewusst Phase 2.
const SPALTEN_MAPPING = {
  'Zielgruppe': 'zielgruppe',
  'Firma': 'firma',
  'Straße & Hausnummer': 'strasse',
  'PLZ': 'plz',
  'Ort': 'ort',
  'Land': 'land',
  'E-Mail Firma': 'email_firma',
  'Internetseite': 'website',
  'Telefon Zentrale': 'telefon_zentrale',
  'Anrede': 'anrede',
  'Titel': 'titel',
  'Vorname': 'vorname',
  'Nachname': 'nachname',
  'E-Mail': 'email',
  'Telefon': 'telefon',
  'Rolle': 'rolle',
  'Quelle': 'quelle',
  'Persönliche Vertriebsstrategie': 'vertriebsstrategie'
};

// Alte Status-Werte (frei kombiniert) auf das neue Phase/Ergebnis-Modell abbilden.
// Grobe, konservative Zuordnung: enthaelt der alte Wert "Auftrag" -> Phase auftrag, usw.
// Absagen/"Kein To-Do" werden als Ergebnis "verloren" mit der hoechsten erreichten Phase markiert.
function statusZuPhaseUndErgebnis(status) {
  const s = (status || '').toLowerCase();
  let phase = 'unbearbeitet';
  if (s.includes('auftrag')) phase = 'auftrag';
  else if (s.includes('angebot')) phase = 'angebot';
  else if (s.includes('termin')) phase = 'termin';
  else if (s.includes('kontakt')) phase = 'in_kontakt';

  let ergebnis = 'offen';
  if (s.includes('absage') || s.includes('kein to-do')) ergebnis = 'verloren';

  return { phase, ergebnis };
}

// POST /api/import/masterliste  (multipart/form-data, Feld "datei")
// Importiert das Tabellenblatt "Kontaktliste" der bekannten Masterliste-Struktur.
router.post('/masterliste', upload.single('datei'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Datei fehlt (Feld "datei")' });

  const importQuelle = req.body.import_quelle || req.file.originalname;
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets['Kontaktliste'] || workbook.Sheets[workbook.SheetNames[0]];
  const zeilen = XLSX.utils.sheet_to_json(sheet, { defval: null });

  let importiert = 0;
  let uebersprungen = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const zeile of zeilen) {
      const kontakt = { import_quelle: importQuelle };
      for (const [quellSpalte, feld] of Object.entries(SPALTEN_MAPPING)) {
        if (zeile[quellSpalte] != null && zeile[quellSpalte] !== '') {
          kontakt[feld] = String(zeile[quellSpalte]).trim();
        }
      }
      if (!kontakt.firma && !kontakt.nachname) { uebersprungen++; continue; }

      const { phase, ergebnis } = statusZuPhaseUndErgebnis(zeile['Status']);
      kontakt.phase = phase;
      kontakt.ergebnis = ergebnis;
      if (zeile['Absagegrund']) kontakt.absagegrund = String(zeile['Absagegrund']).trim();
      if (zeile['Wiedervorlage'] instanceof Date) kontakt.wiedervorlage = zeile['Wiedervorlage'];

      // Alte "Verantwortliche Person" wird als Owner uebernommen. Taucht ein Kuerzel auf,
      // das noch kein Bearbeiter ist, legen wir es automatisch (inaktiv) an, statt den Import
      // an einer fehlenden Zuordnung scheitern zu lassen - aktivieren kann man es spaeter
      // unter Einstellungen mit einem Klick.
      const verantwortlich = zeile['Verantwortliche Person'] ? String(zeile['Verantwortliche Person']).trim() : null;
      if (verantwortlich) {
        await client.query(
          `INSERT INTO bearbeiter (kuerzel, name, aktiv) VALUES ($1, $1, false)
           ON CONFLICT (kuerzel) DO NOTHING`,
          [verantwortlich]
        );
        kontakt.owner_kuerzel = verantwortlich;
      }

      const spalten = Object.keys(kontakt);
      const werte = spalten.map((s) => kontakt[s]);
      const platzhalter = spalten.map((_, i) => `$${i + 1}`);
      const { rows: neu } = await client.query(
        `INSERT INTO kontakte (${spalten.join(', ')}) VALUES (${platzhalter.join(', ')}) RETURNING id`,
        werte
      );

      // Alte Freitext-Notiz wird als ein einzelner Historien-Eintrag uebernommen,
      // statt Daten zu verlieren - ab jetzt kommen neue Eintraege strukturiert dazu.
      if (zeile['Notiz']) {
        await client.query(
          `INSERT INTO aktivitaeten (kontakt_id, autor_kuerzel, text) VALUES ($1, NULL, $2)`,
          [neu[0].id, `[Übernommen aus Masterliste]\n${String(zeile['Notiz']).trim()}`]
        );
      }
      importiert++;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.json({ importiert, uebersprungen, gesamt: zeilen.length });
});

export default router;
