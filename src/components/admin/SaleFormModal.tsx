import { useMemo, useState, type FormEvent } from 'react';
import { formatPrice } from '../../utils/format';
import { resolveImageUrl } from '../../utils/image';
import {
  PAYMENT_METHOD_META,
  type NewSale,
  type PaymentMethod,
} from '../../types/sale';
import type { Product, ProductVariant } from '../../types/product';

interface SaleFormModalProps {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSave: (payload: NewSale) => Promise<void>;
}

const PAYMENT_ORDER: PaymentMethod[] = ['dinheiro', 'pix', 'cartao', 'prazo'];

const formatDate = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function SaleFormModal({
  open,
  products,
  onClose,
  onSave,
}: SaleFormModalProps) {
  const [search, setSearch] = useState('');
  // Carrinho por variação: variantId -> quantidade
  const [cart, setCart] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('dinheiro');
  const [discountInput, setDiscountInput] = useState('');
  const [dueDaysInput, setDueDaysInput] = useState('30');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseTime] = useState(() => Date.now());

  // Reseta o formulário a cada abertura (padrão sem useEffect).
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSearch('');
      setCart({});
      setCustomerName('');
      setPayment('dinheiro');
      setDiscountInput('');
      setDueDaysInput('30');
      setError(null);
    }
  }

  // Mapa variantId -> { product, variant } para resolver as linhas.
  const variantMap = useMemo(() => {
    const map = new Map<number, { product: Product; variant: ProductVariant }>();
    products.forEach((product) =>
      product.variants.forEach((variant) =>
        map.set(variant.id, { product, variant })
      )
    );
    return map;
  }, [products]);

  // Resultados da busca (apenas produtos com algum estoque).
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((p) => p.stock > 0)
      .filter(
        (p) =>
          term === '' ||
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [products, search]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([vid, qty]) => ({ ...variantMap.get(Number(vid))!, qty }))
        .filter((line) => line.product),
    [cart, variantMap]
  );

  const subtotal = cartLines.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0
  );
  const discount = Math.min(Math.max(Number(discountInput) || 0, 0), subtotal);
  const total = subtotal - discount;
  const dueDays = Number(dueDaysInput) || 0;
  const isPrazo = payment === 'prazo';

  const addVariant = (variant: ProductVariant) => {
    setCart((prev) => {
      const qty = (prev[variant.id] ?? 0) + 1;
      if (qty > variant.stock) return prev;
      return { ...prev, [variant.id]: qty };
    });
  };

  const decVariant = (variantId: number) => {
    setCart((prev) => {
      const qty = (prev[variantId] ?? 0) - 1;
      const next = { ...prev };
      if (qty <= 0) delete next[variantId];
      else next[variantId] = qty;
      return next;
    });
  };

  const removeVariant = (variantId: number) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  };

  const nameRequired = isPrazo && customerName.trim() === '';
  const dueInvalid = isPrazo && dueDays < 1;
  const canSubmit =
    cartLines.length > 0 && !submitting && !nameRequired && !dueInvalid;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const payload: NewSale = {
      customer_name: customerName.trim() || null,
      items: cartLines.map(({ product, variant, qty }) => ({
        id: product.id,
        variant_id: variant.id,
        color: variant.color,
        size: variant.size,
        name: product.name,
        price: product.price,
        qty,
      })),
      subtotal,
      discount,
      total,
      payment_method: payment,
      due_days: isPrazo ? dueDays : null,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Falha ao registrar venda:', err);
      const message =
        err instanceof Error ? err.message : 'Não foi possível registrar a venda.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`checkout__overlay ${
          open ? 'checkout__overlay--visible' : ''
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`checkout ${open ? 'checkout--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Nova venda"
        aria-hidden={!open}
      >
        <div className="checkout__header">
          <h2 className="checkout__title">Nova venda</h2>
          <button
            className="checkout__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form className="checkout__body" onSubmit={handleSubmit}>
          {/* Catálogo + carrinho */}
          <div className="checkout__form">
            <section className="checkout__section">
              <h3 className="checkout__section-title">Produtos</h3>
              <input
                className="admin-search sale-search"
                type="search"
                placeholder="Buscar produto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <ul className="sale-results">
                {results.length === 0 ? (
                  <li className="sale-results__empty">
                    Nenhum produto disponível.
                  </li>
                ) : (
                  results.map((product) => (
                    <li key={product.id} className="sale-result">
                      <img src={resolveImageUrl(product.image, 120)} alt="" />
                      <div className="sale-result__info">
                        <span className="sale-result__name">
                          {product.name}
                        </span>
                        <span className="sale-result__meta">
                          {formatPrice(product.price)}
                        </span>
                        <div className="sale-result__sizes">
                          {product.variants.map((v) => {
                            const inCart = cart[v.id] ?? 0;
                            const disabled = v.stock <= 0 || inCart >= v.stock;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                className="sale-size"
                                onClick={() => addVariant(v)}
                                disabled={disabled}
                                title={
                                  v.stock <= 0
                                    ? 'Esgotado'
                                    : `${v.stock} em estoque`
                                }
                              >
                                {[v.color, v.size].filter(Boolean).join(' ')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="checkout__section">
              <h3 className="checkout__section-title">
                Itens da venda ({cartLines.reduce((s, l) => s + l.qty, 0)})
              </h3>
              {cartLines.length === 0 ? (
                <p className="sale-cart__empty">
                  Toque num tamanho para adicionar à venda.
                </p>
              ) : (
                <ul className="checkout__items">
                  {cartLines.map(({ product, variant, qty }) => (
                    <li key={variant.id} className="checkout__item">
                      <img
                        className="checkout__thumb"
                        src={resolveImageUrl(product.image, 120)}
                        alt=""
                      />
                      <div className="checkout__item-info">
                        <p className="checkout__item-name">
                          {product.name}{' '}
                          <span className="sale-item__size">
                            {[variant.color, variant.size].filter(Boolean).join(' ')}
                          </span>
                        </p>
                        <div className="sale-qty">
                          <button
                            type="button"
                            onClick={() => decVariant(variant.id)}
                            aria-label="Diminuir"
                          >
                            −
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={() => addVariant(variant)}
                            disabled={qty >= variant.stock}
                            aria-label="Aumentar"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="sale-qty__remove"
                            onClick={() => removeVariant(variant.id)}
                            aria-label="Remover"
                            title="Remover"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="15"
                              height="15"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <span className="checkout__item-price">
                        {formatPrice(product.price * qty)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Pagamento + totais */}
          <aside className="checkout__summary">
            <h3 className="checkout__section-title">Pagamento</h3>

            <div className="checkout__field">
              <label htmlFor="sale-customer">
                Cliente{isPrazo ? '' : ' (opcional)'}
              </label>
              <input
                id="sale-customer"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="sale-payments">
              {PAYMENT_ORDER.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`admin-chip ${
                    payment === method ? 'admin-chip--active' : ''
                  }`}
                  onClick={() => setPayment(method)}
                >
                  {PAYMENT_METHOD_META[method].label}
                </button>
              ))}
            </div>

            {isPrazo && (
              <div className="checkout__field">
                <label htmlFor="sale-due">Prazo (dias)</label>
                <input
                  id="sale-due"
                  type="number"
                  min="1"
                  value={dueDaysInput}
                  onChange={(e) => setDueDaysInput(e.target.value)}
                />
                {dueDays >= 1 && (
                  <span className="sale-due-hint">
                    Vence em{' '}
                    {formatDate(new Date(baseTime + dueDays * 86400000))}
                  </span>
                )}
              </div>
            )}

            <div className="checkout__field">
              <label htmlFor="sale-discount">Desconto (R$)</label>
              <input
                id="sale-discount"
                type="number"
                min="0"
                step="0.01"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <dl className="checkout__totals">
              <div className="checkout__total-row">
                <dt>Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="checkout__total-row checkout__total-row--discount">
                  <dt>Desconto</dt>
                  <dd>−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="checkout__total-row checkout__total-row--grand">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>

            {nameRequired && (
              <p className="checkout__error">
                Informe o nome do cliente para venda a prazo.
              </p>
            )}
            {error && <p className="checkout__error">{error}</p>}

            <button
              type="submit"
              className="checkout__primary"
              disabled={!canSubmit}
            >
              {submitting ? 'Registrando…' : 'Registrar venda'}
            </button>
          </aside>
        </form>
      </div>
    </>
  );
}
