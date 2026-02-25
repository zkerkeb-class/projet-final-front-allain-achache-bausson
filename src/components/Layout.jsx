import { Link, NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/accueil', label: 'Accueil' },
  { to: '/dressing', label: 'Dressing' },
  { to: '/tenues', label: 'Tenues' },
  { to: '/mes-tenues', label: 'Mes tenues' },
  { to: '/machine', label: 'Machine à laver' },
  { to: '/stats', label: 'Statistiques' },
  { to: '/calendrier', label: 'Calendrier' },
]

function Layout({ title, children }) {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <h1 className="site-title">
            <Link to="/">{title}</Link>
          </h1>
          <nav className="site-nav chips">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `btn${isActive ? ' active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  )
}

export default Layout
