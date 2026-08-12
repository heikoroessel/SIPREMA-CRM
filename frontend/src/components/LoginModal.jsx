import { useBearbeiterContext } from '../context/BearbeiterContext.jsx';

// Exponiertes Pop-up beim Start: solange kein Kuerzel gewaehlt ist, blockiert dieses Modal
// die App, damit die Auswahl nicht vergessen wird (Bearbeiterliste + Punkte-Anzeige
// funktionieren erst danach sinnvoll).
export default function LoginModal() {
  const { kuerzel, setKuerzel, bearbeiter } = useBearbeiterContext();

  if (kuerzel) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <p style={{ fontWeight: 600, fontSize: 16, marginTop: 0 }}>Wer bist du?</p>
        <p style={{ fontSize: 13, color: 'var(--sp-text-muted)', marginTop: -8 }}>
          Wähle dein Kürzel, um deine Kontakte und deinen Fortschritt zu sehen.
        </p>
        <div className="login-modal-optionen">
          {bearbeiter.map((b) => (
            <button key={b.kuerzel} className="login-modal-option" onClick={() => setKuerzel(b.kuerzel)}>
              {b.kuerzel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
