import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyOrders } from '../../lib/orders';
import { formatPrice } from '../../utils/format';
import { ORDER_STATUS_META, ORDER_TIMELINE, type Order } from '../../types/order';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Linha do tempo do pedido. */
function Timeline({ order }: { order: Order }) {
  if (order.status === 'cancelado') {
    return <p className="timeline__cancelled">Este pedido foi cancelado.</p>;
  }
  const effective =
    order.status === 'novo' || order.status === 'em_contato'
      ? 'pago'
      : order.status;
  const currentIndex = ORDER_TIMELINE.findIndex((s) => s.status === effective);

  return (
    <ol className="timeline">
      {ORDER_TIMELINE.map((step, i) => {
        const state =
          i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'todo';
        return (
          <li key={step.status} className={`timeline__step timeline__step--${state}`}>
            <span className="timeline__dot" />
            <span className="timeline__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function AccountOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .catch((err) => console.error('Falha ao carregar pedidos:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="account__title">Meus pedidos</h1>

      {loading ? (
        <p className="account__hint">Carregando…</p>
      ) : orders.length === 0 ? (
        <div className="account__empty">
          <p>Você ainda não tem pedidos.</p>
          <Link to="/" className="payres__btn">
            Ir às compras
          </Link>
        </div>
      ) : (
        <ul className="account__orders">
          {orders.map((order) => {
            const isOpen = expanded === order.id;
            return (
              <li key={order.id} className="account-order">
                <button
                  className="account-order__summary"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  aria-expanded={isOpen}
                >
                  <span className="account-order__number">
                    #{order.order_number}
                  </span>
                  <span className="account-order__date">
                    {formatDate(order.created_at)}
                  </span>
                  <span
                    className="status-pill"
                    style={{ color: ORDER_STATUS_META[order.status].color }}
                  >
                    {ORDER_STATUS_META[order.status].label}
                  </span>
                  <span className="account-order__total">
                    {formatPrice(Number(order.total))}
                  </span>
                  <span className="account-order__chevron" aria-hidden="true">
                    {isOpen ? '▴' : '▾'}
                  </span>
                </button>

                {isOpen && (
                  <div className="account-order__detail">
                    <Timeline order={order} />

                    {order.tracking_code && (
                      <p className="account-order__tracking">
                        Código de rastreio: <strong>{order.tracking_code}</strong>
                      </p>
                    )}

                    <ul className="account-order__items">
                      {order.items.map((item, i) => (
                        <li key={item.variant_id ?? `${item.id}-${i}`}>
                          <span>
                            {item.qty}× {item.name}
                            {item.size ? ` (${item.size})` : ''}
                          </span>
                          <span>{formatPrice(item.price * item.qty)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="account-order__total-row">
                      <span>Total</span>
                      <span>{formatPrice(Number(order.total))}</span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
