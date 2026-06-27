import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile, updateProfile } from '../../lib/account';

export function AccountData() {
  const { session } = useAuth();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        if (!p) return;
        setNome(p.nome ?? '');
        setTelefone(p.telefone ?? '');
        setCpf(p.cpf ?? '');
      })
      .catch((err) => console.error('Falha ao carregar perfil:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        nome: nome.trim(),
        telefone: telefone.trim(),
        cpf: cpf.trim(),
      });
      setSaved(true);
    } catch (err) {
      console.error('Falha ao salvar perfil:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="account__hint">Carregando…</p>;

  return (
    <div>
      <h1 className="account__title">Dados pessoais</h1>
      <form className="account-form" onSubmit={handleSubmit}>
        <div className="checkout__field">
          <label htmlFor="ac-email">E-mail</label>
          <input id="ac-email" type="email" value={session?.user?.email ?? ''} disabled />
        </div>
        <div className="checkout__field">
          <label htmlFor="ac-nome">Nome completo</label>
          <input
            id="ac-nome"
            type="text"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="checkout__row">
          <div className="checkout__field">
            <label htmlFor="ac-tel">Telefone</label>
            <input
              id="ac-tel"
              type="tel"
              value={telefone}
              onChange={(e) => {
                setTelefone(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="ac-cpf">CPF</label>
            <input
              id="ac-cpf"
              type="text"
              value={cpf}
              onChange={(e) => {
                setCpf(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>

        <div className="account-form__actions">
          <button
            className="admin-btn admin-btn--primary"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {saved && <span className="auth__info">Dados salvos!</span>}
        </div>
      </form>
    </div>
  );
}
