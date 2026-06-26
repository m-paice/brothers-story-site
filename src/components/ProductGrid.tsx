import type { Product, ViewMode } from '../types/product';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  favorites: number[];
  view: ViewMode;
  onToggleFavorite: (id: number) => void;
}

/** Grid responsivo de produtos. Exibe estado vazio quando não há resultados. */
export function ProductGrid({
  products,
  favorites,
  view,
  onToggleFavorite,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="grid-empty">
        <p className="grid-empty__title">Nenhum produto encontrado</p>
        <p className="grid-empty__hint">
          Tente ajustar a busca ou os filtros selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid ${view === 'grid' ? 'grid--cols2' : ''}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={favorites.includes(product.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
