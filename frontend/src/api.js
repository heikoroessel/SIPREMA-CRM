const BASE = '/api';

// Bei 401 (Session ungueltig/abgelaufen) wird die gespeicherte Session verworfen und die Seite
// neu geladen, damit wieder die Login-Maske erscheint - so bleibt jede Komponente einfach und
// muss 401 nicht selbst behandeln.
function sessionVerwerfen() {
  localStorage.removeItem('session_token');
  localStorage.removeItem('kuerzel');
  window.location.reload();
}

async function req(path, options = {}) {
  const token = localStorage.getItem('session_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  if (res.status === 401) {
    if (token) sessionVerwerfen(); // Session war da, wurde aber ungueltig -> zurueck zum Login
    throw new Error('Nicht angemeldet');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API-Fehler ${res.status} bei ${path}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  kontakte: (params) => req(`/kontakte?${new URLSearchParams(params)}`),
  kontaktZaehler: () => req('/kontakte/zaehler'),
  alleKontakteLoeschen: () => req('/kontakte/alle', { method: 'DELETE' }),
  kontaktLoeschen: (id) => req(`/kontakte/${id}`, { method: 'DELETE' }),
  kontakt: (id) => req(`/kontakte/${id}`),
  kontaktAendern: (id, body) => req(`/kontakte/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  kontaktAnlegen: (body) => req('/kontakte', { method: 'POST', body: JSON.stringify(body) }),
  bulkZuweisen: (body) => req('/kontakte/bulk-zuweisen', { method: 'POST', body: JSON.stringify(body) }),
  aktivitaetAnlegen: (id, body) => req(`/kontakte/${id}/aktivitaeten`, { method: 'POST', body: JSON.stringify(body) }),
  bearbeiter: (nurAktiv) => req(`/bearbeiter${nurAktiv ? '?nurAktiv=true' : ''}`),
  bearbeiterAnlegen: (body) => req('/bearbeiter', { method: 'POST', body: JSON.stringify(body) }),
  bearbeiterAendern: (kuerzel, body) => req(`/bearbeiter/${kuerzel}`, { method: 'PUT', body: JSON.stringify(body) }),
  passwortZuruecksetzen: (kuerzel) => req(`/bearbeiter/${kuerzel}/passwort-reset`, { method: 'POST' }),
  punkteGewichtung: () => req('/settings/punkte'),
  punkteGewichtungAendern: (ereignis, punkte) => req(`/settings/punkte/${ereignis}`, { method: 'PUT', body: JSON.stringify({ punkte }) }),
  statusOptionen: () => req('/settings/status'),
  statusOptionAnlegen: (wert, label) => req('/settings/status', { method: 'POST', body: JSON.stringify({ wert, label }) }),
  statusOptionLoeschen: (wert) => req(`/settings/status/${wert}`, { method: 'DELETE' }),
  firmaEinstellungen: () => req('/settings/firma'),
  firmaEinstellungAendern: (key, value) => req(`/settings/firma/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  werte: (feld) => req(`/kontakte/werte/${feld}`),
  meinePunkte: (kuerzel) => req(`/punkte/${kuerzel}`),
  manuelleErgaenzung: (kuerzel, kennzahl, anzahl) => req('/punkte/manuell', { method: 'POST', body: JSON.stringify({ kuerzel, kennzahl, anzahl }) }),
  exportCsvUrl: (params) => {
    const token = localStorage.getItem('session_token');
    const query = new URLSearchParams({ ...params, token: token || '' });
    return `${BASE}/kontakte/export.csv?${query}`;
  },
  authStatus: (kuerzel) => req(`/auth/status/${kuerzel}`),
  login: (kuerzel, passwort) => req('/auth/login', { method: 'POST', body: JSON.stringify({ kuerzel, passwort }) })
};
