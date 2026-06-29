import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface StoreRow {
  id: string;
  status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
}

interface PlanCount {
  plan_name: string;
  count: number;
}

interface Metrics {
  total: number;
  active: number;
  suspended: number;
  newThisMonth: number;
  byPlan: PlanCount[];
}

function startOfMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const monthStart = startOfMonth();

      const { data: stores } = await supabase!
        .from('stores')
        .select('id, status, created_at');

      const storeRows = (stores ?? []) as StoreRow[];
      const total = storeRows.length;
      const active = storeRows.filter((s) => s.status === 'active').length;
      const suspended = storeRows.filter((s) => s.status === 'suspended').length;
      const newThisMonth = storeRows.filter(
        (s) => new Date(s.created_at).getTime() >= monthStart
      ).length;

      const { data: subs } = await supabase!
        .from('store_subscriptions')
        .select('plan_id, plans(name)')
        .eq('status', 'active');

      const counts = new Map<string, number>();
      for (const raw of (subs ?? []) as unknown[]) {
        const r = raw as { plans: { name: string } | { name: string }[] | null };
        const plan = Array.isArray(r.plans) ? r.plans[0] : r.plans;
        const name = plan?.name ?? 'Sem plano';
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      const byPlan: PlanCount[] = Array.from(counts, ([plan_name, count]) => ({
        plan_name,
        count,
      })).sort((a, b) => b.count - a.count);

      setMetrics({ total, active, suspended, newThisMonth, byPlan });
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <span className="admin-spinner" aria-hidden="true" />
        <p>Carregando…</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="admin-section">
        <h1 className="admin-section__title">Dashboard</h1>
        <p className="admin-empty">Sem dados disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="dash">
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Dashboard</h1>
          <p className="admin-page__subtitle">Visão geral da plataforma</p>
        </div>
      </div>

      <div className="dash__cards">
        <article className="stat-card">
          <span className="stat-card__label">Total de lojas</span>
          <strong className="stat-card__value">{metrics.total}</strong>
          <span className="stat-card__hint">cadastradas</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Lojas ativas</span>
          <strong className="stat-card__value">{metrics.active}</strong>
          <span className="stat-card__hint">em operação</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Lojas suspensas</span>
          <strong className="stat-card__value">{metrics.suspended}</strong>
          <span className="stat-card__hint">pagamento/uso suspenso</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Novas este mês</span>
          <strong className="stat-card__value">{metrics.newThisMonth}</strong>
          <span className="stat-card__hint">desde o início do mês</span>
        </article>
      </div>

      <section className="admin-panel">
        <h2 className="admin-panel__title">Lojas por plano</h2>
        {metrics.byPlan.length === 0 ? (
          <p className="admin-empty">Nenhuma assinatura ativa.</p>
        ) : (
          <ul className="recent">
            {metrics.byPlan.map(({ plan_name, count }) => (
              <li key={plan_name} className="recent__item">
                <span className="recent__name">{plan_name}</span>
                <span className="recent__total">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
