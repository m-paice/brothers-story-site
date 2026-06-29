import { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

const NAV = [
  { to: '/superadmin', end: true, label: 'Dashboard', icon: '◧' },
  { to: '/superadmin/lojas', end: false, label: 'Lojas', icon: '⊞' },
];

export function SuperAdminLayout() {
  const { session, isSuperAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!loading && !isSuperAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="admin">
      <header className="admin__topbar">
        <div className="admin__topbar-left">
          <button
            className="admin__menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="admin__brand">
            <span className="admin__brand-text">Plataforma</span>
          </div>
        </div>

        <div className="admin__user">
          <span className="admin__user-email">{session?.user?.email}</span>
          <button className="admin__signout" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </header>

      <div
        className={`admin__overlay ${menuOpen ? 'admin__overlay--visible' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside className={`admin__sidebar ${menuOpen ? 'admin__sidebar--open' : ''}`}>
        <button
          className="admin__sidebar-close"
          onClick={closeMenu}
          aria-label="Fechar menu"
        >
          ✕
        </button>

        <nav className="admin__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`
              }
            >
              <span className="admin__nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin__sidebar-footer">
          <a className="admin__nav-link admin__nav-link--ghost" href="/admin">
            <span className="admin__nav-icon" aria-hidden="true">
              ←
            </span>
            Painel da loja
          </a>
        </div>
      </aside>

      <main className="admin__content">
        <Outlet />
      </main>
    </div>
  );
}
