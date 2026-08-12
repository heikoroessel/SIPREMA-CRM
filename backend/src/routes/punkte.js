import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Naeherung fuer den "Soll heute"-Pfeil im Monat: ein Zwanzigstel des Monatsziels pro
// Kalendertag (nicht an echte Arbeitstage/Teilzeit gekoppelt).
const ARBEITSTAGE_PRO_MONAT = 20;

// Berechnet fuer einen Zeitraum [periodenStart, periodenEnde) den Soll-Anteil (0..1) fuer heute,
// wobei die Zaehlung erst ab "zaehlStart" beginnt (falls das spaeter als periodenStart liegt -
// z.B. im allerersten, angebrochenen Monat/Jahr nach Einfuehrung dieses Features). Ausserhalb
// von Monaten wird stattdessen linear ueber die Tage der Periode gerechnet.
function sollAnteilJahr(heute, periodenStart, periodenEndeExklusiv, zaehlStart) {
  const start = zaehlStart > periodenStart ? zaehlStart : periodenStart;
  const gesamtTage = (periodenEndeExklusiv - start) / 86400000;
  const vergangeneTage = (heute - start) / 86400000;
  if (gesamtTage <= 0) return 0;
  return Math.max(0, Math.min(1, vergangeneTage / gesamtTage));
}

