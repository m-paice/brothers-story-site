import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrders } from '../../lib/orders';
import { fetchProducts } from '../../lib/products';
import { fetchSales } from '../../lib/sales';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import {
  ORDER_STATUS_META,
  type Order,
  type OrderStatus,
} from '../../types/order';
import {
  PAYMENT_METHOD_META,
  SALE_STATUS_META,
  getSaleStatus,
  type PaymentMethod,
  type Sale,
} from '../../types/sale';
import type { Product } from '../../types/product';

const ORDER_STATUSES: OrderStatus[] = [
  'aguardando_pagamento',
  'pago',
  'confirmado',
  'enviado',
  'entregue',
  'novo',
  'em_contato',
  'cancelado',
];

const PAYMENTS: PaymentMethod[] = ['dinheiro', 'pix', 'cartao', 'prazo'];

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  dinheiro: 'var(--color-success)',
  pix: 'var(--color-secondary)',
  cartao: 'var(--color-accent)',
  prazo: 'var(--color-warning)',
};

type Period = 'hoje' | '7d' | '30d' | 'mes' | 'tudo';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'tudo', label: 'Tudo' },
];

// Início do período (ms epoch) a partir de "agora" — null = sem limite.
function periodStart(period: Period, now: number): number | null {
  const d = new Date(now);
  switch (period) {
    case 'hoje':
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    case '7d':
      return now - 7 * 86400000;
    case '30d':
      return now - 30 * 86400000;
    case 'mes':
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    default:
      return null;
  }
}

