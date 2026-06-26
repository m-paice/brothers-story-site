import { Routes, Route, Navigate } from 'react-router-dom';
import { StoreLayout } from './components/StoreLayout';
import { Storefront } from './pages/Storefront';
import { ProductPage } from './pages/ProductPage';
import { Sobre } from './pages/Sobre';
import { Envios } from './pages/Envios';
import { Trocas } from './pages/Trocas';
import { Contato } from './pages/Contato';
import { Login } from './pages/admin/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { ProductsAdmin } from './pages/admin/ProductsAdmin';
import { OrdersAdmin } from './pages/admin/OrdersAdmin';
import { SalesAdmin } from './pages/admin/SalesAdmin';
import { ProtectedRoute } from './components/admin/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/produto/:id" element={<ProductPage />} />
      </Route>
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
        <Route path="vendas" element={<SalesAdmin />} />
        <Route path="produtos" element={<ProductsAdmin />} />
        <Route path="pedidos" element={<OrdersAdmin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
