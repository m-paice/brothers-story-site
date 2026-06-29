import { useEffect, useState, type ChangeEvent } from 'react';
import { fetchSettings, saveSettings, DEFAULT_SETTINGS } from '../../lib/settings';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../utils/format';
import type { StoreSettings, WeekDay, PageKey, DayHours, PageContent } from '../../types/settings';

type Tab = 'loja' | 'horarios' | 'frete' | 'paginas' | 'integracoes';

const TABS: { value: Tab; label: string }[] = [
  { value: 'loja', label: 'Loja' },
  { value: 'horarios', label: 'Horários' },
  { value: 'frete', label: 'Frete' },
  { value: 'paginas', label: 'Páginas' },
  { value: 'integracoes', label: 'Integrações' },
];

interface TenantCredentials {
  superfrete_token: string;
  superfrete_sandbox: boolean;
  origin_cep: string;
  mercadopago_access_token: string;
  mercadopago_webhook_secret: string;
  sender_name: string;
  sender_document: string;
  sender_email: string;
  sender_phone: string;
  // campos do JSONB sender_address expandidos no form
  sender_street: string;
  sender_number: string;
  sender_complement: string;
  sender_district: string;
  sender_city: string;
  sender_state: string;
}

const DEFAULT_CREDS: TenantCredentials = {
  superfrete_token: '',
  superfrete_sandbox: true,
  origin_cep: '',
  mercadopago_access_token: '',
  mercadopago_webhook_secret: '',
  sender_name: '',
  sender_document: '',
  sender_email: '',
  sender_phone: '',
  sender_street: '',
  sender_number: '',
  sender_complement: '',
  sender_district: '',
  sender_city: '',
  sender_state: '',
};

const PAGE_TABS: { value: PageKey; label: string }[] = [
  { value: 'sobre', label: 'Sobre' },
  { value: 'contato', label: 'Contato' },
  { value: 'envios', label: 'Envios' },
  { value: 'trocas', label: 'Trocas' },
];

