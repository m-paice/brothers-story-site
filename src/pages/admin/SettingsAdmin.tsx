import { useEffect, useState, type ChangeEvent } from 'react';
import { fetchSettings, saveSettings, DEFAULT_SETTINGS } from '../../lib/settings';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import type { StoreSettings, WeekDay, PageKey, DayHours, PageContent } from '../../types/settings';

type Tab = 'loja' | 'horarios' | 'frete' | 'paginas';

const TABS: { value: Tab; label: string }[] = [
  { value: 'loja', label: 'Loja' },
  { value: 'horarios', label: 'Horários' },
  { value: 'frete', label: 'Frete' },
  { value: 'paginas', label: 'Páginas' },
];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings(currentStoreId ?? undefined)
      .then(setForm)
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSettings(form, currentStoreId ?? undefined);
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
