import { Link, NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const navLinks = [
  { to: "/accueil", label: "Accueil" },
  { to: "/dressing", label: "Dressing" },
  { to: "/tenues", label: "Tenues" },
  { to: "/mes-tenues", label: "Mes tenues" },
  { to: "/lookbook-public", label: "Lookbook Public" },
  { to: "/tri", label: "Tri" },
  { to: "/stats", label: "Statistiques" },
  { to: "/calendrier", label: "Calendrier" },
];

function Layout({ title, children }) {
  const { token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // centralise la logique (localStorage + state)
    navigate("/login"); // navigation propre React Router
  };

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <div className="site-brand">
            <div className="site-eyebrow">Organisation dressing</div>
            <h1 className="site-title">
              <Link to="/">{title}</Link>
            </h1>
          </div>

          <div className="site-actions">
            <nav className="site-nav" aria-label="Navigation principale">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `btn small nav-pill${isActive ? " active" : ""}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {token && (
              <button
                className="btn small ghost"
                type="button"
                onClick={handleLogout}
              >
                Deconnexion
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <div className="container page-shell">{children}</div>
      </main>
    </>
  );
}

export default Layout;