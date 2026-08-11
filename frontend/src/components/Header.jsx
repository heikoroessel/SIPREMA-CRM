import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

// Kopfleiste: Marke links, taegliche Punkteanzeige mittig-prominent (damit klar ist, dass die
// Kuerzel-Auswahl fuer eine korrekte Anzeige wichtig ist), Kuerzel-Auswahl + Zahnrad rechts.
export default function Header() {
  const [bearbeiter, setBearbeiter] = useState([]);
  const [kuerzel, setKuerzel] = useState(localStorage.getItem('kuerzel') || '');
  const [punkte, setPunkte] = useState(null);

  useEffect(() => {
    api.bearbeiter(true).then(setBearbeiter);
  }, []);

  useEffect(() => {
    if (kuerzel) {
      localStorage.setItem('kuerzel', kuerzel);
      api.meinePunkte(kuerzel, 'heute').then(setPunkte).catch(() => setPunkte(null));
    } else {
      setPunkte(null);
    }
  }, [kuerzel]);

  const anteil = punkte && punkte.soll > 0 ? Math.min(100, Math.round((punkte.ist / punkte.soll) * 100)) : 0;

  return (
    <div className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link to="/" className="brand"><span className="dot" /> SIPREMA CRM</Link>
        <Link to="/" className="nav-link">Kontakte</Link>
      </div>

      <div className="punkte-mittig">
        {kuerzel ? (
          punkte && (
            <>
              <span>Heute: <strong>{punkte.ist}</strong> / {punkte.soll} Soll</span>
              <div className="punkte-bar" style={{ width: 120 }}><div style={{ width: `${anteil}%` }} /></div>
            </>
          )
        ) : (
          <span style={{ color: 'var(--sp-amber)', fontSize: 13 }}>Wähle rechts dein Kürzel, um deinen Tagesfortschritt zu sehen</span>
        )}
      </div>

      <div className="punkte-badge">
        <select value={kuerzel} onChange={(e) => setKuerzel(e.target.value)}>
          <option value="">Wer bist du?</option>
          {bearbeiter.map((b) => (
            <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>
          ))}
        </select>
        <Link to="/einstellungen" className="zahnrad" title="Einstellungen">⚙</Link>
      </div>
    </div>
  );
}
