import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useBearbeiterContext } from '../context/BearbeiterContext.jsx';

// Login-Pop-up: blockiert die App, solange keine gueltige Session besteht. Dient gleichzeitig
// als Identitaets-Auswahl (das Kuerzel aus dem Login steuert danach z.B. die Bearbeiterliste) -
// ein separates "Wer bist du?"-Fenster gibt es dadurch nicht mehr.
export default function LoginModal() {
  const { kuerzel, token, bearbeiter, login } = useBearbeiterContext();
  const [gewaehlt, setGewaehlt] = useState('');
  const [hatPasswort, setHatPasswort] = useState(null); // null = noch unbekannt
  const [passwort, setPasswort] = useState('');
  const [passwortWiederholung, setPasswortWiederholung] = useState('');
  const [fehler, setFehler] = useState('');
  const [ladeStatus, setLadeStatus] = useState(false);

  useEffect(() => {
    setPasswort(''); setPasswortWiederholung(''); setFehler(''); setHatPasswort(null);
    if (gewaehlt) {
      api.authStatus(gewaehlt).then((r) => setHatPasswort(r.hat_passwort)).catch(() => setHatPasswort(null));
    }
  }, [gewaehlt]);

  if (kuerzel && token) return null;

  async function absenden(e) {
    e.preventDefault();
    setFehler('');
    if (hatPasswort === false && passwort !== passwortWiederholung) {
      setFehler('Die beiden Passwörter stimmen nicht überein.');
      return;
    }
    if (passwort.length < 4) {
      setFehler('Das Passwort muss mindestens 4 Zeichen haben.');
      return;
    }
    setLadeStatus(true);
    try {
      await login(gewaehlt, passwort);
    } catch (err) {
      setFehler(err.message === 'Falsches Passwort' ? 'Falsches Passwort.' : 'Anmeldung fehlgeschlagen.');
    } finally {
      setLadeStatus(false);
    }
  }

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <p style={{ fontWeight: 600, fontSize: 16, marginTop: 0 }}>Anmelden</p>

        {!gewaehlt && (
          <>
            <p style={{ fontSize: 13, color: 'var(--sp-text-muted)', marginTop: -8 }}>Wähle dein Kürzel.</p>
            <div className="login-modal-optionen">
              {bearbeiter.map((b) => (
                <button key={b.kuerzel} className="login-modal-option" onClick={() => setGewaehlt(b.kuerzel)}>
                  {b.kuerzel}
                </button>
              ))}
            </div>
          </>
        )}

        {gewaehlt && hatPasswort !== null && (
          <form onSubmit={absenden}>
            <p style={{ fontSize: 13, color: 'var(--sp-text-muted)', marginTop: -8 }}>
              {hatPasswort
                ? <>Angemeldet als <strong>{gewaehlt}</strong> – Passwort eingeben.</>
                : <>Noch kein Passwort für <strong>{gewaehlt}</strong> gesetzt – jetzt eins vergeben.</>}
            </p>
            <div className="field-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div>
                <label>Passwort</label>
                <input type="password" style={{ width: '100%' }} value={passwort} onChange={(e) => setPasswort(e.target.value)} autoFocus />
              </div>
              {hatPasswort === false && (
                <div>
                  <label>Passwort wiederholen</label>
                  <input type="password" style={{ width: '100%' }} value={passwortWiederholung} onChange={(e) => setPasswortWiederholung(e.target.value)} />
                </div>
              )}
            </div>
            {fehler && <p style={{ color: 'var(--sp-red)', fontSize: 13 }}>{fehler}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 16 }}>
              <button type="button" className="secondary" onClick={() => setGewaehlt('')}>← Anderes Kürzel</button>
              <button type="submit" className="primary" disabled={ladeStatus || !passwort}>
                {ladeStatus ? 'Bitte warten …' : hatPasswort ? 'Anmelden' : 'Passwort festlegen'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
