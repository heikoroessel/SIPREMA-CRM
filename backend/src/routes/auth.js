import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signToken } from '../auth.js';

const router = Router();

// GET /api/auth/status/:kuerzel -> zeigt dem Frontend, ob fuer dieses Kuerzel schon ein
// Passwort existiert (steuert, ob die Login-Maske ein oder zwei Passwort-Felder zeigt).
router.get('/status/:kuerzel', async (req, res) => {
  const { rows } = await pool.query('SELECT passwort_hash FROM bearbeiter WHERE kuerzel = $1', [req.params.kuerzel]);
  if (!rows.length) return res.status(404).json({ error: 'Kuerzel nicht gefunden' });
  res.json({ hat_passwort: !!rows[0].passwort_hash });
});

// POST /api/auth/login -> normaler Login ODER, falls fuer dieses Kuerzel noch kein Passwort
// gesetzt ist, wird das uebergebene Passwort als neues Passwort uebernommen (Ersteinrichtung;
// die doppelte Eingabe/Bestaetigung passiert rein clientseitig davor).
router.post('/login', async (req, res) => {
  const { kuerzel, passwort } = req.body;
  if (!kuerzel || !passwort) return res.status(400).json({ error: 'kuerzel und passwort erforderlich' });

  const { rows } = await pool.query('SELECT kuerzel, passwort_hash, aktiv FROM bearbeiter WHERE kuerzel = $1', [kuerzel]);
  if (!rows.length) return res.status(404).json({ error: 'Kuerzel nicht gefunden' });
  if (!rows[0].aktiv) return res.status(403).json({ error: 'Dieses Kuerzel ist deaktiviert' });

  if (!rows[0].passwort_hash) {
    const hash = await bcrypt.hash(passwort, 10);
    await pool.query('UPDATE bearbeiter SET passwort_hash = $1 WHERE kuerzel = $2', [hash, kuerzel]);
    const token = await signToken(kuerzel);
    return res.status(201).json({ token, kuerzel, neu_eingerichtet: true });
  }

  const passtZusammen = await bcrypt.compare(passwort, rows[0].passwort_hash);
  if (!passtZusammen) return res.status(401).json({ error: 'Falsches Passwort' });

  const token = await signToken(kuerzel);
  res.json({ token, kuerzel, neu_eingerichtet: false });
});

export default router;
