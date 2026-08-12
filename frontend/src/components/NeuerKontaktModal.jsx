import { useState } from 'react';
import { api } from '../api.js';
import { useBearbeiterContext } from '../context/BearbeiterContext.jsx';

// Formular zum manuellen Anlegen eines einzelnen Kontakts (Ergaenzung zum Excel-Import).
export default function NeuerKontaktModal({ onClose, onAngelegt }) {
  const { kuerzel } = useBearbeiterContext();
  const [firma, setFirma] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [ort, setOrt] = useState('');
  const [plz, setPlz] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [speichern, setSpeichern] = useState(false);

  async function anlegen() {
    if (!firma.trim()) return;
    setSpeichern(true);
    const neu = await api.kontaktAnlegen({
      firma: firma.trim(),
      vorname: vorname.trim() || null,
      nachname: nachname.trim() || null,
      ort: ort.trim() || null,
      plz: plz.trim() || null,
      email: email.trim() || null,
      telefon: telefon.trim() || null,
      owner_kuerzel: kuerzel || null,
      import_quelle: 'manuell'
    });
    setSpeichern(false);
    onAngelegt(neu);
  }

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontWeight: 600, fontSize: 16, marginTop: 0 }}>Neuer Kontakt</p>
        <div className="field-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div>
            <label>Firma *</label>
            <input type="text" style={{ width: '100%' }} value={firma} onChange={(e) => setFirma(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label>Vorname</label>
              <input type="text" style={{ width: '100%' }} value={vorname} onChange={(e) => setVorname(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Nachname</label>
              <input type="text" style={{ width: '100%' }} value={nachname} onChange={(e) => setNachname(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 100 }}>
              <label>PLZ</label>
              <input type="text" style={{ width: '100%' }} value={plz} onChange={(e) => setPlz(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Ort</label>
              <input type="text" style={{ width: '100%' }} value={ort} onChange={(e) => setOrt(e.target.value)} />
            </div>
          </div>
          <div>
            <label>E-Mail</label>
            <input type="text" style={{ width: '100%' }} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label>Telefon</label>
            <input type="text" style={{ width: '100%' }} value={telefon} onChange={(e) => setTelefon(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="secondary" onClick={onClose}>Abbrechen</button>
          <button className="primary" disabled={!firma.trim() || speichern} onClick={anlegen}>
            {speichern ? 'Speichert …' : 'Anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}
