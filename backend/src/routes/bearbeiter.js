import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/bearbeiter?nurAktiv=true -> fuer Owner-Dropdowns nur aktive zurueckgeben
router.get('/', async (req, res) => {
  const where = req.query.nurAktiv === 'true' ? 'WHERE aktiv = true' : '';
  const { rows } = await pool.query(`SELECT * FROM bearbeiter ${where} ORDER BY name`);
  res.json(rows);
});

// POST /api/bearbeiter -> neuen Bearbeiter anlegen
router.post('/', async (req, res) => {
  const { kuerzel, name, stunden_pro_woche, ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege } = req.body;
  if (!kuerzel || !name) return res.status(400).json({ error: 'kuerzel und name erforderlich' });

  const { rows } = await pool.query(
    `INSERT INTO bearbeiter (kuerzel, name, stunden_pro_woche, ziel_kontakte, ziel_termine, ziel_angebote, ziel_auftraege)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [kuerzel.toUpperCase(), name, stunden_pro_woche || 40, ziel_kontakte || 0, ziel_termine || 0, ziel_angebote || 0, ziel_auftraege || 0]
  );
  res.status(201).json(rows[0]);
});

// PUT /api/bearbeiter/:kuerzel -> aktiv/inaktiv setzen, Arbeitszeit + Monatsziele aendern
router.put('/:kuerzel', async (req, res) => {
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
    `UPDATE bearbeiter SET ${sets.join(', ')} WHERE kuerzel = $${params.length} RETURNING *`,
    params
  );
  if (!rows.length) return res.status(404).json({ error: 'Bearbeiter nicht gefunden' });
  res.json(rows[0]);
});

export default router;
