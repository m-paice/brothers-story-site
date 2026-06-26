import type { Product } from '../types/product';
import { formatPrice } from '../utils/format';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onAddToCart: (id: number) => void;
}

/** Retorna rótulo + classe de cor para o status de estoque */
function getStockStatus(stock: number): { label: string; modifier: string } {
  if (stock === 0) return { label: 'Esgotado', modifier: 'out' };
  if (stock <= 5) return { label: `Restam ${stock}`, modifier: 'low' };
  return { label: 'Em estoque', modifier: 'in' };
}

/** Card individual de produto */
export function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
}: ProductCardProps) {
  const stockStatus = getStockStatus(product.stock);
  const isOnSale = product.discount > 0;
  const isOutOfStock = product.stock === 0;

  return (
    <article className="card">
      <div className="card__media">
        <img
          className="card__image"
          src={product.image}
          alt={product.name}
          loading="lazy"
        />

        {/* Badges sobrepostos */}
        <div className="card__badges">
          {product.isNew && <span className="badge badge--new">NOVO</span>}
          {isOnSale && (
            <span className="badge badge--sale">-{product.discount}%</span>
          )}
        </div>

        {/* Favorito */}
        <button
          className={`card__favorite ${
            isFavorite ? 'card__favorite--active' : ''
          }`}
          onClick={() => onToggleFavorite(product.id)}
          aria-label={
            isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
          }
          aria-pressed={isFavorite}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="card__body">
        <div className="card__head">
          <h3 className="card__name">{product.name}</h3>
          <div className="card__pricing">
            <span className="card__price">{formatPrice(product.price)}</span>
            {isOnSale && (
              <span className="card__price-original">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        <p className="card__description">{product.description}</p>

        {/* Estoque */}
        <span className={`card__stock card__stock--${stockStatus.modifier}`}>
          <span className="card__stock-dot" />
          {stockStatus.label}
        </span>

        {/* CTA */}
        <button
          className="card__cart-btn"
          disabled={isOutOfStock}
          onClick={() => onAddToCart(product.id)}
        >
          {isOutOfStock ? 'Esgotado' : 'Adicionar ao Carrinho'}
        </button>
      </div>
    </article>
  );
}
