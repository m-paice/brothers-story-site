import type { Product } from '../types/product';
import { formatPrice } from '../utils/format';

export interface CartLine {
  product: Product;
  qty: number;
}

interface CartDrawerProps {
  open: boolean;
  lines: CartLine[];
  total: number;
  onClose: () => void;
  onInc: (id: number) => void;
  onDec: (id: number) => void;
  onRemove: (id: number) => void;
}

/** Drawer do carrinho: desliza pela direita (desktop) ou por baixo (mobile). */
export function CartDrawer({
  open,
  lines,
  total,
  onClose,
  onInc,
  onDec,
  onRemove,
}: CartDrawerProps) {
  const count = lines.reduce((sum, line) => sum + line.qty, 0);

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

        {lines.length === 0 ? (
          <div className="drawer__empty">
            <p>Seu carrinho está vazio.</p>
            <button className="drawer__continue" onClick={onClose}>
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <ul className="drawer__list">
              {lines.map(({ product, qty }) => (
                <li key={product.id} className="drawer__item">
                  <img
                    className="drawer__thumb"
                    src={product.image}
                    alt={product.name}
                  />
                  <div className="drawer__info">
                    <p className="drawer__name">{product.name}</p>
                    <p className="drawer__price">
                      {formatPrice(product.price)}
                    </p>
                    <div className="drawer__qty">
                      <button
                        onClick={() => onDec(product.id)}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span>{qty}</span>
                      <button
                        onClick={() => onInc(product.id)}
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    className="drawer__remove"
                    onClick={() => onRemove(product.id)}
                    aria-label={`Remover ${product.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <div className="drawer__footer">
              <button className="drawer__checkout">
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
