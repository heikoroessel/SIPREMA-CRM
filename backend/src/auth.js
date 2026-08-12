import jwt from 'jsonwebtoken';
import { pool } from './db.js';

let cachedSecret = null;

// Das Session-Secret liegt in der DB (siehe db.js initSchema) statt in einer Umgebungsvariable,
// damit kein manueller Railway-Konfigurationsschritt noetig ist. Wird nach dem ersten Lesen
// im Prozessspeicher gecacht.
async function getSecret() {
  if (cachedSecret) return cachedSecret;
  const { rows } = await pool.query(`SELECT value FROM firmen_einstellungen WHERE key = 'session_secret'`);
  if (!rows.length) throw new Error('session_secret fehlt - initSchema wurde nicht ausgefuehrt?');
  cachedSecret = rows[0].value;
  return cachedSecret;
}

// Token bleibt bewusst lange gueltig (1 Jahr) - kleines, vertrauenswuerdiges Team, Login soll
// dauerhaft bestehen bleiben bis zum expliziten Abmelden oder einem Passwort-Reset.
export async function signToken(kuerzel) {
  const secret = await getSecret();
  return jwt.sign({ kuerzel }, secret, { expiresIn: '365d' });
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
  if (!token) return res.status(401).json({ error: 'Nicht angemeldet' });
  try {
    const secret = await getSecret();
    const payload = jwt.verify(token, secret);
    req.kuerzel = payload.kuerzel;
    next();
  } catch {
    res.status(401).json({ error: 'Session ungueltig oder abgelaufen' });
  }
}
