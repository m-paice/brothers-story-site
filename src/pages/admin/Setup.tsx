import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSettings, saveSettings, DEFAULT_SETTINGS } from '../../lib/settings';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { StoreSettings } from '../../types/settings';

const TOTAL_STEPS = 4;

const STEP_TITLES = ['Loja', 'Envios', 'Pagamentos', 'Pronto!'];

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function Setup() {
  const navigate = useNavigate();
  const { currentStoreId } = useAuth();

  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [originCep, setOriginCep] = useState('');
  const [superfreteToken, setSuperfreteToken] = useState('');
  const [mpToken, setMpToken] = useState('');

  useEffect(() => {
    fetchSettings(currentStoreId ?? undefined)
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentStoreId]);

  const setStore = (update: Partial<StoreSettings['store']>) =>
    setSettings((s) => ({ ...s, store: { ...s.store, ...update } }));

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));

  const saveStore = async () => {
    if (!currentStoreId) return;
    setSaving(true);
    setError(null);
    try {
      await saveSettings(settings, currentStoreId);
      next();
    } catch {
      setError('Falha ao salvar as informações da loja.');
    } finally {
      setSaving(false);
    }
  };

  const saveCredentials = async (fields: Record<string, string>) => {
    if (!currentStoreId || !supabase) return;
    setSaving(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase
        .from('tenant_credentials')
        .upsert({ store_id: currentStoreId, ...fields }, { onConflict: 'store_id' });
      if (upsertError) throw upsertError;
      next();
    } catch {
      setError('Falha ao salvar as credenciais.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!currentStoreId) return;
    setSaving(true);
    setError(null);
    try {
      const updated: StoreSettings = {
        ...settings,
        store: { ...settings.store, onboarding_done: true },
      };
      await saveSettings(updated, currentStoreId);
      setSettings(updated);
      navigate('/admin');
    } catch {
      setError('Falha ao concluir a configuração.');
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

  const disabled = saving || !currentStoreId;

  return (
    <div className="setup">
      <div className="setup__card">
        <div className="setup__steps">
          {STEP_TITLES.map((title, i) => {
            const n = i + 1;
            const cls =
              n === step
                ? 'setup__step-dot setup__step-dot--active'
                : n < step
                ? 'setup__step-dot setup__step-dot--done'
                : 'setup__step-dot';
            return (
              <span key={title} className={cls} title={title}>
                {n < step ? '✓' : n}
              </span>
            );
          })}
        </div>

        {error && <p className="login__error">{error}</p>}

        {/* ---- Passo 1: Loja ---- */}
        {step === 1 && (
          <>
            <h1 className="setup__title">Sua loja</h1>
            <p className="setup__subtitle">Passo 1 de {TOTAL_STEPS} — dados básicos da loja.</p>

            <div className="setup__field">
              <label>Nome da loja</label>
              <input
                type="text"
                value={settings.store.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStore({ name: e.target.value })}
              />
            </div>
            <div className="setup__field">
              <label>Tagline</label>
              <input
                type="text"
                value={settings.store.tagline}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setStore({ tagline: e.target.value })
                }
              />
            </div>
            <div className="setup__field">
              <label>URL do WhatsApp</label>
              <input
                type="text"
                value={settings.store.whatsapp_url}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setStore({ whatsapp_url: e.target.value })
                }
              />
            </div>
            <div className="setup__field">
              <label>URL do Instagram</label>
              <input
                type="text"
                value={settings.store.instagram_url}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setStore({ instagram_url: e.target.value })
                }
              />
            </div>

            <div className="setup__actions">
              <button className="setup__btn-secondary" onClick={next} disabled={saving}>
                Pular
              </button>
              <button className="setup__btn-primary" onClick={saveStore} disabled={disabled}>
                {saving ? 'Salvando…' : 'Salvar e continuar →'}
              </button>
            </div>
          </>
        )}

        {/* ---- Passo 2: Envios ---- */}
        {step === 2 && (
          <>
            <h1 className="setup__title">Envios</h1>
            <p className="setup__subtitle">
              Passo 2 de {TOTAL_STEPS} — frete via SuperFrete (opcional).
            </p>

            <div className="setup__field">
              <label>CEP de origem</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="00000-000"
                value={originCep}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setOriginCep(formatCep(e.target.value))
                }
              />
            </div>
            <div className="setup__field">
              <label>Token SuperFrete</label>
              <input
                type="text"
                value={superfreteToken}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSuperfreteToken(e.target.value)
                }
              />
            </div>

            <div className="setup__actions">
              <button className="setup__btn-secondary" onClick={next} disabled={saving}>
                Pular
              </button>
              <button
                className="setup__btn-primary"
                onClick={() =>
                  saveCredentials({
                    origin_cep: originCep.replace(/\D/g, ''),
                    superfrete_token: superfreteToken,
                  })
                }
                disabled={disabled}
              >
                {saving ? 'Salvando…' : 'Salvar e continuar →'}
              </button>
            </div>
          </>
        )}

        {/* ---- Passo 3: Pagamentos ---- */}
        {step === 3 && (
          <>
            <h1 className="setup__title">Pagamentos</h1>
            <p className="setup__subtitle">
              Passo 3 de {TOTAL_STEPS} — Mercado Pago (opcional).
            </p>

            <div className="setup__field">
              <label>Access Token do Mercado Pago</label>
              <input
                type="text"
                value={mpToken}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMpToken(e.target.value)}
              />
            </div>

            <div className="setup__actions">
              <button className="setup__btn-secondary" onClick={next} disabled={saving}>
                Pular
              </button>
              <button
                className="setup__btn-primary"
                onClick={() => saveCredentials({ mercadopago_access_token: mpToken })}
                disabled={disabled}
              >
                {saving ? 'Salvando…' : 'Salvar e continuar →'}
              </button>
            </div>
          </>
        )}

        {/* ---- Passo 4: Pronto ---- */}
        {step === 4 && (
          <div className="setup__done">
            <span className="setup__done-icon" aria-hidden="true">
              ✓
            </span>
            <h1 className="setup__title">Tudo pronto!</h1>
            <p className="setup__subtitle">
              Sua loja está configurada. Você pode ajustar tudo depois nas Configurações.
            </p>
            <button className="setup__btn-primary" onClick={finish} disabled={disabled}>
              {saving ? 'Concluindo…' : 'Ir para o painel →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
