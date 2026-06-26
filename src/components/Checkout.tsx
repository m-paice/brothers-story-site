import { useState, type FormEvent } from 'react';
import type { CartLine } from './CartDrawer';
import { formatPrice } from '../utils/format';
import { resolveImageUrl } from '../utils/image';
import { createOrder } from '../lib/orders';
import type { NewOrder } from '../types/order';

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

const EMPTY_FORM = {
  nome: '',
  email: '',
  telefone: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  cidade: '',
  uf: '',
};

/** Modal de finalização: dados de contato/entrega e resumo do pedido.
 *  Nesta versão não há pagamento — o pedido é registrado para o admin. */
export function Checkout({
  open,
  lines,
  subtotal,
  onClose,
  onConfirm,
}: CheckoutProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const payload: NewOrder = {
      customer: {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
      },
      shipping: {
        cep: form.cep,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        cidade: form.cidade,
        uf: form.uf.toUpperCase(),
      },
      items: lines.map(({ product, qty }) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        qty,
      })),
      subtotal,
      shipping_fee: shipping,
      total,
    };

    try {
      const order = await createOrder(payload);
      setOrderNumber(order.order_number);
    } catch (err) {
      console.error('Falha ao enviar pedido:', err);
      setError('Não foi possível enviar seu pedido. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fecha e restaura o estado para uma próxima compra.
  const handleClose = () => {
    if (orderNumber) onConfirm();
    setOrderNumber(null);
    setError(null);
    setForm({ ...EMPTY_FORM });
    onClose();
  };

  const done = orderNumber !== null;

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
        aria-label="Finalizar pedido"
        aria-hidden={!open}
      >
        <div className="checkout__header">
          <h2 className="checkout__title">
            {done ? 'Pedido enviado' : 'Finalizar pedido'}
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
            <p className="checkout__success-title">Recebemos seu pedido!</p>
            <p className="checkout__success-order">
              Pedido <strong>#{orderNumber}</strong>
            </p>
            <p className="checkout__success-text">
              Em breve entraremos em contato para confirmar a disponibilidade e
              combinar a forma de pagamento. Anote o número do seu pedido.
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
                  <input
                    id="co-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={form.nome}
                    onChange={(e) => setField('nome', e.target.value)}
                  />
                </div>
                <div className="checkout__row">
                  <div className="checkout__field">
                    <label htmlFor="co-email">E-mail</label>
                    <input
                      id="co-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                    />
                  </div>
                  <div className="checkout__field">
                    <label htmlFor="co-phone">Telefone</label>
                    <input
                      id="co-phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      value={form.telefone}
                      onChange={(e) => setField('telefone', e.target.value)}
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
                      value={form.cep}
                      onChange={(e) => setField('cep', e.target.value)}
                    />
                  </div>
                  <div className="checkout__field">
                    <label htmlFor="co-address">Endereço</label>
                    <input
                      id="co-address"
                      type="text"
                      autoComplete="street-address"
                      required
                      value={form.endereco}
                      onChange={(e) => setField('endereco', e.target.value)}
                    />
                  </div>
                </div>
                <div className="checkout__row">
                  <div className="checkout__field checkout__field--sm">
                    <label htmlFor="co-number">Número</label>
                    <input
                      id="co-number"
                      type="text"
                      required
                      value={form.numero}
                      onChange={(e) => setField('numero', e.target.value)}
                    />
                  </div>
                  <div className="checkout__field">
                    <label htmlFor="co-complement">Complemento</label>
                    <input
                      id="co-complement"
                      type="text"
                      value={form.complemento}
                      onChange={(e) => setField('complemento', e.target.value)}
                    />
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
                      value={form.cidade}
                      onChange={(e) => setField('cidade', e.target.value)}
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
                      value={form.uf}
                      onChange={(e) => setField('uf', e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <p className="checkout__note">
                O pagamento será combinado após a confirmação do pedido por
                nossa equipe.
              </p>
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
                      src={resolveImageUrl(product.image, 200)}
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
                <div className="checkout__total-row checkout__total-row--grand">
                  <dt>Total</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
              </dl>

              {error && <p className="checkout__error">{error}</p>}

              <button
                type="submit"
                className="checkout__primary"
                disabled={lines.length === 0 || submitting}
              >
                {submitting ? 'Enviando…' : 'Enviar pedido'}
              </button>
            </aside>
          </form>
        )}
      </div>
    </>
  );
}
