import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type StoreStatus = 'active' | 'suspended' | 'cancelled';

interface PlanOption {
  id: string;
  name: string;
}

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  created_at: string;
  ownerName: string | null;
  planId: string | null;
  planName: string | null;
}

interface RawStore {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  created_at: string;
  store_subscriptions: { plan_id: string | null; plans: { name: string } | null }[] | null;
  store_members: { role: string; 'profiles!store_members_user_profile_fkey': { nome: string | null } | null }[] | null;
}

const STATUS_LABEL: Record<StoreStatus, string> = {
  active: 'Ativa',
  suspended: 'Suspensa',
  cancelled: 'Cancelada',
};

const STATUS_COLOR: Record<StoreStatus, string> = {
  active: 'var(--color-success)',
  suspended: 'var(--color-warning)',
  cancelled: 'var(--color-danger)',
};

const ACTION_BTN_STYLE: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  fontSize: '0.78rem',
};

const SUSPEND_BTN_STYLE: React.CSSProperties = {
  ...ACTION_BTN_STYLE,
  borderColor: 'var(--color-danger)',
  color: 'var(--color-danger)',
};

export function SuperAdmin() {
  const { isSuperAdmin } = useAuth();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !isSuperAdmin) return;
    const client = supabase;

    async function load() {
      const [storesRes, plansRes] = await Promise.all([
        client
          .from('stores')
          .select(`
            id, name, slug, status, created_at,
            store_subscriptions ( plan_id, plans ( name ) ),
            store_members ( role, profiles!store_members_user_profile_fkey ( nome ) )
          `)
          .order('created_at', { ascending: false }),
        client.from('plans').select('id, name').order('name'),
      ]);

      setPlans((plansRes.data as PlanOption[] | null) ?? []);

      const raw = (storesRes.data as RawStore[] | null) ?? [];
      const rows: StoreRow[] = raw.map((s) => {
        const subscription = s.store_subscriptions?.[0] ?? null;
        const owner = s.store_members?.find((m) => m.role === 'owner') ?? null;
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          status: s.status,
          created_at: s.created_at,
          ownerName: owner?.['profiles!store_members_user_profile_fkey']?.nome || null,
          planId: subscription?.plan_id ?? null,
          planName: subscription?.plans?.name ?? null,
        };
      });

      setStores(rows);
      setFetching(false);
    }

    load();
  }, [isSuperAdmin]);

  async function toggleStatus(store: StoreRow) {
    if (!supabase) return;
    const newStatus: StoreStatus = store.status === 'active' ? 'suspended' : 'active';
    setBusyId(store.id);
    const { error } = await supabase.from('stores').update({ status: newStatus }).eq('id', store.id);
    if (!error) {
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, status: newStatus } : s)));
    }
    setBusyId(null);
  }

  async function changePlan(storeId: string, planId: string) {
    if (!supabase) return;
    setBusyId(storeId);
    const { error } = await supabase
      .from('store_subscriptions')
      .upsert({ store_id: storeId, plan_id: planId }, { onConflict: 'store_id' });
    if (!error) {
      const plan = plans.find((p) => p.id === planId) ?? null;
      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, planId, planName: plan?.name ?? null } : s)),
      );
    }
    setBusyId(null);
  }

  return (
    <div className="admin-section">
      <div className="admin-section__header">
        <h1 className="admin-section__title">Lojas</h1>
        <span className="admin-section__subtitle">
          {stores.length} loja{stores.length !== 1 ? 's' : ''} cadastrada{stores.length !== 1 ? 's' : ''}
        </span>
      </div>

      {fetching ? (
        <div className="admin-loading">
          <span className="admin-spinner" aria-hidden="true" />
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Loja</th>
                <th>Slug</th>
                <th>Dono</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Criada em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>{store.name}</td>
                  <td>
                    <code style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {store.slug}
                    </code>
                  </td>
                  <td>{store.ownerName ?? '—'}</td>
                  <td>
                    <select
                      className="admin-select"
                      value={store.planId ?? ''}
                      disabled={busyId === store.id}
                      onChange={(e) => changePlan(store.id, e.target.value)}
                    >
                      {store.planId === null && <option value="">—</option>}
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span style={{ color: STATUS_COLOR[store.status], fontWeight: 500 }}>
                      {STATUS_LABEL[store.status]}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                    {new Date(store.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    {store.status === 'active' ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        style={SUSPEND_BTN_STYLE}
                        disabled={busyId === store.id}
                        onClick={() => toggleStatus(store)}
                      >
                        Suspender
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        style={ACTION_BTN_STYLE}
                        disabled={busyId === store.id}
                        onClick={() => toggleStatus(store)}
                      >
                        Reativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
