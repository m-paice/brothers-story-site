import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProduct } from '../lib/products';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';
import { resolveImageUrl } from '../utils/image';
import { colorToHex } from '../utils/color';
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
  const [selColor, setSelColor] = useState<string | null>(null);
  const [selSize, setSelSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetchProduct(id)
      .then((p) => {
        if (!active || !p) return;
        setProduct(p);
        // Pré-seleciona a 1ª cor com estoque e o 1º tamanho dessa cor.
        const colors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))];
        const color =
          colors.find((c) => p.variants.some((v) => v.color === c && v.stock > 0)) ??
          colors[0] ??
          null;
        const pool = color ? p.variants.filter((v) => v.color === color) : p.variants;
        const size = (pool.find((v) => v.stock > 0) ?? pool[0])?.size ?? null;
        setSelColor(color);
        setSelSize(size);
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

  // Cores e tamanhos (estoque por combinação).
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))];
  const hasColor = colors.length > 0;
  const sizePool = hasColor
    ? product.variants.filter((v) => v.color === selColor)
    : product.variants;
  const sizes = [...new Set(sizePool.map((v) => v.size))];
  const stockOfSize = (size: string) =>
    sizePool.find((v) => v.size === size)?.stock ?? 0;
  const colorHasStock = (color: string) =>
    product.variants.some((v) => v.color === color && v.stock > 0);

  const variant =
    product.variants.find(
      (v) => (hasColor ? v.color === selColor : true) && v.size === selSize
    ) ?? null;
  const maxQty = variant?.stock ?? 0;
  const isOnSale = product.discount > 0;
  const favorite = isFavorite(product.id);

  const gallery = product.images.length > 0 ? product.images : [product.image];
  const current = Math.min(imgIndex, gallery.length - 1);
  const showImg = (i: number) =>
    setImgIndex(((i % gallery.length) + gallery.length) % gallery.length);

  const selectColor = (c: string) => {
    setSelColor(c);
    const pool = product.variants.filter((v) => v.color === c);
    setSelSize((pool.find((v) => v.stock > 0) ?? pool[0])?.size ?? null);
    setQty(1);
  };
  const selectSize = (s: string) => {
    setSelSize(s);
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
        color: variant.color,
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
        <div className="pdp__gallery">
          <div className="pdp__media">
            <img
              src={resolveImageUrl(gallery[current], 1000)}
              alt={product.name}
            />
            <div className="card__badges">
              {product.isNew && <span className="badge badge--new">NOVO</span>}
              {isOnSale && (
                <span className="badge badge--sale">-{product.discount}%</span>
              )}
            </div>
            {gallery.length > 1 && (
              <>
                <button
                  className="pdp__nav pdp__nav--prev"
                  onClick={() => showImg(current - 1)}
                  aria-label="Imagem anterior"
                >
                  ‹
                </button>
                <button
                  className="pdp__nav pdp__nav--next"
                  onClick={() => showImg(current + 1)}
                  aria-label="Próxima imagem"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="pdp__thumbs">
              {gallery.map((url, i) => (
                <button
                  key={i}
                  className={`pdp__thumb ${
                    i === current ? 'pdp__thumb--active' : ''
                  }`}
                  onClick={() => setImgIndex(i)}
                  aria-label={`Imagem ${i + 1}`}
                >
                  <img src={resolveImageUrl(url, 160)} alt="" />
                </button>
              ))}
            </div>
          )}
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

          {hasColor && (
            <div className="pdp__sizes">
              <span className="pdp__sizes-label">
                Cor{selColor ? `: ${selColor}` : ''}
              </span>
              <div className="pdp__sizes-list">
                {colors.map((c) => {
                  const hex = colorToHex(c);
                  const out = !colorHasStock(c);
                  return (
                    <button
                      key={c}
                      className={`pdp__color ${
                        selColor === c ? 'pdp__color--active' : ''
                      }`}
                      onClick={() => selectColor(c)}
                      disabled={out}
                      title={out ? 'Esgotado' : c}
                    >
                      {hex && (
                        <span
                          className="pdp__swatch"
                          style={{ background: hex }}
                          aria-hidden="true"
                        />
                      )}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pdp__sizes">
            <span className="pdp__sizes-label">Tamanho</span>
            <div className="pdp__sizes-list">
              {sizes.map((s) => {
                const stock = stockOfSize(s);
                return (
                  <button
                    key={s}
                    className={`pdp__size ${
                      selSize === s ? 'pdp__size--active' : ''
                    }`}
                    onClick={() => selectSize(s)}
                    disabled={stock <= 0}
                    title={stock <= 0 ? 'Esgotado' : undefined}
                  >
                    {s}
                  </button>
                );
              })}
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
