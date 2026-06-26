import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProduct } from '../lib/products';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';
import { resolveImageUrl } from '../utils/image';
import type { Product } from '../types/product';

// Remonta a cada id (key) para resetar o estado sem setState síncrono no effect.
export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductView key={id} id={Number(id)} />;
}

function ProductView({ id }: { id: number }) {
  const { addItem, isFavorite, toggleFavorite } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let active = true;
    fetchProduct(id)
      .then((p) => {
        if (!active) return;
        setProduct(p);
        // Pré-seleciona o primeiro tamanho com estoque.
        const first = p?.variants.find((v) => v.stock > 0) ?? p?.variants[0];
        setVariantId(first?.id ?? null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="content container">
        <div className="grid-empty">
          <p className="grid-empty__title">Carregando…</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="content container">
        <div className="grid-empty">
          <p className="grid-empty__title">Produto não encontrado</p>
          <Link className="grid-empty__hint" to="/">
            Voltar ao catálogo
          </Link>
        </div>
      </main>
    );
  }

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const maxQty = variant?.stock ?? 0;
  const isOnSale = product.discount > 0;
  const favorite = isFavorite(product.id);

  const selectSize = (vid: number) => {
    setVariantId(vid);
    setQty(1);
  };

  const handleAdd = () => {
    if (!variant || variant.stock <= 0) return;
    addItem(
      {
        variantId: variant.id,
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: variant.size,
      },
      qty
    );
  };

  return (
    <main className="content container">
      <Link to="/" className="pdp__back">
        ← Voltar ao catálogo
      </Link>

      <div className="pdp">
        <div className="pdp__media">
          <img src={resolveImageUrl(product.image, 1000)} alt={product.name} />
          <div className="card__badges">
            {product.isNew && <span className="badge badge--new">NOVO</span>}
            {isOnSale && (
              <span className="badge badge--sale">-{product.discount}%</span>
            )}
          </div>
        </div>

        <div className="pdp__info">
          <span className="pdp__category">{product.category}</span>
          <h1 className="pdp__name">{product.name}</h1>

          <div className="pdp__pricing">
            <span className="pdp__price">{formatPrice(product.price)}</span>
            {isOnSale && (
              <span className="pdp__price-original">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          <p className="pdp__description">{product.description}</p>

          <div className="pdp__sizes">
            <span className="pdp__sizes-label">Tamanho</span>
            <div className="pdp__sizes-list">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  className={`pdp__size ${
                    variantId === v.id ? 'pdp__size--active' : ''
                  }`}
                  onClick={() => selectSize(v.id)}
                  disabled={v.stock <= 0}
                  title={v.stock <= 0 ? 'Esgotado' : undefined}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>

          {variant && (
            <span
              className={`card__stock card__stock--${
                variant.stock === 0 ? 'out' : variant.stock <= 5 ? 'low' : 'in'
              }`}
            >
              <span className="card__stock-dot" />
              {variant.stock === 0
                ? 'Esgotado'
                : variant.stock <= 5
                ? `Restam ${variant.stock}`
                : 'Em estoque'}
            </span>
          )}

          <div className="pdp__actions">
            <div className="pdp__qty">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Diminuir"
              >
                −
              </button>
              <span>{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                aria-label="Aumentar"
              >
                +
              </button>
            </div>

            <button
              className="pdp__add"
              onClick={handleAdd}
              disabled={!variant || variant.stock <= 0}
            >
              {!variant || variant.stock <= 0
                ? 'Esgotado'
                : 'Adicionar ao carrinho'}
            </button>

            <button
              className={`pdp__fav ${favorite ? 'pdp__fav--active' : ''}`}
              onClick={() => toggleFavorite(product.id)}
              aria-label={
                favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
              }
              aria-pressed={favorite}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
