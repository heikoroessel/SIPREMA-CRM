import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

const PHASEN = [
  { key: 'unbearbeitet', label: 'Unbearbeitet' },
  { key: 'in_kontakt', label: 'In Kontakt' },
  { key: 'termin', label: 'Termin' },
  { key: 'angebot', label: 'Angebot' },
  { key: 'auftrag', label: 'Auftrag' }
];
const STATUS_LABEL = { offen: 'Offen', verloren: 'Verloren', ruht: 'Ruht' };

// Spalten-Definition fuer die Excel-artige Filterzeile. typ 'text' = Freitextfeld (ILIKE),
// typ 'auswahl' = Dropdown mit tatsaechlich vorkommenden Werten aus der Datenbank,
// typ 'bearbeiter' = Dropdown mit den aktiven Bearbeitern, typ 'keiner' = kein Filter.
// mobil: false -> Spalte wird auf schmalen Bildschirmen automatisch ausgeblendet.
const SPALTEN = [
  { feld: 'zielgruppe', label: 'Zielgruppe', typ: 'auswahl', mobil: false },
  { feld: 'firma', label: 'Firma', typ: 'text', mobil: true },
  { feld: 'plz', label: 'PLZ', typ: 'text', mobil: false },
  { feld: 'ort', label: 'Ort', typ: 'text', mobil: true },
  { feld: 'anrede', label: 'Anrede', typ: 'auswahl', mobil: false },
  { feld: 'vorname', label: 'Vorname', typ: 'text', mobil: true },
  { feld: 'nachname', label: 'Nachname', typ: 'text', mobil: true },
  { feld: 'quelle', label: 'Quelle', typ: 'auswahl', mobil: false },
  { feld: 'wiedervorlage', label: 'Wiedervorlage', typ: 'keiner', mobil: false },
  { feld: 'owner_kuerzel', label: 'Owner', typ: 'bearbeiter', mobil: true }
];

