import { Link, NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const navLinks = [
  { to: "/accueil", label: "Accueil" },
  { to: "/dressing", label: "Dressing" },
  { to: "/tenues", label: "Tenues" },
  { to: "/mes-tenues", label: "Mes tenues" },
  { to: "/tri", label: "Tri" },
  { to: "/machine", label: "Laverie" },
  { to: "/stats", label: "Statistiques" },
  { to: "/calendrier", label: "Calendrier" },
];

function Layout({ title, children }) {
  const { token, setToken, setUser } = useContext(AuthContext);

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    window.location.href = "#/login";
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
                  className={({ isActive }) => `btn small nav-pill${isActive ? " active" : ""}`}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {token ? (
              <button className="btn small ghost" type="button" onClick={handleLogout}>
                Deconnexion
              </button>
            ) : null}
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
