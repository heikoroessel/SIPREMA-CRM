import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Ordnet einen Phasen-Eintrag aus phase_historie einem Punkte-Ereignis zu.
// "in_kontakt", "termin", "angebot", "auftrag" -> direkter Treffer im Gewichtungs-Feld.
// Ruecksprünge (z.B. Ergebnis "verloren") zaehlen nicht extra.
function ereignisFuerPhase(phase) {
  return ['in_kontakt', 'termin', 'angebot', 'auftrag'].includes(phase) ? phase : null;
}

// GET /api/punkte/:kuerzel?zeitraum=heute|woche
// Liefert Ist-Punkte (Aktivitaeten + Phasenwechsel, gewichtet) und das anteilige Soll
// (auf Basis der Wochenarbeitszeit, linear ueber die Woche verteilt).
router.get('/:kuerzel', async (req, res) => {
  const { kuerzel } = req.params;
  const zeitraum = req.query.zeitraum === 'woche' ? 'woche' : 'heute';

  const { rows: gewichtungRows } = await pool.query('SELECT * FROM punkte_gewichtung');
  const gewichtung = Object.fromEntries(gewichtungRows.map((r) => [r.ereignis, r.punkte]));

  const seitAusdruck = zeitraum === 'woche'
    ? `date_trunc('week', now())`
    : `date_trunc('day', now())`;

  const { rows: aktivitaeten } = await pool.query(
    `SELECT count(*) FROM aktivitaeten WHERE autor_kuerzel = $1 AND erstellt_am >= ${seitAusdruck}`,
    [kuerzel]
  );
  const { rows: phasenwechsel } = await pool.query(
    `SELECT phase, count(*) FROM phase_historie
     WHERE geaendert_von = $1 AND geaendert_am >= ${seitAusdruck}
     GROUP BY phase`,
    [kuerzel]
  );

  let istPunkte = Number(aktivitaeten[0].count) * (gewichtung.aktivitaet || 0);
  for (const row of phasenwechsel) {
    const ereignis = ereignisFuerPhase(row.phase);
    if (ereignis) istPunkte += Number(row.count) * (gewichtung[ereignis] || 0);
  }

  // Soll: Wochenarbeitszeit im Verhaeltnis zur Vollzeitstelle * Sollpunkte/Vollzeitwoche,
  // fuer "heute" anteilig auf 5 Arbeitstage (Mo-Fr) heruntergerechnet.
  const { rows: bearbeiterRows } = await pool.query('SELECT stunden_pro_woche FROM bearbeiter WHERE kuerzel = $1', [kuerzel]);
  const { rows: firmaRows } = await pool.query(
    `SELECT key, value FROM firmen_einstellungen WHERE key IN ('vollzeit_stunden_woche','sollpunkte_pro_vollzeit_woche')`
  );
  const firma = Object.fromEntries(firmaRows.map((r) => [r.key, Number(r.value)]));
  const stundenProWoche = bearbeiterRows.length ? Number(bearbeiterRows[0].stunden_pro_woche) : firma.vollzeit_stunden_woche;

  const sollProWoche = (stundenProWoche / firma.vollzeit_stunden_woche) * firma.sollpunkte_pro_vollzeit_woche;
  const sollPunkte = zeitraum === 'woche' ? sollProWoche : sollProWoche / 5;

  res.json({
    kuerzel,
    zeitraum,
    ist: Math.round(istPunkte),
    soll: Math.round(sollPunkte),
    leistungsindex: sollPunkte > 0 ? Math.round((istPunkte / sollPunkte) * 100) : null
  });
});

export default router;