export default function ContactList() {
  const navigate = useNavigate();
  const [zaehler, setZaehler] = useState({ phasen: {}, nicht_zugewiesen: 0 });
  const [phase, setPhase] = useState('');
  const [nurNichtZugewiesen, setNurNichtZugewiesen] = useState(false);
  const [spaltenFilter, setSpaltenFilter] = useState({});
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [ausgewaehlt, setAusgewaehlt] = useState(new Set());
  const [bearbeiter, setBearbeiter] = useState([]);
  const [werte, setWerte] = useState({});
  const [sortSpalte, setSortSpalte] = useState(null);
  const [sortRichtung, setSortRichtung] = useState('auf');

  useEffect(() => {
    api.kontaktZaehler().then(setZaehler);
    api.bearbeiter(true).then(setBearbeiter);
    Promise.all(['zielgruppe', 'quelle', 'anrede'].map((f) => api.werte(f).then((v) => [f, v])))
      .then((paare) => setWerte(Object.fromEntries(paare)));
  }, []);

  function baueParams() {
    const params = { pageSize: 200 };
    if (phase) params.phase = phase;

    // Owner-Filter: entweder die konkrete Spaltenauswahl (Vorrang) oder der "Nicht zugewiesen"-Chip.
    // Backend erwartet dafuer den Query-Parameter "owner" (nicht "owner_kuerzel") - das war der Bug.
    if (spaltenFilter.owner_kuerzel) params.owner = spaltenFilter.owner_kuerzel;
    else if (nurNichtZugewiesen) params.owner = 'none';

    for (const [feld, wert] of Object.entries(spaltenFilter)) {
      if (wert && feld !== 'owner_kuerzel') params[feld] = wert;
    }
    return params;
  }

  function neuLaden() {
    return api.kontakte(baueParams()).then((r) => { setItems(r.items); setTotal(r.total); });
  }

  useEffect(() => {
    const timer = setTimeout(() => { neuLaden(); setAusgewaehlt(new Set()); }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, nurNichtZugewiesen, JSON.stringify(spaltenFilter)]);

  function filterAendern(feld, wert) {
    setSpaltenFilter((prev) => ({ ...prev, [feld]: wert }));
  }

  function sortiereNach(spalte) {
    if (sortSpalte === spalte) setSortRichtung((r) => (r === 'auf' ? 'ab' : 'auf'));
    else { setSortSpalte(spalte); setSortRichtung('auf'); }
  }

  const angezeigteItems = [...items].sort((a, b) => {
    if (!sortSpalte) return 0;
    const av = a[sortSpalte] ?? '';
    const bv = b[sortSpalte] ?? '';
    const vergleich = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'de');
    return sortRichtung === 'auf' ? vergleich : -vergleich;
  });

  function toggleAuswahl(id) {
    setAusgewaehlt((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function ownerAendern(id, owner_kuerzel) {
    await api.kontaktAendern(id, { owner_kuerzel: owner_kuerzel || null, geaendert_von: localStorage.getItem('kuerzel') });
    setItems((prev) => prev.map((k) => (k.id === id ? { ...k, owner_kuerzel } : k)));
    api.kontaktZaehler().then(setZaehler);
  }

  async function sammelZuweisen(owner_kuerzel) {
    if (!ausgewaehlt.size) return;
    await api.bulkZuweisen({ ids: [...ausgewaehlt], owner_kuerzel: owner_kuerzel || null });
    await neuLaden();
    setAusgewaehlt(new Set());
    api.kontaktZaehler().then(setZaehler);
  }

  function pfeil(spalte) {
    if (sortSpalte !== spalte) return '';
    return sortRichtung === 'auf' ? ' ▲' : ' ▼';
  }

  return (
    <div>
      <div className="chip-row">
        <span className={`chip ${!phase ? 'active' : ''}`} onClick={() => setPhase('')}>Alle {total}</span>
        {PHASEN.map((p) => (
          <span key={p.key} className={`chip ${phase === p.key ? 'active' : ''}`} onClick={() => setPhase(p.key)}>
            {p.label} {zaehler.phasen[p.key] ?? 0}
          </span>
        ))}
        <span className={`chip ${nurNichtZugewiesen ? 'active' : ''}`} onClick={() => setNurNichtZugewiesen((v) => !v)}>
          Nicht zugewiesen {zaehler.nicht_zugewiesen}
        </span>
      </div>

      {ausgewaehlt.size > 0 && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
          <span style={{ fontSize: 13 }}>{ausgewaehlt.size} ausgewählt</span>
          <select onChange={(e) => sammelZuweisen(e.target.value)} defaultValue="">
            <option value="" disabled>Owner zuweisen an ...</option>
            {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>)}
          </select>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th style={{ cursor: 'pointer' }} onClick={() => sortiereNach('phase')}>Phase{pfeil('phase')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => sortiereNach('ergebnis')}>Status{pfeil('ergebnis')}</th>
              {SPALTEN.map((s) => (
                <th key={s.feld} className={s.mobil ? '' : 'col-hide-mobile'} style={{ cursor: 'pointer' }} onClick={() => sortiereNach(s.feld)}>{s.label}{pfeil(s.feld)}</th>
              ))}
              <th className="col-hide-mobile" style={{ cursor: 'pointer' }} onClick={() => sortiereNach('tage_in_phase')}>Tage in Phase{pfeil('tage_in_phase')}</th>
            </tr>
            <tr>
              <th></th>
              <th></th>
              <th></th>
              {SPALTEN.map((s) => (
                <th key={s.feld} className={s.mobil ? '' : 'col-hide-mobile'}>
                  {s.typ === 'text' && (
                    <input type="text" placeholder="…" style={{ width: '100%' }} value={spaltenFilter[s.feld] || ''} onChange={(e) => filterAendern(s.feld, e.target.value)} />
                  )}
                  {s.typ === 'auswahl' && (
                    <select style={{ width: '100%' }} value={spaltenFilter[s.feld] || ''} onChange={(e) => filterAendern(s.feld, e.target.value)}>
                      <option value="">Alle</option>
                      {(werte[s.feld] || []).map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  )}
                  {s.typ === 'bearbeiter' && (
                    <select style={{ width: '100%' }} value={spaltenFilter[s.feld] || ''} onChange={(e) => filterAendern(s.feld, e.target.value)}>
                      <option value="">Alle</option>
                      {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>)}
                    </select>
                  )}
                </th>
              ))}
              <th className="col-hide-mobile"></th>
            </tr>
          </thead>
          <tbody>
            {angezeigteItems.map((k) => (
              <tr key={k.id} className="row-clickable">
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={ausgewaehlt.has(k.id)} onChange={() => toggleAuswahl(k.id)} />
                </td>
                <td onClick={() => navigate(`/kontakte/${k.id}`)}>
                  <span className={`badge badge-${k.phase}`}>{PHASEN.find((p) => p.key === k.phase)?.label || k.phase}</span>
                </td>
                <td onClick={() => navigate(`/kontakte/${k.id}`)}>
                  <span className={`badge badge-status-${k.ergebnis}`}>{STATUS_LABEL[k.ergebnis] || k.ergebnis}</span>
                </td>
                <td className="col-hide-mobile" onClick={() => navigate(`/kontakte/${k.id}`)}>{k.zielgruppe || '–'}</td>
                <td onClick={() => navigate(`/kontakte/${k.id}`)}>{k.firma || '–'}</td>
                <td className="col-hide-mobile" onClick={() => navigate(`/kontakte/${k.id}`)}>{k.plz || '–'}</td>
                <td onClick={() => navigate(`/kontakte/${k.id}`)}>{k.ort || '–'}</td>
                <td className="col-hide-mobile" onClick={() => navigate(`/kontakte/${k.id}`)}>{k.anrede || '–'}</td>
                <td onClick={() => navigate(`/kontakte/${k.id}`)}>{k.vorname || '–'}</td>
                <td onClick={() => navigate(`/kontakte/${k.id}`)}>{k.nachname || '–'}</td>
                <td className="col-hide-mobile" onClick={() => navigate(`/kontakte/${k.id}`)}>{k.quelle || '–'}</td>
                <td className="col-hide-mobile" onClick={() => navigate(`/kontakte/${k.id}`)}>{k.wiedervorlage ? new Date(k.wiedervorlage).toLocaleDateString('de-DE') : '–'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select value={k.owner_kuerzel || ''} onChange={(e) => ownerAendern(k.id, e.target.value)}>
                    <option value="">–</option>
                    {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>)}
                  </select>
                </td>
                <td className="col-hide-mobile" onClick={() => navigate(`/kontakte/${k.id}`)}>{k.tage_in_phase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
