import { Link, NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const navLinks = [
  { to: "/accueil", label: "Accueil" },
  { to: "/dressing", label: "Dressing" },
  { to: "/tenues", label: "Tenues" },
  { to: "/mes-tenues", label: "Mes tenues" },
  { to: "/machine", label: "Machine à laver" },
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
      <header style={{ display: "flex", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid #ddd" }}>
        <h2>
          <Link to="/" style={{ textDecoration: "none", color: "black" }}>
            {title}
          </Link>
        </h2>

        <nav style={{ display: "flex", gap: "10px" }}>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}

          {token && (
            <button onClick={handleLogout}>
              Déconnexion
            </button>
          )}
        </nav>
      </header>

      <main style={{ padding: "20px" }}>{children}</main>
    </>
  );
}

export default Layout;