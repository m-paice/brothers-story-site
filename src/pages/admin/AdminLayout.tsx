import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchSettings } from '../../lib/settings';
import '../../styles/admin.css';

export function AdminLayout() {
  const { session, signOut, stores, currentStoreId, currentStoreRole, switchStore } =
    useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [setupPending, setSetupPending] = useState(false);

  const isOwner = currentStoreRole === 'owner';
  const NAV = [
    ...(isOwner ? [{ to: '/admin', end: true, label: 'Dashboard', icon: '◧' }] : []),
    { to: '/admin/vendas', end: false, label: 'Vendas', icon: '$' },
    { to: '/admin/produtos', end: false, label: 'Produtos', icon: '▦' },
    { to: '/admin/pedidos', end: false, label: 'Pedidos', icon: '✦' },
    ...(isOwner
      ? [
          { to: '/admin/equipe', end: false, label: 'Funcionários', icon: '⚉' },
          { to: '/admin/configuracoes', end: false, label: 'Configurações', icon: '⚙' },
        ]
      : []),
  ];

  useEffect(() => {
    if (!currentStoreId) return;
    fetchSettings(currentStoreId).then((s) => {
      if (!s.store.onboarding_done) setSetupPending(true);
    }).catch(() => {});
  }, [currentStoreId]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  const currentStoreName =
    stores.find((s) => s.storeId === currentStoreId)?.storeName ?? 'Admin';

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
            <img
              className="admin__brand-img"
              src="/logo.jpg"
              alt="Brothers Story"
              width={28}
              height={28}
            />
            {stores.length > 1 ? (
              <select
                className="admin__store-select"
                value={currentStoreId ?? ''}
                onChange={(e) => switchStore(e.target.value)}
                aria-label="Selecionar loja"
              >
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>
                    {s.storeName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="admin__brand-text">{currentStoreName}</span>
            )}
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

      <main className="admin__content">
        {setupPending && (
          <div className="admin__setup-banner">
            Configuração inicial pendente —{' '}
            <NavLink to="/admin/setup" onClick={() => setSetupPending(false)}>
              configurar agora →
            </NavLink>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
