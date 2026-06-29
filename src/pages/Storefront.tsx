import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FilterBar } from '../components/FilterBar';
import { ProductGrid } from '../components/ProductGrid';
import { fetchProducts } from '../lib/products';
import { useCart } from '../context/CartContext';
import type { StoreOutletContext } from '../components/StoreLayout';
import {
  ALL_CATEGORIES,
  DEFAULT_FILTERS,
  type FilterState,
  type Product,
  type SortOption,
  type ViewMode,
} from '../types/product';

const SIZE_ORDER = ['PP', 'P', 'p', 'M', 'm', 'G', 'GG', 'XG', 'Único'];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function countActiveFilters(f: FilterState): number {
  return (
    (f.onlySale ? 1 : 0) +
    (f.onlyNew ? 1 : 0) +
    (f.onlyInStock ? 1 : 0) +
    (f.priceMin ? 1 : 0) +
    (f.priceMax ? 1 : 0) +
    f.colors.length +
    f.sizes.length
  );
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
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

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

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach((p) =>
      p.variants.forEach((v) => {
        if (v.color) colors.add(v.color);
      })
    );
    return Array.from(colors).sort();
  }, [products]);

  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach((p) => p.variants.forEach((v) => sizes.add(v.size)));
    return Array.from(sizes).sort((a, b) => {
      const ia = SIZE_ORDER.indexOf(a);
      const ib = SIZE_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [products]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const priceMin = filters.priceMin ? parseFloat(filters.priceMin) : null;
    const priceMax = filters.priceMax ? parseFloat(filters.priceMax) : null;

    const result = products.filter((product) => {
      if (activeCategory !== ALL_CATEGORIES && product.category !== activeCategory)
        return false;
      if (
        term &&
        !product.name.toLowerCase().includes(term) &&
        !product.description.toLowerCase().includes(term) &&
        !product.category.toLowerCase().includes(term)
      )
        return false;
      if (filters.onlySale && product.discount === 0) return false;
      if (filters.onlyNew && !product.isNew) return false;
      if (filters.onlyInStock && product.stock === 0) return false;
      if (priceMin !== null && product.price < priceMin) return false;
      if (priceMax !== null && product.price > priceMax) return false;
      if (filters.colors.length > 0) {
        const productColors = product.variants.map((v) => v.color).filter(Boolean);
        if (!filters.colors.some((c) => productColors.includes(c))) return false;
      }
      if (filters.sizes.length > 0) {
        const productSizes = product.variants.map((v) => v.size);
        if (!filters.sizes.some((s) => productSizes.includes(s))) return false;
      }
      return true;
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
  }, [products, search, activeCategory, sort, filters]);

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
        filters={filters}
        onFiltersChange={setFilters}
        filterOpen={filterOpen}
        onFilterToggle={() => setFilterOpen((o) => !o)}
        activeFilterCount={activeFilterCount}
        availableColors={availableColors}
        availableSizes={availableSizes}
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
