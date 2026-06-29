import { useEffect, useMemo, useState } from 'react';
import {
  fetchOrders,
  updateOrderStatus,
  updateOrderTracking,
  generateLabel,
} from '../../lib/orders';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import {
  ORDER_STATUS_META,
  type Order,
  type OrderStatus,
} from '../../types/order';
import { isSupabaseConfigured } from '../../lib/supabase';

const STATUSES: OrderStatus[] = [
  'aguardando_pagamento',
  'novo',
  'em_contato',
  'pago',
  'confirmado',
  'enviado',
  'entregue',
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
  const { currentStoreId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>(
    {}
  );

  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleGenerateLabel = async (order: Order) => {
    setActionError(null);
    setGeneratingId(order.id);
    try {
      await generateLabel(order.id);
      load();
    } catch (err) {
      console.error('Falha ao gerar etiqueta:', err);
      setActionError(
        `Etiqueta: ${err instanceof Error ? err.message : 'falha ao gerar.'}`
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSaveTracking = async (order: Order) => {
    const code = (trackingDrafts[order.id] ?? '').trim();
    setActionError(null);
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, tracking_code: code } : o))
    );
    try {
      await updateOrderTracking(order.id, code);
    } catch (err) {
      console.error('Falha ao salvar rastreio:', err);
      setActionError('Não foi possível salvar o código de rastreio.');
      load();
    }
  };

  const load = () => {
    setLoading(true);
    fetchOrders(currentStoreId ?? undefined)
      .then(setOrders)
      .catch((err) => console.error('Falha ao carregar pedidos:', err))
      .finally(() => setLoading(false));
  };

  // Carga inicial sem setState síncrono no effect (loading já inicia true).
  useEffect(() => {
    fetchOrders(currentStoreId ?? undefined)
      .then(setOrders)
      .catch((err) => console.error('Falha ao carregar pedidos:', err))
      .finally(() => setLoading(false));
  }, [currentStoreId]);

  const visible = useMemo(
    () =>
      filter === 'todos'
        ? orders
        : orders.filter((o) => o.status === filter),
    [orders, filter]
  );

  const handleStatus = async (order: Order, status: OrderStatus) => {
    if (order.status === status) return;
    setActionError(null);

    // Atualização otimista
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status } : o))
    );
    try {
      await updateOrderStatus(order.id, status);
    } catch (err) {
      // Trigger de estoque pode bloquear (ex.: estoque insuficiente).
      console.error('Falha ao atualizar status:', err);
      const message =
        err instanceof Error ? err.message : 'Falha ao atualizar o status.';
      setActionError(`Pedido #${order.order_number}: ${message}`);
      load(); // reverte para o estado real do banco
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

      {actionError && (
        <p className="admin-banner admin-banner--error" role="alert">
          {actionError}
        </p>
      )}

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
                        {order.items.map((item, i) => (
                          <li key={item.variant_id ?? `${item.id}-${i}`}>
                            <span>
                              {item.qty}× {item.name}
                              {item.color || item.size
                                ? ` (${[item.color, item.size]
                                    .filter(Boolean)
                                    .join(' ')})`
                                : ''}
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

                    {(order.payment_status || order.payment_id) && (
                      <section>
                        <h3 className="order-detail__title">Pagamento</h3>
                        <p>
                          Status: {order.payment_status ?? '—'}
                          {order.paid_at
                            ? ` · pago em ${formatDate(order.paid_at)}`
                            : ''}
                        </p>
                      </section>
                    )}

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

                    <div className="order-detail__label">
                      <span className="order-detail__title">
                        Etiqueta (SuperFrete)
                      </span>
                      {order.label_url ? (
                        <div className="order-detail__label-row">
                          <a
                            className="admin-btn admin-btn--primary"
                            href={order.label_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Imprimir etiqueta
                          </a>
                          {order.tracking_code && (
                            <span>Rastreio: {order.tracking_code}</span>
                          )}
                        </div>
                      ) : order.status === 'pago' ? (
                        <button
                          className="admin-btn admin-btn--primary"
                          onClick={() => handleGenerateLabel(order)}
                          disabled={generatingId === order.id}
                        >
                          {generatingId === order.id
                            ? 'Gerando…'
                            : 'Gerar etiqueta'}
                        </button>
                      ) : (
                        <p className="order-detail__cols">
                          Disponível depois do pagamento (status “pago”).
                        </p>
                      )}
                    </div>

                    <div className="order-detail__tracking">
                      <span className="order-detail__title">
                        Código de rastreio
                      </span>
                      <div className="order-detail__tracking-row">
                        <input
                          type="text"
                          className="admin-search"
                          placeholder="Ex.: BR123456789BR"
                          value={
                            trackingDrafts[order.id] ?? order.tracking_code ?? ''
                          }
                          onChange={(e) =>
                            setTrackingDrafts((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          className="admin-btn admin-btn--ghost"
                          onClick={() => handleSaveTracking(order)}
                        >
                          Salvar
                        </button>
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
