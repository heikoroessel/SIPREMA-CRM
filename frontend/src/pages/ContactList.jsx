import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useBearbeiterContext } from '../context/BearbeiterContext.jsx';
import NeuerKontaktModal from '../components/NeuerKontaktModal.jsx';

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
// nurVollstaendig: true -> Spalte wird in der Bearbeiterliste ausgeblendet (reduzierter Umfang).
const SPALTEN = [
  { feld: 'zielgruppe', label: 'Zielgruppe', typ: 'auswahl', mobil: false, nurVollstaendig: true },
  { feld: 'firma', label: 'Firma', typ: 'text', mobil: true },
  { feld: 'plz', label: 'PLZ', typ: 'text', mobil: false, nurVollstaendig: true },
  { feld: 'ort', label: 'Ort', typ: 'text', mobil: true, nurVollstaendig: true },
  { feld: 'anrede', label: 'Anrede', typ: 'auswahl', mobil: false, nurVollstaendig: true },
  { feld: 'vorname', label: 'Vorname', typ: 'text', mobil: true },
  { feld: 'nachname', label: 'Nachname', typ: 'text', mobil: true },
  { feld: 'quelle', label: 'Quelle', typ: 'auswahl', mobil: false },
  { feld: 'wiedervorlage', label: 'Wiedervorlage', typ: 'keiner', mobil: false },
  { feld: 'owner_kuerzel', label: 'Owner', typ: 'bearbeiter', mobil: true }
];

