const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(`API-Fehler ${res.status} bei ${path}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  kontakte: (params) => req(`/kontakte?${new URLSearchParams(params)}`),
  kontaktZaehler: () => req('/kontakte/zaehler'),
  alleKontakteLoeschen: () => req('/kontakte/alle', { method: 'DELETE' }),
  kontakt: (id) => req(`/kontakte/${id}`),
  kontaktAendern: (id, body) => req(`/kontakte/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  kontaktAnlegen: (body) => req('/kontakte', { method: 'POST', body: JSON.stringify(body) }),
  bulkZuweisen: (body) => req('/kontakte/bulk-zuweisen', { method: 'POST', body: JSON.stringify(body) }),
  aktivitaetAnlegen: (id, body) => req(`/kontakte/${id}/aktivitaeten`, { method: 'POST', body: JSON.stringify(body) }),
  bearbeiter: (nurAktiv) => req(`/bearbeiter${nurAktiv ? '?nurAktiv=true' : ''}`),
  bearbeiterAnlegen: (body) => req('/bearbeiter', { method: 'POST', body: JSON.stringify(body) }),
  bearbeiterAendern: (kuerzel, body) => req(`/bearbeiter/${kuerzel}`, { method: 'PUT', body: JSON.stringify(body) }),
  punkteGewichtung: () => req('/settings/punkte'),
  punkteGewichtungAendern: (ereignis, punkte) => req(`/settings/punkte/${ereignis}`, { method: 'PUT', body: JSON.stringify({ punkte }) }),
  statusOptionen: () => req('/settings/status'),
  statusOptionAnlegen: (wert, label) => req('/settings/status', { method: 'POST', body: JSON.stringify({ wert, label }) }),
  statusOptionLoeschen: (wert) => req(`/settings/status/${wert}`, { method: 'DELETE' }),
  firmaEinstellungen: () => req('/settings/firma'),
  firmaEinstellungAendern: (key, value) => req(`/settings/firma/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  werte: (feld) => req(`/kontakte/werte/${feld}`),
  meinePunkte: (kuerzel) => req(`/punkte/${kuerzel}`),
  exportCsvUrl: (params) => `${BASE}/kontakte/export.csv?${new URLSearchParams(params)}`
};
