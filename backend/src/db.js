import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

// Alle Tabellen, Startdaten fuer Bearbeiter und Punkte-Gewichtung.
// Wird beim Serverstart einmal ausgefuehrt (CREATE TABLE IF NOT EXISTS -> ist idempotent).
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bearbeiter (
      kuerzel text PRIMARY KEY,
      name text NOT NULL,
      aktiv boolean NOT NULL DEFAULT true,
      stunden_pro_woche numeric NOT NULL DEFAULT 40,
      erstellt_am timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS punkte_gewichtung (
      ereignis text PRIMARY KEY,
      punkte integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS status_optionen (
      wert text PRIMARY KEY,
      label text NOT NULL,
      reihenfolge integer NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS firmen_einstellungen (
      key text PRIMARY KEY,
      value text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kontakte (
      id serial PRIMARY KEY,
      zielgruppe text,
      firma text,
      strasse text,
      plz text,
      ort text,
      land text,
      email_firma text,
      website text,
      telefon_zentrale text,
      anrede text,
      titel text,
      vorname text,
      nachname text,
      email text,
      telefon text,
      rolle text,
      quelle text,
      vertriebsstrategie text,
      phase text NOT NULL DEFAULT 'unbearbeitet',
      ergebnis text NOT NULL DEFAULT 'offen',
      absagegrund text,
      pilotprojekt boolean NOT NULL DEFAULT false,
      pilotprojekt_seit date,
      wiedervorlage date,
      owner_kuerzel text REFERENCES bearbeiter(kuerzel) ON DELETE SET NULL,
      umsatz numeric,
      import_quelle text,
      erstellt_am timestamptz NOT NULL DEFAULT now(),
      phase_seit timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_kontakte_phase ON kontakte(phase);
    CREATE INDEX IF NOT EXISTS idx_kontakte_owner ON kontakte(owner_kuerzel);
    CREATE INDEX IF NOT EXISTS idx_kontakte_plz ON kontakte(plz);

    CREATE TABLE IF NOT EXISTS phase_historie (
      id serial PRIMARY KEY,
      kontakt_id integer NOT NULL REFERENCES kontakte(id) ON DELETE CASCADE,
      phase text NOT NULL,
      ergebnis text NOT NULL,
      geaendert_von text REFERENCES bearbeiter(kuerzel),
      geaendert_am timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS aktivitaeten (
      id serial PRIMARY KEY,
      kontakt_id integer NOT NULL REFERENCES kontakte(id) ON DELETE CASCADE,
      autor_kuerzel text REFERENCES bearbeiter(kuerzel),
      text text NOT NULL,
      erstellt_am timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Startdaten nur einsetzen, wenn Tabellen leer sind
  const { rows: bCount } = await pool.query('SELECT count(*) FROM bearbeiter');
  if (Number(bCount[0].count) === 0) {
    await pool.query(`
      INSERT INTO bearbeiter (kuerzel, name, aktiv, stunden_pro_woche) VALUES
      ('HEC', 'HEC', true, 8),
      ('UBC', 'UBC', true, 12),
      ('NEL', 'NEL', false, 40)
    `);
  }

  const { rows: pCount } = await pool.query('SELECT count(*) FROM punkte_gewichtung');
  if (Number(pCount[0].count) === 0) {
    await pool.query(`
      INSERT INTO punkte_gewichtung (ereignis, punkte) VALUES
      ('aktivitaet', 1),
      ('in_kontakt', 2),
      ('termin', 10),
      ('angebot', 15),
      ('auftrag', 40)
    `);
  }

  const { rows: sCount } = await pool.query('SELECT count(*) FROM firmen_einstellungen');
  if (Number(sCount[0].count) === 0) {
    await pool.query(`
      INSERT INTO firmen_einstellungen (key, value) VALUES
      ('vollzeit_stunden_woche', '40'),
      ('sollpunkte_pro_vollzeit_woche', '250')
    `);
  }

  const { rows: statusCount } = await pool.query('SELECT count(*) FROM status_optionen');
  if (Number(statusCount[0].count) === 0) {
    await pool.query(`
      INSERT INTO status_optionen (wert, label, reihenfolge) VALUES
      ('offen', 'Offen', 1),
      ('verloren', 'Verloren', 2),
      ('ruht', 'Ruht', 3)
    `);
  }
}
