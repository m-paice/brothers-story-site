import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrders } from '../../lib/orders';
import { fetchProducts } from '../../lib/products';
import { formatPrice } from '../../utils/format';
import {
  ORDER_STATUS_META,
  type Order,
  type OrderStatus,
} from '../../types/order';
import type { Product } from '../../types/product';

const STATUSES: OrderStatus[] = [
  'novo',
  'em_contato',
  'confirmado',
  'cancelado',
];

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchProducts()])
      .then(([o, p]) => {
        setOrders(o);
        setProducts(p);
      })
      .catch((err) => console.error('Falha ao carregar dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const novos = orders.filter((o) => o.status === 'novo').length;
    const confirmados = orders.filter((o) => o.status === 'confirmado');
    const receita = confirmados.reduce((sum, o) => sum + Number(o.total), 0);
    const baixoEstoque = products.filter(
      (p) => p.stock > 0 && p.stock <= 5
    ).length;
    const semEstoque = products.filter((p) => p.stock === 0).length;

    const byStatus = STATUSES.map((s) => ({
      status: s,
      count: orders.filter((o) => o.status === s).length,
    }));
    const maxStatus = Math.max(1, ...byStatus.map((b) => b.count));

    return {
      totalPedidos: orders.length,
      novos,
      receita,
      totalProdutos: products.length,
      baixoEstoque,
      semEstoque,
      byStatus,
      maxStatus,
    };
  }, [orders, products]);

  const recent = orders.slice(0, 6);

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
        <h1 className="admin-page__title">Dashboard</h1>
        <p className="admin-page__subtitle">Visão geral da loja</p>
      </div>

      <div className="dash__cards">
        <article className="stat-card">
          <span className="stat-card__label">Pedidos</span>
          <strong className="stat-card__value">{stats.totalPedidos}</strong>
          <span className="stat-card__hint">{stats.novos} novo(s)</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Receita confirmada</span>
          <strong className="stat-card__value">
            {formatPrice(stats.receita)}
          </strong>
          <span className="stat-card__hint">pedidos confirmados</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Produtos</span>
          <strong className="stat-card__value">{stats.totalProdutos}</strong>
          <span className="stat-card__hint">no catálogo</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Estoque crítico</span>
          <strong className="stat-card__value">
            {stats.baixoEstoque + stats.semEstoque}
          </strong>
          <span className="stat-card__hint">
            {stats.semEstoque} esgotado(s) · {stats.baixoEstoque} baixo(s)
          </span>
        </article>
      </div>

      <div className="dash__grid">
        <section className="admin-panel">
          <h2 className="admin-panel__title">Pedidos por status</h2>
          <div className="bars">
            {stats.byStatus.map(({ status, count }) => (
              <div key={status} className="bars__row">
                <span className="bars__label">
                  {ORDER_STATUS_META[status].label}
                </span>
                <div className="bars__track">
                  <div
                    className="bars__fill"
                    style={{
                      width: `${(count / stats.maxStatus) * 100}%`,
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

          {recent.length === 0 ? (
            <p className="admin-empty">Nenhum pedido ainda.</p>
          ) : (
            <ul className="recent">
              {recent.map((order) => (
                <li key={order.id} className="recent__item">
                  <div className="recent__info">
                    <span className="recent__number">#{order.order_number}</span>
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
    </div>
  );
}
