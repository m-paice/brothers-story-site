import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { FilterBar } from '../components/FilterBar';
import { ProductGrid } from '../components/ProductGrid';
import { CartDrawer, type CartLine } from '../components/CartDrawer';
import { Checkout } from '../components/Checkout';
import { Footer } from '../components/Footer';
import { fetchProducts } from '../lib/products';
import {
  ALL_CATEGORIES,
  type Cart,
  type Product,
  type SortOption,
} from '../types/product';
import '../App.css';

// Lê um valor do localStorage com fallback seguro
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [sort, setSort] = useState<SortOption>('newest');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Favoritos e carrinho persistidos no localStorage
  const [favorites, setFavorites] = useState<number[]>(() =>
    loadFromStorage<number[]>('ef:favorites', [])
  );
  const [cart, setCart] = useState<Cart>(() =>
    loadFromStorage<Cart>('ef:cart', {})
  );

  // Carrega o catálogo (Supabase ou fallback estático)
  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => console.error('Falha ao carregar produtos:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('ef:favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('ef:cart', JSON.stringify(cart));
  }, [cart]);

  // Categorias derivadas dos produtos (com "All" no início)
  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return [ALL_CATEGORIES, ...unique];
  }, [products]);

  // Aplica busca + filtro de categoria + ordenação
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = products.filter((product) => {
      const matchesCategory =
        activeCategory === ALL_CATEGORIES ||
        product.category === activeCategory;
      const matchesSearch =
        term === '' ||
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case 'priceAsc':
          return a.price - b.price;
        case 'priceDesc':
          return b.price - a.price;
        case 'newest':
          return Number(b.isNew) - Number(a.isNew);
        default:
          return 0; // relevância: mantém ordem original
      }
    });
  }, [products, search, activeCategory, sort]);

  // Linhas do carrinho (produto + quantidade) e totais derivados
  const cartLines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => ({
        product: products.find((p) => p.id === Number(id))!,
        qty,
      }))
      .filter((line) => line.product && line.qty > 0);
  }, [cart, products]);

  const cartCount = cartLines.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cartLines.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0
  );

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const addToCart = (id: number) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setCartOpen(true);
  };

  const decFromCart = (id: number) => {
    setCart((prev) => {
      const qty = (prev[id] ?? 0) - 1;
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Abre o checkout a partir do carrinho
  const openCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  // Pedido enviado: esvazia o carrinho
  const confirmOrder = () => {
    setCart({});
  };

  return (
    <div className="app">
      <Header
        search={search}
        onSearchChange={setSearch}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <FilterBar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sort={sort}
        onSortChange={setSort}
        count={visibleProducts.length}
      />

      <main className="content container">
        {loading ? (
          <div className="grid-empty">
            <p className="grid-empty__title">Carregando catálogo…</p>
          </div>
        ) : (
          <ProductGrid
            products={visibleProducts}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onAddToCart={addToCart}
          />
        )}
      </main>

      <Footer />

      <CartDrawer
        open={cartOpen}
        lines={cartLines}
        total={cartTotal}
        onClose={() => setCartOpen(false)}
        onInc={addToCart}
        onDec={decFromCart}
        onRemove={removeFromCart}
        onCheckout={openCheckout}
      />

      <Checkout
        open={checkoutOpen}
        lines={cartLines}
        subtotal={cartTotal}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={confirmOrder}
      />
    </div>
  );
}
