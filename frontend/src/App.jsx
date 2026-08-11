import { Routes, Route, Link } from 'react-router-dom';
import Header from './components/Header.jsx';
import ContactList from './pages/ContactList.jsx';
import ContactDetail from './pages/ContactDetail.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <div>
      <Header />
      <div className="container">
        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <Link to="/">Kontakte</Link> · <Link to="/einstellungen">Einstellungen</Link>
        </div>
        <Routes>
          <Route path="/" element={<ContactList />} />
          <Route path="/kontakte/:id" element={<ContactDetail />} />
          <Route path="/einstellungen" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}