// GET /api/punkte/:kuerzel -> Monats- UND Jahresfortschritt fuer die vier Kennzahlen
// Kontakt/Termin/Angebot/Auftrag. Kontakt zaehlt aus drei Quellen: jede Aktivitaets-Notiz,
// jeder Phasenwechsel nach "in_kontakt" UND manuelle Ergaenzungen (z.B. Massen-Kontaktierung
// per E-Mail/LinkedIn ausserhalb der Liste). Termin/Angebot/Auftrag zaehlen ausschliesslich aus
// Phasenwechseln in die jeweilige Phase. Gezaehlt wird nie rueckwirkend vor "zaehl_start_datum".
router.get('/:kuerzel', async (req, res) => {
  const { kuerzel } = req.params;
  const heute = new Date();
  const jahr = heute.getFullYear();
  const monatStart = new Date(jahr, heute.getMonth(), 1);
  const monatEndeExkl = new Date(jahr, heute.getMonth() + 1, 1);
  const jahrStart = new Date(jahr, 0, 1);
  const jahrEndeExkl = new Date(jahr + 1, 0, 1);

  const { rows: einstellungen } = await pool.query(
    `SELECT value FROM firmen_einstellungen WHERE key = 'zaehl_start_datum'`
  );
  const zaehlStart = einstellungen.length ? new Date(einstellungen[0].value) : new Date(0);
  const monatEffektivStart = zaehlStart > monatStart ? zaehlStart : monatStart;
  const jahrEffektivStart = zaehlStart > jahrStart ? zaehlStart : jahrStart;

  const { rows: aktivitaetenMonat } = await pool.query(
    `SELECT count(*) FROM aktivitaeten WHERE autor_kuerzel = $1 AND erstellt_am >= $2`,
    [kuerzel, monatEffektivStart]
  );
  const { rows: aktivitaetenJahr } = await pool.query(
    `SELECT count(*) FROM aktivitaeten WHERE autor_kuerzel = $1 AND erstellt_am >= $2`,
    [kuerzel, jahrEffektivStart]
  );
  const { rows: wechselMonat } = await pool.query(
    `SELECT phase, count(*) FROM phase_historie WHERE geaendert_von = $1 AND geaendert_am >= $2 GROUP BY phase`,
    [kuerzel, monatEffektivStart]
  );
  const { rows: wechselJahr } = await pool.query(
    `SELECT phase, count(*) FROM phase_historie WHERE geaendert_von = $1 AND geaendert_am >= $2 GROUP BY phase`,
    [kuerzel, jahrEffektivStart]
  );
  const { rows: manuellMonat } = await pool.query(
    `SELECT kennzahl, coalesce(sum(anzahl), 0) AS summe FROM manuelle_ergaenzung
     WHERE kuerzel = $1 AND datum >= $2 GROUP BY kennzahl`,
    [kuerzel, monatEffektivStart]
  );
  const { rows: manuellJahr } = await pool.query(
    `SELECT kennzahl, coalesce(sum(anzahl), 0) AS summe FROM manuelle_ergaenzung
     WHERE kuerzel = $1 AND datum >= $2 GROUP BY kennzahl`,
    [kuerzel, jahrEffektivStart]
  );

  const zuMap = (rows, feld = 'phase') => Object.fromEntries(rows.map((r) => [r[feld], Number(r.count ?? r.summe)]));
  const wM = zuMap(wechselMonat);
  const wJ = zuMap(wechselJahr);
  const mM = zuMap(manuellMonat, 'kennzahl');
  const mJ = zuMap(manuellJahr, 'kennzahl');

  const { rows: bearbeiterRows } = await pool.query(
    'SELECT ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege FROM bearbeiter WHERE kuerzel = $1',
    [kuerzel]
  );
  const zieleJahr = bearbeiterRows[0] || { ziel_kontakte: 0, ziel_termine: 0, ziel_angebote: 0, ziel_auftraege: 0 };

  const kalendertagImMonat = heute.getDate();
  const sollAnteilMonat = Math.min(1, kalendertagImMonat / ARBEITSTAGE_PRO_MONAT);
  const sollAnteilDesJahres = sollAnteilJahr(heute, jahrStart, jahrEndeExkl, zaehlStart);

  function kennzahl(istMonat, istJahr, zielJahrRoh) {
    const zielJahr = Number(zielJahrRoh) || 0;
    const zielMonat = Math.round(zielJahr / 12);
    return {
      monat: { ist: istMonat, ziel: zielMonat, soll_heute: Math.round(zielMonat * sollAnteilMonat) },
      jahr: { ist: istJahr, ziel: zielJahr, soll_heute: Math.round(zielJahr * sollAnteilDesJahres) }
    };
  }

  res.json({
    kuerzel,
    zaehl_start: zaehlStart.toISOString().slice(0, 10),
    kontakte: kennzahl(
      Number(aktivitaetenMonat[0].count) + (wM.in_kontakt || 0) + (mM.kontakte || 0),
      Number(aktivitaetenJahr[0].count) + (wJ.in_kontakt || 0) + (mJ.kontakte || 0),
      zieleJahr.ziel_kontakte
    ),
    termine: kennzahl(wM.termin || 0, wJ.termin || 0, zieleJahr.ziel_termine),
    angebote: kennzahl(wM.angebot || 0, wJ.angebot || 0, zieleJahr.ziel_angebote),
    auftraege: kennzahl(wM.auftrag || 0, wJ.auftrag || 0, zieleJahr.ziel_auftraege)
  });
});

// POST /api/punkte/manuell -> manuelle Ergaenzung fuer heute addieren (kumulativ pro Tag).
// body: { kuerzel, kennzahl: 'kontakte', anzahl: 100 }
router.post('/manuell', async (req, res) => {
  const { kuerzel, kennzahl, anzahl } = req.body;
  const delta = Number(anzahl);
  if (!kuerzel || !kennzahl || !Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ error: 'kuerzel, kennzahl und anzahl (Zahl != 0) erforderlich' });
  }
  const { rows } = await pool.query(
    `INSERT INTO manuelle_ergaenzung (kuerzel, kennzahl, datum, anzahl)
     VALUES ($1, $2, CURRENT_DATE, $3)
     ON CONFLICT (kuerzel, kennzahl, datum)
     DO UPDATE SET anzahl = manuelle_ergaenzung.anzahl + EXCLUDED.anzahl, aktualisiert_am = now()
     RETURNING *`,
    [kuerzel, kennzahl, delta]
  );
  res.status(201).json(rows[0]);
});

export default router;
