import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [bearbeiter, setBearbeiter] = useState([]);
  const [gewichtung, setGewichtung] = useState([]);
  const [neuKuerzel, setNeuKuerzel] = useState('');
  const [neuName, setNeuName] = useState('');
  const [neuStunden, setNeuStunden] = useState(40);
  const [importStatus, setImportStatus] = useState('');
  const [vonOwner, setVonOwner] = useState('');
  const [zuOwner, setZuOwner] = useState('');
  const [uebernahmeStatus, setUebernahmeStatus] = useState('');

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

  async function kontakteUebertragen() {
    if (!vonOwner || !zuOwner) return;
    setUebernahmeStatus('Übertrage …');
    const res = await api.bulkZuweisen({ von_owner: vonOwner, owner_kuerzel: zuOwner });
    setUebernahmeStatus(`${res.aktualisiert} Kontakte von ${vonOwner} an ${zuOwner} übertragen.`);
    setVonOwner(''); setZuOwner('');
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

  async function alleLoeschen() {
    if (!confirm('Wirklich ALLE Kontakte, Aktivitäten und die Phasen-Historie unwiderruflich löschen? Sinnvoll vor einem sauberen Re-Import.')) return;
    const res = await api.alleKontakteLoeschen();
    setImportStatus(`${res.geloescht} Kontakte gelöscht. Du kannst jetzt sauber neu importieren.`);
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
        </p>

        <p style={{ fontWeight: 600, marginTop: 20, marginBottom: 6, fontSize: 13 }}>Alle Kontakte übertragen</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={vonOwner} onChange={(e) => setVonOwner(e.target.value)}>
            <option value="">Von …</option>
            {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}{!b.aktiv ? ' (inaktiv)' : ''}</option>)}
          </select>
          <span style={{ fontSize: 13 }}>→</span>
          <select value={zuOwner} onChange={(e) => setZuOwner(e.target.value)}>
            <option value="">An …</option>
            {bearbeiter.map((b) => <option key={b.kuerzel} value={b.kuerzel}>{b.kuerzel}{!b.aktiv ? ' (inaktiv)' : ''}</option>)}
          </select>
          <button className="primary" onClick={kontakteUebertragen} disabled={!vonOwner || !zuOwner}>Übertragen</button>
        </div>
        {uebernahmeStatus && <p style={{ fontSize: 13 }}>{uebernahmeStatus}</p>}
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
        <p style={{ fontSize: 12, color: 'var(--sp-text-muted)', marginTop: 16 }}>
          Bei mehrfachem Import entstehen Duplikate, da noch keine automatische Duplikat-Erkennung
          läuft (kommt in Phase 2). Für einen sauberen Neustart:
        </p>
        <button className="secondary" onClick={alleLoeschen}>Alle Kontakte löschen (Reset)</button>
      </div>
    </div>
  );
}
