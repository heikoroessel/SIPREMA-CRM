import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Reihenfolge der Pipeline-Phasen, u.a. fuer "vorwaerts/rueckwaerts" Erkennung
const PHASEN = ['unbearbeitet', 'in_kontakt', 'termin', 'angebot', 'auftrag'];

// GET /api/kontakte
// Query-Parameter: phase, ergebnis, owner ("none" fuer nicht zugewiesen), plz (Prefix),
// zielgruppe, quelle, q (Volltext auf Firma/Nachname), page, pageSize
// sortierung=prioritaet -> Bearbeiterlisten-Logik:
// "verloren" wird immer ausgeblendet. Danach in dieser Reihenfolge (Tier 1 oben):
//   1) faellige/ueberfaellige Wiedervorlage (Datum <= heute), sortiert nach Wiedervorlage aufsteigend
//   2) Phase angebot   (nach phase_seit aufsteigend)
//   3) Phase termin     (nach phase_seit aufsteigend)
//   4) Phase in_kontakt (nach phase_seit aufsteigend)
//   5) Phase unbearbeitet (nach phase_seit aufsteigend)
const PRIORITAETS_ORDER_SQL = `
  CASE
    WHEN wiedervorlage IS NOT NULL AND wiedervorlage <= CURRENT_DATE THEN 0
    WHEN phase = 'angebot' THEN 1
    WHEN phase = 'termin' THEN 2
    WHEN phase = 'in_kontakt' THEN 3
    ELSE 4
  END`;

