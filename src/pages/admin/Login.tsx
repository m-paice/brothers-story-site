import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

export function Login() {
  const { session, signIn, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Já autenticado: vai direto para o painel
  if (session) {
    const from = (location.state as { from?: Location })?.from?.pathname;
    return <Navigate to={from ?? '/admin'} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/admin', { replace: true });
    } catch {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__brand">
          <span className="login__brand-mark" />
          <span className="login__brand-text">Brother Store</span>
        </div>
        <h1 className="login__title">Painel administrativo</h1>
        <p className="login__subtitle">Entre para gerenciar a loja.</p>

        {!configured && (
          <p className="login__warning">
            Supabase não configurado. Preencha o arquivo <code>.env</code> com as
            credenciais do projeto.
          </p>
        )}

        <div className="login__field">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="login__field">
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="login__error">{error}</p>}

        <button
          className="login__submit"
          type="submit"
          disabled={loading || !configured}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
