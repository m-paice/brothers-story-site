import { useEffect, useMemo, useState } from 'react';
import { fetchOrders, updateOrderStatus } from '../../lib/orders';
import { formatPrice } from '../../utils/format';
import {
  ORDER_STATUS_META,
  type Order,
  type OrderStatus,
} from '../../types/order';
import { isSupabaseConfigured } from '../../lib/supabase';

const STATUSES: OrderStatus[] = [
  'novo',
  'em_contato',
  'confirmado',
  'cancelado',
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchOrders()
      .then(setOrders)
      .catch((err) => console.error('Falha ao carregar pedidos:', err))
      .finally(() => setLoading(false));
  };

  // Carga inicial sem setState síncrono no effect (loading já inicia true).
  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch((err) => console.error('Falha ao carregar pedidos:', err))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () =>
      filter === 'todos'
        ? orders
        : orders.filter((o) => o.status === filter),
    [orders, filter]
  );

  const handleStatus = async (order: Order, status: OrderStatus) => {
    // Atualização otimista
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status } : o))
    );
    try {
      await updateOrderStatus(order.id, status);
    } catch (err) {
      console.error('Falha ao atualizar status:', err);
      load();
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Pedidos</h1>
          <p className="admin-page__subtitle">{orders.length} no total</p>
        </div>
      </div>

      <div className="admin-filters">
        <button
          className={`admin-chip ${filter === 'todos' ? 'admin-chip--active' : ''}`}
          onClick={() => setFilter('todos')}
        >
          Todos ({orders.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`admin-chip ${filter === s ? 'admin-chip--active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {ORDER_STATUS_META[s].label} (
            {orders.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>

      {!isSupabaseConfigured ? (
        <p className="admin-banner">
          Configure o Supabase para receber e gerenciar os pedidos.
        </p>
      ) : loading ? (
        <div className="admin-loading">
          <span className="admin-spinner" aria-hidden="true" />
          <p>Carregando…</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="admin-empty">Nenhum pedido nesta categoria.</p>
      ) : (
        <ul className="orders">
          {visible.map((order) => {
            const isOpen = expanded === order.id;
            return (
              <li key={order.id} className="order-row">
                <button
                  className="order-row__summary"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  aria-expanded={isOpen}
                >
                  <span className="order-row__number">
                    #{order.order_number}
                  </span>
                  <span className="order-row__customer">
                    {order.customer.nome}
                  </span>
                  <span className="order-row__date">
                    {formatDate(order.created_at)}
                  </span>
                  <span
                    className="status-pill"
                    style={{ color: ORDER_STATUS_META[order.status].color }}
                  >
                    {ORDER_STATUS_META[order.status].label}
                  </span>
                  <span className="order-row__total">
                    {formatPrice(Number(order.total))}
                  </span>
                  <span className="order-row__chevron" aria-hidden="true">
                    {isOpen ? '▴' : '▾'}
                  </span>
                </button>

                {isOpen && (
                  <div className="order-detail">
                    <div className="order-detail__cols">
                      <section>
                        <h3 className="order-detail__title">Contato</h3>
                        <p>{order.customer.nome}</p>
                        <p>{order.customer.email}</p>
                        <p>{order.customer.telefone}</p>
                      </section>
                      <section>
                        <h3 className="order-detail__title">Entrega</h3>
                        <p>
                          {order.shipping.endereco}, {order.shipping.numero}
                          {order.shipping.complemento
                            ? ` — ${order.shipping.complemento}`
                            : ''}
                        </p>
                        <p>
                          {order.shipping.cidade}/{order.shipping.uf} ·{' '}
                          {order.shipping.cep}
                        </p>
                      </section>
                    </div>

                    <section>
                      <h3 className="order-detail__title">Itens</h3>
                      <ul className="order-detail__items">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            <span>
                              {item.qty}× {item.name}
                            </span>
                            <span>{formatPrice(item.price * item.qty)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="order-detail__totals">
                        <span>Subtotal</span>
                        <span>{formatPrice(Number(order.subtotal))}</span>
                        <span>Frete</span>
                        <span>
                          {Number(order.shipping_fee) === 0
                            ? 'Grátis'
                            : formatPrice(Number(order.shipping_fee))}
                        </span>
                        <span className="order-detail__grand">Total</span>
                        <span className="order-detail__grand">
                          {formatPrice(Number(order.total))}
                        </span>
                      </div>
                    </section>

                    <div className="order-detail__status">
                      <span className="order-detail__title">
                        Alterar status
                      </span>
                      <div className="order-detail__status-btns">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            className={`admin-chip ${
                              order.status === s ? 'admin-chip--active' : ''
                            }`}
                            onClick={() => handleStatus(order, s)}
                          >
                            {ORDER_STATUS_META[s].label}
                          </button>
                        ))}
                      </div>
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