export function Dashboard() {
  const { currentStoreId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  // "agora" capturado uma vez (impureza só no inicializador do useState).
  const [now] = useState(() => Date.now());

  // Filtra pedidos/vendas pelo período selecionado (por created_at).
  const since = periodStart(period, now);
  const periodOrders = useMemo(
    () =>
      since === null
        ? orders
        : orders.filter((o) => new Date(o.created_at).getTime() >= since),
    [orders, since]
  );
  const periodSales = useMemo(
    () =>
      since === null
        ? sales
        : sales.filter((s) => new Date(s.created_at).getTime() >= since),
    [sales, since]
  );

  // Carregados de forma independente: uma falha em um não derruba os demais.
  useEffect(() => {
    const sid = currentStoreId ?? undefined;
    fetchOrders(sid)
      .then(setOrders)
      .catch((err) => console.error('Falha ao carregar pedidos:', err))
      .finally(() => setLoading(false));
    fetchProducts(sid)
      .then(setProducts)
      .catch((err) => console.error('Falha ao carregar produtos:', err));
    fetchSales(sid)
      .then(setSales)
      .catch((err) => console.error('Falha ao carregar vendas:', err));
  }, [currentStoreId]);

  const orderStats = useMemo(() => {
    const novos = periodOrders.filter((o) => o.status === 'novo').length;
    const receita = periodOrders
      .filter((o) => o.status === 'confirmado' || o.status === 'pago')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const byStatus = ORDER_STATUSES.map((s) => ({
      status: s,
      count: periodOrders.filter((o) => o.status === s).length,
    }));
    const maxStatus = Math.max(1, ...byStatus.map((b) => b.count));

    return { total: periodOrders.length, novos, receita, byStatus, maxStatus };
  }, [periodOrders]);

  const saleStats = useMemo(() => {
    const withStatus = periodSales.map((s) => ({
      sale: s,
      status: getSaleStatus(s),
    }));
    const recebido = periodSales
      .filter((s) => s.paid)
      .reduce((sum, s) => sum + Number(s.total), 0);
    const aReceber = periodSales
      .filter((s) => !s.paid)
      .reduce((sum, s) => sum + Number(s.total), 0);
    const vencidas = withStatus.filter((s) => s.status === 'vencido');

    const byPayment = PAYMENTS.map((method) => ({
      method,
      total: periodSales
        .filter((s) => s.payment_method === method)
        .reduce((sum, s) => sum + Number(s.total), 0),
    }));
    const maxPay = Math.max(1, ...byPayment.map((b) => b.total));

    return {
      total: periodSales.length,
      recebido,
      aReceber,
      vencidasCount: vencidas.length,
      vencidasTotal: vencidas.reduce((sum, s) => sum + Number(s.sale.total), 0),
      byPayment,
      maxPay,
    };
  }, [periodSales]);

  const catalog = useMemo(() => {
    const baixo = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const semEstoque = products.filter((p) => p.stock === 0).length;
    return { total: products.length, baixo, semEstoque };
  }, [products]);

  const recentOrders = periodOrders.slice(0, 6);
  const recentSales = periodSales.slice(0, 6);

  if (loading) {
    return (
      <div className="admin-loading">
        <span className="admin-spinner" aria-hidden="true" />
        <p>Carregando…</p>
      </div>
    );
  }

  return (
    <div className="dash">
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Dashboard</h1>
          <p className="admin-page__subtitle">Visão geral da loja</p>
        </div>
        <div className="admin-filters dash__period">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`admin-chip ${
                period === p.value ? 'admin-chip--active' : ''
              }`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Pedidos (loja online) ---- */}
      <h2 className="dash__section-title">Pedidos · loja online</h2>

      <div className="dash__cards">
        <article className="stat-card">
          <span className="stat-card__label">Pedidos</span>
          <strong className="stat-card__value">{orderStats.total}</strong>
          <span className="stat-card__hint">{orderStats.novos} novo(s)</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Receita de pedidos</span>
          <strong className="stat-card__value">
            {formatPrice(orderStats.receita)}
          </strong>
          <span className="stat-card__hint">pagos/confirmados no período</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Produtos</span>
          <strong className="stat-card__value">{catalog.total}</strong>
          <span className="stat-card__hint">no catálogo</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Estoque crítico</span>
          <strong className="stat-card__value">
            {catalog.baixo + catalog.semEstoque}
          </strong>
          <span className="stat-card__hint">
            {catalog.semEstoque} esgotado(s) · {catalog.baixo} baixo(s)
          </span>
        </article>
      </div>

      <div className="dash__grid">
        <section className="admin-panel">
          <h2 className="admin-panel__title">Pedidos por status</h2>
          <div className="bars">
            {orderStats.byStatus.map(({ status, count }) => (
              <div key={status} className="bars__row">
                <span className="bars__label">
                  {ORDER_STATUS_META[status].label}
                </span>
                <div className="bars__track">
                  <div
                    className="bars__fill"
                    style={{
                      width: `${(count / orderStats.maxStatus) * 100}%`,
                      background: ORDER_STATUS_META[status].color,
                    }}
                  />
                </div>
                <span className="bars__count">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">Pedidos recentes</h2>
            <Link className="admin-panel__link" to="/admin/pedidos">
              Ver todos
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="admin-empty">Nenhum pedido ainda.</p>
          ) : (
            <ul className="recent">
              {recentOrders.map((order) => (
                <li key={order.id} className="recent__item">
                  <div className="recent__info">
                    <span className="recent__number">
                      #{order.order_number}
                    </span>
                    <span className="recent__name">{order.customer.nome}</span>
                  </div>
                  <span
                    className="status-pill"
                    style={{ color: ORDER_STATUS_META[order.status].color }}
                  >
                    {ORDER_STATUS_META[order.status].label}
                  </span>
                  <span className="recent__total">
                    {formatPrice(Number(order.total))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ---- Vendas (balcão) ---- */}
      <h2 className="dash__section-title">Vendas · balcão</h2>

      <div className="dash__cards">
        <article className="stat-card">
          <span className="stat-card__label">Vendas</span>
          <strong className="stat-card__value">{saleStats.total}</strong>
          <span className="stat-card__hint">no total</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Receita recebida</span>
          <strong className="stat-card__value">
            {formatPrice(saleStats.recebido)}
          </strong>
          <span className="stat-card__hint">vendas pagas</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">A receber</span>
          <strong className="stat-card__value">
            {formatPrice(saleStats.aReceber)}
          </strong>
          <span className="stat-card__hint">vendas a prazo em aberto</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Vencidas</span>
          <strong className="stat-card__value">
            {saleStats.vencidasCount}
          </strong>
          <span className="stat-card__hint">
            {formatPrice(saleStats.vencidasTotal)} em atraso
          </span>
        </article>
      </div>

      <div className="dash__grid">
        <section className="admin-panel">
          <h2 className="admin-panel__title">Vendas por forma de pagamento</h2>
          <div className="bars">
            {saleStats.byPayment.map(({ method, total }) => (
              <div key={method} className="bars__row">
                <span className="bars__label">
                  {PAYMENT_METHOD_META[method].label}
                </span>
                <div className="bars__track">
                  <div
                    className="bars__fill"
                    style={{
                      width: `${(total / saleStats.maxPay) * 100}%`,
                      background: PAYMENT_COLORS[method],
                    }}
                  />
                </div>
                <span className="bars__count">{formatPrice(total)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">Vendas recentes</h2>
            <Link className="admin-panel__link" to="/admin/vendas">
              Ver todas
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <p className="admin-empty">Nenhuma venda ainda.</p>
          ) : (
            <ul className="recent">
              {recentSales.map((sale) => {
                const status = getSaleStatus(sale);
                return (
                  <li key={sale.id} className="recent__item">
                    <div className="recent__info">
                      <span className="recent__number">
                        #{sale.sale_number}
                      </span>
                      <span className="recent__name">
                        {sale.customer_name || '—'} ·{' '}
                        {PAYMENT_METHOD_META[sale.payment_method].label}
                      </span>
                    </div>
                    <span
                      className="status-pill"
                      style={{ color: SALE_STATUS_META[status].color }}
                    >
                      {SALE_STATUS_META[status].label}
                    </span>
                    <span className="recent__total">
                      {formatPrice(Number(sale.total))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
