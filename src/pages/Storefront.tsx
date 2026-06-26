import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FilterBar } from '../components/FilterBar';
import { ProductGrid } from '../components/ProductGrid';
import { fetchProducts } from '../lib/products';
import { useCart } from '../context/CartContext';
import type { StoreOutletContext } from '../components/StoreLayout';
import {
  ALL_CATEGORIES,
  type Product,
  type SortOption,
  type ViewMode,
} from '../types/product';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function Storefront() {
  const { search } = useOutletContext<StoreOutletContext>();
  const { favorites, toggleFavorite } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [sort, setSort] = useState<SortOption>('newest');
  const [view, setView] = useState<ViewMode>(() =>
    loadFromStorage<ViewMode>('ef:view', 'list')
  );

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => console.error('Falha ao carregar produtos:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('ef:view', JSON.stringify(view));
  }, [view]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return [ALL_CATEGORIES, ...unique];
  }, [products]);

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
          return 0;
      }
    });
  }, [products, search, activeCategory, sort]);

  return (
    <>
      <FilterBar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sort={sort}
        onSortChange={setSort}
        count={visibleProducts.length}
        view={view}
        onViewChange={setView}
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
            view={view}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>
    </>
  );
}
