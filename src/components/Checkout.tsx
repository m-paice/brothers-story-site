import { useState, type FormEvent } from 'react';
import type { CartLine } from './CartDrawer';
import { formatPrice } from '../utils/format';

type PaymentMethod = 'pix' | 'card' | 'boleto';

interface CheckoutProps {
  open: boolean;
  lines: CartLine[];
  subtotal: number;
  onClose: () => void;
  onConfirm: () => void;
}

// Frete fixo grátis acima desse valor; abaixo, cobra a taxa padrão.
const FREE_SHIPPING_THRESHOLD = 300;
const SHIPPING_FEE = 24.9;

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'pix', label: 'Pix', hint: '5% de desconto' },
  { value: 'card', label: 'Cartão de crédito', hint: 'Em até 12x' },
  { value: 'boleto', label: 'Boleto', hint: 'Aprovação em 1-2 dias úteis' },
];

/** Modal de finalização: dados de entrega, pagamento e resumo do pedido. */
export function Checkout({
  open,
  lines,
  subtotal,
  onClose,
  onConfirm,
}: CheckoutProps) {
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [done, setDone] = useState(false);

  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const pixDiscount = payment === 'pix' ? subtotal * 0.05 : 0;
  const total = subtotal + shipping - pixDiscount;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDone(true);
  };

  // Fecha e restaura o estado para uma próxima compra.
  const handleClose = () => {
    if (done) onConfirm();
    setDone(false);
    setPayment('pix');
    onClose();
  };

  return (
    <>
      <div
        className={`checkout__overlay ${
          open ? 'checkout__overlay--visible' : ''
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`checkout ${open ? 'checkout--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Finalizar compra"
        aria-hidden={!open}
      >
        <div className="checkout__header">
          <h2 className="checkout__title">
            {done ? 'Pedido confirmado' : 'Finalizar compra'}
          </h2>
          <button
            className="checkout__close"
            onClick={handleClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="checkout__success">
            <div className="checkout__success-mark" aria-hidden="true">
              ✓
            </div>
            <p className="checkout__success-title">
              Obrigado pela sua compra!
            </p>
            <p className="checkout__success-text">
              Seu pedido de {count} {count === 1 ? 'item' : 'itens'} no valor de{' '}
              {formatPrice(total)} foi recebido. Enviamos a confirmação por
              e-mail.
            </p>
            <button className="checkout__primary" onClick={handleClose}>
              Voltar à loja
            </button>
          </div>
        ) : (
          <form className="checkout__body" onSubmit={handleSubmit}>
            <div className="checkout__form">
              <section className="checkout__section">
                <h3 className="checkout__section-title">Contato</h3>
                <div className="checkout__field">
                  <label htmlFor="co-name">Nome completo</label>
                  <input id="co-name" type="text" autoComplete="name" required />
                </div>
                <div className="checkout__row">
                  <div className="checkout__field">
                    <label htmlFor="co-email">E-mail</label>
                    <input
                      id="co-email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="checkout__field">
                    <label htmlFor="co-phone">Telefone</label>
                    <input
                      id="co-phone"
                      type="tel"
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="checkout__section">
                <h3 className="checkout__section-title">Entrega</h3>
                <div className="checkout__row">
                  <div className="checkout__field checkout__field--sm">
                    <label htmlFor="co-zip">CEP</label>
                    <input
                      id="co-zip"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      required
                    />
                  </div>
                  <div className="checkout__field">
                    <label htmlFor="co-address">Endereço</label>
                    <input
                      id="co-address"
                      type="text"
                      autoComplete="street-address"
                      required
                    />
                  </div>
                </div>
                <div className="checkout__row">
                  <div className="checkout__field checkout__field--sm">
                    <label htmlFor="co-number">Número</label>
                    <input id="co-number" type="text" required />
                  </div>
                  <div className="checkout__field">
                    <label htmlFor="co-complement">Complemento</label>
                    <input id="co-complement" type="text" />
                  </div>
                </div>
                <div className="checkout__row">
                  <div className="checkout__field">
                    <label htmlFor="co-city">Cidade</label>
                    <input
                      id="co-city"
                      type="text"
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                  <div className="checkout__field checkout__field--sm">
                    <label htmlFor="co-state">UF</label>
                    <input
                      id="co-state"
                      type="text"
                      maxLength={2}
                      autoComplete="address-level1"
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="checkout__section">
                <h3 className="checkout__section-title">Pagamento</h3>
                <div className="checkout__payments">
                  {PAYMENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`checkout__payment ${
                        payment === option.value
                          ? 'checkout__payment--active'
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={option.value}
                        checked={payment === option.value}
                        onChange={() => setPayment(option.value)}
                      />
                      <span className="checkout__payment-label">
                        {option.label}
                      </span>
                      <span className="checkout__payment-hint">
                        {option.hint}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <aside className="checkout__summary">
              <h3 className="checkout__section-title">
                Resumo ({count} {count === 1 ? 'item' : 'itens'})
              </h3>

              <ul className="checkout__items">
                {lines.map(({ product, qty }) => (
                  <li key={product.id} className="checkout__item">
                    <img
                      className="checkout__thumb"
                      src={product.image}
                      alt={product.name}
                    />
                    <div className="checkout__item-info">
                      <p className="checkout__item-name">{product.name}</p>
                      <p className="checkout__item-qty">Qtd: {qty}</p>
                    </div>
                    <span className="checkout__item-price">
                      {formatPrice(product.price * qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="checkout__totals">
                <div className="checkout__total-row">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div className="checkout__total-row">
                  <dt>Frete</dt>
                  <dd>{shipping === 0 ? 'Grátis' : formatPrice(shipping)}</dd>
                </div>
                {pixDiscount > 0 && (
                  <div className="checkout__total-row checkout__total-row--discount">
                    <dt>Desconto Pix</dt>
                    <dd>−{formatPrice(pixDiscount)}</dd>
                  </div>
                )}
                <div className="checkout__total-row checkout__total-row--grand">
                  <dt>Total</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
              </dl>

              <button
                type="submit"
                className="checkout__primary"
                disabled={lines.length === 0}
              >
                Confirmar pedido
              </button>
            </aside>
          </form>
        )}
      </div>
    </>
  );
}
