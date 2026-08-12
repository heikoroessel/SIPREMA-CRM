import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useBearbeiterContext } from '../context/BearbeiterContext.jsx';

const KENNZAHLEN = [
  { feld: 'kontakte', label: 'Kontakte' },
  { feld: 'termine', label: 'Termine' },
  { feld: 'angebote', label: 'Angebote' },
  { feld: 'auftraege', label: 'Aufträge' }
];

// Ein Kennzahl-Balken: grauer Hintergrund = Monatsziel, gruene Fuellung = Ist-Stand,
// kleiner Dreieck-Pfeil = rechnerischer Soll-Stand "heute" (1/20 des Monatsziels pro Kalendertag).
function KennzahlBox({ label, daten }) {
  const ziel = daten?.ziel || 0;
  const ist = daten?.ist || 0;
  const sollHeute = daten?.soll_heute || 0;
  const istAnteil = ziel > 0 ? Math.min(100, Math.round((ist / ziel) * 100)) : 0;
  const sollAnteil = ziel > 0 ? Math.min(100, Math.round((sollHeute / ziel) * 100)) : 0;

  return (
    <div className="kpi-box">
      <div className="kpi-box-kopf">
        <span className="kpi-box-label">{label}</span>
        <span className="kpi-box-zahlen">{ist} <span className="kpi-box-ziel">/ {ziel}</span></span>
      </div>
      <div className="kpi-bar">
        <div className="kpi-bar-ist" style={{ width: `${istAnteil}%` }} />
        <div className="kpi-bar-pfeil" style={{ left: `${sollAnteil}%` }} title="Soll heute" />
      </div>
    </div>
  );
}

export default function Header() {
  const { kuerzel, setKuerzel, bearbeiter } = useBearbeiterContext();
  const [punkte, setPunkte] = useState(null);

  useEffect(() => {
    if (kuerzel) {
      api.meinePunkte(kuerzel).then(setPunkte).catch(() => setPunkte(null));
    } else {
      setPunkte(null);
    }
  }, [kuerzel]);

  return (
    <div className="app-header">
      <div className="app-header-zeile1">
        <Link to="/" className="brand"><span className="dot" /> SIPREMA CRM</Link>
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

      {kuerzel && (
        <div className="kpi-row">
          {KENNZAHLEN.map((k) => (
            <KennzahlBox key={k.feld} label={k.label} daten={punkte?.[k.feld]} />
          ))}
        </div>
      )}
    </div>
  );
}
