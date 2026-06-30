import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { Checkout } from './Checkout';
import { useCart } from '../context/CartContext';
import '../App.css';

export interface StoreOutletContext {
  search: string;
}

/** Casca da loja: cabeçalho, rodapé e carrinho/checkout compartilhados entre
 *  a vitrine e a página de produto. */
export function StoreLayout() {
  const [search, setSearch] = useState('');
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Buscar a partir de qualquer página leva para o catálogo.
  const handleSearch = (value: string) => {
    setSearch(value);
    if (location.pathname !== '/') navigate('/');
  };

  return (
    <div className="app">
      <Header
        search={search}
        onSearchChange={handleSearch}
        cartCount={cart.count}
        onOpenCart={cart.openCart}
        isAccountPage={location.pathname.startsWith('/minha-conta')}
      />

      <Outlet context={{ search } satisfies StoreOutletContext} />

      <Footer />

      <CartDrawer
        open={cart.cartOpen}
        entries={cart.entries}
        total={cart.total}
        onClose={cart.closeCart}
        onInc={cart.inc}
        onDec={cart.dec}
        onRemove={cart.remove}
        onCheckout={cart.openCheckout}
      />

      <Checkout
        open={cart.checkoutOpen}
        entries={cart.entries}
        subtotal={cart.total}
        onClose={cart.closeCheckout}
        onConfirm={cart.confirmOrder}
      />
    </div>
  );
}
