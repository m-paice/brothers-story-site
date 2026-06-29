import { Routes, Route, Navigate } from 'react-router-dom';
import { StoreLayout } from './components/StoreLayout';
import { Storefront } from './pages/Storefront';
import { ProductPage } from './pages/ProductPage';
import { PaymentResult } from './pages/PaymentResult';
import { CustomerAuth } from './pages/CustomerAuth';
import { AccountLayout } from './pages/account/AccountLayout';
import { AccountData } from './pages/account/AccountData';
import { AccountAddresses } from './pages/account/AccountAddresses';
import { AccountOrders } from './pages/account/AccountOrders';
import { AccountSecurity } from './pages/account/AccountSecurity';
import { ResetPassword } from './pages/ResetPassword';
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
import { SettingsAdmin } from './pages/admin/SettingsAdmin';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { SuperAdmin } from './pages/admin/SuperAdmin';
import { SuperAdminLayout } from './pages/admin/SuperAdminLayout';
import { SuperAdminDashboard } from './pages/admin/SuperAdminDashboard';
import { CriarLoja } from './pages/CriarLoja';
import { Setup } from './pages/admin/Setup';

function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/produto/:id" element={<ProductPage />} />
        <Route
          path="/pagamento/sucesso"
          element={<PaymentResult kind="sucesso" />}
        />
        <Route
          path="/pagamento/pendente"
          element={<PaymentResult kind="pendente" />}
        />
        <Route path="/pagamento/erro" element={<PaymentResult kind="erro" />} />
        <Route path="/entrar" element={<CustomerAuth />} />
        <Route path="/minha-conta" element={<AccountLayout />}>
          <Route index element={<AccountOrders />} />
          <Route path="dados" element={<AccountData />} />
          <Route path="enderecos" element={<AccountAddresses />} />
          <Route path="pedidos" element={<AccountOrders />} />
          <Route path="senha" element={<AccountSecurity />} />
        </Route>
        <Route path="/redefinir-senha" element={<ResetPassword />} />
      </Route>
      <Route path="/sobre" element={<Sobre />} />
      <Route path="/envios" element={<Envios />} />
      <Route path="/trocas" element={<Trocas />} />
      <Route path="/contato" element={<Contato />} />

      <Route path="/criar-loja" element={<CriarLoja />} />

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
        <Route path="configuracoes" element={<SettingsAdmin />} />
        <Route path="setup" element={<Setup />} />
      </Route>

      <Route path="/superadmin" element={<SuperAdminLayout />}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="lojas" element={<SuperAdmin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