export default function ContactList() {
  const navigate = useNavigate();
  const { kuerzel, bearbeiter } = useBearbeiterContext();
  const [ansicht, setAnsicht] = useState('bearbeiter'); // 'bearbeiter' | 'vollstaendig'
  const [zaehler, setZaehler] = useState({ phasen: {}, nicht_zugewiesen: 0 });
  const [phase, setPhase] = useState('');
  const [nurNichtZugewiesen, setNurNichtZugewiesen] = useState(false);
  const [spaltenFilter, setSpaltenFilter] = useState({});
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [ausgewaehlt, setAusgewaehlt] = useState(new Set());
  const [werte, setWerte] = useState({});
  const [sortSpalte, setSortSpalte] = useState(null);
  const [sortRichtung, setSortRichtung] = useState('auf');
  const [neuerKontaktOffen, setNeuerKontaktOffen] = useState(false);

  const istBearbeiterAnsicht = ansicht === 'bearbeiter' && !!kuerzel;
  const sichtbareSpalten = SPALTEN.filter((s) => !(istBearbeiterAnsicht && s.nurVollstaendig));

  useEffect(() => {
    api.kontaktZaehler().then(setZaehler);
    Promise.all(['zielgruppe', 'quelle', 'anrede'].map((f) => api.werte(f).then((v) => [f, v])))
      .then((paare) => setWerte(Object.fromEntries(paare)));
  }, []);

  function baueParams() {
    const params = { pageSize: 200 };
    if (istBearbeiterAnsicht) {
      params.owner = kuerzel;
      params.sortierung = 'prioritaet';
      params.ohne_verloren = 'true';
    } else {
      if (phase) params.phase = phase;
      if (spaltenFilter.owner_kuerzel) params.owner = spaltenFilter.owner_kuerzel;
      else if (nurNichtZugewiesen) params.owner = 'none';
    }

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
  }, [ansicht, kuerzel, phase, nurNichtZugewiesen, JSON.stringify(spaltenFilter)]);

  function filterAendern(feld, wert) {
    setSpaltenFilter((prev) => ({ ...prev, [feld]: wert }));
  }

  function sortiereNach(spalte) {
    if (istBearbeiterAnsicht) return; // Bearbeiterliste hat feste Prioritaets-Sortierung
    if (sortSpalte === spalte) setSortRichtung((r) => (r === 'auf' ? 'ab' : 'auf'));
    else { setSortSpalte(spalte); setSortRichtung('auf'); }
  }

  const angezeigteItems = istBearbeiterAnsicht || !sortSpalte
    ? items
    : [...items].sort((a, b) => {
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
    await api.kontaktAendern(id, { owner_kuerzel: owner_kuerzel || null, geaendert_von: kuerzel });
    await neuLaden();
    api.kontaktZaehler().then(setZaehler);
  }

  async function sammelZuweisen(owner_kuerzel) {
    if (!ausgewaehlt.size) return;
    await api.bulkZuweisen({ ids: [...ausgewaehlt], owner_kuerzel: owner_kuerzel || null });
    await neuLaden();
    setAusgewaehlt(new Set());
    api.kontaktZaehler().then(setZaehler);
  }

  async function kontaktLoeschen(id, firma) {
    if (!confirm(`Kontakt "${firma || id}" wirklich unwiderruflich löschen (inkl. Aktivitäten-Historie)?`)) return;
    await api.kontaktLoeschen(id);
    await neuLaden();
    api.kontaktZaehler().then(setZaehler);
  }

  function pfeil(spalte) {
    if (istBearbeiterAnsicht || sortSpalte !== spalte) return '';
    return sortRichtung === 'auf' ? ' ▲' : ' ▼';
  }

  function exportieren() {
    const params = baueParams();
    delete params.pageSize;
    window.open(api.exportCsvUrl(params), '_blank');
  }

  return (
    <div>
      <div className="listen-kopf">
        <button
          className="secondary"
          onClick={() => setAnsicht((a) => (a === 'bearbeiter' ? 'vollstaendig' : 'bearbeiter'))}
          disabled={!kuerzel}
          title={!kuerzel ? 'Erst oben dein Kürzel wählen' : ''}
        >
          {ansicht === 'bearbeiter' ? 'Vollständige Liste anzeigen' : '← Zurück zur Bearbeiterliste'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={exportieren}>CSV Export</button>
          <button className="primary" onClick={() => setNeuerKontaktOffen(true)}>+ Neuer Kontakt</button>
        </div>
      </div>

      {!istBearbeiterAnsicht && (
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
      )}

      {istBearbeiterAnsicht && (
        <p style={{ fontSize: 13, color: 'var(--sp-text-muted)', marginTop: 0 }}>
          Deine Kontakte, sortiert nach Priorität: fällige Wiedervorlagen zuerst, dann Angebot → Termin → In Kontakt → Unbearbeitet.
        </p>
      )}

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
              <th style={{ cursor: istBearbeiterAnsicht ? 'default' : 'pointer' }} onClick={() => sortiereNach('phase')}>Phase{pfeil('phase')}</th>
              <th style={{ cursor: istBearbeiterAnsicht ? 'default' : 'pointer' }} onClick={() => sortiereNach('ergebnis')}>Status{pfeil('ergebnis')}</th>
              {sichtbareSpalten.map((s) => (
                <th key={s.feld} className={s.mobil ? '' : 'col-hide-mobile'} style={{ cursor: istBearbeiterAnsicht ? 'default' : 'pointer' }} onClick={() => sortiereNach(s.feld)}>{s.label}{pfeil(s.feld)}</th>
              ))}
              <th className="col-hide-mobile" style={{ cursor: istBearbeiterAnsicht ? 'default' : 'pointer' }} onClick={() => sortiereNach('tage_in_phase')}>Tage in Phase{pfeil('tage_in_phase')}</th>
              {!istBearbeiterAnsicht && <th style={{ width: 36 }}></th>}
            </tr>
            <tr>
              <th></th>
              <th></th>
              <th></th>
              {sichtbareSpalten.map((s) => (
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
                  {s.typ === 'bearbeiter' && !istBearbeiterAnsicht && (
                    <select style={{ width: '100%' }} value={spaltenFilter[s.feld] || ''} onChange={(e) => filterAendern(s.feld, e.target.value)}>
                      <option value="">Alle</option>
                      {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>)}
                    </select>
                  )}
                </th>
              ))}
              <th className="col-hide-mobile"></th>
              {!istBearbeiterAnsicht && <th></th>}
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
                {sichtbareSpalten.map((s) => {
                  if (s.feld === 'owner_kuerzel') {
                    return (
                      <td key={s.feld} className={s.mobil ? '' : 'col-hide-mobile'} onClick={(e) => e.stopPropagation()}>
                        <select value={k.owner_kuerzel || ''} onChange={(e) => ownerAendern(k.id, e.target.value)}>
                          <option value="">–</option>
                          {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>)}
                        </select>
                      </td>
                    );
                  }
                  if (s.feld === 'wiedervorlage') {
                    return (
                      <td key={s.feld} className={s.mobil ? '' : 'col-hide-mobile'} onClick={() => navigate(`/kontakte/${k.id}`)}>
                        {k.wiedervorlage ? new Date(k.wiedervorlage).toLocaleDateString('de-DE') : '–'}
                      </td>
                    );
                  }
                  return (
                    <td key={s.feld} className={s.mobil ? '' : 'col-hide-mobile'} onClick={() => navigate(`/kontakte/${k.id}`)}>
                      {k[s.feld] || '–'}
                    </td>
                  );
                })}
                <td className="col-hide-mobile" onClick={() => navigate(`/kontakte/${k.id}`)}>{k.tage_in_phase}</td>
                {!istBearbeiterAnsicht && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="loesch-knopf" title="Kontakt löschen" onClick={() => kontaktLoeschen(k.id, k.firma)}>🗑</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {neuerKontaktOffen && (
        <NeuerKontaktModal
          onClose={() => setNeuerKontaktOffen(false)}
          onAngelegt={(neu) => { setNeuerKontaktOffen(false); navigate(`/kontakte/${neu.id}`); }}
        />
      )}
    </div>
  );
}
