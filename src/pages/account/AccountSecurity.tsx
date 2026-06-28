import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';

export function AccountSecurity() {
  const { updatePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(password);
      setSaved(true);
      setCurrent('');
      setPassword('');
      setConfirm('');
    } catch {
      setError('Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="account__title">Segurança</h1>
      <form className="account-form" onSubmit={handleSubmit}>
        <div className="checkout__field">
          <label htmlFor="sec-current">Senha atual</label>
          <input
            id="sec-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="checkout__field">
          <label htmlFor="sec-password">Nova senha</label>
          <input
            id="sec-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="checkout__field">
          <label htmlFor="sec-confirm">Confirmar nova senha</label>
          <input
            id="sec-confirm"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setSaved(false);
            }}
          />
        </div>

        {error && <p className="checkout__error">{error}</p>}

        <div className="account-form__actions">
          <button
            className="admin-btn admin-btn--primary"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Alterar senha'}
          </button>
          {saved && <span className="auth__info">Senha alterada com sucesso!</span>}
        </div>
      </form>
    </div>
  );
}
