import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { CartEntry } from '../types/cart';
import { formatPrice } from '../utils/format';
import { resolveImageUrl } from '../utils/image';
import { createOrder } from '../lib/orders';
import { startPayment } from '../lib/payments';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { fetchProfile, fetchAddresses } from '../lib/account';
import { quoteShipping, type ShippingOption } from '../lib/shipping';
import { fetchCep } from '../lib/cep';
import type { Address } from '../types/account';
import type { NewOrder } from '../types/order';

interface CheckoutProps {
  open: boolean;
  entries: CartEntry[];
  subtotal: number;
  onClose: () => void;
  onConfirm: () => void;
}

const EMPTY_FORM = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
};

/** Modal de finalização: dados de contato/entrega e resumo do pedido.
 *  Nesta versão não há pagamento — o pedido é registrado para o admin. */
export function Checkout({
  open,
  entries,
  subtotal,
  onClose,
  onConfirm,
}: CheckoutProps) {
  const { session } = useAuth();
  const { storeId } = useTenant();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Frete (SuperFrete)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Compra exige login (quando há Supabase). Offline segue como guest.
  const needsLogin = isSupabaseConfigured && !session;

  const applyAddress = (a: Address) => {
    // Limpa cotação anterior: o CEP mudou, o frete precisa ser recalculado.
    setShippingOptions([]);
    setShippingId(null);
    setForm((f) => ({
      ...f,
      cep: a.cep,
      endereco: a.endereco,
      numero: a.numero,
      complemento: a.complemento,
      bairro: a.bairro,
      cidade: a.cidade,
      uf: a.uf,
    }));
  };

  // Ao abrir logado: pré-preenche contato (perfil) e endereço padrão (salvos).
  useEffect(() => {
    if (!open || !session) return;
    const email = session.user?.email ?? '';
    fetchProfile()
      .then((p) =>
        setForm((f) => ({
          ...f,
          nome: f.nome || p?.nome || '',
          email: f.email || email,
          telefone: f.telefone || p?.telefone || '',
          cpf: f.cpf || p?.cpf || '',
        }))
      )
      .catch(() => {});
    fetchAddresses()
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.is_default) ?? list[0];
        if (def) applyAddress(def);
      })
      .catch(() => {});
  }, [open, session]);

  const count = entries.reduce((sum, e) => sum + e.qty, 0);
  const selectedShipping =
    shippingOptions.find((o) => o.id === shippingId) ?? null;
  const shipping = selectedShipping?.price ?? 0;
  const total = subtotal + shipping;

  const handleQuote = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length < 8) {
      setQuoteError('Informe um CEP válido.');
      return;
    }
    setQuoting(true);
    setQuoteError(null);
    setShippingOptions([]);
    setShippingId(null);
    try {
      const options = await quoteShipping(cep, entries, storeId ?? undefined);
      if (options.length === 0) {
        setQuoteError('Nenhuma opção de frete para este CEP.');
      }
      setShippingOptions(options);
      // Pré-seleciona a mais barata.
      const cheapest = [...options].sort((a, b) => a.price - b.price)[0];
      if (cheapest) setShippingId(cheapest.id);
    } catch (err) {
      console.error('Falha ao cotar frete:', err);
      setQuoteError('Não foi possível calcular o frete. Tente novamente.');
    } finally {
      setQuoting(false);
    }
  };

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // CEP: limpa o frete e preenche endereço automaticamente (ViaCEP).
  const handleCepChange = (value: string) => {
    setShippingOptions([]);
    setShippingId(null);
    setForm((prev) => ({ ...prev, cep: value }));
    if (value.replace(/\D/g, '').length === 8) {
      fetchCep(value).then((r) => {
        if (!r) return;
        setForm((prev) => ({
          ...prev,
          endereco: r.endereco || prev.endereco,
          bairro: r.bairro || prev.bairro,
          cidade: r.cidade || prev.cidade,
          uf: r.uf || prev.uf,
        }));
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (isSupabaseConfigured && shippingId === null) {
      setError('Calcule e escolha o frete antes de continuar.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const customer = {
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      cpf: form.cpf,
    };
    const shippingData = {
      cep: form.cep,
      endereco: form.endereco,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf.toUpperCase(),
    };

    // Com Supabase configurado: pagamento real (redireciona ao Mercado Pago).
    if (isSupabaseConfigured) {
      try {
        const { init_point, order_number } = await startPayment({
          entries,
          customer,
          shipping: shippingData,
          shipping_option_id: shippingId!,
          storeId: storeId ?? undefined,
        });
        // Guarda o nº do pedido para exibir no retorno (sobrevive ao redirect).
        sessionStorage.setItem('ef:lastOrder', order_number);
        window.location.assign(init_point);
        return; // sai da loja para o checkout do Mercado Pago
      } catch (err) {
        console.error('Falha ao iniciar pagamento:', err);
        setError('Não foi possível iniciar o pagamento. Tente novamente.');
        setSubmitting(false);
        return;
      }
    }

    // Fallback offline (dev sem Supabase): registra um pedido simulado.
    const payload: NewOrder = {
      customer,
      shipping: shippingData,
      items: entries.map((e) => ({
        id: e.productId,
        variant_id: e.variantId,
        color: e.color,
        size: e.size,
        name: e.name,
        price: e.price,
        qty: e.qty,
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
    setShippingOptions([]);
    setShippingId(null);
    setQuoteError(null);
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

        {needsLogin ? (
          <div className="checkout__success">
            <div className="checkout__success-mark" aria-hidden="true">
              👤
            </div>
            <p className="checkout__success-title">Entre para finalizar</p>
            <p className="checkout__success-text">
              Você precisa estar logado para concluir a compra e acompanhar seu
              pedido.
            </p>
            <Link to="/entrar?next=/" className="checkout__primary" onClick={onClose}>
              Entrar ou criar conta
            </Link>
          </div>
        ) : done ? (
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
                <div className="checkout__field">
                  <label htmlFor="co-cpf">CPF</label>
                  <input
                    id="co-cpf"
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Para a nota e a etiqueta de envio"
                    value={form.cpf}
                    onChange={(e) => setField('cpf', e.target.value)}
                  />
                </div>
              </section>

              <section className="checkout__section">
                <h3 className="checkout__section-title">Entrega</h3>

                {addresses.length > 0 && (
                  <div className="checkout__field">
                    <label htmlFor="co-saved">Endereço salvo</label>
                    <select
                      id="co-saved"
                      className="sort__select"
                      onChange={(e) => {
                        const a = addresses.find((x) => x.id === e.target.value);
                        if (a) applyAddress(a);
                      }}
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {(a.label || a.endereco) + ` — ${a.cidade}/${a.uf}`}
                          {a.is_default ? ' (padrão)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                      onChange={(e) => handleCepChange(e.target.value)}
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
                    <label htmlFor="co-district">Bairro</label>
                    <input
                      id="co-district"
                      type="text"
                      value={form.bairro}
                      onChange={(e) => setField('bairro', e.target.value)}
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
                {isSupabaseConfigured
                  ? 'Você será redirecionado ao Mercado Pago para pagar com Pix ou cartão de crédito com segurança.'
                  : 'O pagamento será combinado após a confirmação do pedido por nossa equipe.'}
              </p>
            </div>

            <aside className="checkout__summary">
              <h3 className="checkout__section-title">
                Resumo ({count} {count === 1 ? 'item' : 'itens'})
              </h3>

              <ul className="checkout__items">
                {entries.map((e) => (
                  <li key={e.variantId} className="checkout__item">
                    <img
                      className="checkout__thumb"
                      src={resolveImageUrl(e.image, 200)}
                      alt={e.name}
                    />
                    <div className="checkout__item-info">
                      <p className="checkout__item-name">{e.name}</p>
                      <p className="checkout__item-qty">
                        {e.color ? `${e.color} · ` : ''}Tam. {e.size} · Qtd:{' '}
                        {e.qty}
                      </p>
                    </div>
                    <span className="checkout__item-price">
                      {formatPrice(e.price * e.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Frete */}
              <div className="checkout__freight">
                <button
                  type="button"
                  className="checkout__freight-btn"
                  onClick={handleQuote}
                  disabled={quoting}
                >
                  {quoting ? 'Calculando…' : 'Calcular frete'}
                </button>

                {quoteError && <p className="checkout__error">{quoteError}</p>}

                {shippingOptions.length > 0 && (
                  <div className="freight-options">
                    {shippingOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={`freight-option ${
                          shippingId === opt.id ? 'freight-option--active' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="frete"
                          checked={shippingId === opt.id}
                          onChange={() => setShippingId(opt.id)}
                        />
                        <span className="freight-option__name">
                          {opt.name}
                          {opt.company ? ` · ${opt.company}` : ''}
                        </span>
                        <span className="freight-option__meta">
                          {opt.delivery_time != null
                            ? `${opt.delivery_time} dia(s)`
                            : ''}
                        </span>
                        <span className="freight-option__price">
                          {formatPrice(opt.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <dl className="checkout__totals">
                <div className="checkout__total-row">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div className="checkout__total-row">
                  <dt>Frete</dt>
                  <dd>
                    {selectedShipping
                      ? formatPrice(shipping)
                      : 'calcule o frete'}
                  </dd>
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
                disabled={
                  entries.length === 0 ||
                  submitting ||
                  (isSupabaseConfigured && shippingId === null)
                }
              >
                {submitting
                  ? 'Processando…'
                  : isSupabaseConfigured
                  ? 'Ir para o pagamento'
                  : 'Enviar pedido'}
              </button>
            </aside>
          </form>
        )}
      </div>
    </>
  );
}
