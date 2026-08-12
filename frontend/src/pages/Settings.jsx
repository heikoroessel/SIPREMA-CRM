import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useBearbeiterContext } from '../context/BearbeiterContext.jsx';

export default function Settings() {
  const { kuerzel } = useBearbeiterContext();
  const [bearbeiter, setBearbeiter] = useState([]);
  const [neuKuerzel, setNeuKuerzel] = useState('');
  const [neuName, setNeuName] = useState('');
  const [neuStunden, setNeuStunden] = useState(40);
  const [importStatus, setImportStatus] = useState('');
  const [vonOwner, setVonOwner] = useState('');
  const [zuOwner, setZuOwner] = useState('');
  const [uebernahmeStatus, setUebernahmeStatus] = useState('');
  const [statusOptionen, setStatusOptionen] = useState([]);
  const [neuerStatusWert, setNeuerStatusWert] = useState('');
  const [neuerStatusLabel, setNeuerStatusLabel] = useState('');
  const [zaehlStart, setZaehlStart] = useState('');
  const [istWerte, setIstWerte] = useState({});

  const KENNZAHLEN_SETTINGS = [
    { feld: 'kontakte', label: 'Kontakte' },
    { feld: 'termine', label: 'Termine' },
    { feld: 'angebote', label: 'Angebote' },
    { feld: 'auftraege', label: 'Aufträge' }
  ];

  function laden() {
    if (!kuerzel) return;
    api.bearbeiter().then((liste) => {
      setBearbeiter(liste);
      Promise.all(liste.map((b) => api.meinePunkte(b.kuerzel).then((p) => [b.kuerzel, p])))
        .then((paare) => setIstWerte(Object.fromEntries(paare)));
    });
    api.statusOptionen().then(setStatusOptionen);
    api.firmaEinstellungen().then((e) => setZaehlStart(e.zaehl_start_datum || ''));
  }
  useEffect(laden, [kuerzel]);

  // Ist-Wert (Monat) manuell korrigieren: Differenz zum aktuell berechneten Wert wird als
  // "manuelle Ergaenzung" von heute gespeichert (gleicher Mechanismus wie die manuelle
  // Kontakte-Eingabe in der Kopfzeile) - wirkt dadurch auch auf den Jahreswert mit.
  async function istKorrigieren(kuerzel, kennzahl, neuerWert) {
    const aktuell = istWerte[kuerzel]?.[kennzahl]?.monat?.ist || 0;
    const delta = Number(neuerWert) - aktuell;
    if (!delta) return;
    await api.manuelleErgaenzung(kuerzel, kennzahl, delta);
    laden();
  }

  async function zaehlStartAendern(wert) {
    await api.firmaEinstellungAendern('zaehl_start_datum', wert);
    laden();
  }

  async function statusOptionAnlegen() {
    if (!neuerStatusWert || !neuerStatusLabel) return;
    await api.statusOptionAnlegen(neuerStatusWert, neuerStatusLabel);
    setNeuerStatusWert(''); setNeuerStatusLabel('');
    laden();
  }

  async function statusOptionLoeschen(wert) {
    if (!confirm(`Status "${wert}" wirklich löschen? Kontakte, die diesen Status haben, behalten ihn als Wert, er erscheint dann aber nicht mehr in der Auswahl.`)) return;
    await api.statusOptionLoeschen(wert);
    laden();
  }

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

  async function passwortZuruecksetzen(kuerzel) {
    if (!confirm(`Passwort von ${kuerzel} wirklich zurücksetzen? Beim nächsten Login muss ${kuerzel} ein neues Passwort vergeben.`)) return;
    await api.passwortZuruecksetzen(kuerzel);
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
    const res = await fetch('/api/import/masterliste', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('session_token') || ''}` },
      body: form
    });
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
        <p style={{ fontSize: 12, color: 'var(--sp-text-muted)', marginTop: 0 }}>
          Kontakte/Termine/Angebote/Aufträge sind die persönlichen <strong>Jahresziele</strong> – der Monatsbalken in der Kopfzeile zeigt automatisch Jahresziel ÷ 12. Zählung läuft seit {zaehlStart || '…'} (siehe unten), nicht rückwirkend.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Kürzel</th><th>Name</th><th>Std./Woche</th>
                {KENNZAHLEN_SETTINGS.map((k) => (
                  <th key={k.feld} colSpan={2}>{k.label}</th>
                ))}
                <th>Aktiv</th>
                <th>Passwort</th>
              </tr>
              <tr>
                <th></th><th></th><th></th>
                {KENNZAHLEN_SETTINGS.map((k) => (
                  <React.Fragment key={k.feld}>
                    <th style={{ fontWeight: 400 }}>Jahresziel</th>
                    <th style={{ fontWeight: 400 }}>Ist (Monat)</th>
                  </React.Fragment>
                ))}
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bearbeiter.map((b) => (
                <tr key={b.kuerzel}>
                  <td>{b.kuerzel}</td>
                  <td><input type="text" defaultValue={b.name} onBlur={(e) => bearbeiterAendern(b.kuerzel, 'name', e.target.value)} /></td>
                  <td><input type="text" defaultValue={b.stunden_pro_woche} style={{ width: 60 }} onBlur={(e) => bearbeiterAendern(b.kuerzel, 'stunden_pro_woche', Number(e.target.value))} /></td>
                  {KENNZAHLEN_SETTINGS.map((k) => (
                    <React.Fragment key={k.feld}>
                      <td>
                        <input
                          type="text" defaultValue={b[`ziel_${k.feld}`]}
                          style={{ width: 55 }}
                          onBlur={(e) => bearbeiterAendern(b.kuerzel, `ziel_${k.feld}`, Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="text" key={istWerte[b.kuerzel]?.[k.feld]?.monat?.ist}
                          defaultValue={istWerte[b.kuerzel]?.[k.feld]?.monat?.ist ?? 0}
                          style={{ width: 50 }}
                          onBlur={(e) => istKorrigieren(b.kuerzel, k.feld, e.target.value)}
                        />
                      </td>
                    </React.Fragment>
                  ))}
                  <td><input type="checkbox" checked={b.aktiv} onChange={(e) => bearbeiterAendern(b.kuerzel, 'aktiv', e.target.checked)} /></td>
                  <td><button className="secondary" onClick={() => passwortZuruecksetzen(b.kuerzel)}>Zurücksetzen</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: 'var(--sp-text-muted)', marginTop: 8 }}>
          "Ist (Monat)" zeigt den aktuell errechneten Monatswert und ist überschreibbar (z.B. zum Zurücksetzen in der Testphase) – die Korrektur wirkt automatisch auch auf den Jahreswert mit.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Kürzel" style={{ width: 80 }} value={neuKuerzel} onChange={(e) => setNeuKuerzel(e.target.value)} />
          <input type="text" placeholder="Name" value={neuName} onChange={(e) => setNeuName(e.target.value)} />
          <input type="text" placeholder="Std./Woche" style={{ width: 100 }} value={neuStunden} onChange={(e) => setNeuStunden(e.target.value)} />
          <button className="primary" onClick={bearbeiterAnlegen}>Hinzufügen</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--sp-text-muted)' }}>
          Deaktivierte Bearbeiter verschwinden aus den Zuweisungs-Dropdowns, bleiben aber in der Aktivitäten-Historie sichtbar.
        </p>
      </div>

      <div className="card">
        <p style={{ fontWeight: 600, marginTop: 0 }}>Reporting-Zählstart</p>
        <p style={{ fontSize: 12, color: 'var(--sp-text-muted)', marginTop: 0 }}>
          Ab diesem Datum zählen die Fortschrittsbalken (Monat + Jahr) in der Kopfzeile – nicht rückwirkend. Am 1. Januar beginnt die Jahreszählung automatisch neu.
        </p>
        <input type="date" value={zaehlStart} onChange={(e) => setZaehlStart(e.target.value)} onBlur={(e) => zaehlStartAendern(e.target.value)} />
      </div>

      <div className="card">
        <p style={{ fontWeight: 600, marginTop: 0 }}>Alle Kontakte übertragen</p>
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
        <p style={{ fontWeight: 600, marginTop: 0 }}>Status-Optionen</p>
        <p style={{ fontSize: 12, color: 'var(--sp-text-muted)', marginTop: 0 }}>
          Diese Werte stehen im Kontakt-Detail bei "Status" zur Auswahl (z.B. Offen, Verloren, Ruht) — frei erweiterbar.
        </p>
        <table>
          <thead><tr><th>Wert</th><th>Label</th><th></th></tr></thead>
          <tbody>
            {statusOptionen.map((s) => (
              <tr key={s.wert}>
                <td>{s.wert}</td>
                <td>{s.label}</td>
                <td><button className="secondary" onClick={() => statusOptionLoeschen(s.wert)}>Löschen</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="text" placeholder="Wert (z.B. wartend)" style={{ width: 160 }} value={neuerStatusWert} onChange={(e) => setNeuerStatusWert(e.target.value)} />
          <input type="text" placeholder="Label (z.B. Wartend)" value={neuerStatusLabel} onChange={(e) => setNeuerStatusLabel(e.target.value)} />
          <button className="primary" onClick={statusOptionAnlegen}>Hinzufügen</button>
        </div>
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
