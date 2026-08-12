import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// Stellt die aktuelle Login-Session (Kuerzel + Token) app-weit zur Verfuegung, gespiegelt in
// localStorage, damit sie einen Seiten-Reload uebersteht. Kuerzel = eingeloggte Person, es gibt
// keine Rollen - wer eingeloggt ist, hat alle Rechte.
const BearbeiterContext = createContext(null);

export function BearbeiterProvider({ children }) {
  const [kuerzel, setKuerzelState] = useState(localStorage.getItem('kuerzel') || '');
  const [token, setToken] = useState(localStorage.getItem('session_token') || '');
  const [bearbeiter, setBearbeiter] = useState([]);

  useEffect(() => {
    api.bearbeiter(true).then(setBearbeiter);
  }, []);

  // Login bzw. Ersteinrichtung (siehe Backend: fehlt fuer das Kuerzel ein Passwort, wird das
  // uebergebene Passwort dort automatisch als neues Passwort uebernommen).
  async function login(gewaehltesKuerzel, passwort) {
    const antwort = await api.login(gewaehltesKuerzel, passwort);
    localStorage.setItem('kuerzel', antwort.kuerzel);
    localStorage.setItem('session_token', antwort.token);
    setToken(antwort.token);
    setKuerzelState(antwort.kuerzel);
    return antwort;
  }

  function logout() {
    localStorage.removeItem('kuerzel');
    localStorage.removeItem('session_token');
    setToken('');
    setKuerzelState('');
  }

  return (
    <BearbeiterContext.Provider value={{ kuerzel, token, bearbeiter, login, logout }}>
      {children}
    </BearbeiterContext.Provider>
  );
}

export function useBearbeiterContext() {
  return useContext(BearbeiterContext);
}
