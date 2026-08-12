import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useBearbeiterContext } from '../context/BearbeiterContext.jsx';

const KENNZAHLEN = [
  { feld: 'kontakte', label: 'Kontakte', manuell: true },
  { feld: 'termine', label: 'Termine' },
  { feld: 'angebote', label: 'Angebote' },
  { feld: 'auftraege', label: 'Aufträge' }
];

// Ein einzelner Balken (fuer Monat ODER Jahr): grauer Hintergrund = Ziel, gruene Fuellung =
// Ist-Stand, kleiner Dreieck-Pfeil = rechnerischer Soll-Stand "heute".
function Balken({ daten }) {
  const ziel = daten?.ziel || 0;
  const ist = daten?.ist || 0;
  const sollHeute = daten?.soll_heute || 0;
  const istAnteil = ziel > 0 ? Math.min(100, Math.round((ist / ziel) * 100)) : 0;
  const sollAnteil = ziel > 0 ? Math.min(100, Math.round((sollHeute / ziel) * 100)) : 0;

  return (
    <div className="kpi-bar-zeile">
      <div className="kpi-bar">
        <div className="kpi-bar-ist" style={{ width: `${istAnteil}%` }} />
        <div className="kpi-bar-pfeil" style={{ left: `${sollAnteil}%` }} title="Soll heute" />
      </div>
      <span className="kpi-bar-zahlen">{ist} <span className="kpi-box-ziel">/ {ziel}</span></span>
    </div>
  );
}

function KennzahlBox({ label, daten, manuell, kuerzel, onErgaenzt }) {
  const [ergaenzenOffen, setErgaenzenOffen] = useState(false);
  const [wert, setWert] = useState('');

  async function absenden(e) {
    e.preventDefault();
    const zahl = Number(wert);
    if (!zahl) return;
    await api.manuelleErgaenzung(kuerzel, 'kontakte', zahl);
    setWert('');
    setErgaenzenOffen(false);
    onErgaenzt();
  }

  return (
    <div className="kpi-box">
      <div className="kpi-box-kopf">
        <span className="kpi-box-label">{label}</span>
        {manuell && !ergaenzenOffen && (
          <span className="kpi-manuell-link" onClick={() => setErgaenzenOffen(true)}>+ manuelle Eingabe</span>
        )}
        {manuell && ergaenzenOffen && (
          <form onSubmit={absenden} style={{ display: 'flex', gap: 4 }}>
            <input
              type="number" autoFocus placeholder="Anzahl" style={{ width: 60, padding: '2px 5px', fontSize: 12 }}
              value={wert} onChange={(e) => setWert(e.target.value)}
              onBlur={(e) => { if (wert) absenden(e); else setErgaenzenOffen(false); }}
            />
          </form>
        )}
      </div>
      <div className="kpi-zeilen-label">Monat</div>
      <Balken daten={daten?.monat} />
      <div className="kpi-zeilen-label">Jahr</div>
      <Balken daten={daten?.jahr} />
    </div>
  );
}

export default function Header() {
  const { kuerzel, setKuerzel, bearbeiter } = useBearbeiterContext();
  const [punkte, setPunkte] = useState(null);

  function laden() {
    if (kuerzel) api.meinePunkte(kuerzel).then(setPunkte).catch(() => setPunkte(null));
    else setPunkte(null);
  }
  useEffect(laden, [kuerzel]);

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
            <KennzahlBox key={k.feld} label={k.label} daten={punkte?.[k.feld]} manuell={k.manuell} kuerzel={kuerzel} onErgaenzt={laden} />
          ))}
        </div>
      )}
    </div>
  );
}
