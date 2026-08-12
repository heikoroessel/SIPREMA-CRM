import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import LoginModal from './components/LoginModal.jsx';
import ContactList from './pages/ContactList.jsx';
import ContactDetail from './pages/ContactDetail.jsx';
import Settings from './pages/Settings.jsx';
import { BearbeiterProvider } from './context/BearbeiterContext.jsx';

export default function App() {
  return (
    <BearbeiterProvider>
      <div>
        <Header />
        <LoginModal />
        <div className="container">
          <Routes>
            <Route path="/" element={<ContactList />} />
            <Route path="/kontakte/:id" element={<ContactDetail />} />
            <Route path="/einstellungen" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </BearbeiterProvider>
  );
}
