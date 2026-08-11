import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

const PHASEN = ['unbearbeitet', 'in_kontakt', 'termin', 'angebot', 'auftrag'];
const PHASEN_LABEL = { unbearbeitet: 'Unbearbeitet', in_kontakt: 'In Kontakt', termin: 'Termin', angebot: 'Angebot', auftrag: 'Auftrag' };
const ABSAGEGRUENDE = ['kein Interesse', 'keine Rückmeldung', 'Falsche Zielgruppe', 'Multiplikator', 'Berufswechsel'];

// Editierbares Textfeld: zeigt den Wert an, wird bei Klick zum Eingabefeld (onBlur speichert).
function Feld({ label, feld, wert, aendern, typ = 'text' }) {
  return (
    <div>
      <label>{label}</label>
      <input type={typ} defaultValue={wert || ''} style={{ width: '100%' }} onBlur={(e) => { if (e.target.value !== (wert || '')) aendern(feld, e.target.value || null); }} />
    </div>
  );
}

export default function ContactDetail() {
  const { id } = useParams();
  const [k, setK] = useState(null);
  const [bearbeiter, setBearbeiter] = useState([]);
  const [statusOptionen, setStatusOptionen] = useState([]);
  const [neuerText, setNeuerText] = useState('');

  function laden() { api.kontakt(id).then(setK); }
  useEffect(() => {
    laden();
    api.bearbeiter(true).then(setBearbeiter);
    api.statusOptionen().then(setStatusOptionen);
  }, [id]);

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
      <Link to="/" style={{ fontSize: 13, display: 'inline-block', marginBottom: 12 }}>← Zurück zur Liste</Link>
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
            <label>Status</label>
            <select value={k.ergebnis} onChange={(e) => feldAendern('ergebnis', e.target.value)}>
              {statusOptionen.map((s) => <option key={s.wert} value={s.wert}>{s.label}</option>)}
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
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <div>
            <p style={{ fontWeight: 600, marginTop: 0 }}>Firma</p>
            <div className="field-grid" style={{ gridTemplateColumns: '1fr' }}>
              <Feld label="Firma" feld="firma" wert={k.firma} aendern={feldAendern} />
              <Feld label="Zielgruppe" feld="zielgruppe" wert={k.zielgruppe} aendern={feldAendern} />
              <Feld label="Straße & Hausnummer" feld="strasse" wert={k.strasse} aendern={feldAendern} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Feld label="PLZ" feld="plz" wert={k.plz} aendern={feldAendern} />
                <Feld label="Ort" feld="ort" wert={k.ort} aendern={feldAendern} />
              </div>
              <Feld label="Land" feld="land" wert={k.land} aendern={feldAendern} />
              <Feld label="Internetseite" feld="website" wert={k.website} aendern={feldAendern} />
              <Feld label="Telefon Zentrale" feld="telefon_zentrale" wert={k.telefon_zentrale} aendern={feldAendern} />
              <Feld label="E-Mail Firma" feld="email_firma" wert={k.email_firma} aendern={feldAendern} />
              <Feld label="Quelle" feld="quelle" wert={k.quelle} aendern={feldAendern} />
              <Feld label="Persönliche Vertriebsstrategie" feld="vertriebsstrategie" wert={k.vertriebsstrategie} aendern={feldAendern} />
            </div>
          </div>

          <div>
            <p style={{ fontWeight: 600, marginTop: 0 }}>Ansprechpartner</p>
            <div className="field-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div>
                  <label>Anrede</label>
                  <select value={k.anrede || ''} onChange={(e) => feldAendern('anrede', e.target.value || null)}>
                    <option value="">–</option>
                    <option value="Herr">Herr</option>
                    <option value="Frau">Frau</option>
                    <option value="Divers">Divers</option>
                  </select>
                </div>
                <Feld label="Titel" feld="titel" wert={k.titel} aendern={feldAendern} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Feld label="Vorname" feld="vorname" wert={k.vorname} aendern={feldAendern} />
                <Feld label="Nachname" feld="nachname" wert={k.nachname} aendern={feldAendern} />
              </div>
              <Feld label="Rolle" feld="rolle" wert={k.rolle} aendern={feldAendern} />
              <Feld label="E-Mail" feld="email" wert={k.email} aendern={feldAendern} />
              <Feld label="Telefon" feld="telefon" wert={k.telefon} aendern={feldAendern} />
            </div>
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