function baueWhere(query) {
  const { phase, ergebnis, owner, plz, zielgruppe, quelle, anrede, vorname, nachname, ort, firma, q, ohne_verloren } = query;
  const where = [];
  const params = [];

  if (phase) { params.push(phase); where.push(`phase = $${params.length}`); }
  if (ergebnis) { params.push(ergebnis); where.push(`ergebnis = $${params.length}`); }
  if (ohne_verloren === 'true') { where.push(`ergebnis != 'verloren'`); }
  if (owner === 'none') { where.push('owner_kuerzel IS NULL'); }
  else if (owner) { params.push(owner); where.push(`owner_kuerzel = $${params.length}`); }
  if (plz) { params.push(`${plz}%`); where.push(`plz LIKE $${params.length}`); }
  if (ort) { params.push(`%${ort}%`); where.push(`ort ILIKE $${params.length}`); }
  if (firma) { params.push(`%${firma}%`); where.push(`firma ILIKE $${params.length}`); }
  if (zielgruppe) { params.push(zielgruppe); where.push(`zielgruppe = $${params.length}`); }
  if (quelle) { params.push(quelle); where.push(`quelle = $${params.length}`); }
  if (anrede) { params.push(anrede); where.push(`anrede = $${params.length}`); }
  if (vorname) { params.push(`%${vorname}%`); where.push(`vorname ILIKE $${params.length}`); }
  if (nachname) { params.push(`%${nachname}%`); where.push(`nachname ILIKE $${params.length}`); }
  if (q) { params.push(`%${q}%`); where.push(`(firma ILIKE $${params.length} OR nachname ILIKE $${params.length})`); }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Number(req.query.pageSize) || 50);
  const { whereSql, params } = baueWhere(req.query);

  const orderSql = req.query.sortierung === 'prioritaet'
    ? `ORDER BY ${PRIORITAETS_ORDER_SQL}, CASE WHEN wiedervorlage IS NOT NULL AND wiedervorlage <= CURRENT_DATE THEN wiedervorlage::timestamptz ELSE phase_seit END ASC`
    : `ORDER BY erstellt_am DESC`;

  const { rows: countRows } = await pool.query(`SELECT count(*) FROM kontakte ${whereSql}`, params);
  const limitParams = [...params, pageSize, (page - 1) * pageSize];
  const { rows } = await pool.query(
    `SELECT id, zielgruppe, firma, ort, plz, anrede, vorname, nachname, quelle,
            phase, ergebnis, owner_kuerzel, wiedervorlage,
            EXTRACT(day FROM now() - phase_seit)::int AS tage_in_phase
     FROM kontakte ${whereSql}
     ${orderSql}
     LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
    limitParams
  );

  res.json({ total: Number(countRows[0].count), page, pageSize, items: rows });
});

// GET /api/kontakte/export.csv -> CSV-Export, respektiert dieselben Filter-Query-Parameter
// wie GET /api/kontakte (kein Paging - immer alle Treffer).
router.get('/export.csv', async (req, res) => {
  const { whereSql, params } = baueWhere(req.query);
  const orderSql = req.query.sortierung === 'prioritaet'
    ? `ORDER BY ${PRIORITAETS_ORDER_SQL}, CASE WHEN wiedervorlage IS NOT NULL AND wiedervorlage <= CURRENT_DATE THEN wiedervorlage::timestamptz ELSE phase_seit END ASC`
    : `ORDER BY erstellt_am DESC`;

  const { rows } = await pool.query(
    `SELECT zielgruppe, firma, strasse, plz, ort, land, anrede, titel, vorname, nachname,
            email, telefon, telefon_zentrale, email_firma, website, rolle, quelle,
            vertriebsstrategie, phase, ergebnis, absagegrund, owner_kuerzel, wiedervorlage,
            EXTRACT(day FROM now() - phase_seit)::int AS tage_in_phase
     FROM kontakte ${whereSql} ${orderSql}`,
    params
  );

  const spalten = Object.keys(rows[0] || {
    zielgruppe: '', firma: '', strasse: '', plz: '', ort: '', land: '', anrede: '', titel: '',
    vorname: '', nachname: '', email: '', telefon: '', telefon_zentrale: '', email_firma: '',
    website: '', rolle: '', quelle: '', vertriebsstrategie: '', phase: '', ergebnis: '',
    absagegrund: '', owner_kuerzel: '', wiedervorlage: '', tage_in_phase: ''
  });
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const zeilen = [spalten.join(';'), ...rows.map((r) => spalten.map((s) => escape(r[s])).join(';'))];
  const csv = '\uFEFF' + zeilen.join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="siprema-kontakte.csv"');
  res.send(csv);
});

// GET /api/kontakte/werte/:feld -> bekannte, tatsaechlich vorkommende Werte einer Spalte
// (fuer Dropdown-Filter in der Kontaktliste bei Zielgruppe/Quelle/Anrede - keine geratenen Listen)
const FILTERBARE_FELDER = ['zielgruppe', 'quelle', 'anrede'];
router.get('/werte/:feld', async (req, res) => {
  if (!FILTERBARE_FELDER.includes(req.params.feld)) return res.status(400).json({ error: 'Feld nicht filterbar' });
  const { rows } = await pool.query(
    `SELECT DISTINCT ${req.params.feld} AS wert FROM kontakte WHERE ${req.params.feld} IS NOT NULL AND ${req.params.feld} != '' ORDER BY 1`
  );
  res.json(rows.map((r) => r.wert));
});

// GET /api/kontakte/zaehler -> Anzahl pro Phase, fuer die Filter-Chips mit Live-Zaehler
router.get('/zaehler', async (req, res) => {
  const { rows } = await pool.query(`SELECT phase, count(*) FROM kontakte GROUP BY phase`);
  const { rows: nichtZugewiesen } = await pool.query(
    `SELECT count(*) FROM kontakte WHERE owner_kuerzel IS NULL`
  );
  res.json({
    phasen: Object.fromEntries(rows.map((r) => [r.phase, Number(r.count)])),
    nicht_zugewiesen: Number(nichtZugewiesen[0].count)
  });
});

// GET /api/kontakte/:id -> Detailansicht inkl. Aktivitaeten-Timeline
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM kontakte WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Kontakt nicht gefunden' });

  const { rows: aktivitaeten } = await pool.query(
    'SELECT * FROM aktivitaeten WHERE kontakt_id = $1 ORDER BY erstellt_am DESC',
    [req.params.id]
  );

  res.json({ ...rows[0], aktivitaeten });
});

// PUT /api/kontakte/:id -> Felder bearbeiten. Bei Phasen-/Ergebniswechsel wird automatisch
// ein Eintrag in phase_historie geschrieben (Basis fuer Verweildauer + spaetere KPI/Punkte-Auswertung).
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { rows: current } = await pool.query('SELECT phase, ergebnis FROM kontakte WHERE id = $1', [id]);
  if (!current.length) return res.status(404).json({ error: 'Kontakt nicht gefunden' });

  const erlaubteFelder = [
    'zielgruppe', 'firma', 'strasse', 'plz', 'ort', 'land', 'email_firma', 'website',
    'telefon_zentrale', 'anrede', 'titel', 'vorname', 'nachname', 'email', 'telefon', 'rolle',
    'quelle', 'vertriebsstrategie', 'phase', 'ergebnis', 'absagegrund', 'pilotprojekt',
    'pilotprojekt_seit', 'wiedervorlage', 'owner_kuerzel', 'umsatz'
  ];
  const geaendert_von = req.body.geaendert_von || null;

  const sets = [];
  const params = [];
  for (const feld of erlaubteFelder) {
    if (feld in req.body) {
      params.push(req.body[feld]);
      sets.push(`${feld} = $${params.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Keine Felder zum Aendern' });

  const phaseWechselt = 'phase' in req.body && req.body.phase !== current[0].phase;
  if (phaseWechselt) sets.push('phase_seit = now()');

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE kontakte SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  if (phaseWechselt || ('ergebnis' in req.body && req.body.ergebnis !== current[0].ergebnis)) {
    await pool.query(
      `INSERT INTO phase_historie (kontakt_id, phase, ergebnis, geaendert_von)
       VALUES ($1, $2, $3, $4)`,
      [id, rows[0].phase, rows[0].ergebnis, geaendert_von]
    );
  }

  res.json(rows[0]);
});

