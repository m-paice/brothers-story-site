import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/minha-conta/dados', label: 'Dados pessoais' },
  { to: '/minha-conta/enderecos', label: 'Endereços' },
  { to: '/minha-conta/pedidos', label: 'Pedidos' },
];

export function AccountLayout() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (!loading && !session) {
    return <Navigate to="/entrar?next=/minha-conta/pedidos" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <main className="content container">
      <div className="account-page">
        <aside className="account-nav">
          <p className="account-nav__email">{session?.user?.email}</p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `account-nav__link ${
                  isActive ? 'account-nav__link--active' : ''
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button className="account-nav__signout" onClick={handleSignOut}>
            Sair
          </button>
        </aside>

        <section className="account-content">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
