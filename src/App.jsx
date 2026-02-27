import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Accueil from './pages/Accueil'
import Dressing from './pages/Dressing'
import Tenues from './pages/Tenues'
import MesTenues from './pages/MesTenues'
import Machine from './pages/Machine'
import Stats from './pages/Stats'
import Calendrier from './pages/Calendrier'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/accueil" replace />} />
        <Route path="/accueil" element={<Accueil />} />
        <Route path="/dressing" element={<Dressing />} />
        <Route path="/tenues" element={<Tenues />} />
        <Route path="/mes-tenues" element={<MesTenues />} />
        <Route path="/machine" element={<Machine />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/calendrier" element={<Calendrier />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