// POST /api/kontakte -> neuen Kontakt anlegen
router.post('/', async (req, res) => {
  const felder = [
    'zielgruppe', 'firma', 'strasse', 'plz', 'ort', 'land', 'email_firma', 'website',
    'telefon_zentrale', 'anrede', 'titel', 'vorname', 'nachname', 'email', 'telefon', 'rolle',
    'quelle', 'vertriebsstrategie', 'owner_kuerzel', 'import_quelle'
  ];
  const spalten = felder.filter((f) => f in req.body);
  const werte = spalten.map((f) => req.body[f]);
  const platzhalter = spalten.map((_, i) => `$${i + 1}`);

  const { rows } = await pool.query(
    `INSERT INTO kontakte (${spalten.join(', ')}) VALUES (${platzhalter.join(', ')}) RETURNING *`,
    werte
  );
  res.status(201).json(rows[0]);
});

// POST /api/kontakte/bulk-zuweisen -> Sammel-Zuweisung/Uebernahme (Gruppen-Pick oder Bearbeiterwechsel)
// body: { ids: [1,2,3], owner_kuerzel: "HEC" }  -- oder als Alternative:
// body: { von_owner: "NEL", owner_kuerzel: "HEC" }  fuer "alle Kontakte von X auf Y"
router.post('/bulk-zuweisen', async (req, res) => {
  const { ids, von_owner, owner_kuerzel } = req.body;
  if (!owner_kuerzel && owner_kuerzel !== null) {
    return res.status(400).json({ error: 'owner_kuerzel fehlt' });
  }

  let result;
  if (Array.isArray(ids) && ids.length) {
    result = await pool.query(
      `UPDATE kontakte SET owner_kuerzel = $1 WHERE id = ANY($2::int[]) RETURNING id`,
      [owner_kuerzel, ids]
    );
  } else if (von_owner) {
    result = await pool.query(
      `UPDATE kontakte SET owner_kuerzel = $1 WHERE owner_kuerzel = $2 RETURNING id`,
      [owner_kuerzel, von_owner]
    );
  } else {
    return res.status(400).json({ error: 'ids oder von_owner erforderlich' });
  }

  res.json({ aktualisiert: result.rowCount });
});

// POST /api/kontakte/:id/aktivitaeten -> neuen Timeline-Eintrag anlegen
router.post('/:id/aktivitaeten', async (req, res) => {
  const { autor_kuerzel, text } = req.body;
  if (!autor_kuerzel || !text) return res.status(400).json({ error: 'autor_kuerzel und text erforderlich' });

  const { rows } = await pool.query(
    `INSERT INTO aktivitaeten (kontakt_id, autor_kuerzel, text) VALUES ($1, $2, $3) RETURNING *`,
    [req.params.id, autor_kuerzel, text]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/kontakte/alle -> setzt die Kontaktliste komplett zurueck (z.B. vor einem sauberen
// Re-Import), damit Mehrfach-Importe nicht zu Duplikaten fuehren. Loescht kaskadierend auch
// Aktivitaeten und Phasen-Historie.
router.delete('/alle', async (req, res) => {
  const result = await pool.query('DELETE FROM kontakte');
  res.json({ geloescht: result.rowCount });
});

// DELETE /api/kontakte/:id -> einzelnen Kontakt vollstaendig loeschen (kaskadiert auf
// Aktivitaeten und Phasen-Historie). Nur in der Vollstaendigen Liste im Frontend verfuegbar.
router.delete('/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM kontakte WHERE id = $1', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Kontakt nicht gefunden' });
  res.status(204).end();
});

export default router;
