import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [bearbeiter, setBearbeiter] = useState([]);
  const [gewichtung, setGewichtung] = useState([]);
  const [neuKuerzel, setNeuKuerzel] = useState('');
  const [neuName, setNeuName] = useState('');
  const [neuStunden, setNeuStunden] = useState(40);
  const [importStatus, setImportStatus] = useState('');

  function laden() {
    api.bearbeiter().then(setBearbeiter);
    api.punkteGewichtung().then(setGewichtung);
  }
  useEffect(laden, []);

  async function bearbeiterAnlegen() {
    if (!neuKuerzel || !neuName) return;
    await api.bearbeiterAnlegen({ kuerzel: neuKuerzel, name: neuName, stunden_pro_woche: Number(neuStunden) });
    setNeuKuerzel(''); setNeuName(''); setNeuStunden(40);
    laden();
  }

  async function bearbeiterAendern(kuerzel, feld, wert) {
    await api.bearbeiterAendern(kuerzel, { [feld]: wert });
    laden();
  }

  async function gewichtungAendern(ereignis, punkte) {
    await api.punkteGewichtungAendern(ereignis, Number(punkte));
    laden();
  }

  async function importieren(e) {
    const datei = e.target.files[0];
    if (!datei) return;
    setImportStatus('Import läuft …');
    const form = new FormData();
    form.append('datei', datei);
    const res = await fetch('/api/import/masterliste', { method: 'POST', body: form });
    const json = await res.json();
    setImportStatus(res.ok
      ? `${json.importiert} Kontakte importiert (${json.uebersprungen} übersprungen von ${json.gesamt}).`
      : `Fehler: ${json.error || 'unbekannt'}`);
  }

  return (
    <div>
      <div className="card">
        <p style={{ fontWeight: 600, marginTop: 0 }}>Bearbeiter verwalten</p>
        <table>
          <thead><tr><th>Kürzel</th><th>Name</th><th>Std./Woche</th><th>Aktiv</th></tr></thead>
          <tbody>
            {bearbeiter.map((b) => (
              <tr key={b.kuerzel}>
                <td>{b.kuerzel}</td>
                <td><input type="text" defaultValue={b.name} onBlur={(e) => bearbeiterAendern(b.kuerzel, 'name', e.target.value)} /></td>
                <td><input type="text" defaultValue={b.stunden_pro_woche} style={{ width: 60 }} onBlur={(e) => bearbeiterAendern(b.kuerzel, 'stunden_pro_woche', Number(e.target.value))} /></td>
                <td><input type="checkbox" checked={b.aktiv} onChange={(e) => bearbeiterAendern(b.kuerzel, 'aktiv', e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="text" placeholder="Kürzel" style={{ width: 80 }} value={neuKuerzel} onChange={(e) => setNeuKuerzel(e.target.value)} />
          <input type="text" placeholder="Name" value={neuName} onChange={(e) => setNeuName(e.target.value)} />
          <input type="text" placeholder="Std./Woche" style={{ width: 100 }} value={neuStunden} onChange={(e) => setNeuStunden(e.target.value)} />
          <button className="primary" onClick={bearbeiterAnlegen}>Hinzufügen</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--sp-text-muted)' }}>
          Deaktivierte Bearbeiter verschwinden aus den Zuweisungs-Dropdowns, bleiben aber in der Aktivitäten-Historie sichtbar.
          Alle Kontakte eines Bearbeiters übertragen: in der Kontaktliste nach "Owner" filtern, alle auswählen, neu zuweisen.
        </p>
      </div>

      <div className="card">
        <p style={{ fontWeight: 600, marginTop: 0 }}>Punkte-Gewichtung</p>
        <table>
          <thead><tr><th>Ereignis</th><th>Punkte</th></tr></thead>
          <tbody>
            {gewichtung.map((g) => (
              <tr key={g.ereignis}>
                <td>{g.ereignis}</td>
                <td><input type="text" defaultValue={g.punkte} style={{ width: 60 }} onBlur={(e) => gewichtungAendern(g.ereignis, e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <p style={{ fontWeight: 600, marginTop: 0 }}>Masterliste importieren</p>
        <input type="file" accept=".xlsx" onChange={importieren} />
        {importStatus && <p style={{ fontSize: 13 }}>{importStatus}</p>}
      </div>
    </div>
  );
}
