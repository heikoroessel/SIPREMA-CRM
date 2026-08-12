import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// Stellt das aktuell ausgewaehlte Kuerzel app-weit zur Verfuegung (statt lokalem State pro
// Komponente), damit die Auswahl beim Wechseln zwischen Listen-/Detail-/Einstellungsseite
// erhalten bleibt. Wird zusaetzlich in localStorage gespiegelt, damit sie auch einen
// Seiten-Reload uebersteht.
const BearbeiterContext = createContext(null);

export function BearbeiterProvider({ children }) {
  const [kuerzel, setKuerzelState] = useState(localStorage.getItem('kuerzel') || '');
  const [bearbeiter, setBearbeiter] = useState([]);

  useEffect(() => {
    api.bearbeiter(true).then(setBearbeiter);
  }, []);

  function setKuerzel(neu) {
    setKuerzelState(neu);
    if (neu) localStorage.setItem('kuerzel', neu);
    else localStorage.removeItem('kuerzel');
  }

  return (
    <BearbeiterContext.Provider value={{ kuerzel, setKuerzel, bearbeiter }}>
      {children}
    </BearbeiterContext.Provider>
  );
}

export function useBearbeiterContext() {
  return useContext(BearbeiterContext);
}
