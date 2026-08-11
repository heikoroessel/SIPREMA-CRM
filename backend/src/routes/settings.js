import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/settings/punkte -> aktuelle Punkte-Gewichtung je Ereignistyp
router.get('/punkte', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM punkte_gewichtung ORDER BY punkte');
  res.json(rows);
});

// PUT /api/settings/punkte/:ereignis -> einzelnen Punktwert aendern
router.put('/punkte/:ereignis', async (req, res) => {
  const { punkte } = req.body;
  if (typeof punkte !== 'number') return res.status(400).json({ error: 'punkte (Zahl) erforderlich' });

  const { rows } = await pool.query(
    `UPDATE punkte_gewichtung SET punkte = $1 WHERE ereignis = $2 RETURNING *`,
    [punkte, req.params.ereignis]
  );
  if (!rows.length) return res.status(404).json({ error: 'Ereignistyp nicht gefunden' });
  res.json(rows[0]);
});

// GET/PUT /api/settings/firma -> allgemeine Einstellungen (Vollzeit-Sollpunkte etc.)
router.get('/firma', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM firmen_einstellungen');
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

router.put('/firma/:key', async (req, res) => {
  const { value } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO firmen_einstellungen (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2 RETURNING *`,
    [req.params.key, String(value)]
  );
  res.json(rows[0]);
});

export default router;
