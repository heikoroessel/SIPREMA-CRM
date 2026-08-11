import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

const PHASEN = ['unbearbeitet', 'in_kontakt', 'termin', 'angebot', 'auftrag'];
const PHASEN_LABEL = { unbearbeitet: 'Unbearbeitet', in_kontakt: 'In Kontakt', termin: 'Termin', angebot: 'Angebot', auftrag: 'Auftrag' };
const ABSAGEGRUENDE = ['kein Interesse', 'keine Rückmeldung', 'Falsche Zielgruppe', 'Multiplikator', 'Berufswechsel'];

export default function ContactDetail() {
  const { id } = useParams();
  const [k, setK] = useState(null);
  const [bearbeiter, setBearbeiter] = useState([]);
  const [neuerText, setNeuerText] = useState('');

  function laden() { api.kontakt(id).then(setK); }
  useEffect(() => { laden(); api.bearbeiter(true).then(setBearbeiter); }, [id]);

  if (!k) return <p>Lädt …</p>;

  const aktuellerIndex = PHASEN.indexOf(k.phase);

  async function feldAendern(feld, wert) {
    const aktualisiert = await api.kontaktAendern(id, { [feld]: wert, geaendert_von: localStorage.getItem('kuerzel') });
    setK((prev) => ({ ...prev, ...aktualisiert }));
  }

  async function notizSpeichern() {
    if (!neuerText.trim()) return;
    const autor = localStorage.getItem('kuerzel');
    if (!autor) { alert('Bitte oben rechts erst dein Kürzel auswählen.'); return; }
    await api.aktivitaetAnlegen(id, { autor_kuerzel: autor, text: neuerText.trim() });
    setNeuerText('');
    laden();
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>{k.firma}</p>
        <p style={{ color: 'var(--sp-text-muted)', fontSize: 13, margin: 0 }}>{k.ort} · {k.zielgruppe} · Owner {k.owner_kuerzel || '– nicht zugewiesen –'}</p>
      </div>

      <div className="card">
        <div className="stepper">
          {PHASEN.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <div className={`line ${i <= aktuellerIndex ? 'done' : ''}`} />}
              <div className="step" onClick={() => feldAendern('phase', p)} style={{ cursor: 'pointer' }}>
                <div className={`dot ${i < aktuellerIndex ? 'done' : ''} ${i === aktuellerIndex ? 'current' : ''}`} />
                <div className="label">{PHASEN_LABEL[p]}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="field-grid">
          <div>
            <label>Ergebnis</label>
            <select value={k.ergebnis} onChange={(e) => feldAendern('ergebnis', e.target.value)}>
              <option value="offen">Offen</option>
              <option value="verloren">Verloren</option>
              <option value="ruht">Ruht</option>
            </select>
          </div>
          {k.ergebnis === 'verloren' && (
            <div>
              <label>Absagegrund</label>
              <select value={k.absagegrund || ''} onChange={(e) => feldAendern('absagegrund', e.target.value)}>
                <option value="">–</option>
                {ABSAGEGRUENDE.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}
          <div>
            <label>Owner</label>
            <select value={k.owner_kuerzel || ''} onChange={(e) => feldAendern('owner_kuerzel', e.target.value || null)}>
              <option value="">–</option>
              {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>)}
            </select>
          </div>
          <div>
            <label>Wiedervorlage</label>
            <input type="date" value={k.wiedervorlage ? k.wiedervorlage.slice(0, 10) : ''} onChange={(e) => feldAendern('wiedervorlage', e.target.value || null)} />
          </div>
          <div>
            <label>Pilotprojekt</label>
            <input type="checkbox" checked={k.pilotprojekt} onChange={(e) => feldAendern('pilotprojekt', e.target.checked)} />
          </div>
          <div>
            <label>Ansprechpartner</label>
            <span>{[k.anrede, k.titel, k.vorname, k.nachname].filter(Boolean).join(' ')} {k.rolle ? `– ${k.rolle}` : ''}</span>
          </div>
          <div>
            <label>Kontakt</label>
            <span>{k.email || '–'} · {k.telefon || '–'}</span>
          </div>
          <div>
            <label>Adresse</label>
            <span>{k.strasse}, {k.plz} {k.ort}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <p style={{ color: 'var(--sp-text-muted)', fontSize: 13, marginTop: 0 }}>Aktivitäten</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <textarea rows={2} style={{ flex: 1 }} placeholder="Neue Notiz (Anruf, Mail, Gespräch ...)" value={neuerText} onChange={(e) => setNeuerText(e.target.value)} />
          <button className="primary" onClick={notizSpeichern}>Speichern</button>
        </div>
        {k.aktivitaeten.map((a) => (
          <div className="aktivitaet" key={a.id}>
            <span className="meta">{new Date(a.erstellt_am).toLocaleDateString('de-DE')} · {a.autor_kuerzel || 'Import'}</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
