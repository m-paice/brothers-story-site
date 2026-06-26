import { Routes, Route, Navigate } from 'react-router-dom';
import { Storefront } from './pages/Storefront';
import { Sobre } from './pages/Sobre';
import { Envios } from './pages/Envios';
import { Trocas } from './pages/Trocas';
import { Contato } from './pages/Contato';
import { Login } from './pages/admin/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { ProductsAdmin } from './pages/admin/ProductsAdmin';
import { OrdersAdmin } from './pages/admin/OrdersAdmin';
import { ProtectedRoute } from './components/admin/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/sobre" element={<Sobre />} />
      <Route path="/envios" element={<Envios />} />
      <Route path="/trocas" element={<Trocas />} />
      <Route path="/contato" element={<Contato />} />

      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="produtos" element={<ProductsAdmin />} />
        <Route path="pedidos" element={<OrdersAdmin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
