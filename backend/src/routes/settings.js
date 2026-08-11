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

// Status-Optionen (fruehere "Ergebnis"-Werte offen/verloren/ruht) - frei erweiterbar,
// damit das Team eigene Zwischenstati definieren kann, ohne dass Claude nochmal ran muss.
router.get('/status', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM status_optionen ORDER BY reihenfolge, label');
  res.json(rows);
});

router.post('/status', async (req, res) => {
  const { wert, label } = req.body;
  if (!wert || !label) return res.status(400).json({ error: 'wert und label erforderlich' });
  const { rows: max } = await pool.query('SELECT coalesce(max(reihenfolge), 0) AS m FROM status_optionen');
  const { rows } = await pool.query(
    `INSERT INTO status_optionen (wert, label, reihenfolge) VALUES ($1, $2, $3) RETURNING *`,
    [wert.toLowerCase().trim(), label, Number(max[0].m) + 1]
  );
  res.status(201).json(rows[0]);
});

router.delete('/status/:wert', async (req, res) => {
  await pool.query('DELETE FROM status_optionen WHERE wert = $1', [req.params.wert]);
  res.status(204).end();
});

export default router;