const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: 'seg', label: 'Segunda-feira' },
  { key: 'ter', label: 'Terça-feira' },
  { key: 'qua', label: 'Quarta-feira' },
  { key: 'qui', label: 'Quinta-feira' },
  { key: 'sex', label: 'Sexta-feira' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

export function SettingsAdmin() {
  const { currentStoreId } = useAuth();
  const [tab, setTab] = useState<Tab>('loja');
  const [pageTab, setPageTab] = useState<PageKey>('sobre');
  const [form, setForm] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [creds, setCreds] = useState<TenantCredentials>(DEFAULT_CREDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storeId = currentStoreId ?? undefined;
    Promise.all([
      fetchSettings(storeId).then(setForm),
      supabase && currentStoreId
        ? supabase
            .from('tenant_credentials')
            .select('*')
            .eq('store_id', currentStoreId)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                const addr =
                  typeof data.sender_address === 'object' && data.sender_address !== null
                    ? (data.sender_address as Record<string, string>)
                    : {};
                setCreds({
                  superfrete_token: data.superfrete_token ?? '',
                  superfrete_sandbox: data.superfrete_sandbox ?? true,
                  origin_cep: data.origin_cep ?? '',
                  mercadopago_access_token: data.mercadopago_access_token ?? '',
                  mercadopago_webhook_secret: data.mercadopago_webhook_secret ?? '',
                  sender_name: data.sender_name ?? '',
                  sender_document: data.sender_document ?? '',
                  sender_email: data.sender_email ?? '',
                  sender_phone: data.sender_phone ?? '',
                  sender_street: addr.address ?? '',
                  sender_number: addr.number ?? '',
                  sender_complement: addr.complement ?? '',
                  sender_district: addr.district ?? '',
                  sender_city: addr.city ?? '',
                  sender_state: addr.state ?? '',
                });
              }
            })
        : Promise.resolve(),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentStoreId]);

  const setStore = (update: Partial<StoreSettings['store']>) =>
    setForm((f) => ({ ...f, store: { ...f.store, ...update } }));

  const setHours = (day: WeekDay, update: Partial<DayHours>) =>
    setForm((f) => ({
      ...f,
      hours: { ...f.hours, [day]: { ...f.hours[day], ...update } },
    }));

  const setShipping = (update: Partial<StoreSettings['shipping']>) =>
    setForm((f) => ({ ...f, shipping: { ...f.shipping, ...update } }));

  const setPage = (page: PageKey, update: Partial<PageContent>) =>
    setForm((f) => ({
      ...f,
      pages: { ...f.pages, [page]: { ...f.pages[page], ...update } },
    }));

  const setCred = (update: Partial<TenantCredentials>) =>
    setCreds((c) => ({ ...c, ...update }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (tab === 'integracoes') {
        if (!supabase || !currentStoreId) throw new Error('Sem conexão.');
        const { error: upsertErr } = await supabase
          .from('tenant_credentials')
          .upsert(
            {
              store_id: currentStoreId,
              superfrete_token: creds.superfrete_token,
              superfrete_sandbox: creds.superfrete_sandbox,
              origin_cep: creds.origin_cep,
              mercadopago_access_token: creds.mercadopago_access_token,
              mercadopago_webhook_secret: creds.mercadopago_webhook_secret,
              sender_name: creds.sender_name,
              sender_document: creds.sender_document,
              sender_email: creds.sender_email,
              sender_phone: creds.sender_phone,
              sender_address: {
                address: creds.sender_street,
                number: creds.sender_number,
                complement: creds.sender_complement,
                district: creds.sender_district,
                city: creds.sender_city,
                state: creds.sender_state,
              },
            },
            { onConflict: 'store_id' }
          );
        if (upsertErr) throw upsertErr;
      } else {
        await saveSettings(form, currentStoreId ?? undefined);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Falha ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <span className="admin-spinner" aria-hidden="true" />
        <p>Carregando…</p>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Configurações</h1>
          <p className="admin-page__subtitle">Dados e conteúdo da loja</p>
        </div>
      </div>

      <div className="admin-filters">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`admin-chip ${tab === t.value ? 'admin-chip--active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="admin-banner admin-banner--error">{error}</p>}

      {/* ---- Loja ---- */}
      {tab === 'loja' && (
        <section className="settings__section">
          <h2 className="settings__section-title">Informações da loja</h2>
          <div className="settings-grid">
            <Field
              label="Nome da loja"
              value={form.store.name}
              onChange={(v) => setStore({ name: v })}
            />
            <Field
              label="Tagline"
              value={form.store.tagline}
              onChange={(v) => setStore({ tagline: v })}
            />
            <Field
              label="URL do Instagram"
              value={form.store.instagram_url}
              onChange={(v) => setStore({ instagram_url: v })}
            />
            <Field
              label="URL do WhatsApp"
              value={form.store.whatsapp_url}
              onChange={(v) => setStore({ whatsapp_url: v })}
            />
          </div>
        </section>
      )}

      {/* ---- Horários ---- */}
      {tab === 'horarios' && (
        <section className="settings__section">
          <h2 className="settings__section-title">Horário de atendimento — loja física</h2>
          <div className="settings-hours">
            <div className="settings-hours__header">
              <span>Dia</span>
              <span>Aberto</span>
              <span>Abre</span>
              <span>Fecha</span>
            </div>
            {WEEK_DAYS.map(({ key, label }) => {
              const day = form.hours[key];
              return (
                <div key={key} className="settings-hours__row">
                  <span className="settings-hours__day">{label}</span>
                  <label className="settings-hours__toggle">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setHours(key, { enabled: e.target.checked })
                      }
                    />
                    {day.enabled ? 'Sim' : 'Não'}
                  </label>
                  <input
                    type="time"
                    className="settings-hours__time"
                    value={day.open}
                    disabled={!day.enabled}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setHours(key, { open: e.target.value })
                    }
                  />
                  <input
                    type="time"
                    className="settings-hours__time"
                    value={day.close}
                    disabled={!day.enabled}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setHours(key, { close: e.target.value })
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- Frete ---- */}
      {tab === 'frete' && (
        <section className="settings__section">
          <h2 className="settings__section-title">Frete padrão</h2>
          <p className="settings__hint">
            Valores usados como fallback quando a cotação SuperFrete não está disponível e na página de Envios.
          </p>
          <div className="settings-grid settings-grid--narrow">
            <FieldNumber
              label={`Frete grátis acima de (atual: ${formatPrice(form.shipping.free_threshold)})`}
              value={form.shipping.free_threshold}
              onChange={(v) => setShipping({ free_threshold: v })}
              prefix="R$"
            />
            <FieldNumber
              label={`Frete padrão (atual: ${formatPrice(form.shipping.default_fee)})`}
              value={form.shipping.default_fee}
              onChange={(v) => setShipping({ default_fee: v })}
              prefix="R$"
            />
          </div>
        </section>
      )}

      {/* ---- Páginas ---- */}
      {tab === 'paginas' && (
        <section className="settings__section">
          <h2 className="settings__section-title">Conteúdo das páginas institucionais</h2>
          <p className="settings__hint">
            Use <code>## Título</code> para subtítulos, <code>- item</code> para listas e linha em branco para separar parágrafos.
          </p>

          <div className="admin-filters settings__page-tabs">
            {PAGE_TABS.map((pt) => (
              <button
                key={pt.value}
                className={`admin-chip ${pageTab === pt.value ? 'admin-chip--active' : ''}`}
                onClick={() => setPageTab(pt.value)}
              >
                {pt.label}
              </button>
            ))}
          </div>

          <div className="settings-grid">
            <Field
              label="Título"
              value={form.pages[pageTab].title}
              onChange={(v) => setPage(pageTab, { title: v })}
            />
            <Field
              label="Subtítulo"
              value={form.pages[pageTab].subtitle}
              onChange={(v) => setPage(pageTab, { subtitle: v })}
            />
          </div>
          <div className="settings-field" style={{ marginTop: 'var(--space-4)' }}>
            <label>Conteúdo</label>
            <textarea
              rows={16}
              value={form.pages[pageTab].body}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setPage(pageTab, { body: e.target.value })
              }
            />
          </div>
        </section>
      )}

      {/* ---- Integrações ---- */}
      {tab === 'integracoes' && (
        <>
          <section className="settings__section">
            <h2 className="settings__section-title">SuperFrete</h2>
            <p className="settings__hint">Credenciais para cotação e geração de etiquetas.</p>
            <div className="settings-grid">
              <FieldSecret
                label="Token"
                value={creds.superfrete_token}
                onChange={(v) => setCred({ superfrete_token: v })}
              />
              <Field
                label="CEP de origem"
                value={creds.origin_cep}
                onChange={(v) => setCred({ origin_cep: v.replace(/\D/g, '').slice(0, 8) })}
              />
              <div className="settings-field">
                <label>Ambiente</label>
                <select
                  className="admin-select"
                  value={creds.superfrete_sandbox ? 'sandbox' : 'producao'}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setCred({ superfrete_sandbox: e.target.value === 'sandbox' })
                  }
                >
                  <option value="sandbox">Sandbox (testes)</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
            </div>
            <p className="settings__hint" style={{ marginTop: 'var(--space-6)' }}>Dados do remetente usados nas etiquetas.</p>
            <div className="settings-grid">
              <Field label="Nome completo" value={creds.sender_name} onChange={(v) => setCred({ sender_name: v })} />
              <Field label="CPF ou CNPJ" value={creds.sender_document} onChange={(v) => setCred({ sender_document: v })} />
              <Field label="E-mail" value={creds.sender_email} onChange={(v) => setCred({ sender_email: v })} />
              <Field label="Telefone" value={creds.sender_phone} onChange={(v) => setCred({ sender_phone: v })} />
            </div>
            <div className="settings-grid" style={{ marginTop: 'var(--space-4)' }}>
              <Field label="Logradouro" value={creds.sender_street} onChange={(v) => setCred({ sender_street: v })} />
              <Field label="Número" value={creds.sender_number} onChange={(v) => setCred({ sender_number: v })} />
              <Field label="Complemento" value={creds.sender_complement} onChange={(v) => setCred({ sender_complement: v })} />
              <Field label="Bairro" value={creds.sender_district} onChange={(v) => setCred({ sender_district: v })} />
              <Field label="Cidade" value={creds.sender_city} onChange={(v) => setCred({ sender_city: v })} />
              <Field label="Estado (UF)" value={creds.sender_state} onChange={(v) => setCred({ sender_state: v.toUpperCase().slice(0, 2) })} />
            </div>
          </section>

          <section className="settings__section">
            <h2 className="settings__section-title">Mercado Pago</h2>
            <p className="settings__hint">Credenciais para processamento de pagamentos.</p>
            <div className="settings-grid">
              <FieldSecret
                label="Access Token"
                value={creds.mercadopago_access_token}
                onChange={(v) => setCred({ mercadopago_access_token: v })}
              />
              <FieldSecret
                label="Webhook Secret (opcional)"
                value={creds.mercadopago_webhook_secret}
                onChange={(v) => setCred({ mercadopago_webhook_secret: v })}
              />
            </div>
          </section>

        </>
      )}

      {/* ---- Barra de salvar ---- */}
      <div className="settings__save-bar">
        {saved && <span className="settings__saved">✓ Salvo com sucesso</span>}
        <button
          className="admin-btn admin-btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  );
}

// ── Componentes auxiliares de campo ────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="settings-field">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldSecret({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="settings-field">
      <label>{label}</label>
      <div className="settings-field__prefix-wrap">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          style={{ paddingRight: 'calc(var(--space-3) * 2 + 3ch)' }}
        />
        <button
          type="button"
          className="settings-field__reveal"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar' : 'Mostrar'}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div className="settings-field">
      <label>{label}</label>
      <div className="settings-field__prefix-wrap">
        {prefix && <span className="settings-field__prefix">{prefix}</span>}
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(parseFloat(e.target.value) || 0)
          }
          style={{ paddingLeft: prefix ? 'calc(var(--space-3) * 2 + 1.5ch)' : undefined }}
        />
      </div>
    </div>
  );
}
