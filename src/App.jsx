import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Accueil from "./pages/Accueil";
import Dressing from "./pages/Dressing";
import VetementDetail from "./pages/VetementDetail";
import Tenues from "./pages/Tenues";
import MesTenues from "./pages/MesTenues";
import LookbookPublic from "./pages/LookbookPublic";
import Tri from "./pages/Tri";
import Machine from "./pages/Machine";
import Stats from "./pages/Stats";
import Calendrier from "./pages/Calendrier";

import Login from "./pages/Login";
import Register from "./pages/Register";

import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Pages publiques */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/lookbook-public" element={<LookbookPublic />} />

        {/* Redirection racine */}
        <Route path="/" element={<Navigate to="/accueil" replace />} />

        {/* Pages privées */}
        <Route
          path="/accueil"
          element={
            <PrivateRoute>
              <Accueil />
            </PrivateRoute>
          }
        />
        <Route
          path="/dressing"
          element={
            <PrivateRoute>
              <Dressing />
            </PrivateRoute>
          }
        />
        <Route
          path="/dressing/:id"
          element={
            <PrivateRoute>
              <VetementDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/tenues"
          element={
            <PrivateRoute>
              <Tenues />
            </PrivateRoute>
          }
        />
        <Route
          path="/mes-tenues"
          element={
            <PrivateRoute>
              <MesTenues />
            </PrivateRoute>
          }
        />
        <Route
          path="/tri"
          element={
            <PrivateRoute>
              <Tri />
            </PrivateRoute>
          }
        />
        <Route
          path="/machine"
          element={
            <PrivateRoute>
              <Machine />
            </PrivateRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <PrivateRoute>
              <Stats />
            </PrivateRoute>
          }
        />
        <Route
          path="/calendrier"
          element={
            <PrivateRoute>
              <Calendrier />
            </PrivateRoute>
          }
        />

        {/* Fallback → login direct */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
