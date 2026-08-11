import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const PHASEN = [
  { key: 'unbearbeitet', label: 'Unbearbeitet' },
  { key: 'in_kontakt', label: 'In Kontakt' },
  { key: 'termin', label: 'Termin' },
  { key: 'angebot', label: 'Angebot' },
  { key: 'auftrag', label: 'Auftrag' }
];

export default function ContactList() {
  const navigate = useNavigate();
  const [zaehler, setZaehler] = useState({ phasen: {}, nicht_zugewiesen: 0 });
  const [phase, setPhase] = useState('');
  const [nurNichtZugewiesen, setNurNichtZugewiesen] = useState(false);
  const [plz, setPlz] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [ausgewaehlt, setAusgewaehlt] = useState(new Set());
  const [bearbeiter, setBearbeiter] = useState([]);

  useEffect(() => { api.kontaktZaehler().then(setZaehler); api.bearbeiter(true).then(setBearbeiter); }, []);

  useEffect(() => {
    const params = { pageSize: 100 };
    if (phase) params.phase = phase;
    if (nurNichtZugewiesen) params.owner = 'none';
    if (plz) params.plz = plz;
    api.kontakte(params).then((r) => { setItems(r.items); setTotal(r.total); });
    setAusgewaehlt(new Set());
  }, [phase, nurNichtZugewiesen, plz]);

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
    const params = { pageSize: 100 };
    if (phase) params.phase = phase;
    if (nurNichtZugewiesen) params.owner = 'none';
    if (plz) params.plz = plz;
    const r = await api.kontakte(params);
    setItems(r.items); setTotal(r.total); setAusgewaehlt(new Set());
    api.kontaktZaehler().then(setZaehler);
  }

  return (
    <div>
      <div className="chip-row">
        <span className={`chip ${!phase ? 'active' : ''}`} onClick={() => setPhase('')}>
          Alle {total}
        </span>
        {PHASEN.map((p) => (
          <span key={p.key} className={`chip ${phase === p.key ? 'active' : ''}`} onClick={() => setPhase(p.key)}>
            {p.label} {zaehler.phasen[p.key] ?? 0}
          </span>
        ))}
        <span className={`chip ${nurNichtZugewiesen ? 'active' : ''}`} onClick={() => setNurNichtZugewiesen((v) => !v)}>
          Nicht zugewiesen {zaehler.nicht_zugewiesen}
        </span>
        <input type="text" placeholder="PLZ-Bereich, z.B. 74" value={plz} onChange={(e) => setPlz(e.target.value)} style={{ width: 140 }} />
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

      <table>
        <thead>
          <tr>
            <th style={{ width: 28 }}></th>
            <th>Firma</th>
            <th>Ort</th>
            <th>Phase</th>
            <th>Owner</th>
            <th>Tage in Phase</th>
          </tr>
        </thead>
        <tbody>
          {items.map((k) => (
            <tr key={k.id} className="row-clickable">
              <td onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={ausgewaehlt.has(k.id)} onChange={() => toggleAuswahl(k.id)} />
              </td>
              <td onClick={() => navigate(`/kontakte/${k.id}`)}>{k.firma || '–'}</td>
              <td onClick={() => navigate(`/kontakte/${k.id}`)}>{k.ort || '–'}</td>
              <td onClick={() => navigate(`/kontakte/${k.id}`)}>
                <span className={`badge badge-${k.ergebnis === 'verloren' ? 'verloren' : k.ergebnis === 'ruht' ? 'ruht' : k.phase}`}>
                  {k.ergebnis === 'verloren' ? 'Verloren' : k.ergebnis === 'ruht' ? 'Ruht' : PHASEN.find((p) => p.key === k.phase)?.label || k.phase}
                </span>
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <select value={k.owner_kuerzel || ''} onChange={(e) => ownerAendern(k.id, e.target.value)}>
                  <option value="">–</option>
                  {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>)}
                </select>
              </td>
              <td onClick={() => navigate(`/kontakte/${k.id}`)}>{k.tage_in_phase}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
