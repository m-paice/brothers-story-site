import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Bloqueia rotas restritas ao dono da loja (Dashboard, Configurações, Equipe). */
export function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { currentStoreRole } = useAuth();

  if (currentStoreRole !== 'owner') {
    return <Navigate to="/admin/vendas" replace />;
  }

  return <>{children}</>;
}
