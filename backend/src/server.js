import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSchema } from './db.js';
import { authMiddleware } from './auth.js';
import authRouter from './routes/auth.js';
import kontakteRouter from './routes/kontakte.js';
import bearbeiterRouter from './routes/bearbeiter.js';
import settingsRouter from './routes/settings.js';
import punkteRouter from './routes/punkte.js';
import importRouter from './routes/import.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Oeffentlich (kein Login noetig): Login selbst, und GET /api/bearbeiter fuer die
// Kuerzel-Auswahl auf der Login-Maske (bearbeiter.js schuetzt seine schreibenden Routen selbst).
app.use('/api/auth', authRouter);
app.use('/api/bearbeiter', bearbeiterRouter);

// Alles andere erfordert eine gueltige Session.
app.use('/api/kontakte', authMiddleware, kontakteRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/punkte', authMiddleware, punkteRouter);
app.use('/api/import', authMiddleware, importRouter);

// Im Produktivbetrieb liefert der Server auch das gebaute React-Frontend aus
// (frontend/dist wird als statischer Ordner eingebunden -> ein Railway-Service reicht)
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const port = process.env.PORT || 3000;

initSchema()
  .then(() => {
    app.listen(port, () => console.log(`SIPREMA CRM backend laeuft auf Port ${port}`));
  })
  .catch((err) => {
    console.error('Schema-Initialisierung fehlgeschlagen:', err);
    process.exit(1);
  });
