import { useState, type FormEvent } from 'react';
import type { NewStoreMember } from '../../lib/team';

interface TeamMemberFormModalProps {
  open: boolean;
  storeId: string;
  onClose: () => void;
  onSave: (input: NewStoreMember) => Promise<void>;
}

interface FormState {
  nome: string;
  email: string;
  password: string;
}

const emptyForm = (): FormState => ({
  nome: '',
  email: '',
  password: '',
});

export function TeamMemberFormModal({
  open,
  storeId,
  onClose,
  onSave,
}: TeamMemberFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reseta o formulário toda vez que o modal abre (mesmo padrão do
  // ProductFormModal: ajusta estado durante a renderização, sem useEffect).
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(emptyForm());
      setError(null);
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        store_id: storeId,
        nome: form.nome.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'admin',
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar. Verifique os dados e tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`checkout__overlay ${
          open ? 'checkout__overlay--visible' : ''
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`checkout ${open ? 'checkout--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Novo funcionário"
        aria-hidden={!open}
      >
        <div className="checkout__header">
          <h2 className="checkout__title">Novo funcionário</h2>
          <button
            className="checkout__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="checkout__field">
            <label htmlFor="tm-nome">Nome</label>
            <input
              id="tm-nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div className="checkout__field">
            <label htmlFor="tm-email">E-mail</label>
            <input
              id="tm-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="checkout__field">
            <label htmlFor="tm-password">Senha</label>
            <input
              id="tm-password"
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <p className="checkout__note">
            Terá acesso a Vendas, Pedidos e Produtos.
          </p>

          {error && <p className="checkout__error">{error}</p>}

          <div className="product-form__actions">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
