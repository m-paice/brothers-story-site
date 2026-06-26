import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: '◧' },
  { to: '/admin/produtos', end: false, label: 'Produtos', icon: '▦' },
  { to: '/admin/pedidos', end: false, label: 'Pedidos', icon: '✦' },
];

export function AdminLayout() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <div className="admin__brand">
          <img
            className="admin__brand-img"
            src="/logo.jpg"
            alt="Brothers Story"
            width={28}
            height={28}
          />
          <span className="admin__brand-text">Brothers Story</span>
        </div>

        <nav className="admin__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
          <a
            className="admin__nav-link admin__nav-link--ghost"
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            <span className="admin__nav-icon" aria-hidden="true">
              ↗
            </span>
            Ver loja
          </a>
        </div>
      </aside>

      <div className="admin__main">
        <header className="admin__topbar">
          <div className="admin__user">
            <span className="admin__user-email">{session?.user?.email}</span>
            <button className="admin__signout" onClick={handleSignOut}>
              Sair
            </button>
          </div>
        </header>

        <main className="admin__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
