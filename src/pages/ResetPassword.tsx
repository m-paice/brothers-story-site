import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ResetPassword() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch {
      setError('Não foi possível alterar a senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="content container">
      <div className="auth">
        <h1 className="auth__title">Redefinir senha</h1>

        {done ? (
          <>
            <p className="auth__info">Senha alterada com sucesso!</p>
            <Link to="/minha-conta" className="auth__toggle">
              Ir para minha conta
            </Link>
          </>
        ) : (
          <form className="auth__form" onSubmit={handleSubmit}>
            <div className="checkout__field">
              <label htmlFor="rp-password">Nova senha</label>
              <input
                id="rp-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="checkout__field">
              <label htmlFor="rp-confirm">Confirmar nova senha</label>
              <input
                id="rp-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {error && <p className="checkout__error">{error}</p>}

            <button type="submit" className="auth__submit" disabled={loading}>
              {loading ? 'Aguarde…' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
