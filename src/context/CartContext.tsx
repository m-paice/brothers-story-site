import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartEntry } from '../types/cart';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface CartContextValue {
  entries: CartEntry[];
  count: number;
  total: number;
  addItem: (entry: Omit<CartEntry, 'qty'>, qty?: number) => void;
  inc: (variantId: number) => void;
  dec: (variantId: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;

  favorites: number[];
  toggleFavorite: (productId: number) => void;
  isFavorite: (productId: number) => boolean;

  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  checkoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  confirmOrder: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<CartEntry[]>(() =>
    loadFromStorage<CartEntry[]>('ef:cart:v2', [])
  );
  const [favorites, setFavorites] = useState<number[]>(() =>
    loadFromStorage<number[]>('ef:favorites', [])
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('ef:cart:v2', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('ef:favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addItem = (entry: Omit<CartEntry, 'qty'>, qty = 1) => {
    setEntries((prev) => {
      const found = prev.find((e) => e.variantId === entry.variantId);
      if (found) {
        return prev.map((e) =>
          e.variantId === entry.variantId ? { ...e, qty: e.qty + qty } : e
        );
      }
      return [...prev, { ...entry, qty }];
    });
    setCartOpen(true);
  };

  const inc = (variantId: number) =>
    setEntries((prev) =>
      prev.map((e) =>
        e.variantId === variantId ? { ...e, qty: e.qty + 1 } : e
      )
    );

  const dec = (variantId: number) =>
    setEntries((prev) =>
      prev
        .map((e) =>
          e.variantId === variantId ? { ...e, qty: e.qty - 1 } : e
        )
        .filter((e) => e.qty > 0)
    );

  const remove = (variantId: number) =>
    setEntries((prev) => prev.filter((e) => e.variantId !== variantId));

  const clear = () => setEntries([]);

  const toggleFavorite = (productId: number) =>
    setFavorites((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );

  const count = entries.reduce((sum, e) => sum + e.qty, 0);
  const total = entries.reduce((sum, e) => sum + e.price * e.qty, 0);

  const value = useMemo<CartContextValue>(
    () => ({
      entries,
      count,
      total,
      addItem,
      inc,
      dec,
      remove,
      clear,
      favorites,
      toggleFavorite,
      isFavorite: (id: number) => favorites.includes(id),
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      checkoutOpen,
      openCheckout: () => {
        setCartOpen(false);
        setCheckoutOpen(true);
      },
      closeCheckout: () => setCheckoutOpen(false),
      confirmOrder: () => setEntries([]),
    }),
    [entries, favorites, cartOpen, checkoutOpen, count, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de <CartProvider>.');
  return ctx;
}
