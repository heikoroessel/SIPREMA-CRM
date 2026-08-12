import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

// GET /api/bearbeiter?nurAktiv=true -> bewusst OHNE Login-Pflicht, wird von der Login-Maske
// gebraucht (Kuerzel-Auswahl vor dem Anmelden). passwort_hash wird nie mit ausgeliefert.
router.get('/', async (req, res) => {
  const where = req.query.nurAktiv === 'true' ? 'WHERE aktiv = true' : '';
  const { rows } = await pool.query(
    `SELECT kuerzel, name, aktiv, stunden_pro_woche, ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege, erstellt_am
     FROM bearbeiter ${where} ORDER BY name`
  );
  res.json(rows);
});

// POST /api/bearbeiter -> neuen Bearbeiter anlegen (Login erforderlich)
router.post('/', authMiddleware, async (req, res) => {
  const { kuerzel, name, stunden_pro_woche, ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege } = req.body;
  if (!kuerzel || !name) return res.status(400).json({ error: 'kuerzel und name erforderlich' });

  const { rows } = await pool.query(
    `INSERT INTO bearbeiter (kuerzel, name, stunden_pro_woche, ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING kuerzel, name, aktiv, stunden_pro_woche, ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege`,
    [kuerzel.toUpperCase(), name, stunden_pro_woche || 40, ziel_kontakte || 0, ziel_termine || 0, ziel_angebote || 0, ziel_auftraege || 0]
  );
  res.status(201).json(rows[0]);
});

// PUT /api/bearbeiter/:kuerzel -> aktiv/inaktiv setzen, Arbeitszeit + Jahresziele aendern (Login erforderlich)
router.put('/:kuerzel', authMiddleware, async (req, res) => {
  const { name, aktiv, stunden_pro_woche, ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege } = req.body;
  const sets = [];
  const params = [];
  if (name !== undefined) { params.push(name); sets.push(`name = $${params.length}`); }
  if (aktiv !== undefined) { params.push(aktiv); sets.push(`aktiv = $${params.length}`); }
  if (stunden_pro_woche !== undefined) { params.push(stunden_pro_woche); sets.push(`stunden_pro_woche = $${params.length}`); }
  if (ziel_kontakte !== undefined) { params.push(ziel_kontakte); sets.push(`ziel_kontakte = $${params.length}`); }
  if (ziel_termine !== undefined) { params.push(ziel_termine); sets.push(`ziel_termine = $${params.length}`); }
  if (ziel_angebote !== undefined) { params.push(ziel_angebote); sets.push(`ziel_angebote = $${params.length}`); }
  if (ziel_auftraege !== undefined) { params.push(ziel_auftraege); sets.push(`ziel_auftraege = $${params.length}`); }
  if (!sets.length) return res.status(400).json({ error: 'Keine Felder zum Aendern' });

  params.push(req.params.kuerzel);
  const { rows } = await pool.query(
    `UPDATE bearbeiter SET ${sets.join(', ')} WHERE kuerzel = $${params.length}
     RETURNING kuerzel, name, aktiv, stunden_pro_woche, ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege`,
    params
  );
  if (!rows.length) return res.status(404).json({ error: 'Bearbeiter nicht gefunden' });
  res.json(rows[0]);
});

// POST /api/bearbeiter/:kuerzel/passwort-reset -> Passwort loeschen, damit beim naechsten
// Login wieder die Ersteinrichtung (neues Passwort setzen) greift. Jeder eingeloggte Kollege
// darf das fuer jedes Kuerzel ausloesen (kein Rollensystem, wie besprochen).
router.post('/:kuerzel/passwort-reset', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE bearbeiter SET passwort_hash = NULL WHERE kuerzel = $1 RETURNING kuerzel',
    [req.params.kuerzel]
  );
  if (!rows.length) return res.status(404).json({ error: 'Bearbeiter nicht gefunden' });
  res.json({ zurueckgesetzt: true });
});

export default router;
