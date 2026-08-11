import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Kopfleiste: Kuerzel-Auswahl (ohne Passwort, wird lokal gemerkt) + taegliche Punkteanzeige.
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
    }
  }, [kuerzel]);

  const anteil = punkte && punkte.soll > 0 ? Math.min(100, Math.round((punkte.ist / punkte.soll) * 100)) : 0;

  return (
    <div className="app-header">
      <div className="brand"><span className="dot" /> SIPREMA CRM</div>
      <div className="punkte-badge">
        {punkte && (
          <>
            <span>Heute: <strong>{punkte.ist}</strong> / {punkte.soll} Soll</span>
            <div className="punkte-bar"><div style={{ width: `${anteil}%` }} /></div>
          </>
        )}
        <select value={kuerzel} onChange={(e) => setKuerzel(e.target.value)}>
          <option value="">Wer bist du?</option>
          {bearbeiter.map((b) => (
            <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
