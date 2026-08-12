import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Naeherung fuer den "Soll heute"-Pfeil: ein Zwanzigstel des Monatsziels pro Kalendertag,
// gedeckelt auf 100% (fuer Monate mit mehr als 20 Tagen bzw. am Monatsende).
const ARBEITSTAGE_PRO_MONAT = 20;

// GET /api/punkte/:kuerzel -> Monatsfortschritt fuer die vier Kennzahlen Kontakt/Termin/Angebot/Auftrag.
// Kontakt zaehlt aus zwei Quellen: jede Aktivitaets-Notiz UND jeder Phasenwechsel nach "in_kontakt".
// Termin/Angebot/Auftrag zaehlen ausschliesslich aus Phasenwechseln in die jeweilige Phase.
router.get('/:kuerzel', async (req, res) => {
  const { kuerzel } = req.params;
  const monatsStart = `date_trunc('month', now())`;

  const { rows: aktivitaeten } = await pool.query(
    `SELECT count(*) FROM aktivitaeten WHERE autor_kuerzel = $1 AND erstellt_am >= ${monatsStart}`,
    [kuerzel]
  );
  const { rows: phasenwechsel } = await pool.query(
    `SELECT phase, count(*) FROM phase_historie
     WHERE geaendert_von = $1 AND geaendert_am >= ${monatsStart}
     GROUP BY phase`,
    [kuerzel]
  );
  const wechselCount = Object.fromEntries(phasenwechsel.map((r) => [r.phase, Number(r.count)]));

  const { rows: bearbeiterRows } = await pool.query(
    'SELECT ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege FROM bearbeiter WHERE kuerzel = $1',
    [kuerzel]
  );
  const ziele = bearbeiterRows[0] || { ziel_kontakte: 0, ziel_termine: 0, ziel_angebote: 0, ziel_auftraege: 0 };

  const heute = new Date();
  const kalendertagImMonat = heute.getDate();
  const sollAnteil = Math.min(1, kalendertagImMonat / ARBEITSTAGE_PRO_MONAT);

  const kennzahl = (ist, ziel) => ({
    ist,
    ziel: Number(ziel) || 0,
    soll_heute: Math.round((Number(ziel) || 0) * sollAnteil)
  });

  res.json({
    kuerzel,
    monat: heute.toISOString().slice(0, 7),
    kontakte: kennzahl(Number(aktivitaeten[0].count) + (wechselCount.in_kontakt || 0), ziele.ziel_kontakte),
    termine: kennzahl(wechselCount.termin || 0, ziele.ziel_termine),
    angebote: kennzahl(wechselCount.angebot || 0, ziele.ziel_angebote),
    auftraege: kennzahl(wechselCount.auftrag || 0, ziele.ziel_auftraege)
  });
});

export default router;
