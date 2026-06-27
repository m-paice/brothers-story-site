import { useEffect, useState, type FormEvent } from 'react';
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../lib/account';
import { fetchCep } from '../../lib/cep';
import type { Address, AddressInput } from '../../types/account';

const emptyForm = (): AddressInput & { makeDefault: boolean } => ({
  label: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  makeDefault: false,
});

export function AccountAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAddresses()
      .then(setAddresses)
      .catch((err) => console.error('Falha ao carregar endereços:', err))
      .finally(() => setLoading(false));
  };

  // Carga inicial sem setState síncrono no effect (loading já inicia true).
  useEffect(() => {
    fetchAddresses()
      .then(setAddresses)
      .catch((err) => console.error('Falha ao carregar endereços:', err))
      .finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), makeDefault: addresses.length === 0 });
    setShowForm(true);
  };

  const openEdit = (a: Address) => {
    setEditingId(a.id);
    setForm({
      label: a.label ?? '',
      cep: a.cep,
      endereco: a.endereco,
      numero: a.numero,
      complemento: a.complemento,
      bairro: a.bairro,
      cidade: a.cidade,
      uf: a.uf,
      makeDefault: a.is_default,
    });
    setShowForm(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const { makeDefault, ...input } = form;
    try {
      if (editingId) await updateAddress(editingId, input, makeDefault);
      else await createAddress(input, makeDefault);
      setShowForm(false);
      load();
    } catch (err) {
      console.error('Falha ao salvar endereço:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Address) => {
    if (!confirm('Remover este endereço?')) return;
    try {
      await deleteAddress(a.id);
      load();
    } catch (err) {
      console.error('Falha ao remover endereço:', err);
    }
  };

  const handleSetDefault = async (a: Address) => {
    try {
      await setDefaultAddress(a.id);
      load();
    } catch (err) {
      console.error('Falha ao definir padrão:', err);
    }
  };

  const setField = (key: keyof AddressInput, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // CEP → preenche endereço automaticamente (ViaCEP).
  const handleCep = (value: string) => {
    setForm((f) => ({ ...f, cep: value }));
    if (value.replace(/\D/g, '').length === 8) {
      fetchCep(value).then((r) => {
        if (!r) return;
        setForm((f) => ({
          ...f,
          endereco: r.endereco || f.endereco,
          bairro: r.bairro || f.bairro,
          cidade: r.cidade || f.cidade,
          uf: r.uf || f.uf,
        }));
      });
    }
  };

  return (
    <div>
      <div className="account-head">
        <h1 className="account__title">Endereços</h1>
        {!showForm && (
          <button className="admin-btn admin-btn--primary" onClick={openNew}>
            + Novo endereço
          </button>
        )}
      </div>

      {showForm ? (
        <form className="account-form" onSubmit={handleSubmit}>
          <div className="checkout__field">
            <label htmlFor="ad-label">Identificação (ex.: Casa, Trabalho)</label>
            <input
              id="ad-label"
              type="text"
              value={form.label ?? ''}
              onChange={(e) => setField('label', e.target.value)}
            />
          </div>
          <div className="checkout__row">
            <div className="checkout__field checkout__field--sm">
              <label htmlFor="ad-cep">CEP</label>
              <input id="ad-cep" type="text" required value={form.cep} onChange={(e) => handleCep(e.target.value)} />
            </div>
            <div className="checkout__field">
              <label htmlFor="ad-end">Endereço</label>
              <input id="ad-end" type="text" required value={form.endereco} onChange={(e) => setField('endereco', e.target.value)} />
            </div>
          </div>
          <div className="checkout__row">
            <div className="checkout__field checkout__field--sm">
              <label htmlFor="ad-num">Número</label>
              <input id="ad-num" type="text" required value={form.numero} onChange={(e) => setField('numero', e.target.value)} />
            </div>
            <div className="checkout__field">
              <label htmlFor="ad-comp">Complemento</label>
              <input id="ad-comp" type="text" value={form.complemento} onChange={(e) => setField('complemento', e.target.value)} />
            </div>
          </div>
          <div className="checkout__row">
            <div className="checkout__field">
              <label htmlFor="ad-bairro">Bairro</label>
              <input id="ad-bairro" type="text" value={form.bairro} onChange={(e) => setField('bairro', e.target.value)} />
            </div>
          </div>
          <div className="checkout__row">
            <div className="checkout__field">
              <label htmlFor="ad-cidade">Cidade</label>
              <input id="ad-cidade" type="text" required value={form.cidade} onChange={(e) => setField('cidade', e.target.value)} />
            </div>
            <div className="checkout__field checkout__field--sm">
              <label htmlFor="ad-uf">UF</label>
              <input id="ad-uf" type="text" maxLength={2} required value={form.uf} onChange={(e) => setField('uf', e.target.value)} />
            </div>
          </div>

          <label className="product-form__check">
            <input
              type="checkbox"
              checked={form.makeDefault}
              onChange={(e) => setForm((f) => ({ ...f, makeDefault: e.target.checked }))}
            />
            Usar como endereço padrão
          </label>

          <div className="account-form__actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar endereço'}
            </button>
          </div>
        </form>
      ) : loading ? (
        <p className="account__hint">Carregando…</p>
      ) : addresses.length === 0 ? (
        <p className="account__hint">Você ainda não cadastrou endereços.</p>
      ) : (
        <ul className="address-list">
          {addresses.map((a) => (
            <li key={a.id} className="address-card">
              <div className="address-card__head">
                <span className="address-card__label">
                  {a.label || 'Endereço'}
                  {a.is_default && <span className="admin-tag">Padrão</span>}
                </span>
              </div>
              <p className="address-card__text">
                {a.endereco}, {a.numero}
                {a.complemento ? ` — ${a.complemento}` : ''}
                {a.bairro ? ` · ${a.bairro}` : ''}
                <br />
                {a.cidade}/{a.uf} · {a.cep}
              </p>
              <div className="address-card__actions">
                {!a.is_default && (
                  <button className="admin-icon-btn" onClick={() => handleSetDefault(a)}>
                    Tornar padrão
                  </button>
                )}
                <button className="admin-icon-btn" onClick={() => openEdit(a)}>
                  Editar
                </button>
                <button className="admin-icon-btn admin-icon-btn--danger" onClick={() => handleDelete(a)}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
