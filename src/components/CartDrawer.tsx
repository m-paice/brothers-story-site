import type { CartEntry } from '../types/cart';
import { formatPrice } from '../utils/format';
import { resolveImageUrl } from '../utils/image';

interface CartDrawerProps {
  open: boolean;
  entries: CartEntry[];
  total: number;
  onClose: () => void;
  onInc: (variantId: number) => void;
  onDec: (variantId: number) => void;
  onRemove: (variantId: number) => void;
  onCheckout: () => void;
}

/** Drawer do carrinho: desliza pela direita (desktop) ou por baixo (mobile). */
export function CartDrawer({
  open,
  entries,
  total,
  onClose,
  onInc,
  onDec,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  const count = entries.reduce((sum, e) => sum + e.qty, 0);

  return (
    <>
      <div
        className={`drawer__overlay ${open ? 'drawer__overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`drawer ${open ? 'drawer--open' : ''}`}
        aria-label="Carrinho de compras"
        aria-hidden={!open}
      >
        <div className="drawer__header">
          <h2 className="drawer__title">Seu Carrinho ({count})</h2>
          <button
            className="drawer__close"
            onClick={onClose}
            aria-label="Fechar carrinho"
          >
            ✕
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="drawer__empty">
            <p>Seu carrinho está vazio.</p>
            <button className="drawer__continue" onClick={onClose}>
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <ul className="drawer__list">
              {entries.map((entry) => (
                <li key={entry.variantId} className="drawer__item">
                  <img
                    className="drawer__thumb"
                    src={resolveImageUrl(entry.image, 200)}
                    alt={entry.name}
                  />
                  <div className="drawer__info">
                    <p className="drawer__name">{entry.name}</p>
                    <p className="drawer__size">Tamanho: {entry.size}</p>
                    <p className="drawer__price">{formatPrice(entry.price)}</p>
                    <div className="drawer__qty">
                      <button
                        onClick={() => onDec(entry.variantId)}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span>{entry.qty}</span>
                      <button
                        onClick={() => onInc(entry.variantId)}
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    className="drawer__remove"
                    onClick={() => onRemove(entry.variantId)}
                    aria-label={`Remover ${entry.name}`}
                    title="Remover"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
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
                </li>
              ))}
            </ul>

            <div className="drawer__footer">
              <button className="drawer__checkout" onClick={onCheckout}>
                <span>Finalizar compra</span>
                <span>{formatPrice(total)}</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
