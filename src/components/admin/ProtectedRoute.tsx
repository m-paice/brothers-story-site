import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Bloqueia o acesso às rotas do admin: exige sessão E papel de admin. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, role, isAdmin, isStoreAdmin, isSuperAdmin, loading } = useAuth();
  const location = useLocation();

  // Aguarda o papel ser determinado (evita piscar "acesso restrito").
  if (loading || (session && role === null)) {
    return (
      <div className="admin-loading">
        <span className="admin-spinner" aria-hidden="true" />
        <p>Carregando…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  // Superadmin não usa o painel da loja — vai para a plataforma.
  if (isSuperAdmin) {
    return <Navigate to="/superadmin" replace />;
  }

  // Logado, mas sem papel de admin (ex.: conta de cliente).
  if (!isAdmin && !isStoreAdmin) {
    return (
      <div className="admin-loading">
        <p>Acesso restrito. Esta conta não tem permissão de administrador.</p>
        <a className="admin__signout" href="/">
          Voltar à loja
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
