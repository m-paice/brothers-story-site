import { useEffect, useMemo, useState } from 'react';
import { createSale, fetchSales, markSalePaid, deleteSale } from '../../lib/sales';
import { fetchProducts } from '../../lib/products';
import { SaleFormModal } from '../../components/admin/SaleFormModal';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  PAYMENT_METHOD_META,
  SALE_STATUS_META,
  getSaleStatus,
  type NewSale,
  type Sale,
  type SaleStatus,
} from '../../types/sale';
import type { Product } from '../../types/product';

type Filter = 'todas' | SaleStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'aberto', label: 'Em aberto' },
  { value: 'vencido', label: 'Vencidas' },
  { value: 'pago', label: 'Pagas' },
];

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');

export function SalesAdmin() {
  const { currentStoreId } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('todas');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    // Carregados de forma independente: uma falha no fetch de vendas não pode
    // impedir o carregamento dos produtos (usados na busca do PDV).
    fetchSales(currentStoreId ?? undefined)
      .then(setSales)
      .catch((err) => console.error('Falha ao carregar vendas:', err))
      .finally(() => setLoading(false));
    fetchProducts(currentStoreId ?? undefined)
      .then(setProducts)
      .catch((err) => console.error('Falha ao carregar produtos:', err));
  }, [currentStoreId]);

  const reload = () => {
    fetchSales(currentStoreId ?? undefined)
      .then(setSales)
      .catch((err) => console.error('Falha ao recarregar vendas:', err));
    fetchProducts(currentStoreId ?? undefined)
      .then(setProducts)
      .catch((err) => console.error('Falha ao recarregar produtos:', err));
  };

  const withStatus = useMemo(
    () => sales.map((sale) => ({ sale, status: getSaleStatus(sale) })),
    [sales]
  );

  const visible = useMemo(
    () =>
      filter === 'todas'
        ? withStatus
        : withStatus.filter((s) => s.status === filter),
    [withStatus, filter]
  );

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      todas: withStatus.length,
      aberto: 0,
      vencido: 0,
      pago: 0,
    };
    withStatus.forEach(({ status }) => (base[status] += 1));
    return base;
  }, [withStatus]);

  const handleSave = async (payload: NewSale) => {
    // Erros (ex.: estoque) sobem para o modal exibir.
    await createSale(payload);
    reload();
  };

  const handleMarkPaid = async (sale: Sale) => {
    setActionError(null);
    try {
      await markSalePaid(sale.id);
      reload();
    } catch (err) {
      console.error('Falha ao quitar venda:', err);
      setActionError('Não foi possível marcar a venda como paga.');
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm(`Excluir a venda #${sale.sale_number}? O estoque será devolvido.`))
      return;
    setActionError(null);
    try {
      await deleteSale(sale.id);
      reload();
    } catch (err) {
      console.error('Falha ao excluir venda:', err);
      setActionError('Não foi possível excluir a venda.');
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Vendas</h1>
          <p className="admin-page__subtitle">{sales.length} no total</p>
        </div>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => setModalOpen(true)}
          disabled={!isSupabaseConfigured}
          title={
            isSupabaseConfigured
              ? undefined
              : 'Configure o Supabase para registrar vendas'
          }
        >
          + Nova venda
        </button>
      </div>

      <div className="admin-filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`admin-chip ${filter === f.value ? 'admin-chip--active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label} ({counts[f.value]})
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
          Configure o Supabase para registrar e gerenciar as vendas.
        </p>
      ) : loading ? (
        <div className="admin-loading">
          <span className="admin-spinner" aria-hidden="true" />
          <p>Carregando…</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="admin-empty">Nenhuma venda nesta categoria.</p>
      ) : (
        <ul className="orders">
          {visible.map(({ sale, status }) => {
            const isOpen = expanded === sale.id;
            return (
              <li key={sale.id} className="order-row">
                <button
                  className="order-row__summary sale-row__summary"
                  onClick={() => setExpanded(isOpen ? null : sale.id)}
                  aria-expanded={isOpen}
                >
                  <span className="order-row__number">#{sale.sale_number}</span>
                  <span className="order-row__customer">
                    {sale.customer_name || '—'}
                  </span>
                  <span className="order-row__date">
                    {formatDateTime(sale.created_at)}
                  </span>
                  <span className="sale-row__payment">
                    {PAYMENT_METHOD_META[sale.payment_method].label}
                  </span>
                  <span
                    className="status-pill"
                    style={{ color: SALE_STATUS_META[status].color }}
                  >
                    {SALE_STATUS_META[status].label}
                  </span>
                  <span className="order-row__total">
                    {formatPrice(Number(sale.total))}
                  </span>
                  <span className="order-row__chevron" aria-hidden="true">
                    {isOpen ? '▴' : '▾'}
                  </span>
                </button>

                {isOpen && (
                  <div className="order-detail">
                    <section>
                      <h3 className="order-detail__title">Itens</h3>
                      <ul className="order-detail__items">
                        {sale.items.map((item, i) => (
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
                        <span>{formatPrice(Number(sale.subtotal))}</span>
                        {Number(sale.discount) > 0 && (
                          <>
                            <span>Desconto</span>
                            <span>−{formatPrice(Number(sale.discount))}</span>
                          </>
                        )}
                        <span className="order-detail__grand">Total</span>
                        <span className="order-detail__grand">
                          {formatPrice(Number(sale.total))}
                        </span>
                      </div>
                    </section>

                    {sale.payment_method === 'prazo' && (
                      <section className="sale-detail__prazo">
                        <div>
                          <span className="order-detail__title">Vencimento</span>
                          <p>
                            {sale.due_date ? formatDay(sale.due_date) : '—'}
                            {sale.due_days != null
                              ? ` (${sale.due_days} dias)`
                              : ''}
                          </p>
                        </div>
                        {!sale.paid && (
                          <button
                            className="admin-btn admin-btn--primary"
                            onClick={() => handleMarkPaid(sale)}
                          >
                            Marcar como pago
                          </button>
                        )}
                      </section>
                    )}

                    <div className="sale-detail__actions">
                      <button
                        className="admin-icon-btn admin-icon-btn--danger"
                        onClick={() => handleDelete(sale)}
                      >
                        Excluir venda
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <SaleFormModal
        open={modalOpen}
        products={products}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
